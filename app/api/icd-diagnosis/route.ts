import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export interface ICDDiagnosisWithPatient {
  id: string;
  patient_id: string;
  status: number;
  comment: string | null;
  created_at: string;
  patient: {
    id: string;
    admission_number: string;
    age: number | null;
    sex: string;
    chief_complaint: string;
    patient_illness: string;
    patient_examine: string;
    pre_diagnosis: string;
    treatment_plan: string;
  };
}

export interface ICDDiagnosisListResponse {
  success: boolean;
  data: ICDDiagnosisWithPatient[];
  count: number;
}

export interface ICDDiagnosisListError {
  error: string;
}

export interface ICDDiagnosisListQuery {
  status?: number;
  limit?: number;
  offset?: number;
}

/**
 * GET /api/icd-diagnosis
 * Returns list of icd_diagnosis with related patient info
 * Query params:
 *   - status: Filter by status (0=pending, 1=approved, 2=modified, 3=rejected)
 *   - limit: Number of records to return (default: 20, max: 100)
 *   - offset: Offset for pagination (default: 0)
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const statusParam = searchParams.get("status");
    const status = statusParam !== null ? parseInt(statusParam) : undefined;
    
    const limitParam = searchParams.get("limit");
    const limit = Math.min(parseInt(limitParam || "20") || 20, 100);
    
    const offsetParam = searchParams.get("offset");
    const offset = parseInt(offsetParam || "0") || 0;

    const supabase = await createClient();

    // Build query with patient join
    let query = supabase
      .from("icd_diagnosis")
      .select(
        `
        id,
        patient_id,
        status,
        comment,
        created_at,
        patient:patients!inner(
          id,
          admission_number,
          age,
          sex,
          chief_complaint,
          patient_illness,
          patient_examine,
          pre_diagnosis,
          treatment_plan
        )
        `,
        { count: "exact" }
      );

    // Apply status filter if provided
    if (status !== undefined && !isNaN(status)) {
      query = query.eq("status", status);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1).order("created_at", { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching icd_diagnosis:", error);
      return NextResponse.json(
        { error: "Failed to fetch icd_diagnosis" },
        { status: 500 }
      );
    }

    // Transform data to match interface
    const transformedData: ICDDiagnosisWithPatient[] = (data || []).map((item: any) => ({
      id: item.id,
      patient_id: item.patient_id,
      status: item.status,
      comment: item.comment,
      created_at: item.created_at,
      patient: {
        id: item.patient.id,
        admission_number: item.patient.admission_number,
        age: item.patient.age,
        sex: item.patient.sex,
        chief_complaint: item.patient.chief_complaint,
        patient_illness: item.patient.patient_illness,
        patient_examine: item.patient.patient_examine,
        pre_diagnosis: item.patient.pre_diagnosis,
        treatment_plan: item.patient.treatment_plan,
      },
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
    console.error("ICD Diagnosis list error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    );
  }
}
