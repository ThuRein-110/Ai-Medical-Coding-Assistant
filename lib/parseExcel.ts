import * as XLSX from "xlsx";

export interface ParsedExcelResult {
  allRecords: Record<string, any>[];
  headers: string[];
}

/**
 * Parse Excel buffer and return all records with headers
 */
export function parseExcelBuffer(buffer: Buffer): ParsedExcelResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  
  // Use the first sheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
    raw: false,
  }) as Record<string, any>[];
  
  // Extract headers from the first row
  const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
  
  return {
    allRecords: jsonData,
    headers,
  };
}

/**
 * Detect diagnosis/procedure columns from headers
 */
export function findDiagnosisColumns(headers: string[]): string[] {
  const dxPattern = /^(p?dx|s?dx\d*|pdx|sdx|primary.?d(iag|x)|secondary.?d(iag|x)|diagnosis|diagnoses|description|condition|chief.?complaint|admitting.?d|discharge.?d|dx.?\d*|diag.?\d*|proc(edure)?s?\d*|p(ri)?x|spx|ppx|px\d*|cpt\d*|hcpcs\d*|primary.?proc|secondary.?proc|surg(ery|ical)?)/i;
  const matched = headers.filter((h) => dxPattern.test(h.trim()));
  return matched.length > 0 ? matched : [];
}
