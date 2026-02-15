/**
 * Audit Trail types
 */

export interface CodeResult {
  id: string;
  code: string;
  desc: string;
}

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
  code_results: CodeResult[];
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

export type AuditTrailApiResponse = AuditTrailResponse | AuditTrailError;
