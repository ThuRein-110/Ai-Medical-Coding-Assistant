'use client'

import React from 'react'
import { DashboardLayout } from '@/app/components/DashboardLayoutComponent'
import { ProtectedRoute } from '@/app/components/ProtectedRoute'

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  )
}
