'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { auditTrailApi } from '@/lib/audit-trail-api';
import { STATUS_LABELS, STATUS_COLORS } from '@/types/icd-diagnosis';
import type { AuditTrailItem } from '@/types/audit-trail';
import { History, Filter, Download, Loader2, AlertCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function AuditTrailPage() {
  // Data states
  const [auditLogs, setAuditLogs] = useState<AuditTrailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  // Filter states
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [anFilter, setAnFilter] = useState('');

  // Fetch audit trail data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await auditTrailApi.getList({ limit: 100 });

        if (response.success) {
          setAuditLogs(response.data);
          setCount(response.count);
        } else {
          setError('Failed to fetch audit trail');
        }
      } catch (err) {
        console.error('Error fetching audit trail:', err);
        setError('Error loading audit trail');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter logs locally
  const filteredLogs = auditLogs.filter((log) => {
    const statusName = STATUS_LABELS[log.status]?.toLowerCase() || '';
    const matchesStatus = statusFilter === 'all' || statusName === statusFilter;
    const matchesAN =
      !anFilter ||
      log.patient.admission_number.toLowerCase().includes(anFilter.toLowerCase());
    const matchesDate =
      !dateFilter ||
      new Date(log.updated_at).toISOString().split('T')[0] === dateFilter;
    return matchesStatus && matchesAN && matchesDate;
  });

  // Calculate stats
  const approvedCount = auditLogs.filter((l) => l.status === 1).length;
  const modifiedCount = auditLogs.filter((l) => l.status === 2).length;
  const rejectedCount = auditLogs.filter((l) => l.status === 3).length;

  const handleExport = () => {
    // Create CSV content
    const headers = ['Case ID', 'Admission Number', 'Status', 'Updated At', 'Comment'];
    const rows = filteredLogs.map((log) => [
      log.id,
      log.patient.admission_number,
      STATUS_LABELS[log.status] || 'Unknown',
      new Date(log.updated_at).toLocaleString(),
      log.comment || '',
    ]);
    
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Audit trail exported successfully');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusBadge = (status: number) => {
    const colors = STATUS_COLORS[status] || STATUS_COLORS[0];
    return `${colors.bg} ${colors.text} ${colors.border}`;
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Audit Trail</h1>
            <p className="text-gray-600">
              Complete history of all coding decisions and modifications
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl font-medium transition-colors"
          >
            <Download className="w-5 h-5" />
            Export
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 mb-1">Total Approved</p>
              <p className="text-2xl font-bold text-green-900">{approvedCount}</p>
            </div>
            <div className="w-12 h-12 bg-green-200 rounded-xl flex items-center justify-center">
              <History className="w-6 h-6 text-green-700" />
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700 mb-1">Total Modified</p>
              <p className="text-2xl font-bold text-purple-900">{modifiedCount}</p>
            </div>
            <div className="w-12 h-12 bg-purple-200 rounded-xl flex items-center justify-center">
              <History className="w-6 h-6 text-purple-700" />
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700 mb-1">Total Rejected</p>
              <p className="text-2xl font-bold text-red-900">{rejectedCount}</p>
            </div>
            <div className="w-12 h-12 bg-red-200 rounded-xl flex items-center justify-center">
              <History className="w-6 h-6 text-red-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Loading audit trail...</span>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700 mb-6">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-gray-600" />
              <h2 className="font-semibold text-gray-900">Filters</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Date Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="modified">Modified</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Admission Number Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admission Number
                </label>
                <input
                  type="text"
                  value={anFilter}
                  onChange={(e) => setAnFilter(e.target.value)}
                  placeholder="Search by AN..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Results Count */}
            <div className="mt-4 text-sm text-gray-600">
              Showing {filteredLogs.length} of {count} records
            </div>
          </div>

          {/* Audit Table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                      Admission Number
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                      Patient Info
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                      Updated At
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                      Comment
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <Link
                          href={`/dashboard/cases/${log.id}`}
                          className="font-medium text-blue-600 hover:text-blue-700"
                        >
                          {log.patient.admission_number}
                        </Link>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-900">
                          {log.patient.sex}, {log.patient.age || '-'} yrs
                        </div>
                        <div className="text-xs text-gray-500 truncate max-w-xs">
                          {log.patient.chief_complaint || log.patient.pre_diagnosis || '-'}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize border ${getStatusBadge(
                            log.status
                          )}`}
                        >
                          {STATUS_LABELS[log.status] || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600">
                        {formatDateTime(log.updated_at)}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600 max-w-xs">
                        <p className="truncate" title={log.comment || ''}>
                          {log.comment || '-'}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <Link
                          href={`/dashboard/cases/${log.id}`}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredLogs.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No audit logs found matching your filters</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
