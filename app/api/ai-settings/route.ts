import { NextRequest, NextResponse } from 'next/server';
import { AISettings, DEFAULT_AI_SETTINGS } from '@/types/ai-settings';

// GET /api/ai-settings - Get current AI settings from request headers or defaults
export async function GET(request: NextRequest) {
  try {
    const settingsHeader = request.headers.get('x-ai-settings');
    
    if (settingsHeader) {
      const parsed = JSON.parse(settingsHeader);
      return NextResponse.json({
        success: true,
        settings: { ...DEFAULT_AI_SETTINGS, ...parsed }
      });
    }
    
    return NextResponse.json({
      success: true,
      settings: DEFAULT_AI_SETTINGS
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to parse AI settings',
      settings: DEFAULT_AI_SETTINGS
    }, { status: 400 });
  }
}

// POST /api/ai-settings - Validate AI settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const settings: Partial<AISettings> = body.settings || {};
    
    // Validate settings
    const validatedSettings: AISettings = { ...DEFAULT_AI_SETTINGS };
    
    if (typeof settings.temperature === 'number') {
      validatedSettings.temperature = Math.max(0, Math.min(1, settings.temperature));
    }
    
    if (typeof settings.topP === 'number') {
      validatedSettings.topP = Math.max(0.1, Math.min(1, settings.topP));
    }
    
    if (typeof settings.maxTokens === 'number') {
      validatedSettings.maxTokens = Math.max(512, Math.min(8192, settings.maxTokens));
    }
    
    if (typeof settings.confidenceThreshold === 'number') {
      validatedSettings.confidenceThreshold = Math.max(0, Math.min(1, settings.confidenceThreshold));
    }
    
    if (typeof settings.chunkSize === 'number') {
      validatedSettings.chunkSize = Math.max(5, Math.min(20, settings.chunkSize));
    }
    
    if (typeof settings.maxAlternatives === 'number') {
      validatedSettings.maxAlternatives = Math.max(1, Math.min(10, settings.maxAlternatives));
    }
    
    if (typeof settings.maxICDContextCodes === 'number') {
      validatedSettings.maxICDContextCodes = Math.max(5, Math.min(50, settings.maxICDContextCodes));
    }
    
    return NextResponse.json({
      success: true,
      settings: validatedSettings,
      message: 'AI settings validated successfully'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to validate AI settings'
    }, { status: 400 });
  }
}
