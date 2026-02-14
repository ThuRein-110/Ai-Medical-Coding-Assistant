import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export interface UpdateCodeResultRequest {
  code?: string;
  desc?: string;
}

export interface UpdateCodeResultData {
  codeResult: {
    id: string;
    diag_id: string;
    code: string;
    desc: string;
    comment: string | null;
    updated_at: string;
  };
  icdDiagnosis: {
    id: string;
    status: number;
    updated_at: string;
  };
}

/**
 * PATCH /api/icd-diagnosis/[id]/code-results/[codeId]
 * Updates a code_result (code and/or desc) and marks the parent icd_diagnosis as modified
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; codeId: string }> }
): Promise<NextResponse> {
  try {
    const { id: diagId, codeId } = await params;

    if (!diagId || !codeId) {
      return NextResponse.json(
        { error: "ICD Diagnosis ID and Code Result ID are required" },
        { status: 400 }
      );
    }

    // Parse request body
    const body: UpdateCodeResultRequest = await request.json();

    if (!body.code && !body.desc) {
      return NextResponse.json(
        { error: "At least one field (code or desc) must be provided" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const now = new Date().toISOString();

    // Build update data for code_result
    const updateData: Record<string, any> = {
      updated_at: now,
    };
    if (body.code !== undefined) {
      updateData.code = body.code;
    }
    if (body.desc !== undefined) {
      updateData.desc = body.desc;
    }

    // Update code_result
    const { data: updatedCodeResult, error: codeResultError } = await supabase
      .from("code_results")
      .update(updateData)
      .eq("id", codeId)
      .eq("diag_id", diagId)
      .select("id, diag_id, code, desc, comment, updated_at")
      .single();

    if (codeResultError) {
      console.error("Error updating code_result:", codeResultError);
      if (codeResultError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Code result not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Failed to update code result" },
        { status: 500 }
      );
    }

    // Update parent icd_diagnosis status to modified (2) and update timestamp
    const { data: updatedIcdDiagnosis, error: icdError } = await supabase
      .from("icd_diagnosis")
      .update({
        status: 2, // 2 = modified
        updated_at: now,
      })
      .eq("id", diagId)
      .select("id, status, updated_at")
      .single();

    if (icdError) {
      console.error("Error updating icd_diagnosis:", icdError);
      // Code result was updated but icd_diagnosis update failed
      return NextResponse.json(
        { error: "Code result updated but failed to update diagnosis status" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          codeResult: updatedCodeResult,
          icdDiagnosis: updatedIcdDiagnosis,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update code result error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    );
  }
}
