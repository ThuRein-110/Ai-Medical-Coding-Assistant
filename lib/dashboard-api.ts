import type { DashboardAnalyticsResponse } from "@/types/dashboard";
import type { RecentActivitiesResponse } from "@/app/api/activities/recent/route";

export const dashboardApi = {
  /**
   * Get dashboard analytics counts
   * @returns Analytics data with total cases and status counts
   */
  getAnalytics: async (): Promise<DashboardAnalyticsResponse> => {
    const response = await fetch("/api/dashboard/analytics", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.json();
  },

  /**
   * Get recent activities (all statuses except pending, sorted by updated_at latest first)
   * @returns Recent activities data
   */
  getRecentActivities: async (): Promise<RecentActivitiesResponse> => {
    const response = await fetch("/api/activities/recent", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.json();
  },
};
