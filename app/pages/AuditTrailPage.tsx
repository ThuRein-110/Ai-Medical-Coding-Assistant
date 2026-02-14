import React, { useState } from 'react';
import { mockAuditLogs, AuditLogEntry } from '../../utils/mockData';
import { History, Filter, Download } from 'lucide-react';
import { toast } from 'sonner';

export const AuditTrailPage: React.FC = () => {
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('');

  // Filter logs
  const filteredLogs = mockAuditLogs.filter((log) => {
    const matchesStatus = statusFilter === 'all' || log.action === statusFilter;
    const matchesUser =
      !userFilter ||
      log.user.toLowerCase().includes(userFilter.toLowerCase());
    const matchesDate =
      !dateFilter ||
      new Date(log.timestamp).toISOString().split('T')[0] === dateFilter;
    return matchesStatus && matchesUser && matchesDate;
  });

  const handleExport = () => {
    toast.success('Audit log exported successfully');
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

  const getActionBadge = (action: string) => {
    const styles = {
      approved: 'bg-green-100 text-green-700 border-green-200',
      modified: 'bg-purple-100 text-purple-700 border-purple-200',
      rejected: 'bg-red-100 text-red-700 border-red-200',
    };
    return styles[action as keyof typeof styles] || 'bg-gray-100 text-gray-700';
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
            className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
          >
            <Download className="w-5 h-5" />
            Export
          </button>
        </div>
      </div>

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
              Action
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Actions</option>
              <option value="approved">Approved</option>
              <option value="modified">Modified</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* User Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User
            </label>
            <input
              type="text"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              placeholder="Search by user name..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredLogs.length} of {mockAuditLogs.length} log entries
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                  Case ID
                </th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                  AI Codes
                </th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                  Final Codes
                </th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                  Action
                </th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                  User
                </th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                  Timestamp
                </th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                  Comment
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
                    <span className="font-medium text-blue-600">{log.caseId}</span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-1">
                      {log.aiCodes.map((code, idx) => (
                        <span
                          key={idx}
                          className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs font-mono rounded"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-1">
                      {log.finalCodes.map((code, idx) => (
                        <span
                          key={idx}
                          className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-mono rounded"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize border ${getActionBadge(
                        log.action
                      )}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-gray-900">{log.user}</td>
                  <td className="py-4 px-6 text-sm text-gray-600">
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-600 max-w-xs">
                    <p className="truncate" title={log.comment}>
                      {log.comment}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <History className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No audit logs found matching your filters</p>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 mb-1">Total Approved</p>
              <p className="text-2xl font-bold text-green-900">
                {mockAuditLogs.filter((l) => l.action === 'approved').length}
              </p>
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
              <p className="text-2xl font-bold text-purple-900">
                {mockAuditLogs.filter((l) => l.action === 'modified').length}
              </p>
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
              <p className="text-2xl font-bold text-red-900">
                {mockAuditLogs.filter((l) => l.action === 'rejected').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-200 rounded-xl flex items-center justify-center">
              <History className="w-6 h-6 text-red-700" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
