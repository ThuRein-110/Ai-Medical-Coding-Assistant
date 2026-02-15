"use client";

import React from "react";
import {
  Settings,
  RotateCcw,
  Save,
  Sparkles,
  Gauge,
  Brain,
  Layers,
  CheckCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  AISettings,
  DEFAULT_AI_SETTINGS,
  AI_SETTINGS_CONFIG,
  AISettingConfig,
} from "@/types/ai-settings";
import { useAISettings } from "@/app/contexts/AISettingsContext";

// Group settings by category
const SETTING_GROUPS = {
  model: {
    title: "Model Parameters",
    description: "Control how the AI generates responses",
    icon: Brain,
    keys: ["temperature", "topP", "maxTokens"] as (keyof AISettings)[],
  },
  quality: {
    title: "Quality & Filtering",
    description: "Set thresholds for code acceptance",
    icon: Gauge,
    keys: ["confidenceThreshold"] as (keyof AISettings)[],
  },
  processing: {
    title: "Processing Options",
    description: "Configure batch processing and context size",
    icon: Layers,
    keys: [
      "chunkSize",
      "maxAlternatives",
      "maxICDContextCodes",
    ] as (keyof AISettings)[],
  },
};

function SettingSlider({
  config,
  value,
  onChange,
  defaultValue,
}: {
  config: AISettingConfig;
  value: number;
  onChange: (value: number) => void;
  defaultValue: number;
}) {
  const isDefault = Math.abs(value - defaultValue) < 0.001;
  const defaultPercentage =
    ((defaultValue - config.min) / (config.max - config.min)) * 100;

  return (
    <div className="space-y-3 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-900">
              {config.label}
            </label>
            {isDefault && (
              <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                Default
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">{config.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-blue-600 min-w-[60px] text-right">
            {config.step < 1 ? value.toFixed(2) : value}
            {config.unit ? ` ${config.unit}` : ""}
          </span>
        </div>
      </div>

      <div className="relative pt-1">
        {/* Default value marker - simple tick */}
        <div
          className="absolute top-1 w-0.5 h-2 bg-gray-400 rounded-full z-10 pointer-events-none"
          style={{ left: `${defaultPercentage}%` }}
          title={`Default: ${config.step < 1 ? defaultValue.toFixed(2) : defaultValue}`}
        />
        <Slider
          value={[value]}
          min={config.min}
          max={config.max}
          step={config.step}
          onValueChange={(vals) => onChange(vals[0])}
          className="w-full"
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-400">
            {config.min}
            {config.unit ? ` ${config.unit}` : ""}
          </span>
          <span className="text-xs text-gray-400">
            {config.max}
            {config.unit ? ` ${config.unit}` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const {
    settings,
    updateSetting,
    resetToDefaults,
    saveSettings,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    error,
  } = useAISettings();

  const handleSave = async () => {
    try {
      await saveSettings();
      toast.success("AI settings saved successfully");
    } catch {
      toast.error("Failed to save settings");
    }
  };

  const handleReset = async () => {
    try {
      await resetToDefaults();
      toast.success("Settings reset to defaults");
    } catch {
      toast.error("Failed to reset settings");
    }
  };

  const getConfigByKey = (
    key: keyof AISettings,
  ): AISettingConfig | undefined => {
    return AI_SETTINGS_CONFIG.find((c) => c.key === key);
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
        <span className="ml-3 text-gray-600">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Settings</h1>
              <p className="text-gray-500">
                Configure AI behavior and weights for medical coding
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isSaving}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Defaults
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving}
              className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-blue-600 font-medium">Temperature</p>
                <p className="text-2xl font-bold text-blue-900">
                  {settings.temperature.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Gauge className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-purple-600 font-medium">
                  Confidence Threshold
                </p>
                <p className="text-2xl font-bold text-purple-900">
                  {(settings.confidenceThreshold * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Layers className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-green-600 font-medium">Batch Size</p>
                <p className="text-2xl font-bold text-green-900">
                  {settings.chunkSize} items
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Groups */}
      <div className="space-y-6">
        {Object.entries(SETTING_GROUPS).map(([groupKey, group]) => {
          const Icon = group.icon;
          return (
            <Card key={groupKey}>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{group.title}</CardTitle>
                    <CardDescription>{group.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {group.keys.map((key) => {
                  const config = getConfigByKey(key);
                  if (!config) return null;
                  return (
                    <SettingSlider
                      key={key}
                      config={config}
                      value={settings[key]}
                      defaultValue={DEFAULT_AI_SETTINGS[key]}
                      onChange={(value) => updateSetting(key, value)}
                    />
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card className="mt-6 mb-6 bg-amber-50 border-amber-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex-shrink-0 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-medium text-amber-900">
                How AI Weights Affect Coding
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                <strong>Temperature</strong> controls creativity - lower values
                (0.1-0.3) are recommended for medical coding to ensure
                consistent, accurate results.
                <strong> Confidence Threshold</strong> determines the minimum
                score required to accept a code suggestion. Results below this
                threshold will be flagged for manual review.
                <strong> Batch Size</strong> affects processing speed - smaller
                batches are more reliable but take longer.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Floating Save Bar - Always visible */}
      <div
        className={`fixed bottom-4 right-6 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 transition-all ${
          hasUnsavedChanges
            ? "bg-blue-600 text-white"
            : isSaving
              ? "bg-gray-200 text-gray-600"
              : "bg-gray-100 text-gray-500 border border-gray-200"
        }`}
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Saving...</span>
          </>
        ) : hasUnsavedChanges ? (
          <>
            <span className="text-sm font-medium">
              You have unsaved changes
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSave}
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              Save Now
            </Button>
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-gray-600">
              Settings saved
            </span>
          </>
        )}
      </div>
    </div>
  );
}
