/**
 * ICD-10 Code Lookup Service
 * 
 * Provides fast, accurate lookups against the local icd10_codes.json database.
 * Includes:
 * - Direct code lookup
 * - Keyword-based search with scoring
 * - Fuzzy code matching
 * - Pre-built inverted index for fast search
 */

import fs from 'fs';
import path from 'path';

// --- Types ---
export interface ICD10Entry {
  code: string;
  desc: string;
  normalizedCode: string; // Without dots for matching
  keywords: string[]; // Pre-computed keywords for search
}

export interface SearchResult {
  code: string;
  description: string;
  score: number;
  matchType: 'exact_code' | 'partial_code' | 'keyword' | 'fuzzy';
}

// --- Singleton database instance ---
let icd10Database: ICD10Entry[] | null = null;
let keywordIndex: Map<string, number[]> | null = null; // keyword -> indices in database
let codeIndex: Map<string, number> | null = null; // normalizedCode -> index
let isLoading = false;
let loadPromise: Promise<void> | null = null;

const ICD10_JSON_PATH = path.join(process.cwd(), 'lib', 'ICD', 'icd10_codes.json');

/**
 * Extract keywords from a description for indexing
 */
function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3)
    .filter(w => !STOP_WORDS.has(w));
}

// Common medical stop words to skip
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'without', 'other', 'due', 'not', 'unspecified',
  'specified', 'type', 'from', 'that', 'this', 'has', 'have', 'are', 'was',
  'were', 'been', 'being', 'having', 'had', 'does', 'did', 'but', 'can',
  'could', 'may', 'might', 'must', 'shall', 'should', 'will', 'would',
]);

/**
 * Normalize ICD-10 code for matching (remove dots, uppercase)
 */
function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[.\s-]/g, '');
}

/**
 * Load ICD-10 database and build indices
 */
async function loadDatabase(): Promise<void> {
  if (icd10Database !== null) return;
  
  if (isLoading && loadPromise) {
    await loadPromise;
    return;
  }

  isLoading = true;
  loadPromise = new Promise<void>((resolve, reject) => {
    try {
      console.log('[ICD10-Lookup] Loading database...');
      const startTime = Date.now();
      
      const rawData = fs.readFileSync(ICD10_JSON_PATH, 'utf-8');
      const entries: Array<{ code: string; desc: string }> = JSON.parse(rawData);
      
      // Build database with pre-computed fields
      icd10Database = entries.map((e) => ({
        code: e.code,
        desc: e.desc,
        normalizedCode: normalizeCode(e.code),
        keywords: extractKeywords(e.desc),
      }));

      // Build code index for O(1) exact lookups
      codeIndex = new Map();
      icd10Database.forEach((entry, idx) => {
        codeIndex!.set(entry.normalizedCode, idx);
      });

      // Build inverted keyword index for fast search
      keywordIndex = new Map();
      icd10Database.forEach((entry, idx) => {
        for (const keyword of entry.keywords) {
          if (!keywordIndex!.has(keyword)) {
            keywordIndex!.set(keyword, []);
          }
          keywordIndex!.get(keyword)!.push(idx);
        }
      });

      const elapsed = Date.now() - startTime;
      console.log(`[ICD10-Lookup] Loaded ${icd10Database.length} codes in ${elapsed}ms`);
      console.log(`[ICD10-Lookup] Keyword index: ${keywordIndex.size} unique keywords`);
      
      resolve();
    } catch (error) {
      console.error('[ICD10-Lookup] Failed to load database:', error);
      reject(error);
    } finally {
      isLoading = false;
    }
  });

  await loadPromise;
}

/**
 * Ensure database is loaded (call before any lookup)
 */
export async function ensureLoaded(): Promise<void> {
  await loadDatabase();
}

/**
 * Look up a code directly - returns exact match or null
 */
export async function lookupCode(code: string): Promise<ICD10Entry | null> {
  await loadDatabase();
  
  const normalized = normalizeCode(code);
  const idx = codeIndex?.get(normalized);
  
  if (idx !== undefined && icd10Database) {
    return icd10Database[idx];
  }
  
  return null;
}

