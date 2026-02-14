import OpenAI from "openai";
import { searchReferenceDocs } from "./referenceDocs";
import { getICDContextForAI, lookupCode, searchByDescription, isValidCode } from "./icd10-lookup";
import { AISettings, DEFAULT_AI_SETTINGS } from "@/types/ai-settings";

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
  forceMode?: "code_to_description" | "description_to_code",
  settings: Partial<AISettings> = {}
): Promise<LookupResult> {
  const aiSettings = { ...DEFAULT_AI_SETTINGS, ...settings };
  if (!NVIDIA_API_KEY) {
    throw new Error("NVIDIA_API_KEY environment variable is not set.");
  }

  const mode = forceMode || (looksLikeCode(input) ? "code_to_description" : "description_to_code");
  const systemPrompt = mode === "code_to_description" ? CODE_TO_DESC_PROMPT : DESC_TO_CODE_PROMPT;

  // For code lookup, check local database first
  if (mode === "code_to_description") {
    const dbEntry = await lookupCode(input);
    if (dbEntry) {
      return {
        mode: "code_to_description",
        input_code: input,
        code_system: "ICD-10-CM",
        official_description: dbEntry.desc,
        plain_english: dbEntry.desc,
        category: input.substring(0, 3),
        chapter: "",
        parent_code: "",
        related_codes: [],
        notes: "Retrieved from local ICD-10 database",
        valid: true,
      } as CodeToDescResult;
    }
  }

  // For description to code, get relevant codes from database
  let icdContext = "";
  if (mode === "description_to_code") {
    icdContext = await getICDContextForAI(input, aiSettings.maxICDContextCodes);
  }

  // Search reference docs for relevant context
  const refContext = await searchReferenceDocs(input, 5, 6000);
  const refSection = refContext
    ? `\n\nREFERENCE DOCUMENTS:\n${refContext}`
    : "";
  
  const icdSection = icdContext
    ? `\n\nICD-10-CM DATABASE (use these verified codes):\n${icdContext}`
    : "";

  const userPrompt =
    mode === "code_to_description"
      ? `Look up this medical code: "${input}"${refSection}\n\nReturn ONLY the JSON.`
      : `Find the medical code(s) for: "${input}"${icdSection}${refSection}\n\nIMPORTANT: Prioritize codes from the ICD-10-CM DATABASE above.\n\nReturn ONLY the JSON.`;

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
    temperature: aiSettings.temperature,
    top_p: aiSettings.topP,
    max_tokens: aiSettings.maxTokens,
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
const BATCH_PROMPT = `You are an expert AI Medical Coding Assistant with access to the official ICD-10-CM database.

TASK: Given a JSON array of medical items (each with a row number, AN/admission number, and diagnosis or procedure text), return the best medical code for EVERY SINGLE item in the array.

CRITICAL RULES:
1. You MUST return exactly one result object for EVERY input item. Do NOT skip any rows.
2. The number of objects in your output array MUST equal the number of items in the input array.
3. ACCURACY IS PARAMOUNT: Use ONLY codes that appear in the ICD-10-CM DATABASE PROVIDED below.
4. For diagnoses/conditions: Return ICD-10-CM codes (format: letter + 2-7 alphanumeric characters, e.g., J18.9, E11.65).
5. For procedures/surgeries: Return ICD-10-PCS or CPT codes as appropriate.
6. If the exact code is in the provided ICD-10 database, use it exactly as shown.
7. Do NOT invent codes. If unsure, pick the closest match from the database and set lower confidence.
8. If an item is too vague, set icd_code to "" and explain in notes. Still include it in the output.
9. Output ONLY a valid JSON array, no text outside it. No markdown fences.

OUTPUT FORMAT (STRICT – JSON array, one entry per input):
[
  {
    "row": 1,
    "an": "",
    "input_diagnosis": "",
    "icd_code": "",
    "code_system": "ICD-10-CM",
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
  diagnoses: DiagnosisInput[],
  settings: Partial<AISettings> = {}
): Promise<BatchCodeResult[]> {
  const aiSettings = { ...DEFAULT_AI_SETTINGS, ...settings };
  
  if (!NVIDIA_API_KEY) {
    throw new Error("NVIDIA_API_KEY environment variable is not set.");
  }

  const client = new OpenAI({
    baseURL: NVIDIA_BASE_URL,
    apiKey: NVIDIA_API_KEY,
  });

  // Use chunk size from settings
  const CHUNK_SIZE = aiSettings.chunkSize;
  const allResults: BatchCodeResult[] = [];

  for (let i = 0; i < diagnoses.length; i += CHUNK_SIZE) {
    const chunk = diagnoses.slice(i, i + CHUNK_SIZE);
    const chunkResults = await processChunk(client, chunk, aiSettings);

    // Check for missing rows and retry them individually
    const returnedRows = new Set(chunkResults.map((r) => r.row));
    const missingItems = chunk.filter((d) => !returnedRows.has(d.row));

    allResults.push(...chunkResults);

    // Retry missing rows one-by-one
    for (const missing of missingItems) {
      const singleResult = await processChunk(client, [missing], aiSettings);
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
  chunk: DiagnosisInput[],
  aiSettings: AISettings
): Promise<BatchCodeResult[]> {
  const inputPayload = chunk.map((d) => ({
    row: d.row,
    an: d.an,
    diagnosis: d.diagnosis,
  }));

  // Get ICD-10 codes from local database for each diagnosis (parallel)
  const icdContextPromises = chunk.map(d => getICDContextForAI(d.diagnosis, aiSettings.maxICDContextCodes));
  const icdContexts = await Promise.all(icdContextPromises);
  
  // Combine and deduplicate ICD-10 context
  const allICDLines = new Set<string>();
  icdContexts.forEach(ctx => {
    if (ctx) {
      ctx.split('\n').slice(1).forEach(line => {
        if (line.trim()) allICDLines.add(line.trim());
      });
    }
  });
  
  const icdSection = allICDLines.size > 0
    ? `\n\nICD-10-CM DATABASE (use these codes - they are verified accurate):\n${Array.from(allICDLines).slice(0, 50).join('\n')}`
    : '';

  // Search reference docs for additional context
  const batchQuery = chunk.map((d) => d.diagnosis).join(" ");
  const refContext = await searchReferenceDocs(batchQuery, 3, 2000);
  const refSection = refContext
    ? `\n\nADDITIONAL REFERENCE:\n${refContext}`
    : "";

  const userPrompt = `Convert these ${chunk.length} diagnoses/procedures to medical codes. You MUST return exactly ${chunk.length} results.

IMPORTANT: Prioritize codes from the ICD-10-CM DATABASE below. Only use other codes if no match exists in the database.${icdSection}${refSection}

INPUT DATA:
${JSON.stringify(inputPayload, null, 2)}

Return ONLY the JSON array with ${chunk.length} objects.`;

  try {
    const completion = await client.chat.completions.create({
      model: NVIDIA_MODEL,
      messages: [
        { role: "system", content: BATCH_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: aiSettings.temperature,
      top_p: aiSettings.topP,
      max_tokens: aiSettings.maxTokens,
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
    
    // Post-process: validate codes against local database
    const validated = await Promise.all(parsed.map(async (result) => {
      if (!result.icd_code || result.icd_code.trim() === '') {
        return result;
      }
      
      // Check if the code exists in our database
      const dbEntry = await lookupCode(result.icd_code);
      
      if (dbEntry) {
        // Code is valid - use the official description from database
        return {
          ...result,
          official_description: dbEntry.desc,
          notes: result.notes ? `${result.notes} [Verified in ICD-10 database]` : 'Verified in ICD-10 database',
        };
      } else {
        // Code not found - try to find a better match
        const suggestions = await searchByDescription(result.input_diagnosis, 3);
        
        if (suggestions.length > 0) {
          const bestMatch = suggestions[0];
          // If confidence was high but code invalid, suggest the correct one
          return {
            ...result,
            icd_code: bestMatch.code,
            official_description: bestMatch.description,
            confidence: Math.min(result.confidence, 0.75), // Cap confidence since we auto-corrected
            notes: `AI suggested "${result.icd_code}" but DB lookup found "${bestMatch.code}" as better match`,
          };
        } else {
          // No match found in database
          return {
            ...result,
            notes: `Code "${result.icd_code}" not found in ICD-10 database. May need manual review.`,
            confidence: Math.min(result.confidence, 0.5),
          };
        }
      }
    }));
    
    return validated;
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
