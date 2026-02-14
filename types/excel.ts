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
