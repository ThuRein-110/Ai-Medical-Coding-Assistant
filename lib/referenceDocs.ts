import fs from "fs";
import path from "path";
// eslint-disable-next-line @typescript-eslint/no-require-imports
import {PDFParse} from "pdf-parse";

const REFERENCE_DIR = path.join(process.cwd(), "lib", "ICD");
const CHUNK_SIZE = 1500; // characters per chunk
const CHUNK_OVERLAP = 200; // overlap between chunks for context continuity

interface DocChunk {
  text: string;
  source: string; // filename
  chunkIndex: number;
}

// Cache: loaded once, reused across requests
let cachedChunks: DocChunk[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Split text into overlapping chunks for search
 */
function chunkText(text: string, source: string): DocChunk[] {
  const chunks: DocChunk[] = [];
  const cleanText = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  let start = 0;
  let idx = 0;

  while (start < cleanText.length) {
    const end = Math.min(start + CHUNK_SIZE, cleanText.length);
    chunks.push({
      text: cleanText.slice(start, end).trim(),
      source,
      chunkIndex: idx,
    });
    start += CHUNK_SIZE - CHUNK_OVERLAP;
    idx++;
  }

  return chunks;
}

/**
 * Load and parse all PDFs and text files from reference-docs/
 */
async function loadAllDocs(): Promise<DocChunk[]> {
  const now = Date.now();

  // Return cache if fresh
  if (cachedChunks && now - cacheTimestamp < CACHE_TTL) {
    return cachedChunks;
  }

  if (!fs.existsSync(REFERENCE_DIR)) {
    fs.mkdirSync(REFERENCE_DIR, { recursive: true });
    cachedChunks = [];
    cacheTimestamp = now;
    return [];
  }

  const files = fs.readdirSync(REFERENCE_DIR);
  const allChunks: DocChunk[] = [];

  for (const file of files) {
    const filePath = path.join(REFERENCE_DIR, file);
    const ext = path.extname(file).toLowerCase();

    try {
      if (ext === ".pdf") {
        const buffer = fs.readFileSync(filePath);
        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        const data = await parser.getText();
        await parser.destroy();
        const chunks = chunkText(data.text, file);
        allChunks.push(...chunks);
        console.log(`[RefDocs] Loaded ${file}: ${chunks.length} chunks`);
      } else if (ext === ".txt" || ext === ".md" || ext === ".csv") {
        const text = fs.readFileSync(filePath, "utf-8");
        const chunks = chunkText(text, file);
        allChunks.push(...chunks);
        console.log(`[RefDocs] Loaded ${file}: ${chunks.length} chunks`);
      }
    } catch (err) {
      console.error(`[RefDocs] Failed to load ${file}:`, err);
    }
  }

  console.log(`[RefDocs] Total: ${allChunks.length} chunks from ${files.length} files`);
  cachedChunks = allChunks;
  cacheTimestamp = now;
  return allChunks;
}

/**
 * Simple keyword search: score each chunk by how many query terms it contains
 */
function scoreChunk(chunk: DocChunk, queryTerms: string[]): number {
  const lowerText = chunk.text.toLowerCase();
  let score = 0;
  for (const term of queryTerms) {
    if (term.length < 2) continue;
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const matches = lowerText.match(regex);
    if (matches) {
      score += matches.length;
    }
  }
  return score;
}

/**
 * Search reference docs for content relevant to the query.
 * Returns the top N most relevant chunks concatenated as context.
 */
export async function searchReferenceDocs(
  query: string,
  maxChunks: number = 5,
  maxChars: number = 6000
): Promise<string> {
  const chunks = await loadAllDocs();

  if (chunks.length === 0) {
    return "";
  }

  // Tokenize query into search terms
  const queryTerms = query
    .toLowerCase()
    .replace(/[^\w\s.-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  if (queryTerms.length === 0) {
    return "";
  }

  // Score and sort
  const scored = chunks
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, queryTerms) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChunks);

  if (scored.length === 0) {
    return "";
  }

  // Build context string, respecting max chars
  let context = "";
  for (const { chunk } of scored) {
    const entry = `\n--- [Source: ${chunk.source}] ---\n${chunk.text}\n`;
    if (context.length + entry.length > maxChars) break;
    context += entry;
  }

  return context;
}

/**
 * Get list of loaded reference doc files
 */
export function listReferenceDocs(): string[] {
  if (!fs.existsSync(REFERENCE_DIR)) return [];
  return fs
    .readdirSync(REFERENCE_DIR)
    .filter((f) => /\.(pdf|txt|md|csv)$/i.test(f));
}

/**
 * Force reload of reference docs (call after adding new files)
 */
export function invalidateRefDocsCache(): void {
  cachedChunks = null;
  cacheTimestamp = 0;
}
