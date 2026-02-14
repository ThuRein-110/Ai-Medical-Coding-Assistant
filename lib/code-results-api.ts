import type { UpdateCodeResultResponse, UpdateCodeResultRequest } from "@/types/icd-diagnosis";

export const codeResultsApi = {
  /**
   * Update a code result (code and/or description)
   * Automatically updates the parent icd_diagnosis status to "modified"
   * 
   * @param diagId - ICD Diagnosis ID
   * @param codeId - Code Result ID
   * @param data - Fields to update (code and/or desc)
   * @returns Updated code result and parent icd_diagnosis
   */
  update: async (
    diagId: string,
    codeId: string,
    data: UpdateCodeResultRequest
  ): Promise<UpdateCodeResultResponse> => {
    const response = await fetch(`/api/icd-diagnosis/${diagId}/code-results/${codeId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return response.json();
  },

  /**
   * Update only the code of a code result
   */
  updateCode: async (
    diagId: string,
    codeId: string,
    code: string
  ): Promise<UpdateCodeResultResponse> => {
    return codeResultsApi.update(diagId, codeId, { code });
  },

  /**
   * Update only the description of a code result
   */
  updateDesc: async (
    diagId: string,
    codeId: string,
    desc: string
  ): Promise<UpdateCodeResultResponse> => {
    return codeResultsApi.update(diagId, codeId, { desc });
  },
};
