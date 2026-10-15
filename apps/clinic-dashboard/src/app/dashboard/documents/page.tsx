"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import {
  FileText,
  Upload,
  Download,
  Eye,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Filter,
} from "lucide-react";

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Upload Form State
  const [targetPatientId, setTargetPatientId] = useState("");
  const [docType, setDocType] = useState("X_RAY");
  const [description, setDescription] = useState("");
  const [isPatientVisible, setIsPatientVisible] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Queries
  const { data: patientsData } = useQuery({
    queryKey: ["patientsList"],
    queryFn: () => api.getPatients(undefined, 1, 100),
  });

  const { data: documents = [], isLoading, refetch } = useQuery({
    queryKey: ["documents", selectedPatientId],
    queryFn: () => (selectedPatientId ? api.getPatientDocuments(selectedPatientId) : Promise.resolve([])),
    enabled: !!selectedPatientId,
  });

  // Mutation
  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => api.uploadDocument(targetPatientId, formData),
    onSuccess: () => {
      setShowUploadModal(false);
      setUploadError(null);
      setSelectedFile(null);
      setDescription("");
      if (selectedPatientId === targetPatientId) {
        refetch();
      } else {
        setSelectedPatientId(targetPatientId);
      }
    },
    onError: (err: any) => {
      setUploadError(err.message || "Failed to upload document.");
    },
  });

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPatientId || !selectedFile) {
      setUploadError("Please select a patient and a document file.");
      return;
    }
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("document_type", docType);
    formData.append("description", description);
    formData.append("is_patient_visible", isPatientVisible ? "true" : "false");
    uploadMutation.mutate(formData);
  };

  const { user, isDoctor, isAdmin } = useAuth();

  const handleDownload = async (docId: string) => {
    try {
      const res = await api.getDocumentDownloadUrl(docId);
      if (res.download_url) {
        window.open(res.download_url, "_blank");
      }
    } catch (err: any) {
      alert(err.message || "Failed to generate download URL.");
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => api.deleteDocument(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", selectedPatientId] });
      alert("Medical document successfully deleted by Doctor.");
    },
    onError: (err: any) => {
      alert(err.message || "Failed to delete document. Only doctors can delete medical records.");
    },
  });

  const handleDelete = (doc: any) => {
    if (!isDoctor && !isAdmin) {
      alert("Access Denied: Only clinic Doctors (Dr. Kumar or Dr. Neha) can delete medical records.");
      return;
    }
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${doc.file_name}"?\n\nThis action is strictly restricted to Doctors and will be recorded in the clinic audit log.`
    );
    if (confirmed) {
      deleteMutation.mutate(doc.id);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Medical Document Locker</h1>
          <p className="text-xs text-slate-500 mt-1">
            Access-controlled digital X-rays, OPG scans, diagnostic reports, and medical attachments
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all"
        >
          <Upload className="w-4 h-4" />
          Upload Medical File
        </button>
      </div>

      {/* Patient Selector */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
        <label className="text-xs font-semibold text-slate-600">Select Patient:</label>
        <select
          value={selectedPatientId}
          onChange={(e) => setSelectedPatientId(e.target.value)}
          className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white min-w-[280px]"
        >
          <option value="">-- Choose Patient to Inspect Documents --</option>
          {patientsData?.items?.map((p: any) => (
            <option key={p.id} value={p.id}>
              {p.full_name} ({p.phone || "No phone"})
            </option>
          ))}
        </select>
      </div>

      {/* Documents Grid / Table */}
      {!selectedPatientId ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-12 text-center space-y-3">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-base text-slate-700">Select a Patient</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Choose a registered patient above to browse their medical radiographs, lab reports, and uploaded records.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Patient Medical Files</h2>
            <span className="text-xs text-slate-400">{documents.length} files on record</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">File Size</th>
                  <th className="py-3 px-4">Patient Portal</th>
                  <th className="py-3 px-4">Upload Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Loading patient files...
                    </td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No documents uploaded for this patient yet.
                    </td>
                  </tr>
                ) : (
                  documents.map((doc: any) => (
                    <tr key={doc.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">{doc.file_name}</p>
                        {doc.description && <p className="text-[11px] text-slate-400">{doc.description}</p>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] uppercase">
                          {doc.document_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {(doc.file_size_bytes / 1024).toFixed(0)} KB
                      </td>
                      <td className="py-3.5 px-4">
                        {doc.is_patient_visible ? (
                          <span className="text-emerald-600 font-semibold text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Visible
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Staff Only</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownload(doc.id)}
                            className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-all"
                            title="View / Download 15-minute signed URL"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                          {(isDoctor || isAdmin) && (
                            <button
                              onClick={() => handleDelete(doc)}
                              disabled={deleteMutation.isPending}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-all disabled:opacity-50"
                              title="Doctor only: Permanently delete report from clinic storage"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Upload Patient Document</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">
                ✕
              </button>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Patient *</label>
                <select
                  required
                  value={targetPatientId}
                  onChange={(e) => setTargetPatientId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                >
                  <option value="">-- Choose Patient --</option>
                  {patientsData?.items?.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Document Category</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                >
                  <option value="X_RAY">Dental X-Ray / Radiograph (IOPA/OPG)</option>
                  <option value="LAB_REPORT">Laboratory Investigation Report</option>
                  <option value="PRESCRIPTION_SCAN">Prescription Scan</option>
                  <option value="CLINICAL_PHOTO">Clinical Pre/Post Photo</option>
                  <option value="OTHER">Other Clinical Record</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">File Attachment (JPG, PNG, PDF, TIFF - Max 25MB) *</label>
                <input
                  type="file"
                  required
                  accept="image/jpeg,image/png,image/webp,application/pdf,image/tiff"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-xl bg-slate-50 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Pre-operative radiograph of tooth 16"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="visibleCheckbox"
                  checked={isPatientVisible}
                  onChange={(e) => setIsPatientVisible(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="visibleCheckbox" className="text-xs text-slate-700">
                  Visible to patient in mobile application
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-sm"
                >
                  {uploadMutation.isPending ? "Uploading..." : "Upload to Vault"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
