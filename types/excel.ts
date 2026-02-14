/**
 * Excel extraction types
 */

export interface ExcelMetadata {
  fileName: string
  fileSize: number
  sheetNames: string[]
  sheetCount: number
  uploadedAt: string
}

export interface ExcelExtractionResponse {
  success: boolean
  data: Record<string, any[]>
  metadata: ExcelMetadata
}

export interface ExcelExtractionError {
  error: string
}

export type ExcelApiResponse = ExcelExtractionResponse | ExcelExtractionError

/**
 * Diagnosis coding types
 */

export interface BatchCodeResult {
  row: number
  an: string
  column: string
  input_diagnosis: string
  icd_code: string
  code_system: string
  official_description: string
  confidence: number
  notes: string
}

export interface DiagnosisCodingMetadata {
  totalRows: number
  processedDiagnoses: number
  columns: string[]
  headers: string[]
}

export interface ProcessDiagnosesResult {
  success: boolean
  results: BatchCodeResult[]
  metadata: DiagnosisCodingMetadata
  error?: string
}

export interface ExcelExtractionWithCodingResponse {
  success: boolean
  data: Record<string, any[]>
  metadata: ExcelMetadata & {
    totalInserted: number
    insertedPatients: string[]
  }
  diagnosisCoding: ProcessDiagnosesResult | null
}
