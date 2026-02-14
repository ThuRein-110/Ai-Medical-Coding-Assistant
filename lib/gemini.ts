import OpenAI from "openai";
import { searchReferenceDocs } from "./referenceDocs";

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || "";
const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || "moonshotai/kimi-k2-instruct-0905";

// --- Mode: Code → Description ---
const CODE_TO_DESC_PROMPT = `You are an expert AI Medical Coding Assistant.

TASK: Given a medical code (ICD-10, ICD-9, CPT, HCPCS, or DRG), return a clear human-readable explanation.

RULES:
- Identify the code system automatically (ICD-10-CM, ICD-10-PCS, ICD-9, CPT, HCPCS, DRG).
- Provide the official description and a plain-English explanation.
- Include the code category/chapter if applicable.
- If the code is invalid or unrecognized, say so clearly.
- Output ONLY valid JSON, no text outside it.

OUTPUT FORMAT (STRICT JSON):
{
  "mode": "code_to_description",
  "input_code": "",
  "code_system": "",
  "official_description": "",
  "plain_english": "",
  "category": "",
  "chapter": "",
  "parent_code": "",
  "related_codes": [
    { "code": "", "description": "" }
  ],
  "notes": "",
  "valid": true
}`;

// --- Mode: Description → Code ---
const DESC_TO_CODE_PROMPT = `You are an expert AI Medical Coding Assistant.

TASK: Given a human-readable medical description, diagnosis, procedure, or condition, return the most appropriate medical code(s).

RULES:
- Return ICD-10-CM codes for diagnoses/conditions.
- Return ICD-10-PCS or CPT codes for procedures.
- Return the single best-match code as "primary" and up to 5 alternatives.
- Include confidence scores (0.00 to 1.00).
- Do NOT upcode. Only assign codes that match the documented description.
- If the description is too vague, explain what additional detail is needed.
- Output ONLY valid JSON, no text outside it.

OUTPUT FORMAT (STRICT JSON):
{
  "mode": "description_to_code",
  "input_description": "",
  "primary_result": {
    "code": "",
    "code_system": "",
    "official_description": "",
    "confidence": 0.00
  },
  "alternatives": [
    {
      "code": "",
      "code_system": "",
      "official_description": "",
      "confidence": 0.00,
      "why_alternative": ""
    }
  ],
  "specificity_warnings": [],
  "notes": ""
}`;

// --- Types ---
export interface CodeToDescResult {
  mode: "code_to_description";
  input_code: string;
  code_system: string;
  official_description: string;
  plain_english: string;
  category: string;
  chapter: string;
  parent_code: string;
  related_codes: Array<{ code: string; description: string }>;
  notes: string;
  valid: boolean;
}

export interface DescToCodeResult {
  mode: "description_to_code";
  input_description: string;
  primary_result: {
    code: string;
    code_system: string;
    official_description: string;
    confidence: number;
  };
  alternatives: Array<{
    code: string;
    code_system: string;
    official_description: string;
    confidence: number;
    why_alternative: string;
  }>;
  specificity_warnings: string[];
  notes: string;
}

export type LookupResult = CodeToDescResult | DescToCodeResult;

// --- Detect if input looks like a medical code ---
function looksLikeCode(input: string): boolean {
  const trimmed = input.trim();
  // ICD-10: letter + digits (+ optional dot + more), CPT: 5 digits, HCPCS: letter + 4 digits, DRG: 3 digits
  return /^[A-Za-z]\d{2,}/.test(trimmed) || /^\d{3,5}$/.test(trimmed);
}

// --- Main lookup function ---
export async function lookupMedicalCode(
  input: string,
  forceMode?: "code_to_description" | "description_to_code"
): Promise<LookupResult> {
  if (!NVIDIA_API_KEY) {
    throw new Error("NVIDIA_API_KEY environment variable is not set.");
  }

  const mode = forceMode || (looksLikeCode(input) ? "code_to_description" : "description_to_code");
  const systemPrompt = mode === "code_to_description" ? CODE_TO_DESC_PROMPT : DESC_TO_CODE_PROMPT;

  // Search reference docs for relevant context
  const refContext = await searchReferenceDocs(input, 5, 6000);
  const refSection = refContext
    ? `

REFERENCE DOCUMENTS (use these as authoritative source when relevant):
${refContext}`
    : "";

  const userPrompt =
    mode === "code_to_description"
      ? `Look up this medical code: "${input}"${refSection}\n\nReturn ONLY the JSON.`
      : `Find the medical code(s) for: "${input}"${refSection}\n\nReturn ONLY the JSON.`;

  const client = new OpenAI({
    baseURL: NVIDIA_BASE_URL,
    apiKey: NVIDIA_API_KEY,
  });

  // Collect streamed response
  const completion = await client.chat.completions.create({
    model: NVIDIA_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.6,
    top_p: 0.9,
    max_tokens: 4096,
    stream: true,
  });

  let text = "";
  for await (const chunk of completion) {
    if (chunk.choices?.[0]?.delta?.content) {
      text += chunk.choices[0].delta.content;
    }
  }

  // Extract JSON from the response (handle markdown code blocks)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  const jsonStr = (jsonMatch[1] || text).trim();

  try {
    return JSON.parse(jsonStr) as LookupResult;
  } catch {
    throw new Error(
      `Failed to parse AI response as JSON. Raw response:\n${text}`
    );
  }
}

