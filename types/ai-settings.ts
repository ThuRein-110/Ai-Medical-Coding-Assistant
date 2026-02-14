export interface AISettings {
  // Model Parameters
  temperature: number;        // 0.0 - 1.0, controls randomness (lower = more deterministic)
  topP: number;              // 0.0 - 1.0, nucleus sampling threshold
  maxTokens: number;         // Maximum tokens to generate (512 - 8192)
  
  // Confidence & Filtering
  confidenceThreshold: number; // 0.0 - 1.0, minimum confidence to accept results
  
  // Batch Processing
  chunkSize: number;         // Number of diagnoses to process per API call (5-20)
  
  // Code Lookup
  maxAlternatives: number;   // Maximum alternative codes to return (1-10)
  maxICDContextCodes: number; // Maximum ICD codes to include in context (5-50)
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  temperature: 0.3,
  topP: 0.85,
  maxTokens: 4096,
  confidenceThreshold: 0.7,
  chunkSize: 10,
  maxAlternatives: 5,
  maxICDContextCodes: 15,
};

export interface AISettingConfig {
  key: keyof AISettings;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

export const AI_SETTINGS_CONFIG: AISettingConfig[] = [
  {
    key: 'temperature',
    label: 'Temperature',
    description: 'Controls AI creativity. Lower values make responses more deterministic and focused. Higher values increase variety.',
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    key: 'topP',
    label: 'Top P (Nucleus Sampling)',
    description: 'Controls diversity via nucleus sampling. Lower values make output more focused on likely tokens.',
    min: 0.1,
    max: 1,
    step: 0.05,
  },
  {
    key: 'maxTokens',
    label: 'Max Tokens',
    description: 'Maximum number of tokens the AI can generate in a response.',
    min: 512,
    max: 8192,
    step: 256,
    unit: 'tokens',
  },
  {
    key: 'confidenceThreshold',
    label: 'Confidence Threshold',
    description: 'Minimum confidence score required to accept an AI-generated code. Results below this are flagged for review.',
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    key: 'chunkSize',
    label: 'Batch Size',
    description: 'Number of diagnoses to process per API call. Smaller batches are more reliable but slower.',
    min: 5,
    max: 20,
    step: 1,
    unit: 'items',
  },
  {
    key: 'maxAlternatives',
    label: 'Max Alternative Codes',
    description: 'Maximum number of alternative ICD codes to suggest for each diagnosis.',
    min: 1,
    max: 10,
    step: 1,
    unit: 'codes',
  },
  {
    key: 'maxICDContextCodes',
    label: 'ICD Context Size',
    description: 'Number of ICD codes from the database to include as context for the AI. More context improves accuracy but increases processing time.',
    min: 5,
    max: 50,
    step: 5,
    unit: 'codes',
  },
];
