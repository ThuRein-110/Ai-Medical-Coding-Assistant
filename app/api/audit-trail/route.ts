import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export interface CodeResult {
  id: string;
  code: string;
  desc: string;
}

export interface AuditTrailItem {
  id: string;
  patient_id: string;
  status: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  patient: {
    id: string;
    admission_number: string;
    age: number | null;
    sex: string;
    chief_complaint: string;
    pre_diagnosis: string;
  };
  code_results: CodeResult[];
}

export interface AuditTrailResponse {
  success: boolean;
  data: AuditTrailItem[];
  count: number;
}

export interface AuditTrailError {
  error: string;
}

export interface AuditTrailQuery {
  limit?: number;
  offset?: number;
}

/**
 * GET /api/audit-trail
 * Returns icd_diagnosis records with status other than pending (0),
 * sorted by updated_at (most recent first),
 * including patient info and code_results
 * 
 * Query params:
 *   - limit: Number of records to return (default: 50, max: 100)
 *   - offset: Offset for pagination (default: 0)
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const limitParam = searchParams.get("limit");
    const limit = Math.min(parseInt(limitParam || "50") || 50, 100);
    
    const offsetParam = searchParams.get("offset");
    const offset = parseInt(offsetParam || "0") || 0;

    const supabase = await createClient();

    // Fetch icd_diagnosis with patient data
    // Filter: status != 0 (not pending)
    // Sort: updated_at desc (most recent first)
    const { data, error, count } = await supabase
      .from("icd_diagnosis")
      .select(
        `
        id,
        patient_id,
        status,
        comment,
        created_at,
        updated_at,
        patient:patients!inner(
          id,
          admission_number,
          age,
          sex,
          chief_complaint,
          pre_diagnosis
        )
        `,
        { count: "exact" }
      )
      .not("status", "eq", 0)  // Exclude pending (status = 0)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching audit trail:", error);
      return NextResponse.json(
        { error: "Failed to fetch audit trail" },
        { status: 500 }
      );
    }

    // Fetch code_results for each diagnosis
    const diagnosisIds = (data || []).map((item: any) => item.id);
    
    let codeResultsData: any[] = [];
    if (diagnosisIds.length > 0) {
      const { data: codes, error: codesError } = await supabase
        .from("code_results")
        .select("id, diag_id, code, desc")
        .in("diag_id", diagnosisIds);
      
      if (codesError) {
        console.error("Error fetching code results:", codesError);
      } else {
        codeResultsData = codes || [];
      }
    }

    // Group code_results by diag_id
    const codeResultsByDiagId = new Map<string, CodeResult[]>();
    for (const code of codeResultsData) {
      if (!codeResultsByDiagId.has(code.diag_id)) {
        codeResultsByDiagId.set(code.diag_id, []);
      }
      codeResultsByDiagId.get(code.diag_id)!.push({
        id: code.id,
        code: code.code,
        desc: code.desc,
      });
    }

    // Transform data to match interface
    const transformedData: AuditTrailItem[] = (data || []).map((item: any) => ({
      id: item.id,
      patient_id: item.patient_id,
      status: item.status,
      comment: item.comment,
      created_at: item.created_at,
      updated_at: item.updated_at,
      patient: {
        id: item.patient.id,
        admission_number: item.patient.admission_number,
        age: item.patient.age,
        sex: item.patient.sex,
        chief_complaint: item.patient.chief_complaint,
        pre_diagnosis: item.patient.pre_diagnosis,
      },
      code_results: codeResultsByDiagId.get(item.id) || [],
    }));

    return NextResponse.json(
      {
        success: true,
        data: transformedData,
        count: count || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Audit trail error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    );
  }
}
