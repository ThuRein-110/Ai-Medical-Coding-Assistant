export type CaseStatus = 'pending' | 'approved' | 'modified' | 'rejected';

export interface ICD10Code {
  code: string;
  description: string;
  reason: string;
  confidence: number;
}

export interface ICD9Procedure {
  code: string;
  description: string;
  reason: string;
  confidence: number;
}

export interface MissingDocAlert {
  id: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
}

export interface EvidenceSnippet {
  id: string;
  source: string;
  text: string;
}

export interface PatientData {
  age: number;
  sex: string;
  chiefComplaint: string;
  presentIllness: string;
  patientExamine: string;
  preDiagnosis: string;
  treatmentPlan: string;
}

export interface AISuggestion {
  icd10Codes: ICD10Code[];
  icd9Procedures: ICD9Procedure[];
  missingDocAlerts: MissingDocAlert[];
  evidenceSnippets: EvidenceSnippet[];
}

export interface CoderReview {
  finalICD10Codes: string[];
  finalICD9Codes: string[];
  comment: string;
  reviewedBy: string;
  reviewedAt: string;
}

export interface Case {
  id: string;
  patientData: PatientData;
  aiSuggestion: AISuggestion;
  coderReview?: CoderReview;
  status: CaseStatus;
  primaryDiagnosis: string;
  overallConfidence: number;
  createdAt: string;
  lastUpdated: string;
}

export interface AuditLogEntry {
  id: string;
  caseId: string;
  aiCodes: string[];
  finalCodes: string[];
  action: 'approved' | 'modified' | 'rejected';
  user: string;
  timestamp: string;
  comment: string;
}

