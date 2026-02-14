"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileSpreadsheet,
  X,
  Loader2,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface PreviewRow {
  age: string;
  sex: string;
  cc: string;
  pi: string;
  exam: string;
  preDx: string;
  treatment: string;
}

interface ExcelExtractResponse {
  success: boolean;
  data: Record<string, any[]>;
  metadata: {
    fileName: string;
    fileSize: number;
    sheetNames: string[];
    sheetCount: number;
    uploadedAt: string;
    totalInserted: number;
    insertedCases: string[];
  };
}

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith(".xlsx")) {
      setFile(droppedFile);
      toast.success("File selected: " + droppedFile.name);
    } else {
      toast.error("Please upload an Excel file (.xlsx)");
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      toast.success("File selected: " + selectedFile.name);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Please upload a file first");
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/excel/extract", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to extract Excel data");
      }

      const result: ExcelExtractResponse = await response.json();

      const { totalInserted, insertedCases } = result.metadata;

      console.log("Stored cases:", insertedCases);
      setUploadedCount(totalInserted);

      // Show success animation
      setShowSuccess(true);

      // Navigate to cases page after showing success animation
      setTimeout(() => {
        router.push("/dashboard/cases");
      }, 2500);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to process Excel file",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-8">
      {/* Success Animation Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-10 shadow-2xl text-center animate-in zoom-in-95 duration-500 max-w-md mx-4">
            {/* Animated Checkmark Circle */}
            <div className="relative mx-auto w-24 h-24 mb-6">
              <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-40"></div>
              <div className="absolute inset-0 bg-green-100 rounded-full animate-pulse"></div>
              <div className="relative w-full h-full bg-linear-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-200">
                <CheckCircle className="w-12 h-12 text-white animate-in zoom-in duration-300 delay-200" />
              </div>
              {/* Sparkles */}
              <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-bounce" />
              <Sparkles className="absolute -bottom-1 -left-3 w-5 h-5 text-yellow-400 animate-bounce delay-100" />
              <Sparkles className="absolute top-0 -left-4 w-4 h-4 text-yellow-400 animate-bounce delay-200" />
            </div>

            {/* Success Text */}
            <h2 className="text-2xl font-bold text-gray-900 mb-2 animate-in slide-in-from-bottom duration-500 delay-100">
              Upload Successful!
            </h2>
            <p className="text-gray-600 mb-4 animate-in slide-in-from-bottom duration-500 delay-150">
              {uploadedCount} patient{" "}
              {uploadedCount === 1 ? "case has" : "cases have"} been submitted
              for AI analysis
            </p>

            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-2 text-sm text-green-600 font-medium animate-in fade-in duration-500 delay-300">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              AI analysis in progress...
            </div>

            {/* Confetti-like dots */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
              <div className="absolute top-4 left-8 w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-75"></div>
              <div className="absolute top-6 right-12 w-3 h-3 bg-purple-400 rounded-full animate-bounce delay-150"></div>
              <div className="absolute bottom-8 left-12 w-2 h-2 bg-pink-400 rounded-full animate-bounce delay-200"></div>
              <div className="absolute bottom-6 right-8 w-2 h-2 bg-yellow-400 rounded-full animate-bounce delay-100"></div>
              <div className="absolute top-12 left-4 w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce delay-300"></div>
              <div className="absolute bottom-12 right-4 w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-250"></div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Upload Patient Cases
        </h1>
        <p className="text-gray-600">
          Upload an Excel file containing patient data for AI analysis
        </p>
      </div>

      {/* Upload Area */}
      <div className="max-w-4xl">
        {!file ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 bg-white hover:border-gray-400"
            }`}
          >
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Drop your Excel file here
              </h3>
              <p className="text-gray-600 mb-6">or click to browse</p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <span className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors">
                  Select Excel File
                </span>
              </label>
              <p className="text-sm text-gray-500 mt-4">
                Supported format: .xlsx (Excel 2007+)
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* File Info Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{file.name}</h3>
                    <p className="text-sm text-gray-600">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  disabled={isProcessing}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Processing Status */}
            {isProcessing && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900 mb-1">
                      Processing your file...
                    </h4>
                    <p className="text-sm text-blue-700">
                      Extracting data and running AI analysis. This may take a
                      moment.
                    </p>
                    <div className="mt-3 w-full bg-blue-200 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-blue-600 h-1.5 rounded-full animate-pulse w-2/3"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={isProcessing}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Submit for AI Analysis"
                )}
              </button>
              <button
                onClick={handleRemoveFile}
                disabled={isProcessing}
                className="px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="max-w-4xl mt-8 bg-white border border-gray-200 rounded-2xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">
          Excel File Requirements
        </h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>File must be in Excel format (.xlsx)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>
              Required columns: Age, Sex, Chief Complaint, Present Illness,
              Patient Examine, Pre-diagnosis, Treatment Plan
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>First row should contain column headers</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>Maximum file size: 10 MB</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
