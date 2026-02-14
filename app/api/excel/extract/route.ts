import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'
import { processDiagnosisCoding } from '@/lib/diagnosis-coding'

// Column mapping from Excel headers to database field names
const COLUMN_MAPPING: Record<string, string> = {
  // Source column name (lowercase) -> Database field name
  'an': 'admission_number',
  'age': 'age',
  'sex': 'sex',
  'cc': 'chief_complaint',
  'pi': 'patient_illness',
  'patient_examine': 'patient_examine',
  'pre_diagnosis': 'pre_diagnosis',
  'treatment_plan': 'treatment_plan',
  // Also support common variations
  'chief_complaint': 'chief_complaint',
  'chief complaint': 'chief_complaint',
  'present_illness': 'patient_illness',
  'present illness': 'patient_illness',
  'patient examine': 'patient_examine',
  'pre-diagnosis': 'pre_diagnosis',
  'prediagnosis': 'pre_diagnosis',
  'treatment plan': 'treatment_plan',
}

interface MappedRow {
  admission_number: string
  age: string
  sex: string
  chief_complaint: string
  patient_illness: string
  patient_examine: string
  pre_diagnosis: string
  treatment_plan: string
}

function normalizeColumnName(header: string): string {
  const normalized = header.toLowerCase().trim().replace(/\s+/g, '_')
  return COLUMN_MAPPING[normalized] || header
}

function mapRowData(row: Record<string, any>): MappedRow {
  const mapped: Record<string, string> = {}
  
  // Map each column to the standardized field name
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeColumnName(key)
    mapped[normalizedKey] = value?.toString() || ''
  }
  
  // Return with all required fields (empty string if not found)
  return {
    admission_number: mapped['admission_number'] || '',
    age: mapped['age'] || '',
    sex: mapped['sex'] || '',
    chief_complaint: mapped['chief_complaint'] || '',
    patient_illness: mapped['patient_illness'] || '',
    patient_examine: mapped['patient_examine'] || '',
    pre_diagnosis: mapped['pre_diagnosis'] || '',
    treatment_plan: mapped['treatment_plan'] || '',
  }
}

// Generate a unique case ID
function generateCaseId(): string {
  const now = new Date()
  const year = now.getFullYear()
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `CASE-${year}-${random}`
}

export const runtime = "nodejs";
export const maxDuration = 300; // allow up to 5 minutes for large multi-column batches

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

    // Initialize Supabase client
    const supabase = await createClient()

    // Extract, map and store data from all sheets
    const sheets: Record<string, MappedRow[]> = {}
    const insertedPatients: string[] = []
    let totalInserted = 0
    
    // Collect records for diagnosis coding (only first 5 rows, matching patient insertion)
    let recordsForCoding: Record<string, any>[] = []
    let allHeaders: string[] = []
    
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName]
      // Convert sheet to JSON with column-value pairs (first row as keys)
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        defval: '', // Default value for empty cells
        raw: false, // Convert all values to strings
      }) as Record<string, any>[]
      
      // Store headers from first sheet
      if (allHeaders.length === 0 && jsonData.length > 0) {
        allHeaders = Object.keys(jsonData[0])
      }
      
      // Only collect first 5 rows per sheet for diagnosis coding (matching patient insertion)
      const slicedData = jsonData.slice(0, 5)
      recordsForCoding = [...recordsForCoding, ...slicedData]
      
      // Map each row to standardized field names (limit to first 5 rows)
      const mappedData: MappedRow[] = slicedData.map(mapRowData)
      sheets[sheetName] = mappedData

      // Insert each row as a new patient/case in Supabase (max 5 rows)
      // for (const row of mappedData) {
      //   // Skip rows with no admission number
      //   if (!row.admission_number) {
      //     console.warn('Skipping row without admission_number:', row)
      //     continue
      //   }

      //   // Generate case ID
      //   const caseId = generateCaseId()
      //   const now = new Date().toISOString()

      //   // Insert into patients table
      //   const { error: insertError } = await supabase
      //     .from('patients')
      //     .insert({
      //       admission_number: row.admission_number,
      //       age: parseInt(row.age) || null,
      //       sex: row.sex,
      //       chief_complaint: row.chief_complaint,
      //       patient_illness: row.patient_illness,
      //       patient_examine: row.patient_examine,
      //       pre_diagnosis: row.pre_diagnosis,
      //       treatment_plan: row.treatment_plan,
      //       created_at: now
      //     })

      //   if (insertError) {
      //     console.error('Error inserting patient:', insertError)
      //     throw new Error(`Failed to insert patient: ${insertError.message}`)
      //   }

      //   insertedPatients.push(caseId)
      //   totalInserted++
      // }
    }

    // Process diagnosis coding AFTER saving patient data (only on the first 5 rows)
    let diagnosisCodingResult = null
    if (recordsForCoding.length > 0 && allHeaders.length > 0) {
      diagnosisCodingResult = await processDiagnosisCoding(recordsForCoding, allHeaders)
    }

    // Get workbook metadata
    const metadata = {
      fileName: file.name,
      fileSize: file.size,
      sheetNames: workbook.SheetNames,
      sheetCount: workbook.SheetNames.length,
      uploadedAt: new Date().toISOString(),
      totalInserted,
      insertedPatients,
    }
    console.log(JSON.stringify(diagnosisCodingResult))
    return NextResponse.json(
      {
        success: true,
        data: sheets,
        metadata,
        diagnosisCoding: diagnosisCodingResult,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Excel extraction error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to extract and store data from Excel file' },
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
      columnMapping: {
        'an': 'admission_number',
        'age': 'age',
        'sex': 'sex',
        'cc': 'chief_complaint',
        'pi': 'patient_illness',
        'patient_examine': 'patient_examine',
        'pre_diagnosis': 'pre_diagnosis',
        'treatment_plan': 'treatment_plan',
      },
    },
    { status: 200 }
  )
}
