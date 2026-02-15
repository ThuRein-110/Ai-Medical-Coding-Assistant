import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export interface RecentActivity {
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
  };
}

export interface RecentActivitiesResponse {
  success: boolean;
  data: RecentActivity[];
  count: number;
}

export interface RecentActivitiesError {
  error: string;
}

/**
 * GET /api/activities/recent
 * Returns recent activities (all statuses except pending, sorted by updated_at latest first)
 */
export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    // Get recent activities: all except pending (status != 0), sorted by updated_at desc
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
        patient:patient_id (
          id,
          admission_number,
          age,
          sex,
          chief_complaint
        )
      `,
        { count: "exact" }
      )
      .neq("status", 0)
      .order("updated_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching recent activities:", error);
      return NextResponse.json(
        { error: "Failed to fetch recent activities" },
        { status: 500 }
      );
    }

    // Transform the data to match the interface
    const activities: RecentActivity[] =
      data?.map((item: any) => ({
        id: item.id,
        patient_id: item.patient_id,
        status: item.status,
        comment: item.comment,
        created_at: item.created_at,
        updated_at: item.updated_at,
        patient: item.patient
          ? {
              id: item.patient.id,
              admission_number: item.patient.admission_number,
              age: item.patient.age,
              sex: item.patient.sex,
              chief_complaint: item.patient.chief_complaint,
            }
          : null,
      })) || [];

    return NextResponse.json(
      {
        success: true,
        data: activities,
        count: count || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Recent activities error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    );
  }
}
