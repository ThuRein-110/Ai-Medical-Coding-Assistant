import type {
  ICDDiagnosisListResponse,
  ICDDiagnosisDetailResponse,
  ICDDiagnosisListQuery,
  UpdateICDDiagnosisResponse,
  UpdateICDDiagnosisRequest,
} from "@/types/icd-diagnosis";

export const icdDiagnosisApi = {
  /**
   * Get list of ICD diagnoses with patient info
   * @param params - Query parameters (status, limit, offset)
   * @returns List of ICD diagnoses with related patient data
   */
  getList: async (params?: ICDDiagnosisListQuery): Promise<ICDDiagnosisListResponse> => {
    const queryParams = new URLSearchParams();

    if (params?.status !== undefined) {
      queryParams.append("status", params.status.toString());
    }
    if (params?.limit !== undefined) {
      queryParams.append("limit", params.limit.toString());
    }
    if (params?.offset !== undefined) {
      queryParams.append("offset", params.offset.toString());
    }

    const queryString = queryParams.toString();
    const url = `/api/icd-diagnosis${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.json();
  },

  /**
   * Get a single ICD diagnosis by ID with patient data and code results
   * @param id - ICD Diagnosis ID
   * @returns ICD diagnosis detail with patient and code results
   */
  getById: async (id: string): Promise<ICDDiagnosisDetailResponse> => {
    const response = await fetch(`/api/icd-diagnosis/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.json();
  },

  /**
   * Update ICD diagnosis status and/or comment
   * @param id - ICD Diagnosis ID
   * @param data - Fields to update (status and/or comment)
   * @returns Updated ICD diagnosis
   */
  update: async (
    id: string,
    data: UpdateICDDiagnosisRequest
  ): Promise<UpdateICDDiagnosisResponse> => {
    const response = await fetch(`/api/icd-diagnosis/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return response.json();
  },

  /**
   * Update only the status of an ICD diagnosis
   */
  updateStatus: async (id: string, status: number): Promise<UpdateICDDiagnosisResponse> => {
    return icdDiagnosisApi.update(id, { status });
  },

  /**
   * Update only the comment of an ICD diagnosis
   */
  updateComment: async (id: string, comment: string): Promise<UpdateICDDiagnosisResponse> => {
    return icdDiagnosisApi.update(id, { comment });
  },

  /**
   * Approve an ICD diagnosis
   */
  approve: async (id: string): Promise<UpdateICDDiagnosisResponse> => {
    return icdDiagnosisApi.updateStatus(id, 1); // 1 = approved
  },

  /**
   * Mark an ICD diagnosis as modified
   */
  markModified: async (id: string): Promise<UpdateICDDiagnosisResponse> => {
    return icdDiagnosisApi.updateStatus(id, 2); // 2 = modified
  },

  /**
   * Reject an ICD diagnosis
   */
  reject: async (id: string): Promise<UpdateICDDiagnosisResponse> => {
    return icdDiagnosisApi.updateStatus(id, 3); // 3 = rejected
  },

  /**
   * Get pending ICD diagnoses
   * @param limit - Number of records (default: 20)
   * @param offset - Offset for pagination (default: 0)
   */
  getPending: async (limit?: number, offset?: number): Promise<ICDDiagnosisListResponse> => {
    return icdDiagnosisApi.getList({ status: 0, limit, offset });
  },

  /**
   * Get approved ICD diagnoses
   * @param limit - Number of records (default: 20)
   * @param offset - Offset for pagination (default: 0)
   */
  getApproved: async (limit?: number, offset?: number): Promise<ICDDiagnosisListResponse> => {
    return icdDiagnosisApi.getList({ status: 1, limit, offset });
  },

  /**
   * Get modified ICD diagnoses
   * @param limit - Number of records (default: 20)
   * @param offset - Offset for pagination (default: 0)
   */
  getModified: async (limit?: number, offset?: number): Promise<ICDDiagnosisListResponse> => {
    return icdDiagnosisApi.getList({ status: 2, limit, offset });
  },

  /**
   * Get rejected ICD diagnoses
   * @param limit - Number of records (default: 20)
   * @param offset - Offset for pagination (default: 0)
   */
  getRejected: async (limit?: number, offset?: number): Promise<ICDDiagnosisListResponse> => {
    return icdDiagnosisApi.getList({ status: 3, limit, offset });
  },
};
