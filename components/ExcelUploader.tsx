'use client'

import { useState } from 'react'
import { excelApi, isValidExcelFile, formatFileSize } from '@/lib/excel-api'
import type { ExcelExtractionResponse } from '@/types/excel'

export default function ExcelUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ExcelExtractionResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    
    if (!selectedFile) {
      setFile(null)
      return
    }

    if (!isValidExcelFile(selectedFile)) {
      setError('Please select a valid Excel file (.xls, .xlsx, .xlsm)')
      setFile(null)
      return
    }

    setFile(selectedFile)
    setError(null)
    setData(null)
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await excelApi.extractData(file)

      if ('error' in result) {
        setError(result.error)
        setData(null)
      } else {
        setData(result)
        setError(null)
      }
    } catch (err) {
      setError('Failed to extract data from Excel file')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Excel Data Extractor</h1>

      {/* File Upload */}
      <div className="mb-6">
        <input
          type="file"
          accept=".xls,.xlsx,.xlsm"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            cursor-pointer"
        />
        
        {file && (
          <p className="mt-2 text-sm text-gray-600">
            Selected: {file.name} ({formatFileSize(file.size)})
          </p>
        )}
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="px-6 py-2 bg-blue-600 text-white rounded-md
          hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed
          transition-colors"
      >
        {loading ? 'Extracting...' : 'Extract Data'}
      </button>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Results Display */}
      {data && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">Extraction Results</h2>
          
          {/* Metadata */}
          <div className="mb-4 p-4 bg-gray-50 rounded-md">
            <h3 className="font-medium mb-2">File Information</h3>
            <ul className="text-sm space-y-1">
              <li><strong>File:</strong> {data.metadata.fileName}</li>
              <li><strong>Size:</strong> {formatFileSize(data.metadata.fileSize)}</li>
              <li><strong>Sheets:</strong> {data.metadata.sheetCount}</li>
              <li><strong>Uploaded:</strong> {new Date(data.metadata.uploadedAt).toLocaleString()}</li>
            </ul>
          </div>

          {/* Sheet Data */}
          {data.metadata.sheetNames.map((sheetName) => {
            const sheetData = data.data[sheetName]
            if (!sheetData || sheetData.length === 0) return null
            
            // Get column headers from first object
            const columns = Object.keys(sheetData[0])
            
            return (
              <div key={sheetName} className="mb-6">
                <h3 className="font-medium mb-2">Sheet: {sheetName}</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100 font-medium">
                        {columns.map((column) => (
                          <th key={column} className="px-4 py-2 border border-gray-300 text-sm text-left">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sheetData.map((row: any, rowIndex: number) => (
                        <tr key={rowIndex}>
                          {columns.map((column) => (
                            <td
                              key={column}
                              className="px-4 py-2 border border-gray-300 text-sm"
                            >
                              {row[column] !== null && row[column] !== undefined ? String(row[column]) : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {sheetData.length} rows extracted
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
