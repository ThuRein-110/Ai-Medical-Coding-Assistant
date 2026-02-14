import { batchDiagnosisToCode, type BatchCodeResult, type DiagnosisInput } from "./gemini";
import { AISettings, DEFAULT_AI_SETTINGS } from "@/types/ai-settings";

export type { BatchCodeResult };
import { findDiagnosisColumns } from "./parseExcel";

export interface DiagnosisEntry extends DiagnosisInput {
  column: string;
}

export interface ProcessDiagnosesResult {
  success: boolean;
  results: BatchCodeResult[];
  metadata: {
    totalRows: number;
    processedDiagnoses: number;
    columns: string[];
    headers: string[];
  };
  error?: string;
}

/**
 * Find the admission number (AN) column value from a record
 */
function findANColumnValue(record: Record<string, any>): string {
  // Common variations of AN column
  const anPatterns = ['an', 'AN', 'An', 'aN', 'admission_number', 'Admission_Number', 'ADMISSION_NUMBER'];
  
  for (const pattern of anPatterns) {
    if (record[pattern] !== undefined) {
      return String(record[pattern] || "");
    }
  }
  
  // Try case-insensitive search
  for (const key of Object.keys(record)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey === 'an' || lowerKey === 'admission_number') {
      return String(record[key] || "");
    }
  }
  
  return "";
}

/**
 * Extract diagnoses from records and convert them to ICD-10 codes
 * This function is designed to be called after saving patient data
 * 
 * @param allRecords - Array of record objects from Excel
 * @param headers - Array of column header names
 * @param settings - Optional AI settings to customize processing
 * @returns ProcessDiagnosesResult with coding results
 */
export async function processDiagnosisCoding(
  allRecords: Record<string, any>[],
  headers: string[],
  settings: Partial<AISettings> = {}
): Promise<ProcessDiagnosesResult> {
  const aiSettings = { ...DEFAULT_AI_SETTINGS, ...settings };
  try {
    if (allRecords.length === 0) {
      return {
        success: false,
        results: [],
        metadata: {
          totalRows: 0,
          processedDiagnoses: 0,
          columns: [],
          headers,
        },
        error: "No records provided for diagnosis coding",
      };
    }

    // Find ALL diagnosis columns (PDX, SDX, SDX1, SDX2, Diagnosis, etc.)
    const dxColumns = findDiagnosisColumns(headers);

    if (dxColumns.length === 0) {
      return {
        success: false,
        results: [],
        metadata: {
          totalRows: allRecords.length,
          processedDiagnoses: 0,
          columns: [],
          headers,
        },
        error: `No diagnosis/procedure columns found. Expected columns named PDX, SDX, Proc, Procedure, CPT, Diagnosis, etc. Available columns: ${headers.join(", ")}`,
      };
    }

    // Build diagnosis list from ALL matched columns
    const diagnoses: DiagnosisEntry[] = [];

    for (const col of dxColumns) {
      for (let idx = 0; idx < allRecords.length; idx++) {
        const val = String(allRecords[idx][col] || "").trim();
        if (val.length > 0) {
          const anValue = findANColumnValue(allRecords[idx]);
          diagnoses.push({
            row: idx + 1,
            an: anValue,
            column: col,
            diagnosis: val,
          });
        }
      }
    }

    if (diagnoses.length === 0) {
      return {
        success: false,
        results: [],
        metadata: {
          totalRows: allRecords.length,
          processedDiagnoses: 0,
          columns: dxColumns,
          headers,
        },
        error: `No non-empty values found in columns: ${dxColumns.join(", ")}`,
      };
    }

    // Call AI batch conversion with settings
    const results = await batchDiagnosisToCode(
      diagnoses.map((d) => ({ row: d.row, an: d.an, diagnosis: d.diagnosis })),
      aiSettings
    );

    // Filter results by confidence threshold and attach column name
    const resultsWithColumns: BatchCodeResult[] = results.map((r, i) => {
      const needsReview = r.confidence < aiSettings.confidenceThreshold;
      return {
        ...r,
        column: diagnoses[i]?.column || "unknown",
        notes: needsReview 
          ? `${r.notes || ''} [Below confidence threshold: ${(r.confidence * 100).toFixed(0)}% < ${(aiSettings.confidenceThreshold * 100).toFixed(0)}%]`.trim()
          : r.notes,
      };
    });

    return {
      success: true,
      results: resultsWithColumns,
      metadata: {
        totalRows: allRecords.length,
        processedDiagnoses: diagnoses.length,
        columns: dxColumns,
        headers,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Diagnosis coding error:", message);
    return {
      success: false,
      results: [],
      metadata: {
        totalRows: allRecords.length,
        processedDiagnoses: 0,
        columns: [],
        headers,
      },
      error: message,
    };
  }
}