// --- Batch: Convert multiple diagnoses/procedures to codes in one call ---
const BATCH_PROMPT = `You are an expert AI Medical Coding Assistant.

TASK: Given a JSON array of medical items (each with a row number, AN/admission number, and diagnosis or procedure text), return the best medical code for EVERY SINGLE item in the array.

CRITICAL RULES:
- You MUST return exactly one result object for EVERY input item. Do NOT skip any rows.
- The number of objects in your output array MUST equal the number of items in the input array.
- For diagnoses/conditions: Return ICD-10-CM codes.
- For procedures/surgeries: Return ICD-10-PCS or CPT codes as appropriate.
- Auto-detect whether each item is a diagnosis or a procedure and code accordingly.
- For each item, return the single best-match code plus confidence.
- Do NOT upcode.
- If an item is too vague or invalid, set icd_code to "" and explain in notes. Still include it in the output.
- Output ONLY a valid JSON array, no text outside it. No markdown fences.

OUTPUT FORMAT (STRICT – JSON array, one entry per input):
[
  {
    "row": 1,
    "an": "",
    "input_diagnosis": "",
    "icd_code": "",
    "code_system": "",
    "official_description": "",
    "confidence": 0.00,
    "notes": ""
  }
]`;

export interface BatchCodeResult {
  row: number;
  an: string;
  column: string;
  input_diagnosis: string;
  icd_code: string;
  code_system: string;
  official_description: string;
  confidence: number;
  notes: string;
}

export interface DiagnosisInput {
  row: number;
  an: string;
  diagnosis: string;
}

export async function batchDiagnosisToCode(
  diagnoses: DiagnosisInput[]
): Promise<BatchCodeResult[]> {
  if (!NVIDIA_API_KEY) {
    throw new Error("NVIDIA_API_KEY environment variable is not set.");
  }

  const client = new OpenAI({
    baseURL: NVIDIA_BASE_URL,
    apiKey: NVIDIA_API_KEY,
  });

  // Smaller chunks = more reliable complete responses
  const CHUNK_SIZE = 10;
  const allResults: BatchCodeResult[] = [];

  for (let i = 0; i < diagnoses.length; i += CHUNK_SIZE) {
    const chunk = diagnoses.slice(i, i + CHUNK_SIZE);
    const chunkResults = await processChunk(client, chunk);

    // Check for missing rows and retry them individually
    const returnedRows = new Set(chunkResults.map((r) => r.row));
    const missingItems = chunk.filter((d) => !returnedRows.has(d.row));

    allResults.push(...chunkResults);

    // Retry missing rows one-by-one
    for (const missing of missingItems) {
      const singleResult = await processChunk(client, [missing]);
      if (singleResult.length > 0) {
        allResults.push(...singleResult);
      } else {
        // Final fallback: add an error entry
        allResults.push({
          row: missing.row,
          an: missing.an,
          column: "",
          input_diagnosis: missing.diagnosis,
          icd_code: "",
          code_system: "",
          official_description: "",
          confidence: 0,
          notes: "AI failed to return a result for this diagnosis after retry.",
        });
      }
    }
  }

  // Sort by row number to maintain original order
  allResults.sort((a, b) => a.row - b.row);

  return allResults;
}

async function processChunk(
  client: OpenAI,
  chunk: DiagnosisInput[]
): Promise<BatchCodeResult[]> {
  const inputPayload = chunk.map((d) => ({
    row: d.row,
    an: d.an,
    diagnosis: d.diagnosis,
  }));

  // Search reference docs for context relevant to this batch
  const batchQuery = chunk.map((d) => d.diagnosis).join(" ");
  const refContext = await searchReferenceDocs(batchQuery, 5, 4000);
  const refSection = refContext
    ? `

REFERENCE DOCUMENTS (use these as authoritative source when relevant):
${refContext}
`
    : "";

  const userPrompt = `Convert these ${chunk.length} diagnoses/procedures to medical codes. You MUST return exactly ${chunk.length} results.${refSection}\n\n${JSON.stringify(inputPayload, null, 2)}\n\nReturn ONLY the JSON array with ${chunk.length} objects.`;

  try {
    const completion = await client.chat.completions.create({
      model: NVIDIA_MODEL,
      messages: [
        { role: "system", content: BATCH_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.6,
      top_p: 0.9,
      max_tokens: 16384,
      stream: true,
    });

    let text = "";
    for await (const chunkResp of completion) {
      if (chunkResp.choices?.[0]?.delta?.content) {
        text += chunkResp.choices[0].delta.content;
      }
    }

    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
    const jsonStr = (jsonMatch[1] || text).trim();

    const parsed = JSON.parse(jsonStr) as BatchCodeResult[];
    return parsed;
  } catch {
    // If parsing fails for the chunk, add error entries
    return chunk.map((d) => ({
      row: d.row,
      an: d.an,
      column: "",
      input_diagnosis: d.diagnosis,
      icd_code: "",
      code_system: "",
      official_description: "",
      confidence: 0,
      notes: "AI response could not be parsed for this chunk.",
    }));
  }
}
