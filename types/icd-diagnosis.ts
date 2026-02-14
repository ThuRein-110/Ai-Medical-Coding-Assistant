/**
 * ICD Diagnosis types
 */

export interface CodeResult {
  id: string;
  diag_id: string;
  code: string;
  desc: string;
  comment: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ICDDiagnosisWithPatient {
  id: string;
  patient_id: string;
  status: number;
  comment: string | null;
  created_at: string;
  updated_at?: string;
  patient: {
    id: string;
    admission_number: string;
    age: number | null;
    sex: string;
    chief_complaint: string;
    patient_illness: string;
    patient_examine: string;
    pre_diagnosis: string;
    treatment_plan: string;
  };
}

export interface ICDDiagnosisDetail {
  id: string;
  patient_id: string;
  status: number;
  comment: string | null;
  created_at: string;
  updated_at?: string;
  patient: {
    id: string;
    admission_number: string;
    age: number | null;
    sex: string;
    chief_complaint: string;
    patient_illness: string;
    patient_examine: string;
    pre_diagnosis: string;
    treatment_plan: string;
    created_at: string;
  };
  code_results: CodeResult[];
}

export interface ICDDiagnosisListResponse {
  success: boolean;
  data: ICDDiagnosisWithPatient[];
  count: number;
}

export interface ICDDiagnosisDetailResponse {
  success: boolean;
  data: ICDDiagnosisDetail;
}

export interface ICDDiagnosisListError {
  error: string;
}

export interface ICDDiagnosisDetailError {
  error: string;
}

export interface ICDDiagnosisListQuery {
  status?: number;
  limit?: number;
  offset?: number;
}

export type ICDDiagnosisApiResponse = ICDDiagnosisListResponse | ICDDiagnosisListError;
export type ICDDiagnosisDetailApiResponse = ICDDiagnosisDetailResponse | ICDDiagnosisDetailError;

// Update ICD diagnosis types
export interface UpdateICDDiagnosisRequest {
  status?: number;
  comment?: string;
}

export interface UpdateICDDiagnosisResponse {
  success: boolean;
  data: {
    id: string;
    status: number;
    comment: string | null;
    updated_at: string;
  };
}

// Update code result types
export interface UpdateCodeResultRequest {
  code?: string;
  desc?: string;
}

export interface UpdateCodeResultResponse {
  success: boolean;
  data: {
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
  };
}

// Status labels for display
export const STATUS_LABELS: Record<number, string> = {
  0: "Pending",
  1: "Approved",
  2: "Modified",
  3: "Rejected",
};

// Status colors for UI
export const STATUS_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  0: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  1: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  2: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  3: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};
