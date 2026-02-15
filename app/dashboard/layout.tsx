"use client";

import React from "react";
import { DashboardLayout } from "@/app/components/DashboardLayoutComponent";
import { ProtectedRoute } from "@/app/components/ProtectedRoute";
import { AISettingsProvider } from "@/app/contexts/AISettingsContext";

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <AISettingsProvider>
        <DashboardLayout>{children}</DashboardLayout>
      </AISettingsProvider>
    </ProtectedRoute>
  );
}
