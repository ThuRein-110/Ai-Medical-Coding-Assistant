'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { mockCases } from '../../../utils/mockData';
import { useAuth } from '@/app/contexts/AuthContext';
import {
  ArrowLeft,
  User,
  Activity,
  AlertTriangle,
  FileText,
  Plus,
  X,
  Check,
  Edit,
  Ban,
  ChevronDown,
  ChevronUp,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const caseId = params.caseId as string;
  const caseData = mockCases.find((c) => c.id === caseId);

  // Pre-populate with AI suggestions by default
  const [finalICD10, setFinalICD10] = useState<string[]>(
    caseData?.aiSuggestion.icd10Codes.map((c) => c.code) || []
  );
  const [finalICD9, setFinalICD9] = useState<string[]>(
    caseData?.aiSuggestion.icd9Procedures.map((c) => c.code) || []
  );
  const [newICD10, setNewICD10] = useState('');
  const [newICD9, setNewICD9] = useState('');
  const [comment, setComment] = useState('');
  const [showEvidence, setShowEvidence] = useState(false);

  // Check if user can edit (only admin)
  const userRole = user?.user_metadata?.role || ''
  const canEdit = userRole === 'admin';

  if (!caseData) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-gray-600">Case not found</p>
          <button
            onClick={() => router.push('/dashboard/cases')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Back to Case List
          </button>
        </div>
      </div>
    );
  }

  const handleAction = async (action: 'approve' | 'modify' | 'reject') => {
    if (!canEdit) {
      toast.error('Only administrators can review cases');
      return;
    }

    // Simulate API call to /api/feedback
    await new Promise((resolve) => setTimeout(resolve, 500));

    const actionMessages = {
      approve: 'Case approved successfully',
      modify: 'Case modified and saved',
      reject: 'Case rejected',
    };

    toast.success(actionMessages[action]);

    // Navigate back after short delay
    setTimeout(() => {
      router.push('/dashboard/cases');
    }, 1000);
  };

  const addICD10Code = () => {
    if (!canEdit) {
      toast.error('Only administrators can edit codes');
      return;
    }
    if (newICD10.trim()) {
      setFinalICD10([...finalICD10, newICD10.trim()]);
      setNewICD10('');
    }
  };

  const addICD9Code = () => {
    if (!canEdit) {
      toast.error('Only administrators can edit codes');
      return;
    }
    if (newICD9.trim()) {
      setFinalICD9([...finalICD9, newICD9.trim()]);
      setNewICD9('');
    }
  };

  const removeICD10 = (index: number) => {
    if (!canEdit) {
      toast.error('Only administrators can edit codes');
      return;
    }
    setFinalICD10(finalICD10.filter((_, i) => i !== index));
  };

  const removeICD9 = (index: number) => {
    if (!canEdit) {
      toast.error('Only administrators can edit codes');
      return;
    }
    setFinalICD9(finalICD9.filter((_, i) => i !== index));
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-600 bg-green-50';
    if (confidence >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      high: 'bg-red-100 border-red-300 text-red-700',
      medium: 'bg-yellow-100 border-yellow-300 text-yellow-700',
      low: 'bg-orange-100 border-orange-300 text-orange-700',
    };
    return colors[severity as keyof typeof colors];
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/cases')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Cases
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {caseData.id}
            </h1>
            <p className="text-gray-600">{caseData.primaryDiagnosis}</p>
          </div>
          <span
            className={`px-4 py-2 rounded-xl font-medium capitalize ${
              caseData.status === 'pending'
                ? 'bg-yellow-100 text-yellow-700'
                : caseData.status === 'approved'
                ? 'bg-green-100 text-green-700'
                : caseData.status === 'modified'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {caseData.status}
          </span>
        </div>
      </div>

      {/* 3-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT PANEL - Patient Data */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Patient Data</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Age</label>
              <p className="mt-1 text-gray-900">{caseData.patientData.age} years</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Sex</label>
              <p className="mt-1 text-gray-900">{caseData.patientData.sex}</p>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <label className="text-sm font-medium text-gray-500">
                Chief Complaint
              </label>
              <p className="mt-1 text-gray-900">
                {caseData.patientData.chiefComplaint}
              </p>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <label className="text-sm font-medium text-gray-500">
                Present Illness
              </label>
              <p className="mt-1 text-gray-900">
                {caseData.patientData.presentIllness}
              </p>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <label className="text-sm font-medium text-gray-500">
                Patient Examine
              </label>
              <p className="mt-1 text-gray-900">
                {caseData.patientData.patientExamine}
              </p>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <label className="text-sm font-medium text-gray-500">
                Pre-diagnosis
              </label>
              <p className="mt-1 text-gray-900">
                {caseData.patientData.preDiagnosis}
              </p>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <label className="text-sm font-medium text-gray-500">
                Treatment Plan
              </label>
              <p className="mt-1 text-gray-900">
                {caseData.patientData.treatmentPlan}
              </p>
            </div>
          </div>
        </div>

        {/* MIDDLE PANEL - AI Suggestions */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">AI Suggestions</h2>
          </div>

          {/* ICD-10 Codes */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">
              ICD-10 Diagnosis Codes
            </h3>
            <div className="space-y-3">
              {caseData.aiSuggestion.icd10Codes.map((code, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-gray-50 rounded-xl border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-mono font-semibold text-blue-600">
                      {code.code}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${getConfidenceColor(
                        code.confidence
                      )}`}
                    >
                      {code.confidence}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 mb-2">{code.description}</p>
                  <p className="text-xs text-gray-600 italic">{code.reason}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ICD-9 Procedures */}
          {caseData.aiSuggestion.icd9Procedures.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">
                ICD-9 Procedure Codes
              </h3>
              <div className="space-y-3">
                {caseData.aiSuggestion.icd9Procedures.map((code, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-gray-50 rounded-xl border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-mono font-semibold text-purple-600">
                        {code.code}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${getConfidenceColor(
                          code.confidence
                        )}`}
                      >
                        {code.confidence}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 mb-2">{code.description}</p>
                    <p className="text-xs text-gray-600 italic">{code.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing Documentation Alerts */}
          {caseData.aiSuggestion.missingDocAlerts.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-gray-900">
                  Missing Documentation
                </h3>
              </div>
              <div className="space-y-2">
                {caseData.aiSuggestion.missingDocAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-xl border ${getSeverityColor(
                      alert.severity
                    )}`}
                  >
                    <p className="text-sm font-medium">{alert.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evidence Snippets */}
          {caseData.aiSuggestion.evidenceSnippets.length > 0 && (
            <div>
              <button
                onClick={() => setShowEvidence(!showEvidence)}
                className="flex items-center justify-between w-full p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span className="font-semibold text-gray-900">
                    Evidence Snippets
                  </span>
                </div>
                {showEvidence ? (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
              </button>

              {showEvidence && (
                <div className="mt-3 space-y-2">
                  {caseData.aiSuggestion.evidenceSnippets.map((snippet) => (
                    <div
                      key={snippet.id}
                      className="p-3 bg-blue-50 border border-blue-200 rounded-xl"
                    >
                      <p className="text-xs font-medium text-blue-900 mb-1">
                        {snippet.source}
                      </p>
                      <p className="text-sm text-blue-700">"{snippet.text}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT PANEL - Coder Review */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Edit className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Coder Review</h2>
            {!canEdit && (
              <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg">
                <Lock className="w-4 h-4 text-gray-600" />
                <span className="text-xs text-gray-600">View Only</span>
              </div>
            )}
          </div>

          {/* Admin-only notice */}
          {!canEdit && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Only administrators can edit and approve cases. You can view AI suggestions and default codes.
              </p>
            </div>
          )}

          {/* Final ICD-10 Codes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Final ICD-10 Codes {!canEdit && '(AI Default)'}
            </label>
            <div className="space-y-2 mb-2">
              {finalICD10.map((code, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <span className="font-mono text-sm">{code}</span>
                  {canEdit && (
                    <button
                      onClick={() => removeICD10(idx)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {canEdit && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newICD10}
                  onChange={(e) => setNewICD10(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addICD10Code()}
                  placeholder="Add ICD-10 code"
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addICD10Code}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Final ICD-9 Codes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Final ICD-9 Procedure Codes {!canEdit && '(AI Default)'}
            </label>
            <div className="space-y-2 mb-2">
              {finalICD9.map((code, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <span className="font-mono text-sm">{code}</span>
                  {canEdit && (
                    <button
                      onClick={() => removeICD9(idx)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {canEdit && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newICD9}
                  onChange={(e) => setNewICD9(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addICD9Code()}
                  placeholder="Add ICD-9 code"
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addICD9Code}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Comment */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comment
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={canEdit ? "Add your review comments..." : "View only mode"}
              rows={4}
              disabled={!canEdit}
              className={`w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                !canEdit ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            />
          </div>

          {/* Action Buttons */}
          {canEdit ? (
            <div className="space-y-3">
              <button
                onClick={() => handleAction('approve')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors"
              >
                <Check className="w-5 h-5" />
                Approve
              </button>
              <button
                onClick={() => handleAction('modify')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
              >
                <Edit className="w-5 h-5" />
                Modify
              </button>
              <button
                onClick={() => handleAction('reject')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
              >
                <Ban className="w-5 h-5" />
                Reject
              </button>
            </div>
          ) : (
            <div className="p-4 bg-gray-100 border border-gray-300 rounded-xl text-center">
              <Lock className="w-8 h-8 mx-auto mb-2 text-gray-500" />
              <p className="text-sm text-gray-600 font-medium">
                Administrator approval required
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Contact your administrator to review this case
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
