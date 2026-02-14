import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';

interface PreviewRow {
  age: string;
  sex: string;
  cc: string;
  pi: string;
  exam: string;
  preDx: string;
  treatment: string;
}

export const UploadPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

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
    if (droppedFile && droppedFile.name.endsWith('.xlsx')) {
      handleFileSelect(droppedFile);
    } else {
      toast.error('Please upload an Excel file (.xlsx)');
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    
    // Mock preview data (in real app, parse Excel here)
    const mockPreview: PreviewRow[] = [
      {
        age: '45',
        sex: 'F',
        cc: 'Chest pain radiating to left arm',
        pi: 'Sudden onset chest pain for 2 hours',
        exam: 'BP: 145/95, HR: 98',
        preDx: 'Acute MI (rule out)',
        treatment: 'ECG, cardiac enzymes, aspirin',
      },
      {
        age: '62',
        sex: 'M',
        cc: 'Difficulty breathing',
        pi: 'Progressive dyspnea over 3 days',
        exam: 'BP: 130/80, SpO2: 91%',
        preDx: 'Pneumonia',
        treatment: 'Chest X-ray, antibiotics',
      },
      {
        age: '28',
        sex: 'F',
        cc: 'Severe headache',
        pi: 'Sudden severe headache, 9/10',
        exam: 'Neurological exam normal',
        preDx: 'Migraine',
        treatment: 'IV fluids, antiemetics',
      },
    ];
    
    setPreviewData(mockPreview);
    toast.success('File loaded successfully');
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreviewData([]);
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Please upload a file first');
      return;
    }

    setIsProcessing(true);
    
    // Simulate API call to /api/analyze
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    toast.success('Cases submitted for AI analysis');
    setIsProcessing(false);
    
    // Reset form after submission
    setTimeout(() => {
      handleRemoveFile();
    }, 1000);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Patient Cases</h1>
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
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 bg-white hover:border-gray-400'
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
                      {(file.size / 1024).toFixed(2)} KB • {previewData.length} rows
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Preview Table */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Data Preview</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Age</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Sex</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Chief Complaint</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Present Illness</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Pre-Diagnosis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">{row.age}</td>
                        <td className="py-3 px-4 text-sm text-gray-900">{row.sex}</td>
                        <td className="py-3 px-4 text-sm text-gray-900 max-w-xs truncate">
                          {row.cc}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 max-w-xs truncate">
                          {row.pi}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">{row.preDx}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Ready to Process</h4>
                  <p className="text-sm text-blue-700">
                    {previewData.length} patient records will be analyzed by AI
                  </p>
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-900 mb-1">Processing Time</h4>
                  <p className="text-sm text-yellow-700">
                    Estimated time: ~{previewData.length * 2} seconds
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={isProcessing}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : 'Submit for AI Analysis'}
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
        <h3 className="font-semibold text-gray-900 mb-4">Excel File Requirements</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>File must be in Excel format (.xlsx)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>Required columns: Age, Sex, Chief Complaint, Present Illness, Patient Examine, Pre-diagnosis, Treatment Plan</span>
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
};