// Mock case data
export const mockCases: Case[] = [
  {
    id: 'CASE-2026-001',
    patientData: {
      age: 45,
      sex: 'Female',
      chiefComplaint: 'Severe chest pain radiating to left arm',
      presentIllness: 'Patient presents with sudden onset chest pain for 2 hours, associated with shortness of breath and diaphoresis. Pain described as pressure-like, 8/10 severity.',
      patientExamine: 'BP: 145/95 mmHg, HR: 98 bpm, RR: 22/min, Temp: 37.2°C. Patient appears anxious and in distress. Cardiac exam reveals regular rhythm, no murmurs. Lungs clear bilaterally.',
      preDiagnosis: 'Acute myocardial infarction (rule out)',
      treatmentPlan: 'ECG performed, cardiac enzymes ordered, aspirin 325mg given, IV access established, continuous cardiac monitoring.',
    },
    aiSuggestion: {
      icd10Codes: [
        {
          code: 'I21.09',
          description: 'ST elevation (STEMI) myocardial infarction involving other coronary artery of anterior wall',
          reason: 'Patient presents with classic MI symptoms: chest pain, radiation, diaphoresis, and ECG changes',
          confidence: 92,
        },
        {
          code: 'I25.10',
          description: 'Atherosclerotic heart disease of native coronary artery without angina pectoris',
          reason: 'Underlying coronary artery disease contributing to acute event',
          confidence: 85,
        },
        {
          code: 'R07.9',
          description: 'Chest pain, unspecified',
          reason: 'Primary presenting symptom documented in chief complaint',
          confidence: 95,
        },
      ],
      icd9Procedures: [
        {
          code: '89.52',
          description: 'Electrocardiogram',
          reason: 'ECG performed as part of cardiac evaluation',
          confidence: 98,
        },
        {
          code: '99.04',
          description: 'Transfusion of packed cells',
          reason: 'May be required based on treatment protocol',
          confidence: 65,
        },
      ],
      missingDocAlerts: [
        {
          id: 'alert-001',
          severity: 'high',
          message: 'Troponin levels not documented - required for MI confirmation',
        },
        {
          id: 'alert-002',
          severity: 'medium',
          message: 'Previous cardiac history not documented',
        },
      ],
      evidenceSnippets: [
        {
          id: 'ev-001',
          source: 'Chief Complaint',
          text: 'Severe chest pain radiating to left arm',
        },
        {
          id: 'ev-002',
          source: 'Present Illness',
          text: 'sudden onset chest pain for 2 hours, associated with shortness of breath and diaphoresis',
        },
      ],
    },
    status: 'pending',
    primaryDiagnosis: 'I21.09 - STEMI myocardial infarction',
    overallConfidence: 92,
    createdAt: '2026-02-14T08:30:00Z',
    lastUpdated: '2026-02-14T08:30:00Z',
  },
  {
    id: 'CASE-2026-002',
    patientData: {
      age: 62,
      sex: 'Male',
      chiefComplaint: 'Difficulty breathing and persistent cough',
      presentIllness: 'Patient reports progressive dyspnea over 3 days with productive cough (yellow sputum), fever (38.5°C), and fatigue. No recent travel or sick contacts.',
      patientExamine: 'BP: 130/80 mmHg, HR: 88 bpm, RR: 24/min, SpO2: 91% on room air. Decreased breath sounds and crackles in right lower lobe. No wheezing.',
      preDiagnosis: 'Community-acquired pneumonia',
      treatmentPlan: 'Chest X-ray ordered, sputum culture obtained, oxygen therapy initiated, empiric antibiotics (ceftriaxone + azithromycin).',
    },
    aiSuggestion: {
      icd10Codes: [
        {
          code: 'J18.9',
          description: 'Pneumonia, unspecified organism',
          reason: 'Clinical presentation consistent with pneumonia: fever, productive cough, crackles on exam',
          confidence: 88,
        },
        {
          code: 'R06.02',
          description: 'Shortness of breath',
          reason: 'Primary complaint with objective finding of tachypnea and low SpO2',
          confidence: 95,
        },
        {
          code: 'R05.9',
          description: 'Cough, unspecified',
          reason: 'Persistent productive cough documented',
          confidence: 90,
        },
      ],
      icd9Procedures: [
        {
          code: '87.44',
          description: 'Routine chest X-ray',
          reason: 'Imaging performed to confirm pneumonia diagnosis',
          confidence: 95,
        },
        {
          code: '93.96',
          description: 'Other oxygen enrichment',
          reason: 'Oxygen therapy initiated for hypoxemia',
          confidence: 90,
        },
      ],
      missingDocAlerts: [
        {
          id: 'alert-003',
          severity: 'medium',
          message: 'X-ray findings not yet documented',
        },
      ],
      evidenceSnippets: [
        {
          id: 'ev-003',
          source: 'Present Illness',
          text: 'progressive dyspnea over 3 days with productive cough (yellow sputum), fever (38.5°C)',
        },
        {
          id: 'ev-004',
          source: 'Physical Exam',
          text: 'Decreased breath sounds and crackles in right lower lobe',
        },
      ],
    },
    status: 'approved',
    primaryDiagnosis: 'J18.9 - Pneumonia, unspecified',
    overallConfidence: 88,
    createdAt: '2026-02-13T14:20:00Z',
    lastUpdated: '2026-02-14T09:15:00Z',
    coderReview: {
      finalICD10Codes: ['J18.9', 'R06.02', 'R05.9'],
      finalICD9Codes: ['87.44', '93.96'],
      comment: 'Codes approved as suggested. Documentation complete.',
      reviewedBy: 'Sarah Johnson',
      reviewedAt: '2026-02-14T09:15:00Z',
    },
  },
  {
    id: 'CASE-2026-003',
    patientData: {
      age: 28,
      sex: 'Female',
      chiefComplaint: 'Severe headache with nausea',
      presentIllness: '24-year-old female with sudden severe headache onset 4 hours ago, 9/10 severity, throbbing quality. Associated with photophobia, phonophobia, and nausea with one episode of vomiting. History of similar episodes monthly.',
      patientExamine: 'BP: 118/75 mmHg, HR: 72 bpm, Temp: 36.8°C. Neurological exam: Alert and oriented, cranial nerves II-XII intact, no focal deficits. Positive photophobia.',
      preDiagnosis: 'Migraine without aura',
      treatmentPlan: 'IV fluids, antiemetics (ondansetron), analgesics (ketorolac), dark quiet room, reassess in 30 minutes.',
    },
    aiSuggestion: {
      icd10Codes: [
        {
          code: 'G43.909',
          description: 'Migraine, unspecified, not intractable, without status migrainosus',
          reason: 'Classic migraine presentation with photophobia, phonophobia, and throbbing headache',
          confidence: 94,
        },
        {
          code: 'R51.9',
          description: 'Headache, unspecified',
          reason: 'Primary presenting symptom',
          confidence: 98,
        },
        {
          code: 'R11.0',
          description: 'Nausea',
          reason: 'Associated symptom with vomiting episode',
          confidence: 92,
        },
      ],
      icd9Procedures: [],
      missingDocAlerts: [],
      evidenceSnippets: [
        {
          id: 'ev-005',
          source: 'Present Illness',
          text: 'sudden severe headache onset, throbbing quality. Associated with photophobia, phonophobia, and nausea',
        },
        {
          id: 'ev-006',
          source: 'History',
          text: 'History of similar episodes monthly',
        },
      ],
    },
    status: 'modified',
    primaryDiagnosis: 'G43.909 - Migraine, unspecified',
    overallConfidence: 94,
    createdAt: '2026-02-12T10:45:00Z',
    lastUpdated: '2026-02-13T16:30:00Z',
    coderReview: {
      finalICD10Codes: ['G43.109', 'R11.2'],
      finalICD9Codes: [],
      comment: 'Changed to G43.109 (migraine with aura) based on additional patient history notes. Changed R11.0 to R11.2 to include vomiting.',
      reviewedBy: 'Sarah Johnson',
      reviewedAt: '2026-02-13T16:30:00Z',
    },
  },
  {
    id: 'CASE-2026-004',
    patientData: {
      age: 55,
      sex: 'Male',
      chiefComplaint: 'Right knee pain and swelling',
      presentIllness: 'Patient reports acute onset right knee pain and swelling after playing basketball yesterday. Unable to bear weight, joint feels warm. No history of previous knee injuries.',
      patientExamine: 'BP: 128/82 mmHg, HR: 78 bpm. Right knee examination: moderate effusion, warmth, tenderness over medial joint line. Positive McMurray test. ROM limited by pain.',
      preDiagnosis: 'Meniscal tear, right knee',
      treatmentPlan: 'X-ray right knee, consider MRI, NSAIDs prescribed, ice and elevation, orthopedic referral.',
    },
    aiSuggestion: {
      icd10Codes: [
        {
          code: 'S83.271A',
          description: 'Complex tear of medial meniscus, current injury, right knee, initial encounter',
          reason: 'Positive McMurray test and mechanism suggest meniscal injury',
          confidence: 78,
        },
        {
          code: 'M25.561',
          description: 'Pain in right knee',
          reason: 'Primary presenting symptom',
          confidence: 98,
        },
        {
          code: 'M25.461',
          description: 'Effusion, right knee',
          reason: 'Moderate effusion documented on physical exam',
          confidence: 95,
        },
      ],
      icd9Procedures: [
        {
          code: '87.16',
          description: 'Other X-ray of knee',
          reason: 'Diagnostic imaging performed',
          confidence: 92,
        },
      ],
      missingDocAlerts: [
        {
          id: 'alert-004',
          severity: 'high',
          message: 'MRI results pending - required to confirm meniscal tear diagnosis',
        },
        {
          id: 'alert-005',
          severity: 'low',
          message: 'Consider documenting range of motion measurements',
        },
      ],
      evidenceSnippets: [
        {
          id: 'ev-007',
          source: 'Present Illness',
          text: 'acute onset right knee pain and swelling after playing basketball',
        },
        {
          id: 'ev-008',
          source: 'Physical Exam',
          text: 'moderate effusion, warmth, tenderness over medial joint line. Positive McMurray test',
        },
      ],
    },
    status: 'pending',
    primaryDiagnosis: 'S83.271A - Meniscal tear, right knee',
    overallConfidence: 78,
    createdAt: '2026-02-14T11:00:00Z',
    lastUpdated: '2026-02-14T11:00:00Z',
  },
  {
    id: 'CASE-2026-005',
    patientData: {
      age: 72,
      sex: 'Female',
      chiefComplaint: 'Fall with hip pain',
      presentIllness: 'Elderly female fell at home while walking to bathroom. Immediate onset of severe right hip pain, unable to stand or bear weight. No loss of consciousness.',
      patientExamine: 'BP: 140/88 mmHg, HR: 92 bpm. Right lower extremity: externally rotated and shortened. Severe pain with any movement. No neurovascular compromise distally.',
      preDiagnosis: 'Right hip fracture',
      treatmentPlan: 'X-ray pelvis and right hip, pain management (morphine), orthopedic consult for probable ORIF, NPO for surgery.',
    },
    aiSuggestion: {
      icd10Codes: [
        {
          code: 'S72.001A',
          description: 'Fracture of unspecified part of neck of right femur, initial encounter for closed fracture',
          reason: 'Classic presentation: elderly fall with shortened and externally rotated leg',
          confidence: 96,
        },
        {
          code: 'W19.XXXA',
          description: 'Unspecified fall, initial encounter',
          reason: 'External cause code for fall',
          confidence: 90,
        },
        {
          code: 'M25.551',
          description: 'Pain in right hip',
          reason: 'Primary symptom following trauma',
          confidence: 98,
        },
      ],
      icd9Procedures: [
        {
          code: '88.26',
          description: 'X-ray of pelvis and hip',
          reason: 'Diagnostic imaging to confirm fracture',
          confidence: 98,
        },
        {
          code: '79.15',
          description: 'Closed reduction of fracture without internal fixation, femur',
          reason: 'Anticipated procedure based on diagnosis',
          confidence: 70,
        },
      ],
      missingDocAlerts: [
        {
          id: 'alert-006',
          severity: 'high',
          message: 'X-ray confirmation required for fracture type and location',
        },
        {
          id: 'alert-007',
          severity: 'medium',
          message: 'Fall risk assessment and home safety evaluation needed',
        },
      ],
      evidenceSnippets: [
        {
          id: 'ev-009',
          source: 'Chief Complaint',
          text: 'Fall with hip pain',
        },
        {
          id: 'ev-010',
          source: 'Physical Exam',
          text: 'Right lower extremity: externally rotated and shortened. Severe pain with any movement',
        },
      ],
    },
    status: 'pending',
    primaryDiagnosis: 'S72.001A - Femoral neck fracture',
    overallConfidence: 96,
    createdAt: '2026-02-14T13:30:00Z',
    lastUpdated: '2026-02-14T13:30:00Z',
  },
];

