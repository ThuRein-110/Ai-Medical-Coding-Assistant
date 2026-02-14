/**
 * Excel API Client
 * Use these functions in your frontend to extract data from Excel files
 */

import type { ExcelApiResponse } from '@/types/excel'

export const excelApi = {
  /**
   * Extract data from an Excel file
   * @param file - The Excel file to extract data from
   * @returns Promise with extracted data and metadata
   */
  extractData: async (file: File): Promise<ExcelApiResponse> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/excel/extract', {
      method: 'POST',
      body: formData,
    })

    return response.json()
  },

  /**
   * Check if the Excel extraction API is available
   */
  checkHealth: async () => {
    const response = await fetch('/api/excel/extract')
    return response.json()
  },
}

/**
 * Helper function to validate Excel file before upload
 */
export const isValidExcelFile = (file: File): boolean => {
  const validExtensions = ['.xls', '.xlsx', '.xlsm']
  const fileName = file.name.toLowerCase()
  return validExtensions.some(ext => fileName.endsWith(ext))
}

/**
 * Helper function to format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
