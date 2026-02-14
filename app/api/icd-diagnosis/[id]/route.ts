import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export interface CodeResult {
  id: string;
  diag_id: string;
  code: string;
  desc: string;
  comment: string | null;
  created_at: string;
}

export interface ICDDiagnosisDetail {
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
    created_at: string;
  };
  code_results: CodeResult[];
}

export interface ICDDiagnosisDetailResponse {
  success: boolean;
  data: ICDDiagnosisDetail;
}

export interface ICDDiagnosisDetailError {
  error: string;
}

/**
 * GET /api/icd-diagnosis/[id]
 * Returns a single ICD diagnosis with related patient data and code results
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ICD Diagnosis ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch ICD diagnosis with patient data
    const { data: diagnosis, error: diagnosisError } = await supabase
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
          treatment_plan,
          created_at
        )
        `
      )
      .eq("id", id)
      .single();

    if (diagnosisError) {
      console.error("Error fetching ICD diagnosis:", diagnosisError);
      if (diagnosisError.code === "PGRST116") {
        return NextResponse.json(
          { error: "ICD Diagnosis not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch ICD diagnosis" },
        { status: 500 }
      );
    }

    if (!diagnosis) {
      return NextResponse.json(
        { error: "ICD Diagnosis not found" },
        { status: 404 }
      );
    }

    // Fetch related code results
    const { data: codeResults, error: codeResultsError } = await supabase
      .from("code_results")
      .select("id, diag_id, code, desc, comment, created_at")
      .eq("diag_id", id)
      .order("created_at", { ascending: true });

    if (codeResultsError) {
      console.error("Error fetching code results:", codeResultsError);
      return NextResponse.json(
        { error: "Failed to fetch code results" },
        { status: 500 }
      );
    }

    // Transform and combine data
    const result: ICDDiagnosisDetail = {
      id: diagnosis.id,
      patient_id: diagnosis.patient_id,
      status: diagnosis.status,
      comment: diagnosis.comment,
      created_at: diagnosis.created_at,
      patient: {
        id: diagnosis.patient.id,
        admission_number: diagnosis.patient.admission_number,
        age: diagnosis.patient.age,
        sex: diagnosis.patient.sex,
        chief_complaint: diagnosis.patient.chief_complaint,
        patient_illness: diagnosis.patient.patient_illness,
        patient_examine: diagnosis.patient.patient_examine,
        pre_diagnosis: diagnosis.patient.pre_diagnosis,
        treatment_plan: diagnosis.patient.treatment_plan,
        created_at: diagnosis.patient.created_at,
      },
      code_results: codeResults || [],
    };

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("ICD Diagnosis detail error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    );
  }
}
