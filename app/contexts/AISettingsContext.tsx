"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { AISettings, DEFAULT_AI_SETTINGS } from "@/types/ai-settings";
import { aiSettingsApi } from "@/lib/ai-settings-api";

interface AISettingsContextType {
  settings: AISettings;
  updateSetting: <K extends keyof AISettings>(
    key: K,
    value: AISettings[K],
  ) => void;
  updateSettings: (newSettings: Partial<AISettings>) => void;
  resetToDefaults: () => void;
  saveSettings: () => Promise<void>;
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  error: string | null;
}

const AISettingsContext = createContext<AISettingsContextType | undefined>(
  undefined,
);

export function AISettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_AI_SETTINGS);
  const [savedSettings, setSavedSettings] =
    useState<AISettings>(DEFAULT_AI_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track if there are unsaved changes
  const hasUnsavedChanges =
    JSON.stringify(settings) !== JSON.stringify(savedSettings);

  // Debounce timer ref for auto-save
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load settings from backend on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await aiSettingsApi.getSettings();

        if (response.success) {
          setSettings(response.settings);
          setSavedSettings(response.settings);
        } else {
          setError(response.error || "Failed to load settings");
          // Keep defaults on error
        }
      } catch (err) {
        console.error("Failed to load AI settings:", err);
        setError("Failed to load settings from server");
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Save settings to backend
  const saveSettings = useCallback(async () => {
    try {
      setIsSaving(true);
      setError(null);
      const response = await aiSettingsApi.saveSettings(settings);

      if (response.success) {
        setSavedSettings(response.settings);
      } else {
        setError(response.error || "Failed to save settings");
        throw new Error(response.error || "Failed to save settings");
      }
    } catch (err) {
      console.error("Failed to save AI settings:", err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [settings]);

  // Auto-save with debounce when settings change
  useEffect(() => {
    if (!isLoading && hasUnsavedChanges) {
      // Clear existing timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      // Set new timer for auto-save (1.5 seconds after last change)
      saveTimerRef.current = setTimeout(() => {
        saveSettings().catch(() => {
          // Error is already handled in saveSettings
        });
      }, 1500);
    }

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [settings, isLoading, hasUnsavedChanges, saveSettings]);

  const updateSetting = useCallback(
    <K extends keyof AISettings>(key: K, value: AISettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const updateSettings = useCallback((newSettings: Partial<AISettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const resetToDefaults = useCallback(async () => {
    try {
      setIsSaving(true);
      setError(null);
      const response = await aiSettingsApi.resetSettings();

      if (response.success) {
        setSettings(DEFAULT_AI_SETTINGS);
        setSavedSettings(DEFAULT_AI_SETTINGS);
      } else {
        setError(response.error || "Failed to reset settings");
      }
    } catch (err) {
      console.error("Failed to reset AI settings:", err);
      setError("Failed to reset settings");
    } finally {
      setIsSaving(false);
    }
  }, []);

  return (
    <AISettingsContext.Provider
      value={{
        settings,
        updateSetting,
        updateSettings,
        resetToDefaults,
        saveSettings,
        isLoading,
        isSaving,
        hasUnsavedChanges,
        error,
      }}
    >
      {children}
    </AISettingsContext.Provider>
  );
}

export function useAISettings() {
  const context = useContext(AISettingsContext);
  if (context === undefined) {
    throw new Error("useAISettings must be used within an AISettingsProvider");
  }
  return context;
}

// Utility function to get settings for API calls (server-side compatible)
export function getAISettingsFromRequest(request: Request): AISettings {
  const settingsHeader = request.headers.get("x-ai-settings");
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