/**
 * Validate if a code exists in the database
 */
export async function isValidCode(code: string): Promise<boolean> {
  const entry = await lookupCode(code);
  return entry !== null;
}

/**
 * Get the official description for a code
 */
export async function getCodeDescription(code: string): Promise<string | null> {
  const entry = await lookupCode(code);
  return entry?.desc ?? null;
}

/**
 * Search for codes by description keywords
 * Returns top N results sorted by relevance score
 */
export async function searchByDescription(
  query: string,
  maxResults: number = 10
): Promise<SearchResult[]> {
  await loadDatabase();
  
  if (!icd10Database || !keywordIndex) return [];

  const queryKeywords = extractKeywords(query);
  if (queryKeywords.length === 0) return [];

  // Score each matching entry
  const scores = new Map<number, number>();
  
  for (const keyword of queryKeywords) {
    // Exact keyword match
    const exactMatches = keywordIndex.get(keyword) || [];
    for (const idx of exactMatches) {
      scores.set(idx, (scores.get(idx) || 0) + 3);
    }
    
    // Partial keyword match (prefix)
    for (const [indexedKeyword, indices] of keywordIndex.entries()) {
      if (indexedKeyword.startsWith(keyword) && indexedKeyword !== keyword) {
        for (const idx of indices) {
          scores.set(idx, (scores.get(idx) || 0) + 1);
        }
      }
    }
  }

  // Sort by score and take top N
  const results: SearchResult[] = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxResults)
    .map(([idx, score]) => {
      const entry = icd10Database![idx];
      return {
        code: entry.code,
        description: entry.desc,
        score,
        matchType: 'keyword' as const,
      };
    });

  return results;
}

/**
 * Search for codes similar to a given code (for suggestions)
 * Finds codes with the same prefix
 */
export async function findSimilarCodes(
  code: string,
  maxResults: number = 5
): Promise<SearchResult[]> {
  await loadDatabase();
  
  if (!icd10Database) return [];

  const normalized = normalizeCode(code);
  const results: SearchResult[] = [];

  // Try different prefix lengths
  for (let prefixLen = normalized.length; prefixLen >= 3 && results.length < maxResults; prefixLen--) {
    const prefix = normalized.slice(0, prefixLen);
    
    for (const entry of icd10Database) {
      if (results.length >= maxResults) break;
      if (entry.normalizedCode.startsWith(prefix) && entry.normalizedCode !== normalized) {
        results.push({
          code: entry.code,
          description: entry.desc,
          score: prefixLen,
          matchType: 'partial_code',
        });
      }
    }
  }

  return results;
}

/**
 * Get relevant ICD-10 context for AI prompts
 * Searches the database and returns formatted context string
 */
export async function getICDContextForAI(
  diagnosis: string,
  maxEntries: number = 15
): Promise<string> {
  const results = await searchByDescription(diagnosis, maxEntries);
  
  if (results.length === 0) {
    return ''; 
  }

  const lines = results.map(r => `${r.code}: ${r.description}`);
  return `RELEVANT ICD-10-CM CODES FROM DATABASE (use these as primary reference):\n${lines.join('\n')}`;
}

/**
 * Batch lookup: validate and enrich multiple codes
 */
export async function batchValidateCodes(
  codes: string[]
): Promise<Map<string, ICD10Entry | null>> {
  await loadDatabase();
  
  const results = new Map<string, ICD10Entry | null>();
  
  for (const code of codes) {
    const entry = await lookupCode(code);
    results.set(code, entry);
  }
  
  return results;
}

/**
 * Get statistics about the database
 */
export async function getDatabaseStats(): Promise<{
  totalCodes: number;
  uniqueKeywords: number;
  loaded: boolean;
}> {
  await loadDatabase();
  
  return {
    totalCodes: icd10Database?.length ?? 0,
    uniqueKeywords: keywordIndex?.size ?? 0,
    loaded: icd10Database !== null,
  };
}
