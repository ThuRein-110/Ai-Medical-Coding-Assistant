import type { AISettings } from "@/types/ai-settings";

export interface AISettingsResponse {
  success: boolean;
  settings: AISettings;
  isDefault?: boolean;
  id?: string;
  message?: string;
  error?: string;
}

export const aiSettingsApi = {
  /**
   * Get current user's AI settings from the backend
   * Returns defaults if no custom settings exist
   */
  getSettings: async (): Promise<AISettingsResponse> => {
    const response = await fetch("/api/ai-settings", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    return response.json();
  },

  /**
   * Save AI settings to the backend (create or update)
   * @param settings - Full or partial AI settings to save
   */
  saveSettings: async (settings: Partial<AISettings>): Promise<AISettingsResponse> => {
    const response = await fetch("/api/ai-settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ settings }),
    });

    return response.json();
  },

  /**
   * Update specific AI settings fields (partial update)
   * @param settings - Partial AI settings to update
   */
  updateSettings: async (settings: Partial<AISettings>): Promise<AISettingsResponse> => {
    const response = await fetch("/api/ai-settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ settings }),
    });

    return response.json();
  },

  /**
   * Reset AI settings to defaults by deleting custom settings
   */
  resetSettings: async (): Promise<AISettingsResponse> => {
    const response = await fetch("/api/ai-settings", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    return response.json();
  },
};
