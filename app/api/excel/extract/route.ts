import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'
import { processDiagnosisCoding, BatchCodeResult } from '@/lib/diagnosis-coding'

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

interface SavedPatient {
  id: string
  admission_number: string
}

interface ICDDiagnosisResult {
  patient_id: string
  an: string
  diag_id: string | null
  codeResultsInserted: number
  inserted: boolean
  error?: string
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
export const maxDuration = 60; // Vercel Hobby tier limit (60s), use 300 for Pro tier

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
    const savedPatients: SavedPatient[] = []
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
      for (const row of mappedData) {
        // Skip rows with no admission number
        if (!row.admission_number) {
          console.warn('Skipping row without admission_number:', row)
          continue
        }

        const now = new Date().toISOString()

        // Insert into patients table and get the created record
        const { data: insertedPatient, error: insertError } = await supabase
          .from('patients')
          .insert({
            admission_number: row.admission_number,
            age: parseInt(row.age) || null,
            sex: row.sex,
            chief_complaint: row.chief_complaint,
            patient_illness: row.patient_illness,
            patient_examine: row.patient_examine,
            pre_diagnosis: row.pre_diagnosis,
            treatment_plan: row.treatment_plan,
            created_at: now
          })
          .select('id, admission_number')
          .single()

        if (insertError) {
          console.error('Error inserting patient:', insertError)
          throw new Error(`Failed to insert patient: ${insertError.message}`)
        }

        if (insertedPatient) {
          savedPatients.push({
            id: insertedPatient.id,
            admission_number: insertedPatient.admission_number
          })
          totalInserted++
        }
      }
    }

    // Step 2: Process diagnosis coding AFTER saving patient data
    let diagnosisCodingResult = null
    if (recordsForCoding.length > 0 && allHeaders.length > 0) {
      diagnosisCodingResult = await processDiagnosisCoding(recordsForCoding, allHeaders)
    }

    // Step 3: Create icd_diagnosis rows and code_results matching AN to patient_id
    const icdDiagnosisResults: ICDDiagnosisResult[] = []
    
    if (diagnosisCodingResult?.success && diagnosisCodingResult.results.length > 0) {
      // Group coding results by AN (normalize to string for comparison)
      const codingResultsByAN = new Map<string, BatchCodeResult[]>()
      
      for (const result of diagnosisCodingResult.results) {
        const an = String(result.an || '').trim()
        if (!codingResultsByAN.has(an)) {
          codingResultsByAN.set(an, [])
        }
        codingResultsByAN.get(an)!.push(result)
      }
      
      // Create icd_diagnosis rows for each saved patient
      for (const patient of savedPatients) {
        const an = String(patient.admission_number).trim()
        const codeResults = codingResultsByAN.get(an) || []
        
        if (codeResults.length > 0) {
          const now = new Date().toISOString()
          
          // 3a. Create icd_diagnosis row
          const { data: icdDiagnosis, error: icdInsertError } = await supabase
            .from('icd_diagnosis')
            .insert({
              patient_id: patient.id,
              status: 0, // 0: pending, 1: approved, 2: modified, 3: rejected
              comment: null,
              created_at: now
            })
            .select('id')
            .single()
          
          if (icdInsertError) {
            console.error('Error inserting icd_diagnosis:', icdInsertError)
            icdDiagnosisResults.push({
              patient_id: patient.id,
              an: an,
              diag_id: null,
              codeResultsInserted: 0,
              inserted: false,
              error: icdInsertError.message
            })
            continue
          }
          
          const diagId = icdDiagnosis!.id
          
          // 3b. Create code_results rows for each coding result
          const codeResultsData = codeResults.map(result => ({
            diag_id: diagId,
            code: result.icd_code,
            desc: result.official_description || result.input_diagnosis,
            comment: result.notes || null,
            created_at: now
          }))
          
          const { error: codeResultsError } = await supabase
            .from('code_results')
            .insert(codeResultsData)
          
          if (codeResultsError) {
            console.error('Error inserting code_results:', codeResultsError)
            icdDiagnosisResults.push({
              patient_id: patient.id,
              an: an,
              diag_id: diagId,
              codeResultsInserted: 0,
              inserted: false,
              error: codeResultsError.message
            })
          } else {
            icdDiagnosisResults.push({
              patient_id: patient.id,
              an: an,
              diag_id: diagId,
              codeResultsInserted: codeResultsData.length,
              inserted: true
            })
          }
        } else {
          // No coding results found for this patient
          icdDiagnosisResults.push({
            patient_id: patient.id,
            an: an,
            diag_id: null,
            codeResultsInserted: 0,
            inserted: false,
            error: 'No coding results found for this AN'
          })
        }
      }
    }

    // Get workbook metadata
    const metadata = {
      fileName: file.name,
      fileSize: file.size,
      sheetNames: workbook.SheetNames,
      sheetCount: workbook.SheetNames.length,
      uploadedAt: new Date().toISOString(),
      totalInserted,
      savedPatients,
    }

    return NextResponse.json(
      {
        success: true,
        data: sheets,
        metadata,
        diagnosisCoding: diagnosisCodingResult,
        icdDiagnosis: icdDiagnosisResults,
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
