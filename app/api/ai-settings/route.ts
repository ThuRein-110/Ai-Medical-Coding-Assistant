import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AISettings, DEFAULT_AI_SETTINGS } from '@/types/ai-settings';

export const runtime = 'nodejs';

// Database row type
interface AISettingsRow {
  id: string;
  user_id: string;
  temperature: number;
  top_p: number;
  max_tokens: number;
  confidence_threshold: number;
  chunk_size: number;
  max_alternatives: number;
  max_icd_context_codes: number;
  created_at: string;
  updated_at: string;
}

// Helper to convert DB row to AISettings type
function rowToSettings(row: AISettingsRow): AISettings {
  return {
    temperature: Number(row.temperature),
    topP: Number(row.top_p),
    maxTokens: row.max_tokens,
    confidenceThreshold: Number(row.confidence_threshold),
    chunkSize: row.chunk_size,
    maxAlternatives: row.max_alternatives,
    maxICDContextCodes: row.max_icd_context_codes,
  };
}

// Helper to convert AISettings to DB columns
function settingsToRow(settings: Partial<AISettings>) {
  const row: Record<string, unknown> = {};
  if (settings.temperature !== undefined) row.temperature = settings.temperature;
  if (settings.topP !== undefined) row.top_p = settings.topP;
  if (settings.maxTokens !== undefined) row.max_tokens = settings.maxTokens;
  if (settings.confidenceThreshold !== undefined) row.confidence_threshold = settings.confidenceThreshold;
  if (settings.chunkSize !== undefined) row.chunk_size = settings.chunkSize;
  if (settings.maxAlternatives !== undefined) row.max_alternatives = settings.maxAlternatives;
  if (settings.maxICDContextCodes !== undefined) row.max_icd_context_codes = settings.maxICDContextCodes;
  return row;
}

// Helper to validate and clamp settings values
function validateSettings(settings: Partial<AISettings>): AISettings {
  const validated: AISettings = { ...DEFAULT_AI_SETTINGS };

  if (typeof settings.temperature === 'number') {
    validated.temperature = Math.max(0, Math.min(1, settings.temperature));
  }
  if (typeof settings.topP === 'number') {
    validated.topP = Math.max(0.1, Math.min(1, settings.topP));
  }
  if (typeof settings.maxTokens === 'number') {
    validated.maxTokens = Math.max(512, Math.min(8192, settings.maxTokens));
  }
  if (typeof settings.confidenceThreshold === 'number') {
    validated.confidenceThreshold = Math.max(0, Math.min(1, settings.confidenceThreshold));
  }
  if (typeof settings.chunkSize === 'number') {
    validated.chunkSize = Math.max(5, Math.min(20, settings.chunkSize));
  }
  if (typeof settings.maxAlternatives === 'number') {
    validated.maxAlternatives = Math.max(1, Math.min(10, settings.maxAlternatives));
  }
  if (typeof settings.maxICDContextCodes === 'number') {
    validated.maxICDContextCodes = Math.max(5, Math.min(50, settings.maxICDContextCodes));
  }

  return validated;
}

/**
 * GET /api/ai-settings
 * Get current user's AI settings from database, or return defaults if not set
 */
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      // Return defaults for unauthenticated users
      return NextResponse.json({
        success: true,
        settings: DEFAULT_AI_SETTINGS,
        isDefault: true,
      });
    }

    // Fetch user's settings from database
    const { data, error } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // If no settings found, return defaults
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: true,
          settings: DEFAULT_AI_SETTINGS,
          isDefault: true,
        });
      }
      console.error('Error fetching AI settings:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch AI settings',
        settings: DEFAULT_AI_SETTINGS,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      settings: rowToSettings(data as AISettingsRow),
      isDefault: false,
      id: data.id,
    });
  } catch (error) {
    console.error('AI settings GET error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch AI settings',
      settings: DEFAULT_AI_SETTINGS,
    }, { status: 500 });
  }
}

/**
 * POST /api/ai-settings
 * Create or update AI settings for the authenticated user (upsert)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }

    const body = await request.json();
    const inputSettings: Partial<AISettings> = body.settings || body;
    
    // Validate settings
    const validatedSettings = validateSettings(inputSettings);
    const dbRow = settingsToRow(validatedSettings);
    
    // Upsert: insert or update based on user_id
    const { data, error } = await supabase
      .from('ai_settings')
      .upsert({
        user_id: user.id,
        ...dbRow,
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving AI settings:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to save AI settings',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      settings: rowToSettings(data as AISettingsRow),
      message: 'AI settings saved successfully',
      id: data.id,
    });
  } catch (error) {
    console.error('AI settings POST error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to save AI settings',
    }, { status: 500 });
  }
}

/**
 * PUT /api/ai-settings
 * Update specific AI settings fields for the authenticated user
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }

    const body = await request.json();
    const inputSettings: Partial<AISettings> = body.settings || body;
    
    // Get existing settings first
    const { data: existing } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Merge with defaults and validate
    const mergedSettings = {
      ...(existing ? rowToSettings(existing as AISettingsRow) : DEFAULT_AI_SETTINGS),
      ...inputSettings,
    };
    const validatedSettings = validateSettings(mergedSettings);
    const dbRow = settingsToRow(validatedSettings);
    
    // Upsert the settings
    const { data, error } = await supabase
      .from('ai_settings')
      .upsert({
        user_id: user.id,
        ...dbRow,
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating AI settings:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to update AI settings',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      settings: rowToSettings(data as AISettingsRow),
      message: 'AI settings updated successfully',
      id: data.id,
    });
  } catch (error) {
    console.error('AI settings PUT error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update AI settings',
    }, { status: 500 });
  }
}

/**
 * DELETE /api/ai-settings
 * Reset AI settings to defaults by deleting the user's settings record
 */
export async function DELETE() {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }

    // Delete user's settings
    const { error } = await supabase
      .from('ai_settings')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting AI settings:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to reset AI settings',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      settings: DEFAULT_AI_SETTINGS,
      message: 'AI settings reset to defaults',
      isDefault: true,
    });
  } catch (error) {
    console.error('AI settings DELETE error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to reset AI settings',
    }, { status: 500 });
  }
}
