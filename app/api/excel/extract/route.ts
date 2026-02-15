import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'

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

export const runtime = "nodejs";
export const maxDuration = 60;

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

    // Extract and store data from all sheets
    const sheets: Record<string, MappedRow[]> = {}
    const savedPatients: SavedPatient[] = []
    let totalInserted = 0
    const insertedCases: string[] = []

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName]
      // Convert sheet to JSON with column-value pairs (first row as keys)
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        defval: '', // Default value for empty cells
        raw: false, // Convert all values to strings
      }) as Record<string, any>[]
      
      // Map each row to standardized field names (limit to first 5 rows)
      const mappedData: MappedRow[] = jsonData.slice(0, 5).map(mapRowData)
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
          insertedCases.push(insertedPatient.admission_number)
          totalInserted++

          // Create empty icd_diagnosis row for AI processing later
          await supabase
            .from('icd_diagnosis')
            .insert({
              patient_id: insertedPatient.id,
              status: 0, // pending
              comment: null,
              created_at: now
            })
        }
      }
    }

    // Trigger background AI processing (fire and forget)
    // This won't block the response
    if (savedPatients.length > 0) {
      // Use waitUntil if available (Vercel), otherwise just fire
      const processPromise = processAIInBackground(savedPatients, sheets, supabase);
      // @ts-ignore
      if (typeof waitUntil !== 'undefined') {
        // @ts-ignore
        waitUntil(processPromise);
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
      insertedCases,
      savedPatients,
    }

    return NextResponse.json(
      {
        success: true,
        data: sheets,
        metadata,
        message: `${totalInserted} patients saved. AI processing started in background.`,
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

// Background AI processing function
async function processAIInBackground(
  savedPatients: SavedPatient[],
  sheets: Record<string, MappedRow[]>,
  supabase: any
) {
  try {
    // Dynamically import to avoid loading during main request
    const { processDiagnosisCoding } = await import('@/lib/diagnosis-coding')
    
    // Collect all records for AI processing
    const allRecords: Record<string, any>[] = []
    const allHeaders: string[] = []
    
    for (const sheetName of Object.keys(sheets)) {
      const data = sheets[sheetName]
      if (data.length > 0) {
        // Convert MappedRow back to record format
        const records = data.map(row => ({
          an: row.admission_number,
          age: row.age,
          sex: row.sex,
          chief_complaint: row.chief_complaint,
          patient_illness: row.patient_illness,
          patient_examine: row.patient_examine,
          pre_diagnosis: row.pre_diagnosis,
          treatment_plan: row.treatment_plan,
        }))
        allRecords.push(...records)
        if (allHeaders.length === 0) {
          allHeaders.push(...Object.keys(records[0]))
        }
      }
    }

    if (allRecords.length === 0 || allHeaders.length === 0) {
      console.log('No records to process for AI')
      return
    }

    // Process diagnosis coding with AI
    const diagnosisCodingResult = await processDiagnosisCoding(allRecords, allHeaders)
    
    if (!diagnosisCodingResult.success) {
      console.error('AI processing failed:', diagnosisCodingResult.error)
      return
    }

    // Group coding results by AN
    const codingResultsByAN = new Map<string, any[]>()
    for (const result of diagnosisCodingResult.results) {
      const an = String(result.an || '').trim()
      if (!codingResultsByAN.has(an)) {
        codingResultsByAN.set(an, [])
      }
      codingResultsByAN.get(an)!.push(result)
    }

    // Insert code results for each patient
    for (const patient of savedPatients) {
      const an = String(patient.admission_number).trim()
      const codeResults = codingResultsByAN.get(an) || []
      
      if (codeResults.length > 0) {
        const now = new Date().toISOString()
        
        // Get the icd_diagnosis row for this patient
        const { data: icdDiagnosis } = await supabase
          .from('icd_diagnosis')
          .select('id')
          .eq('patient_id', patient.id)
          .single()
        
        if (icdDiagnosis) {
          // Insert code results
          const codeResultsData = codeResults.map((result: any) => ({
            diag_id: icdDiagnosis.id,
            code: result.icd_code,
            desc: result.official_description || result.input_diagnosis,
            comment: result.notes || null,
            created_at: now
          }))
          
          const { error } = await supabase
            .from('code_results')
            .insert(codeResultsData)
          
          if (error) {
            console.error(`Error inserting code_results for ${an}:`, error)
          } else {
            console.log(`Inserted ${codeResultsData.length} code results for ${an}`)
          }
        }
      }
    }
    
    console.log('Background AI processing completed')
  } catch (error) {
    console.error('Background AI processing error:', error)
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
