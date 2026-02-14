'use client';

import React, { useEffect, useState } from 'react';
import { mockCases, mockAuditLogs, getCaseStatistics } from '../utils/mockData';
import { useAuth } from '../contexts/AuthContext';
import { dashboardApi } from '@/lib/dashboard-api';
import type { DashboardAnalytics } from '@/types/dashboard';
import {
  FileText,
  Clock,
  CheckCircle,
  Edit,
  XCircle,
  TrendingUp,
  Activity,
  Loader2,
} from 'lucide-react';

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
          setError('Failed to load analytics data');
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Error loading dashboard data');
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

  const statCards = [
    {
      label: 'Total Cases',
      value: stats.totalCases,
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Pending Review',
      value: stats.pendingCount,
      icon: <Clock className="w-6 h-6" />,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      label: 'Approved',
      value: stats.approvedCount,
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Modified',
      value: stats.modifiedCount,
      icon: <Edit className="w-6 h-6" />,
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Rejected',
      value: stats.rejectedCount,
      icon: <XCircle className="w-6 h-6" />,
      color: 'bg-red-500',
      textColor: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  // Get recent activity from audit logs (still using mock for now)
  const recentActivity = mockAuditLogs.slice(0, 5);
  const mockStats = getCaseStatistics(mockCases);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getActionBadge = (action: string) => {
    const styles = {
      approved: 'bg-green-100 text-green-700',
      modified: 'bg-purple-100 text-purple-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return styles[action as keyof typeof styles] || 'bg-gray-100 text-gray-700';
  };

  // Calculate completion and approval rates
  const totalProcessed = stats.approvedCount + stats.modifiedCount + stats.rejectedCount;
  const completionRate = stats.totalCases > 0 
    ? Math.round((totalProcessed / stats.totalCases) * 100) 
    : 0;
  const approvalRate = stats.totalCases > 0 
    ? Math.round((stats.approvedCount / stats.totalCases) * 100) 
    : 0;
  const modificationRate = stats.totalCases > 0 
    ? Math.round((stats.modifiedCount / stats.totalCases) * 100) 
    : 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.email}
        </h1>
        <p className="text-gray-600">
          Here's an overview of your medical coding cases
        </p>
      </div>

      {/* Statistics Cards */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`${card.bgColor} p-3 rounded-xl`}>
                  <div className={card.textColor}>{card.icon}</div>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {card.value}
              </div>
              <div className="text-sm text-gray-600">{card.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>

          <div className="space-y-4">
            {recentActivity.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-gray-900">
                      {log.caseId}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${getActionBadge(
                        log.action
                      )}`}
                    >
                      {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    Reviewed by <span className="font-medium">{log.user}</span>
                  </p>
                  {log.comment && (
                    <p className="text-sm text-gray-500 italic truncate">
                      "{log.comment}"
                    </p>
                  )}
                </div>
                <div className="text-xs text-gray-500 whitespace-nowrap">
                  {formatDate(log.timestamp)}
                </div>
              </div>
            ))}

            {recentActivity.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Quick Stats</h2>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>

          <div className="space-y-4">
            {/* Completion Rate */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Completion Rate</span>
                <span className="text-sm font-bold text-gray-900">
                  {completionRate}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>

            {/* Approval Rate */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Approval Rate</span>
                <span className="text-sm font-bold text-gray-900">
                  {approvalRate}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${approvalRate}%` }}
                />
              </div>
            </div>

            {/* Modification Rate */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Modification Rate</span>
                <span className="text-sm font-bold text-gray-900">
                  {modificationRate}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{ width: `${modificationRate}%` }}
                />
              </div>
            </div>

            {/* Average Confidence */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Avg. Confidence</span>
                <span className="text-2xl font-bold text-gray-900">
                  {Math.round(
                    mockCases.reduce((sum, c) => sum + c.overallConfidence, 0) /
                      mockCases.length
                  )}
                  %
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
