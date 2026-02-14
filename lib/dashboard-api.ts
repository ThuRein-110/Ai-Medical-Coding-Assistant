import type { DashboardAnalyticsResponse } from "@/types/dashboard";

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
};
