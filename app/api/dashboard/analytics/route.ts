import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export interface DashboardAnalytics {
  totalCases: number;
  pendingCount: number;
  approvedCount: number;
  modifiedCount: number;
  rejectedCount: number;
}

export interface DashboardAnalyticsResponse {
  success: boolean;
  data: DashboardAnalytics;
}

export interface DashboardAnalyticsError {
  error: string;
}

/**
 * GET /api/dashboard/analytics
 * Returns dashboard analytics counts for ICD diagnoses
 */
export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    // Get total count of icd_diagnosis
    const { count: totalCases, error: totalError } = await supabase
      .from("icd_diagnosis")
      .select("*", { count: "exact", head: true });

    if (totalError) {
      console.error("Error fetching total cases:", totalError);
      return NextResponse.json(
        { error: "Failed to fetch total cases" },
        { status: 500 }
      );
    }

    // Get count of pending status (0)
    const { count: pendingCount, error: pendingError } = await supabase
      .from("icd_diagnosis")
      .select("*", { count: "exact", head: true })
      .eq("status", 0);

    if (pendingError) {
      console.error("Error fetching pending count:", pendingError);
      return NextResponse.json(
        { error: "Failed to fetch pending count" },
        { status: 500 }
      );
    }

    // Get count of approved status (1)
    const { count: approvedCount, error: approvedError } = await supabase
      .from("icd_diagnosis")
      .select("*", { count: "exact", head: true })
      .eq("status", 1);

    if (approvedError) {
      console.error("Error fetching approved count:", approvedError);
      return NextResponse.json(
        { error: "Failed to fetch approved count" },
        { status: 500 }
      );
    }

    // Get count of modified status (2)
    const { count: modifiedCount, error: modifiedError } = await supabase
      .from("icd_diagnosis")
      .select("*", { count: "exact", head: true })
      .eq("status", 2);

    if (modifiedError) {
      console.error("Error fetching modified count:", modifiedError);
      return NextResponse.json(
        { error: "Failed to fetch modified count" },
        { status: 500 }
      );
    }

    // Get count of rejected status (3)
    const { count: rejectedCount, error: rejectedError } = await supabase
      .from("icd_diagnosis")
      .select("*", { count: "exact", head: true })
      .eq("status", 3);

    if (rejectedError) {
      console.error("Error fetching rejected count:", rejectedError);
      return NextResponse.json(
        { error: "Failed to fetch rejected count" },
        { status: 500 }
      );
    }

    const analytics: DashboardAnalytics = {
      totalCases: totalCases || 0,
      pendingCount: pendingCount || 0,
      approvedCount: approvedCount || 0,
      modifiedCount: modifiedCount || 0,
      rejectedCount: rejectedCount || 0,
    };

    return NextResponse.json(
      {
        success: true,
        data: analytics,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Dashboard analytics error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    );
  }
}
