"use client";

import React, { useEffect, useState } from "react";
import { mockCases, mockAuditLogs, getCaseStatistics } from "../utils/mockData";
import { useAuth } from "../contexts/AuthContext";
import { dashboardApi } from "@/lib/dashboard-api";
import type { DashboardAnalytics } from "@/types/dashboard";
import {
  FileText,
  Clock,
  CheckCircle,
  Edit,
  XCircle,
  TrendingUp,
  Activity,
  Loader2,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch analytics data on mount
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await dashboardApi.getAnalytics();

        if (response.success && response.data) {
          setAnalytics(response.data);
        } else {
          setError("Failed to load analytics data");
        }
      } catch (err) {
        console.error("Error fetching analytics:", err);
        setError("Error loading dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  // Use API data if available, otherwise fallback to mock data
  const stats = analytics || {
    totalCases: 0,
    pendingCount: 0,
    approvedCount: 0,
    modifiedCount: 0,
    rejectedCount: 0,
  };

  // Get recent activity from audit logs (still using mock for now)
  const recentActivity = mockAuditLogs.slice(0, 5);
  const mockStats = getCaseStatistics(mockCases);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getActionBadge = (action: string) => {
    const styles = {
      approved: "bg-green-100 text-green-700",
      modified: "bg-purple-100 text-purple-700",
      rejected: "bg-red-100 text-red-700",
    };
    return styles[action as keyof typeof styles] || "bg-gray-100 text-gray-700";
  };

  // Calculate completion and approval rates
  const totalProcessed =
    stats.approvedCount + stats.modifiedCount + stats.rejectedCount;
  const completionRate =
    stats.totalCases > 0
      ? Math.round((totalProcessed / stats.totalCases) * 100)
      : 0;
  const approvalRate =
    stats.totalCases > 0
      ? Math.round((stats.approvedCount / stats.totalCases) * 100)
      : 0;
  const modificationRate =
    stats.totalCases > 0
      ? Math.round((stats.modifiedCount / stats.totalCases) * 100)
      : 0;

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.email}
        </h1>
        <p className="text-gray-600">
          Here's an overview of your medical coding cases
        </p>
      </div>

      {/* Bento Grid Layout */}
      {loading ? (
        <div className="flex items-center justify-center h-48 mb-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Loading analytics...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 text-red-700">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 auto-rows-[minmax(120px,auto)]">
          {/* Featured Card - Total Cases (Large) */}
          <div className="col-span-2 row-span-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-6 text-white hover:shadow-xl transition-all">
            <div className="h-full flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                  <FileText className="w-8 h-8" />
                </div>
                <span className="text-blue-200 text-sm font-medium">Total</span>
              </div>
              <div>
                <div className="text-5xl md:text-6xl font-bold mb-2">
                  {stats.totalCases}
                </div>
                <div className="text-blue-100 text-lg">Total Cases</div>
              </div>
            </div>
          </div>

          {/* Pending Card */}
          <div className="col-span-1 row-span-1 bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100 rounded-2xl p-4 hover:shadow-md transition-all">
            <div className="flex flex-col h-full justify-between">
              <div className="bg-amber-100 p-2 rounded-xl w-fit">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-bold text-gray-900">
                  {stats.pendingCount}
                </div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
            </div>
          </div>

          {/* Approved Card */}
          <div className="col-span-1 row-span-1 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-4 hover:shadow-md transition-all">
            <div className="flex flex-col h-full justify-between">
              <div className="bg-green-100 p-2 rounded-xl w-fit">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-bold text-gray-900">
                  {stats.approvedCount}
                </div>
                <div className="text-sm text-gray-600">Approved</div>
              </div>
            </div>
          </div>

          {/* Quick Stats Card (spans 2 cols) */}
          <div className="col-span-2 row-span-2 bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Quick Stats</h3>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-gray-600">Completion</span>
                  <span className="text-sm font-bold text-blue-600">
                    {completionRate}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-gray-600">Approval</span>
                  <span className="text-sm font-bold text-green-600">
                    {approvalRate}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ width: `${approvalRate}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-gray-600">Modification</span>
                  <span className="text-sm font-bold text-purple-600">
                    {modificationRate}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{ width: `${modificationRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Modified Card */}
          <div className="col-span-1 row-span-1 bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100 rounded-2xl p-4 hover:shadow-md transition-all">
            <div className="flex flex-col h-full justify-between">
              <div className="bg-purple-100 p-2 rounded-xl w-fit">
                <Edit className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-bold text-gray-900">
                  {stats.modifiedCount}
                </div>
                <div className="text-sm text-gray-600">Modified</div>
              </div>
            </div>
          </div>

          {/* Rejected Card */}
          <div className="col-span-1 row-span-1 bg-gradient-to-br from-red-50 to-rose-50 border border-red-100 rounded-2xl p-4 hover:shadow-md transition-all">
            <div className="flex flex-col h-full justify-between">
              <div className="bg-red-100 p-2 rounded-xl w-fit">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-bold text-gray-900">
                  {stats.rejectedCount}
                </div>
                <div className="text-sm text-gray-600">Rejected</div>
              </div>
            </div>
          </div>

          {/* Recent Activity Card (Large - spans 4 cols) */}
          <div className="col-span-2 md:col-span-4 row-span-2 bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Recent Activity</h3>
              <Activity className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[200px]">
              {recentActivity.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">
                        {log.caseId}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${getActionBadge(log.action)}`}
                      >
                        {log.action.charAt(0).toUpperCase() +
                          log.action.slice(1)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      by {log.user}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 whitespace-nowrap">
                    {formatDate(log.timestamp)}
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </div>
          </div>

          {/* Avg Confidence Card */}
          <div className="col-span-2 row-span-1 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-5 text-white hover:shadow-xl transition-all">
            <div className="flex items-center justify-between h-full">
              <div>
                <div className="text-indigo-200 text-sm mb-1">
                  Avg. AI Confidence
                </div>
                <div className="text-3xl md:text-4xl font-bold">
                  {Math.round(
                    mockCases.reduce((sum, c) => sum + c.overallConfidence, 0) /
                      mockCases.length,
                  )}
                  %
                </div>
              </div>
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
