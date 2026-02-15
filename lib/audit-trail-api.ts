import type { AuditTrailResponse, AuditTrailQuery } from "@/types/audit-trail";

export const auditTrailApi = {
  /**
   * Get audit trail (icd_diagnosis with status other than pending)
   * Sorted by updated_at (most recent first)
   * 
   * @param params - Query parameters (limit, offset, search, status, date, sortField, sortOrder)
   * @returns Audit trail data with count
   */
  getList: async (params?: AuditTrailQuery): Promise<AuditTrailResponse> => {
    const queryParams = new URLSearchParams();

    if (params?.limit !== undefined) {
      queryParams.append("limit", params.limit.toString());
    }
    if (params?.offset !== undefined) {
      queryParams.append("offset", params.offset.toString());
    }
    if (params?.search) {
      queryParams.append("search", params.search);
    }
    if (params?.status !== undefined) {
      queryParams.append("status", params.status.toString());
    }
    if (params?.date) {
      queryParams.append("date", params.date);
    }
    if (params?.sortField) {
      queryParams.append("sortField", params.sortField);
    }
    if (params?.sortOrder) {
      queryParams.append("sortOrder", params.sortOrder);
    }

    const queryString = queryParams.toString();
    const url = `/api/audit-trail${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.json();
  },
};
