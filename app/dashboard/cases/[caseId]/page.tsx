"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { icdDiagnosisApi } from "@/lib/icd-diagnosis-api";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  type ICDDiagnosisDetail,
} from "@/types/icd-diagnosis";
import {
  ArrowLeft,
  User,
  Activity,
  FileText,
  Plus,
  X,
  Check,
  Edit,
  Ban,
  Loader2,
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
  const [newCode, setNewCode] = useState("");
  const [comment, setComment] = useState("");

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
              codesMap.set(cr.id, {
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

      // Build code_results array from finalCodes
      const codeResults = Array.from(finalCodes.entries()).map(
        ([id, data]) => ({
          id: id.startsWith("new-") ? undefined : id, // New codes don't have an ID
          code: data.code,
          desc:
            diagnosisData?.code_results.find((cr) => cr.id === id)?.desc || "",
          comment:
            diagnosisData?.code_results.find((cr) => cr.id === id)?.comment ||
            null,
        }),
      );

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

  const handleAcceptCode = (codeResultId: string) => {
    const codeData = diagnosisData?.code_results.find(
      (cr) => cr.id === codeResultId,
    );
    if (codeData) {
      setFinalCodes(
        new Map(
          finalCodes.set(codeResultId, {
            code: codeData.code,
            status: "approved",
          }),
        ),
      );
    }
  };

  const handleModifyCode = (codeResultId: string, newCodeValue: string) => {
    // Allow empty values so user can delete all characters
    setFinalCodes(
      new Map(
        finalCodes.set(codeResultId, {
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

  const removeCode = (codeResultId: string) => {
    const newMap = new Map(finalCodes);
    newMap.delete(codeResultId);
    setFinalCodes(newMap);
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
                .map((codeResult) => {
                  const review = finalCodes.get(codeResult.id);
                  const isApproved = review?.status === "approved";
                  const isModified = review?.status === "modified";
                  const displayCode = review?.code || codeResult.code;

                  return (
                    <div key={codeResult.id} className="p-4 sm:p-6">
                      {/* AI Suggestion */}
                      <div className="mb-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
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
                            <p className="text-sm text-gray-900 font-medium mb-1">
                              {codeResult.desc}
                            </p>
                            {codeResult.comment && (
                              <p className="text-xs text-gray-600 italic">
                                Note: {codeResult.comment}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Coder Review Input */}
                      <div className="bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-200">
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
                          <div className="flex gap-2 sm:gap-3">
                            <button
                              onClick={() => handleAcceptCode(codeResult.id)}
                              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                                isApproved
                                  ? "bg-green-600 text-white"
                                  : "bg-green-600 hover:bg-green-700 text-white hover:shadow-lg"
                              }`}
                            >
                              <Check className="w-4 h-4" />
                              <span className="hidden sm:inline">
                                {isApproved ? "Accepted" : "Accept"}
                              </span>
                            </button>
                            <button
                              onClick={() => removeCode(codeResult.id)}
                              className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
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

            {/* Show any invalid code warnings */}
            {diagnosisData.code_results.filter(
              (cr) => !cr.code || cr.code.trim() === "",
            ).length > 0 && (
              <div className="p-4 bg-amber-50 border-t border-amber-200">
                <p className="text-sm font-medium text-amber-800 mb-2">
                  AI Processing Notes:
                </p>
                <ul className="text-xs text-amber-700 space-y-1">
                  {diagnosisData.code_results
                    .filter((cr) => !cr.code || cr.code.trim() === "")
                    .map((cr) => (
                      <li key={cr.id} className="flex items-start gap-2">
                        <span className="text-amber-500">•</span>
                        <span>
                          {cr.comment || cr.desc || "Invalid code entry"}
                        </span>
                      </li>
                    ))}
                </ul>
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
          <div className="p-4 sm:p-6 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <button
              onClick={() => handleAction("approve")}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors text-sm sm:text-base"
            >
              <Check className="w-5 h-5" />
              Approve
            </button>
            <button
              onClick={() => handleAction("modify")}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors text-sm sm:text-base"
            >
              <Edit className="w-5 h-5" />
              Modify
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
