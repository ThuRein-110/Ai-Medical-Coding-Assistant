import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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
 * including patient info
 * 
 * Query params:
 *   - limit: Number of records to return (default: 50, max: 100)
 *   - offset: Offset for pagination (default: 0)
 *   - search: Search term for admission number
 *   - status: Filter by status (1=approved, 2=modified, 3=rejected)
 *   - date: Filter by date (YYYY-MM-DD)
 *   - sortField: Field to sort by (admission_number, status, updated_at)
 *   - sortOrder: Sort order (asc, desc)
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const limitParam = searchParams.get("limit");
    const limit = Math.min(parseInt(limitParam || "50") || 50, 100);
    
    const offsetParam = searchParams.get("offset");
    const offset = parseInt(offsetParam || "0") || 0;

    const search = searchParams.get("search") || "";
    const statusParam = searchParams.get("status");
    const status = statusParam ? parseInt(statusParam) : undefined;
    const date = searchParams.get("date") || "";
    const sortField = searchParams.get("sortField") || "updated_at";
    const sortOrder = searchParams.get("sortOrder") || "desc";

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
      .not("status", "eq", 0);  // Exclude pending (status = 0)

    // Apply status filter if provided
    if (status !== undefined && !isNaN(status)) {
      query = query.eq("status", status);
    }

    // Apply search filter on admission_number
    if (search) {
      query = query.ilike("patient.admission_number", `%${search}%`);
    }

    // Apply date filter
    if (date) {
      const startOfDay = `${date}T00:00:00.000Z`;
      const endOfDay = `${date}T23:59:59.999Z`;
      query = query.gte("updated_at", startOfDay).lte("updated_at", endOfDay);
    }

    // Apply sorting
    const ascending = sortOrder === "asc";
    if (sortField === "admission_number") {
      query = query.order("patient(admission_number)", { ascending });
    } else if (sortField === "status") {
      query = query.order("status", { ascending });
    } else {
      query = query.order("updated_at", { ascending });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching audit trail:", error);
      return NextResponse.json(
        { error: "Failed to fetch audit trail" },
        { status: 500 }
      );
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
