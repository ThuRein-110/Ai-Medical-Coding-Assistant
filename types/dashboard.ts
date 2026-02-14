/**
 * Dashboard analytics types
 */

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

export type DashboardAnalyticsApiResponse =
  | DashboardAnalyticsResponse
  | DashboardAnalyticsError;
