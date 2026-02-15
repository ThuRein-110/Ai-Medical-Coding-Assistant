-- Migration: Create ai_settings table for storing AI configuration
-- Date: 2026-02-15

-- Create ai_settings table
CREATE TABLE IF NOT EXISTS ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Model Parameters
  temperature DECIMAL(3,2) NOT NULL DEFAULT 0.30,
  top_p DECIMAL(3,2) NOT NULL DEFAULT 0.85,
  max_tokens INTEGER NOT NULL DEFAULT 4096,
  
  -- Confidence & Filtering
  confidence_threshold DECIMAL(3,2) NOT NULL DEFAULT 0.70,
  
  -- Batch Processing
  chunk_size INTEGER NOT NULL DEFAULT 10,
  
  -- Code Lookup
  max_alternatives INTEGER NOT NULL DEFAULT 5,
  max_icd_context_codes INTEGER NOT NULL DEFAULT 15,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one settings record per user
  CONSTRAINT unique_user_settings UNIQUE (user_id)
);

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_ai_settings_user_id ON ai_settings(user_id);

-- Add check constraints for valid ranges
ALTER TABLE ai_settings
  ADD CONSTRAINT check_temperature CHECK (temperature >= 0 AND temperature <= 1),
  ADD CONSTRAINT check_top_p CHECK (top_p >= 0.1 AND top_p <= 1),
  ADD CONSTRAINT check_max_tokens CHECK (max_tokens >= 512 AND max_tokens <= 8192),
  ADD CONSTRAINT check_confidence_threshold CHECK (confidence_threshold >= 0 AND confidence_threshold <= 1),
  ADD CONSTRAINT check_chunk_size CHECK (chunk_size >= 5 AND chunk_size <= 20),
  ADD CONSTRAINT check_max_alternatives CHECK (max_alternatives >= 1 AND max_alternatives <= 10),
  ADD CONSTRAINT check_max_icd_context_codes CHECK (max_icd_context_codes >= 5 AND max_icd_context_codes <= 50);

-- Enable Row Level Security
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view only their own settings
CREATE POLICY "Users can view own settings" ON ai_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own settings
CREATE POLICY "Users can insert own settings" ON ai_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update only their own settings
CREATE POLICY "Users can update own settings" ON ai_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete only their own settings
CREATE POLICY "Users can delete own settings" ON ai_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
CREATE TRIGGER trigger_ai_settings_updated_at
  BEFORE UPDATE ON ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_settings_updated_at();

-- Comment on table and columns for documentation
COMMENT ON TABLE ai_settings IS 'Stores AI configuration settings per user for the medical coding assistant';
COMMENT ON COLUMN ai_settings.temperature IS 'Controls AI creativity/randomness (0.0-1.0, lower = more deterministic)';
COMMENT ON COLUMN ai_settings.top_p IS 'Nucleus sampling threshold (0.1-1.0)';
COMMENT ON COLUMN ai_settings.max_tokens IS 'Maximum tokens to generate (512-8192)';
COMMENT ON COLUMN ai_settings.confidence_threshold IS 'Minimum confidence to accept results (0.0-1.0)';
COMMENT ON COLUMN ai_settings.chunk_size IS 'Number of diagnoses per API call (5-20)';
COMMENT ON COLUMN ai_settings.max_alternatives IS 'Maximum alternative ICD codes to return (1-10)';
COMMENT ON COLUMN ai_settings.max_icd_context_codes IS 'ICD codes to include in context (5-50)';
