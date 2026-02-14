'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AISettings, DEFAULT_AI_SETTINGS } from '@/types/ai-settings';

const AI_SETTINGS_STORAGE_KEY = 'ai-medical-coding-settings';

interface AISettingsContextType {
  settings: AISettings;
  updateSetting: <K extends keyof AISettings>(key: K, value: AISettings[K]) => void;
  updateSettings: (newSettings: Partial<AISettings>) => void;
  resetToDefaults: () => void;
  isLoading: boolean;
}

const AISettingsContext = createContext<AISettingsContextType | undefined>(undefined);

export function AISettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_AI_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AI_SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle any new settings added in updates
        setSettings({ ...DEFAULT_AI_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load AI settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      } catch (error) {
        console.error('Failed to save AI settings:', error);
      }
    }
  }, [settings, isLoading]);

  const updateSetting = useCallback(<K extends keyof AISettings>(key: K, value: AISettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AISettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_AI_SETTINGS);
  }, []);

  return (
    <AISettingsContext.Provider value={{ settings, updateSetting, updateSettings, resetToDefaults, isLoading }}>
      {children}
    </AISettingsContext.Provider>
  );
}

export function useAISettings() {
  const context = useContext(AISettingsContext);
  if (context === undefined) {
    throw new Error('useAISettings must be used within an AISettingsProvider');
  }
  return context;
}

// Utility function to get settings for API calls (server-side compatible)
export function getAISettingsFromRequest(request: Request): AISettings {
  const settingsHeader = request.headers.get('x-ai-settings');
  if (settingsHeader) {
    try {
      const parsed = JSON.parse(settingsHeader);
      return { ...DEFAULT_AI_SETTINGS, ...parsed };
    } catch {
      return DEFAULT_AI_SETTINGS;
    }
  }
  return DEFAULT_AI_SETTINGS;
}
