'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { icdDiagnosisApi } from '@/lib/icd-diagnosis-api';
import { codeResultsApi } from '@/lib/code-results-api';
import { STATUS_LABELS, STATUS_COLORS, type ICDDiagnosisDetail } from '@/types/icd-diagnosis';
import ICD10Dropdown from '@/app/components/ICD10Dropdown';
import {
  ArrowLeft,
  User,
  Activity,
  FileText,
  Plus,
  X,
  Check,
  Ban,
  Edit3,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

// Individual code status type
type CodeStatus = 'pending' | 'accepted' | 'rejected' | 'modified';

interface CodeWithStatus {
  id: string;
  code: string;
  desc: string;
  originalCode: string;
  originalDesc: string;
  status: CodeStatus;
}

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.caseId as string;

  // Data states
  const [diagnosisData, setDiagnosisData] = useState<ICDDiagnosisDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [codes, setCodes] = useState<CodeWithStatus[]>([]);
  const [newCode, setNewCode] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [comment, setComment] = useState('');

  // Fetch case data
  useEffect(() => {
    const fetchData = async () => {
      if (!caseId) return;

      try {
        setLoading(true);
        setError(null);

        const response = await icdDiagnosisApi.getById(caseId);

        if (response.success && response.data) {
          setDiagnosisData(response.data);
          
          // Initialize codes with status
          const codesWithStatus: CodeWithStatus[] = response.data.code_results.map((cr) => ({
            id: cr.id,
            code: cr.code,
            desc: cr.desc,
            originalCode: cr.code,
            originalDesc: cr.desc,
            status: 'pending',
          }));
          setCodes(codesWithStatus);
          
          setComment(response.data.comment || '');
        } else {
          setError('Failed to fetch case details');
        }
      } catch (err) {
        console.error('Error fetching case:', err);
        setError('Error loading case details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [caseId]);

  // Handle code change (local only)
  const handleCodeChange = (id: string, newCodeValue: string) => {
    setCodes((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        
        const updated = { ...item, code: newCodeValue };
        // If code changed from original, set to modified
        if (newCodeValue !== item.originalCode && item.status !== 'accepted' && item.status !== 'rejected') {
          updated.status = 'modified';
        }
        return updated;
      })
    );
  };

  // Handle desc change (local only)
  const handleDescChange = (id: string, newDescValue: string) => {
    setCodes((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        
        const updated = { ...item, desc: newDescValue };
        // If desc changed from original, set to modified
        if (newDescValue !== item.originalDesc && item.status !== 'accepted' && item.status !== 'rejected') {
          updated.status = 'modified';
        }
        return updated;
      })
    );
  };

  // Accept a code (local only)
  const handleAccept = (id: string) => {
    setCodes((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: 'accepted', code: item.originalCode, desc: item.originalDesc }
          : item
      )
    );
  };

  // Reject a code (local only)
  const handleReject = (id: string) => {
    setCodes((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'rejected' } : item
      )
    );
  };

  // Remove a code
  const removeCode = (id: string) => {
    setCodes((prev) => prev.filter((item) => item.id !== id));
  };

  // Add new code (local only)
  const addNewCode = () => {
    if (newCode.trim()) {
      const tempId = `new-${Date.now()}`;
      setCodes((prev) => [
        ...prev,
        {
          id: tempId,
          code: newCode.trim(),
          desc: newDesc.trim(),
          originalCode: newCode.trim(),
          originalDesc: newDesc.trim(),
          status: 'modified', // New codes are considered modified
        },
      ]);
      setNewCode('');
      setNewDesc('');
    }
  };

  // Calculate overall status
  const getOverallStatus = (): { canSubmit: boolean; action: 'approve' | 'modify' | 'reject' | null; message: string } => {
    if (codes.length === 0) {
      return { canSubmit: false, action: null, message: 'No codes to review' };
    }

    const hasPending = codes.some((c) => c.status === 'pending');
    const hasRejected = codes.some((c) => c.status === 'rejected');
    const hasModified = codes.some((c) => c.status === 'modified');
    const allAccepted = codes.every((c) => c.status === 'accepted');

    if (hasPending) {
      return { canSubmit: false, action: null, message: 'Please review all codes before submitting' };
    }

    if (hasRejected) {
      return { canSubmit: true, action: 'reject', message: 'One or more codes rejected - case will be rejected' };
    }

    if (hasModified) {
      return { canSubmit: true, action: 'modify', message: 'Codes modified - ready to submit' };
    }

    if (allAccepted) {
      return { canSubmit: true, action: 'approve', message: 'All codes accepted - ready to approve' };
    }

    return { canSubmit: false, action: null, message: '' };
  };

  const overallStatus = getOverallStatus();

  // Handle submit action - API calls happen here only
  const handleSubmit = async () => {
    if (!diagnosisData || !overallStatus.canSubmit || !overallStatus.action) return;

    setSubmitting(true);

    try {
      // First, update all modified code_results
      const codesToUpdate = codes.filter(
        (c) => c.status === 'modified' || (c.status === 'accepted' && (c.code !== c.originalCode || c.desc !== c.originalDesc))
      );
      
      for (const code of codesToUpdate) {
        await codeResultsApi.update(diagnosisData.id, code.id, {
          code: code.code,
          desc: code.desc,
        });
      }

      // Then, update icd_diagnosis status
      if (overallStatus.action === 'approve') {
        await icdDiagnosisApi.approve(diagnosisData.id);
        toast.success('Case approved successfully');
      } else if (overallStatus.action === 'modify') {
        await icdDiagnosisApi.markModified(diagnosisData.id);
        toast.success('Case modified successfully');
      } else if (overallStatus.action === 'reject') {
        await icdDiagnosisApi.reject(diagnosisData.id);
        toast.success('Case rejected');
      }

      // Update comment if provided
      if (comment && comment !== diagnosisData.comment) {
        await icdDiagnosisApi.updateComment(diagnosisData.id, comment);
      }

      // Navigate back
      setTimeout(() => {
        router.push('/cases');
      }, 1000);
    } catch (err) {
      console.error('Error submitting:', err);
      toast.error('Failed to submit changes');
    } finally {
      setSubmitting(false);
    }
  };

  // Get status color for individual code
  const getCodeStatusColor = (status: CodeStatus) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'modified':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Loading case details...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !diagnosisData) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-red-600">{error || 'Case not found'}</p>
          <button
            onClick={() => router.push('/cases')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Back to Case List
          </button>
        </div>
      </div>
    );
  }

  const patient = diagnosisData.patient;
  const statusLabel = STATUS_LABELS[diagnosisData.status] || 'Unknown';
  const statusColors = STATUS_COLORS[diagnosisData.status] || STATUS_COLORS[0];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/cases')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Cases
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {patient.admission_number}
            </h1>
            <p className="text-gray-600">{patient.pre_diagnosis || 'No pre-diagnosis'}</p>
          </div>
          <div className="flex items-center gap-3">
            {submitting && (
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </span>
            )}
            <span
              className={`px-4 py-2 rounded-xl font-medium capitalize ${statusColors.bg} ${statusColors.text} border ${statusColors.border}`}
            >
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Status Alert */}
      <div className={`mb-6 p-4 rounded-xl border ${overallStatus.canSubmit ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <div className="flex items-center gap-3">
          <AlertCircle className={`w-5 h-5 ${overallStatus.canSubmit ? 'text-blue-600' : 'text-yellow-600'}`} />
          <span className={overallStatus.canSubmit ? 'text-blue-800' : 'text-yellow-800'}>
            {overallStatus.message}
          </span>
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT PANEL - Patient Data */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Patient Data</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Age</label>
              <p className="mt-1 text-gray-900">{patient.age ? `${patient.age} years` : '-'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Sex</label>
              <p className="mt-1 text-gray-900">{patient.sex || '-'}</p>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <label className="text-sm font-medium text-gray-500">Chief Complaint</label>
              <p className="mt-1 text-gray-900">{patient.chief_complaint || '-'}</p>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <label className="text-sm font-medium text-gray-500">Present Illness</label>
              <p className="mt-1 text-gray-900">{patient.patient_illness || '-'}</p>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <label className="text-sm font-medium text-gray-500">Patient Examine</label>
              <p className="mt-1 text-gray-900">{patient.patient_examine || '-'}</p>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <label className="text-sm font-medium text-gray-500">Pre-diagnosis</label>
              <p className="mt-1 text-gray-900">{patient.pre_diagnosis || '-'}</p>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <label className="text-sm font-medium text-gray-500">Treatment Plan</label>
              <p className="mt-1 text-gray-900">{patient.treatment_plan || '-'}</p>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - ICD-10 Codes Review */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-blue-100 to-blue-50">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">ICD-10 Diagnosis Codes Review</h2>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {codes.length > 0 ? (
              codes.map((codeItem) => {
                const isPending = codeItem.status === 'pending';
                const isAccepted = codeItem.status === 'accepted';
                const isRejected = codeItem.status === 'rejected';
                const isModified = codeItem.status === 'modified';

                return (
                  <div key={codeItem.id} className="p-6">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase border ${getCodeStatusColor(
                          codeItem.status
                        )}`}
                      >
                        {codeItem.status}
                      </span>
                      <button
                        onClick={() => removeCode(codeItem.id)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Original Suggestion */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">AI Suggested</p>
                      <p className="font-mono font-semibold text-blue-700">{codeItem.originalCode}</p>
                      <p className="text-sm text-gray-700">{codeItem.originalDesc}</p>
                    </div>

                    {/* Editable Fields */}
                    <div className="space-y-3">
                      {/* Code Dropdown */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Code</label>
                        <ICD10Dropdown
                          value={codeItem.code}
                          onChange={(value) => handleCodeChange(codeItem.id, value)}
                          placeholder="Search or type ICD-10 code..."
                        />
                      </div>

                      {/* Description Input */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                        <input
                          type="text"
                          value={codeItem.desc}
                          onChange={(e) => handleDescChange(codeItem.id, e.target.value)}
                          placeholder="Enter description..."
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleAccept(codeItem.id)}
                          disabled={isModified}
                          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                            isAccepted
                              ? 'bg-green-600 text-white'
                              : isModified
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                          {isAccepted ? 'Accepted' : 'Accept'}
                        </button>
                        <button
                          onClick={() => handleReject(codeItem.id)}
                          disabled={isModified}
                          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                            isRejected
                              ? 'bg-red-600 text-white'
                              : isModified
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          <Ban className="w-4 h-4" />
                          {isRejected ? 'Rejected' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No ICD-10 codes available</p>
              </div>
            )}

            {/* Add New Code */}
            <div className="p-6 bg-gray-50 border-t border-gray-200">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                Add New Code
              </label>
              <div className="space-y-3">
                <ICD10Dropdown
                  value={newCode}
                  onChange={setNewCode}
                  placeholder="Search or type ICD-10 code..."
                />
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Enter description..."
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addNewCode}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Code
                </button>
              </div>
            </div>
          </div>

          {/* Comment Section */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">Review Comment</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add your review comments..."
              rows={3}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Submit Button */}
          <div className="p-6 border-t border-gray-200">
            <button
              onClick={handleSubmit}
              disabled={!overallStatus.canSubmit || submitting}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors ${
                !overallStatus.canSubmit
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : overallStatus.action === 'approve'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : overallStatus.action === 'reject'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : overallStatus.action === 'approve' ? (
                <Check className="w-5 h-5" />
              ) : overallStatus.action === 'reject' ? (
                <Ban className="w-5 h-5" />
              ) : (
                <Edit3 className="w-5 h-5" />
              )}
              {submitting
                ? 'Submitting...'
                : overallStatus.action === 'approve'
                ? 'Approve Case'
                : overallStatus.action === 'reject'
                ? 'Reject Case'
                : overallStatus.action === 'modify'
                ? 'Submit Modifications'
                : 'Review All Codes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
