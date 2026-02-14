import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Check if file is an Excel file
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel.sheet.macroEnabled.12',
    ]

    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an Excel file (.xls, .xlsx, .xlsm)' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Read the workbook
    const workbook = XLSX.read(buffer, { type: 'buffer' })

    // Extract data from all sheets
    const sheets: Record<string, any[]> = {}
    
    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName]
      // Convert sheet to JSON with column-value pairs (first row as keys)
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        defval: '', // Default value for empty cells
        raw: false, // Convert all values to strings
      })
      sheets[sheetName] = jsonData
    })

    // Get workbook metadata
    const metadata = {
      fileName: file.name,
      fileSize: file.size,
      sheetNames: workbook.SheetNames,
      sheetCount: workbook.SheetNames.length,
      uploadedAt: new Date().toISOString(),
    }

    return NextResponse.json(
      {
        success: true,
        data: sheets,
        metadata,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Excel extraction error:', error)
    return NextResponse.json(
      { error: 'Failed to extract data from Excel file' },
      { status: 500 }
    )
  }
}

// Optional: GET endpoint to check API health
export async function GET() {
  return NextResponse.json(
    {
      message: 'Excel extraction API is ready',
      supportedFormats: ['.xls', '.xlsx', '.xlsm'],
    },
    { status: 200 }
  )
}
