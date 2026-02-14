'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { icdDiagnosisApi } from '@/lib/icd-diagnosis-api';
import { STATUS_LABELS, STATUS_COLORS, type ICDDiagnosisWithPatient } from '@/types/icd-diagnosis';
import { Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

// Map status number to string for URL/param compatibility
const STATUS_MAP: Record<string, number | 'all'> = {
  all: 'all',
  pending: 0,
  approved: 1,
  modified: 2,
  rejected: 3,
};

const STATUS_REVERSE_MAP: Record<number, string> = {
  0: 'pending',
  1: 'approved',
  2: 'modified',
  3: 'rejected',
};

export default function CaseListPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // API data states
  const [diagnoses, setDiagnoses] = useState<ICDDiagnosisWithPatient[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const statusValue = STATUS_MAP[statusFilter];
        const offset = (currentPage - 1) * ITEMS_PER_PAGE;

        const response = await icdDiagnosisApi.getList({
          status: statusValue === 'all' ? undefined : statusValue,
          limit: ITEMS_PER_PAGE,
          offset,
        });

        if (response.success) {
          setDiagnoses(response.data);
          setTotalCount(response.count);
        } else {
          setError('Failed to fetch cases');
        }
      } catch (err) {
        console.error('Error fetching cases:', err);
        setError('Error loading cases');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentPage, statusFilter]);

  // Filter cases by search term (client-side)
  const filteredDiagnoses = diagnoses.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      String(item.patient.admission_number || '').toLowerCase().includes(searchLower) ||
      String(item.patient.chief_complaint || '').toLowerCase().includes(searchLower) ||
      String(item.patient.pre_diagnosis || '').toLowerCase().includes(searchLower);
    return matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalCount);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getStatusBadge = (status: number) => {
    const colors = STATUS_COLORS[status] || STATUS_COLORS[0];
    return `${colors.bg} ${colors.text}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Case List</h1>
        <p className="text-gray-600">Browse and manage all medical coding cases</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by admission number or diagnosis..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="modified">Modified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Results Count */}
        <div className="mt-4 text-sm text-gray-600">
          Showing {totalCount > 0 ? startIndex + 1 : 0} - {Math.min(endIndex, totalCount)} of{' '}
          {totalCount} cases
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Loading cases...</span>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700">
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                    Admission Number
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                    Age
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                    Sex
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                    Chief Complaint
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                    Pre-diagnosis
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDiagnoses.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-6">
                      <Link
                        href={`/dashboard/cases/${item.id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {item.patient.admission_number}
                      </Link>
                    </td>
                    <td className="py-4 px-6 text-gray-900">
                      {item.patient.age || '-'}
                    </td>
                    <td className="py-4 px-6 text-gray-900">
                      {item.patient.sex || '-'}
                    </td>
                    <td className="py-4 px-6 text-gray-900 max-w-xs truncate">
                      {item.patient.chief_complaint || '-'}
                    </td>
                    <td className="py-4 px-6 text-gray-900 max-w-xs truncate">
                      {item.patient.pre_diagnosis || '-'}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(
                          item.status
                        )}`}
                      >
                        {STATUS_LABELS[item.status] || 'Unknown'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600">
                      {formatDate(item.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredDiagnoses.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No cases found matching your filters</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`w-10 h-10 rounded-xl font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
