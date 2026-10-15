"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import {
  Stethoscope,
  Calendar,
  Clock,
  FileText,
  Pill,
  Upload,
  Plus,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileCheck,
} from "lucide-react";

export default function DoctorWorkspacePage() {
  const queryClient = useQueryClient();
  const { user, isDoctor } = useAuth();

  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);

  // Treatment Record Form State
  const [toothNumber, setToothNumber] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [treatmentPerformed, setTreatmentPerformed] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [treatmentError, setTreatmentError] = useState<string | null>(null);
  const [treatmentSuccess, setTreatmentSuccess] = useState(false);

  // Prescription Form State
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [rxNotes, setRxNotes] = useState("");
  const [rxFollowUpDate, setRxFollowUpDate] = useState("");
  const [rxItems, setRxItems] = useState([
    { medicine_name: "Amoxicillin (500mg)", dosage: "1 Tablet", timing: "TID after meals", duration: "5 Days", instructions: "" },
  ]);
  const [rxError, setRxError] = useState<string | null>(null);

  // Today's Doctor Agenda
  const { data: agenda = [], isLoading: isAgendaLoading } = useQuery({
    queryKey: ["doctorAgenda"],
    queryFn: async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      return api.getAdminAppointments({ date: todayStr });
    },
  });

  // Query treatment record for selected appointment
  const { data: treatmentRecord, refetch: refetchTreatment } = useQuery({
    queryKey: ["treatmentRecord", selectedAppointment?.id],
    queryFn: () => api.getTreatmentRecord(selectedAppointment.id),
    enabled: !!selectedAppointment?.id,
    retry: false,
  });

  // Query patient documents (X-rays) for selected patient
  const { data: patientDocs = [] } = useQuery({
    queryKey: ["patientDocs", selectedAppointment?.patient_id],
    queryFn: () => api.getPatientDocuments(selectedAppointment.patient_id),
    enabled: !!selectedAppointment?.patient_id,
  });

  // Query existing prescriptions for selected patient
  const { data: patientRxs = [], refetch: refetchRxs } = useQuery({
    queryKey: ["patientRxs", selectedAppointment?.patient_id],
    queryFn: () => api.getPatientPrescriptions(selectedAppointment.patient_id),
    enabled: !!selectedAppointment?.patient_id,
  });

  // Mutations
  const treatmentMutation = useMutation({
    mutationFn: (data: any) => api.createTreatmentRecord(selectedAppointment.id, data),
    onSuccess: () => {
      setTreatmentSuccess(true);
      setTreatmentError(null);
      refetchTreatment();
      queryClient.invalidateQueries({ queryKey: ["doctorAgenda"] });
    },
    onError: (err: any) => {
      setTreatmentError(err.message || "Failed to save treatment record.");
    },
  });

  const prescriptionMutation = useMutation({
    mutationFn: (data: any) => api.createPrescription(data),
    onSuccess: () => {
      setShowPrescriptionModal(false);
      setRxError(null);
      refetchRxs();
    },
    onError: (err: any) => {
      setRxError(err.message || "Failed to create prescription.");
    },
  });

  const handleSaveTreatment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis || !clinicalNotes || !treatmentPerformed) {
      setTreatmentError("Diagnosis, clinical notes, and treatment performed are required.");
      return;
    }
    treatmentMutation.mutate({
      tooth_number: toothNumber || undefined,
      diagnosis,
      clinical_notes: clinicalNotes,
      treatment_performed: treatmentPerformed,
      follow_up_recommendation: followUpNotes || undefined,
    });
  };

  const handleAddRxItem = () => {
    setRxItems([
      ...rxItems,
      { medicine_name: "", dosage: "1 Tablet", timing: "BD after meals", duration: "3 Days", instructions: "" },
    ]);
  };

  const handleRxItemChange = (index: number, field: string, val: string) => {
    const updated = [...rxItems];
    (updated[index] as any)[field] = val;
    setRxItems(updated);
  };

  const handleSavePrescription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment?.patient_id) return;
    prescriptionMutation.mutate({
      patient_id: selectedAppointment.patient_id,
      appointment_id: selectedAppointment.id,
      notes: rxNotes,
      follow_up_date: rxFollowUpDate || undefined,
      items: rxItems,
    });
  };

  const handleViewDocument = async (docId: string) => {
    try {
      const res = await api.getDocumentDownloadUrl(docId);
      if (res.download_url) {
        window.open(res.download_url, "_blank");
      }
    } catch (err: any) {
      alert(err.message || "Failed to generate document URL.");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-teal-600" />
            Doctor Clinical Workspace
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Clinical charting, dental notes, prescription authoring, and X-ray radiograph inspection
          </p>
        </div>
        {selectedAppointment && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPrescriptionModal(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all"
            >
              <Pill className="w-4 h-4" />
              Write Prescription
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Agenda Queue & Clinical Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Agenda Queue */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Today&apos;s Clinical Agenda</h2>
            <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
              {agenda.length} cases
            </span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto">
            {isAgendaLoading ? (
              <p className="text-xs text-slate-400 text-center py-8">Loading doctor schedule...</p>
            ) : agenda.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No appointments scheduled for today.</p>
            ) : (
              agenda.map((app: any) => (
                <div
                  key={app.id}
                  onClick={() => {
                    setSelectedAppointment(app);
                    setToothNumber("");
                    setDiagnosis("");
                    setClinicalNotes("");
                    setTreatmentPerformed("");
                    setTreatmentSuccess(false);
                    setTreatmentError(null);
                  }}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedAppointment?.id === app.id
                      ? "border-teal-500 bg-teal-50/70 shadow-sm ring-2 ring-teal-500/20"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-900">{app.patient_name}</span>
                    <span className="font-mono text-[11px] text-teal-700">{app.start_time}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 font-medium">{app.service_name}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100/80 text-[10px]">
                    <span className="text-slate-400">{app.doctor_name}</span>
                    <span
                      className={`font-bold uppercase ${
                        app.status === "COMPLETED"
                          ? "text-slate-500"
                          : app.status === "CHECKED_IN"
                          ? "text-blue-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Clinical Charting & Operatory Editor */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedAppointment ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-12 text-center space-y-3">
              <Stethoscope className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-base text-slate-700">Select a Patient to Begin Consultation</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Choose an appointment from your agenda on the left to enter clinical treatment records, prescribe medications, or inspect patient radiographs.
              </p>
            </div>
          ) : (
            <>
              {/* Patient Banner */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedAppointment.patient_name}</h2>
                  <p className="text-xs text-slate-500">
                    Service: <span className="font-semibold text-slate-800">{selectedAppointment.service_name}</span> • Time: {selectedAppointment.start_time}
                  </p>
                  {selectedAppointment.chief_complaint && (
                    <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded-lg mt-2 border border-amber-200/60">
                      <strong>Chief Complaint:</strong> {selectedAppointment.chief_complaint}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-100 text-teal-800">
                    {selectedAppointment.status}
                  </span>
                </div>
              </div>

              {/* Treatment Record Editor or View */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-5">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-teal-600" />
                    Clinical Treatment Record
                  </h3>
                  {treatmentRecord && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <FileCheck className="w-3 h-3" /> Finalized
                    </span>
                  )}
                </div>

                {treatmentSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Clinical record successfully saved and audited to patient file.</span>
                  </div>
                )}

                {treatmentError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{treatmentError}</span>
                  </div>
                )}

                {treatmentRecord ? (
                  <div className="space-y-3.5 text-xs">
                    {treatmentRecord.tooth_number && (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-400 text-[10px] block font-semibold">Tooth / Operatory Area:</span>
                        <span className="font-bold text-slate-800">{treatmentRecord.tooth_number}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400 text-[10px] block font-semibold">Clinical Diagnosis:</span>
                      <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-800 font-medium">
                        {treatmentRecord.diagnosis}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-semibold">Treatment Performed:</span>
                      <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-800">
                        {treatmentRecord.treatment_performed}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-semibold">Doctor Clinical Notes:</span>
                      <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-700">
                        {treatmentRecord.clinical_notes}
                      </p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSaveTreatment} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tooth / Treatment Area (e.g. FDI 16, 21, Lower Arch)
                      </label>
                      <input
                        type="text"
                        value={toothNumber}
                        onChange={(e) => setToothNumber(e.target.value)}
                        placeholder="Tooth #16 (Upper Right First Molar)"
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Clinical Diagnosis *
                      </label>
                      <input
                        type="text"
                        required
                        value={diagnosis}
                        onChange={(e) => setDiagnosis(e.target.value)}
                        placeholder="e.g. Deep dental caries with pulp involvement, irreversible pulpitis"
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Treatment Performed *
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={treatmentPerformed}
                        onChange={(e) => setTreatmentPerformed(e.target.value)}
                        placeholder="Details of procedure performed, local anesthesia, materials used..."
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Confidential Clinical Notes & Findings *
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={clinicalNotes}
                        onChange={(e) => setClinicalNotes(e.target.value)}
                        placeholder="Internal doctor clinical remarks, vitality tests, radiographic evaluation..."
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Follow-up Recommendation
                      </label>
                      <input
                        type="text"
                        value={followUpNotes}
                        onChange={(e) => setFollowUpNotes(e.target.value)}
                        placeholder="e.g. Review for second visit obturation in 5 days"
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={treatmentMutation.isPending}
                        className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5"
                      >
                        {treatmentMutation.isPending ? "Finalizing..." : "Finalize Treatment Record"}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Patient X-Rays & Medical Files Section */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-teal-600" />
                    Patient Diagnostic Radiographs & Reports
                  </h3>
                  <span className="text-xs text-slate-400">{patientDocs.length} files</span>
                </div>
                {patientDocs.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No digital X-rays uploaded for this patient.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {patientDocs.map((doc: any) => (
                      <div key={doc.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                        <div className="truncate pr-2">
                          <p className="font-semibold text-slate-800 truncate">{doc.file_name}</p>
                          <p className="text-[10px] text-slate-500 uppercase">{doc.document_type} • {(doc.file_size_bytes / 1024).toFixed(0)} KB</p>
                        </div>
                        <button
                          onClick={() => handleViewDocument(doc.id)}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-teal-700 font-semibold hover:bg-teal-50 flex items-center gap-1 shrink-0"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Write Prescription Modal */}
      {showPrescriptionModal && selectedAppointment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Pill className="w-5 h-5 text-indigo-600" />
                Sign Prescription for {selectedAppointment.patient_name}
              </h3>
              <button onClick={() => setShowPrescriptionModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">
                ✕
              </button>
            </div>

            {rxError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{rxError}</span>
              </div>
            )}

            <form onSubmit={handleSavePrescription} className="space-y-4">
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {rxItems.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Medication #{idx + 1}</span>
                      {rxItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setRxItems(rxItems.filter((_, i) => i !== idx))}
                          className="text-rose-600 text-[11px] font-semibold"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Medicine name (e.g. Amoxicillin 500mg)"
                      value={item.medicine_name}
                      onChange={(e) => handleRxItemChange(idx, "medicine_name", e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Dosage (e.g. 1 Tab)"
                        value={item.dosage}
                        onChange={(e) => handleRxItemChange(idx, "dosage", e.target.value)}
                        className="p-2 border border-slate-200 rounded-lg bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Timing (e.g. TID after food)"
                        value={item.timing}
                        onChange={(e) => handleRxItemChange(idx, "timing", e.target.value)}
                        className="p-2 border border-slate-200 rounded-lg bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Duration (e.g. 5 days)"
                        value={item.duration}
                        onChange={(e) => handleRxItemChange(idx, "duration", e.target.value)}
                        className="p-2 border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddRxItem}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Another Medicine
              </button>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={rxFollowUpDate}
                    onChange={(e) => setRxFollowUpDate(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    General Instructions
                  </label>
                  <input
                    type="text"
                    value={rxNotes}
                    onChange={(e) => setRxNotes(e.target.value)}
                    placeholder="e.g. Warm salt water rinses"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPrescriptionModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={prescriptionMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm"
                >
                  {prescriptionMutation.isPending ? "Signing..." : "Sign & Authorize Prescription"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