// Mock audit log data
export const mockAuditLogs: AuditLogEntry[] = [
  {
    id: 'audit-001',
    caseId: 'CASE-2026-002',
    aiCodes: ['J18.9', 'R06.02', 'R05.9', '87.44', '93.96'],
    finalCodes: ['J18.9', 'R06.02', 'R05.9', '87.44', '93.96'],
    action: 'approved',
    user: 'Sarah Johnson',
    timestamp: '2026-02-14T09:15:00Z',
    comment: 'Codes approved as suggested. Documentation complete.',
  },
  {
    id: 'audit-002',
    caseId: 'CASE-2026-003',
    aiCodes: ['G43.909', 'R51.9', 'R11.0'],
    finalCodes: ['G43.109', 'R11.2'],
    action: 'modified',
    user: 'Sarah Johnson',
    timestamp: '2026-02-13T16:30:00Z',
    comment: 'Changed to G43.109 (migraine with aura) based on additional patient history notes. Changed R11.0 to R11.2 to include vomiting.',
  },
];

// Statistics helper
export function getCaseStatistics(cases: Case[]) {
  return {
    total: cases.length,
    pending: cases.filter((c) => c.status === 'pending').length,
    approved: cases.filter((c) => c.status === 'approved').length,
    modified: cases.filter((c) => c.status === 'modified').length,
    rejected: cases.filter((c) => c.status === 'rejected').length,
  };
}
