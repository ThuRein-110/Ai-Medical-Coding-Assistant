"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { icdDiagnosisApi } from "@/lib/icd-diagnosis-api";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  type ICDDiagnosisDetail,
} from "@/types/icd-diagnosis";
import ICD10Dropdown from "@/app/components/ICD10Dropdown";
import {
  ArrowLeft,
  User,
  Activity,
  FileText,
  Plus,
  X,
  Check,
  Ban,
  Loader2,
  AlertTriangle,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.caseId as string;

  // Data states
  const [diagnosisData, setDiagnosisData] = useState<ICDDiagnosisDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states for review
  const [finalCodes, setFinalCodes] = useState<
    Map<string, { code: string; status: "pending" | "approved" | "modified" }>
  >(new Map());
  const [deletedCodes, setDeletedCodes] = useState<
    Map<string, { code: string; desc: string; comment: string | null }>
  >(new Map());
  const [newCode, setNewCode] = useState("");
  const [comment, setComment] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; code: string } | null>(null);

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

          // Initialize final codes from API with pending status (only valid codes)
          const codesMap = new Map();
          response.data.code_results
            .filter((cr) => cr.code && cr.code.trim() !== "")
            .forEach((cr) => {
              codesMap.set(String(cr.id), {
                code: cr.code,
                status: "pending" as const,
              });
            });
          setFinalCodes(codesMap);

          setComment(response.data.comment || "");
        } else {
          setError("Failed to fetch case details");
        }
      } catch (err) {
        console.error("Error fetching case:", err);
        setError("Error loading case details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [caseId]);

  const handleAction = async (action: "approve" | "modify" | "reject") => {
    try {
      // Map action to status
      const statusMap = {
        approve: 1,
        modify: 2,
        reject: 3,
      };

      // Build code_results array from finalCodes (filter out new codes that don't exist in DB)
      const codeResults = Array.from(finalCodes.entries())
        .filter(([id]) => {
          const idStr = String(id);
          return !idStr.startsWith("new-");
        })
        .map(([id, data]) => ({
          id: id,
          code: data.code,
          desc:
            diagnosisData?.code_results.find((cr) => cr.id === id)?.desc || "",
          comment:
            diagnosisData?.code_results.find((cr) => cr.id === id)?.comment ||
            null,
        }));

      // Call the API
      const response = await icdDiagnosisApi.update(caseId, {
        status: statusMap[action],
        comment: comment,
        code_results: codeResults,
      });

      if (response.success) {
        const actionMessages = {
          approve: "Case approved successfully",
          modify: "Case modified and saved",
          reject: "Case rejected",
        };
        toast.success(actionMessages[action]);

        // Navigate back after short delay
        setTimeout(() => {
          router.push("/dashboard/cases");
        }, 1000);
      } else {
        toast.error(response.error || "Failed to update case");
      }
    } catch (err) {
      console.error("Error updating case:", err);
      toast.error("Failed to update case");
    }
  };

  const handleAcceptCode = (codeResultId: string | number) => {
    const idStr = String(codeResultId);
    const codeData = diagnosisData?.code_results.find(
      (cr) => String(cr.id) === idStr,
    );
    if (codeData) {
      setFinalCodes(
        new Map(
          finalCodes.set(idStr, {
            code: codeData.code,
            status: "approved",
          }),
        ),
      );
    }
  };

  const handleModifyCode = (codeResultId: string | number, newCodeValue: string) => {
    const idStr = String(codeResultId);
    // Allow empty values so user can delete all characters
    setFinalCodes(
      new Map(
        finalCodes.set(idStr, {
          code: newCodeValue,
          status: "modified",
        }),
      ),
    );
  };

  const addNewCode = () => {
    if (newCode.trim()) {
      const tempId = `new-${Date.now()}`;
      setFinalCodes(
        new Map(
          finalCodes.set(tempId, { code: newCode.trim(), status: "modified" }),
        ),
      );
      setNewCode("");
    }
  };

  // Show delete confirmation modal
  const confirmDeleteCode = (codeResultId: string | number, code: string) => {
    setDeleteConfirm({ id: String(codeResultId), code });
  };

  // Actually remove the code after confirmation
  const removeCode = () => {
    if (!deleteConfirm) return;
    const idStr = deleteConfirm.id;
    
    // Find the original code data to store in deleted
    const codeData = diagnosisData?.code_results.find(
      (cr) => String(cr.id) === idStr,
    );
    
    if (codeData) {
      // Add to deleted codes
      setDeletedCodes(new Map(
        deletedCodes.set(idStr, {
          code: codeData.code,
          desc: codeData.desc,
          comment: codeData.comment,
        })
      ));
    }
    
    // Remove from active codes
    const newMap = new Map(finalCodes);
    newMap.delete(idStr);
    setFinalCodes(newMap);
    setDeleteConfirm(null);
  };

  // Restore a deleted code
  const restoreCode = (codeResultId: string) => {
    const deleted = deletedCodes.get(codeResultId);
    if (deleted) {
      // Add back to finalCodes
      setFinalCodes(new Map(
        finalCodes.set(codeResultId, {
          code: deleted.code,
          status: "pending" as const,
        })
      ));
      // Remove from deleted
      const newDeleted = new Map(deletedCodes);
      newDeleted.delete(codeResultId);
      setDeletedCodes(newDeleted);
    }
  };

  // Check if all codes are approved (required for case approval)
  const allCodesApproved = () => {
    if (finalCodes.size === 0) return false;
    for (const [, data] of finalCodes) {
      if (data.status !== "approved") return false;
    }
    return true;
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
          <p className="text-red-600">{error || "Case not found"}</p>
          <button
            onClick={() => router.push("/dashboard/cases")}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Back to Case List
          </button>
        </div>
      </div>
    );
  }

  const patient = diagnosisData.patient;
  const statusLabel = STATUS_LABELS[diagnosisData.status] || "Unknown";
  const statusColors = STATUS_COLORS[diagnosisData.status] || STATUS_COLORS[0];

  return (
    <div className="p-4 sm:p-6 lg:p-8 overflow-x-hidden">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/dashboard/cases")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Cases
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 truncate">
              {patient.admission_number}
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              {patient.pre_diagnosis || "No pre-diagnosis"}
            </p>
          </div>
          <span
            className={`px-4 py-2 rounded-xl font-medium capitalize self-start sm:self-auto whitespace-nowrap ${statusColors.bg} ${statusColors.text} border ${statusColors.border}`}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Code?</h3>
                <p className="text-sm text-gray-500">This can be undone before you leave the page.</p>
              </div>
            </div>
            <p className="text-gray-700 mb-6">
              Are you sure you want to remove code <span className="font-mono font-bold text-red-600">{deleteConfirm.code}</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={removeCode}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Processing Issues Alert - Top of page for attention */}
      {diagnosisData.code_results.filter(
        (cr) => !cr.code || cr.code.trim() === "",
      ).length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 mb-2">
              AI Processing Issues Detected
            </p>
            <ul className="text-sm text-amber-700 space-y-1">
              {diagnosisData.code_results
                .filter((cr) => !cr.code || cr.code.trim() === "")
                .map((cr) => (
                  <li key={cr.id} className="flex items-start gap-2">
                    <span className="text-amber-500">•</span>
                    <span>{cr.comment || cr.desc || "Invalid code entry"}</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}

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
              <p className="mt-1 text-gray-900">
                {patient.age ? `${patient.age} years` : "-"}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Sex</label>
              <p className="mt-1 text-gray-900">{patient.sex || "-"}</p>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <label className="text-sm font-medium text-gray-500">
                Chief Complaint
              </label>
              <p className="mt-1 text-gray-900">
                {patient.chief_complaint || "-"}
              </p>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <label className="text-sm font-medium text-gray-500">
                Present Illness
              </label>
              <p className="mt-1 text-gray-900">
                {patient.patient_illness || "-"}
              </p>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <label className="text-sm font-medium text-gray-500">
                Patient Examine
              </label>
              <p className="mt-1 text-gray-900">
                {patient.patient_examine || "-"}
              </p>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <label className="text-sm font-medium text-gray-500">
                Pre-diagnosis
              </label>
              <p className="mt-1 text-gray-900">
                {patient.pre_diagnosis || "-"}
              </p>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <label className="text-sm font-medium text-gray-500">
                Treatment Plan
              </label>
              <p className="mt-1 text-gray-900">
                {patient.treatment_plan || "-"}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - ICD-10 Diagnosis Codes with Review */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden min-w-0">
          <div className="p-4 sm:p-6 border-b border-gray-200 bg-linear-to-br from-blue-100 to-blue-50">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600 shrink-0" />
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                ICD-10 Diagnosis Codes
              </h2>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {diagnosisData.code_results.filter(
              (cr) => cr.code && cr.code.trim() !== "",
            ).length > 0 ? (
              diagnosisData.code_results
                .filter((cr) => cr.code && cr.code.trim() !== "")
                .filter((cr) => !deletedCodes.has(String(cr.id)))
                .map((codeResult) => {
                  const idStr = String(codeResult.id);
                  const review = finalCodes.get(idStr);
                  const isApproved = review?.status === "approved";
                  const isModified = review?.status === "modified";
                  const displayCode = review?.code ?? codeResult.code;

                  return (
                    <div key={codeResult.id} className="p-4 sm:p-6">
                      {/* Header with delete button */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <span className="font-mono font-bold text-blue-700 text-base sm:text-lg">
                            {codeResult.code}
                          </span>
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${
                              isApproved
                                ? "bg-green-100 text-green-800"
                                : isModified
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-gray-200 text-gray-800"
                            }`}
                          >
                            {review?.status || "pending"}
                          </span>
                        </div>
                        <button
                          onClick={() => confirmDeleteCode(codeResult.id, codeResult.code)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove this code"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Description */}
                      <p className="text-sm text-gray-900 font-medium mb-1">
                        {codeResult.desc}
                      </p>
                      {codeResult.comment && (
                        <p className="text-xs text-gray-600 italic mb-4">
                          Note: {codeResult.comment}
                        </p>
                      )}

                      {/* Coder Review Input */}
                      <div className="bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-200 mt-3">
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                          Final Code (Editable)
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                          <input
                            type="text"
                            value={displayCode}
                            onChange={(e) =>
                              handleModifyCode(codeResult.id, e.target.value)
                            }
                            placeholder="Enter ICD-10 code..."
                            className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-0"
                          />
                          <button
                            onClick={() => handleAcceptCode(codeResult.id)}
                            className={`px-3 sm:px-4 py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                              isApproved
                                ? "bg-green-600 text-white"
                                : "bg-green-600 hover:bg-green-700 text-white hover:shadow-lg"
                            }`}
                          >
                            <Check className="w-4 h-4" />
                            <span>{isApproved ? "Accepted" : "Accept"}</span>
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

            {/* Deleted Codes Section */}
            {deletedCodes.size > 0 && (
              <div className="p-4 bg-red-50 border-t border-red-200">
                <p className="text-sm font-semibold text-red-800 mb-3 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Deleted Codes ({deletedCodes.size})
                </p>
                <div className="space-y-2">
                  {Array.from(deletedCodes.entries()).map(([id, data]) => (
                    <div key={id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                      <div className="flex-1 min-w-0">
                        <span className="font-mono font-bold text-red-600">{data.code}</span>
                        <p className="text-xs text-gray-600 truncate">{data.desc}</p>
                      </div>
                      <button
                        onClick={() => restoreCode(id)}
                        className="ml-3 px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Code */}
            <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-200">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                Add New Code
              </label>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addNewCode()}
                  placeholder="Enter new ICD-10 code..."
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-0"
                />
                <button
                  onClick={addNewCode}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Comment Section */}
          <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Review Comment
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add your review comments..."
              rows={3}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Action Buttons */}
          {!allCodesApproved() && (
            <div className="p-3 sm:p-4 bg-amber-50 border-t border-amber-200 flex items-center gap-2 text-amber-700 text-sm">
              <span className="font-medium">Note:</span>
              <span>Accept all codes individually before approving the case.</span>
            </div>
          )}
          <div className="p-4 sm:p-6 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <button
              onClick={() => handleAction("approve")}
              disabled={!allCodesApproved()}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors text-sm sm:text-base ${
                allCodesApproved()
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              <Check className="w-5 h-5" />
              Approve
            </button>
            <button
              onClick={() => handleAction("reject")}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors text-sm sm:text-base"
            >
              <Ban className="w-5 h-5" />
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
