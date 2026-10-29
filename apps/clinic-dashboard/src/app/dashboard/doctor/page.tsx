"use client";

import React, { useState, useMemo } from "react";
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
  HeartPulse,
  ShieldAlert,
  Sparkles,
  Printer,
  Search,
  UserCheck,
  Phone,
  Droplets,
  Activity,
  History,
} from "lucide-react";

// Adult FDI Tooth Numbering Chart (32 Teeth)
const UPPER_RIGHT_Q1 = ["18", "17", "16", "15", "14", "13", "12", "11"];
const UPPER_LEFT_Q2 = ["21", "22", "23", "24", "25", "26", "27", "28"];
const LOWER_RIGHT_Q4 = ["48", "47", "46", "45", "44", "43", "42", "41"];
const LOWER_LEFT_Q3 = ["31", "32", "33", "34", "35", "36", "37", "38"];

const TOOTH_NAMES: Record<string, string> = {
  "1": "Central Incisor",
  "2": "Lateral Incisor",
  "3": "Canine",
  "4": "First Premolar",
  "5": "Second Premolar",
  "6": "First Molar",
  "7": "Second Molar",
  "8": "Third Molar (Wisdom)",
};

const CLINICAL_TEMPLATES = [
  {
    label: "RCT — Access & BMP",
    diagnosis: "Symptomatic irreversible pulpitis with apical periodontitis",
    treatment:
      "Local anesthesia (2% Lignocaine with 1:80,000 adrenaline) administered. Rubber dam isolation achieved. Access cavity prepared, pulp extirpated, working length determined via electronic apex locator & IOPA radiograph. Biomechanical preparation (BMP) completed using rotary NiTi files with copious 3% NaOCl & EDTA irrigation. Calcium hydroxide intracanal medicament placed and closed dressing given.",
    notes: "Percussion tender (+), vitality test delayed positive. 3 canals located (MB, DB, P / M, D). Patient tolerated procedure well.",
    followUp: "Recall in 5–7 days for obturation and permanent core build-up.",
  },
  {
    label: "Composite Filling",
    diagnosis: "Deep Class II dentinal caries without pulpal exposure",
    treatment:
      "Caries excavated completely under air-water spray. Cavity prepared, selective enamel etching with 37% phosphoric acid (15s), universal bonding agent applied and light-cured. Incremental layering of nano-hybrid tooth-colored composite restoration completed. Occlusion checked with articulating paper and high pointsfinished & polished.",
    notes: "Cold test normal, no lingering pain, radiographic pulp horns intact. Glass ionomer liner placed over deep dentin.",
    followUp: "Review in 6 months during routine dental checkup.",
  },
  {
    label: "Scaling & Polishing",
    diagnosis: "Generalized chronic marginal gingivitis with supragingival & subgingival calculus",
    treatment:
      "Full-mouth ultrasonic piezoelectric scaling performed across all four quadrants to remove plaque, stains, and subgingival calculus deposits. Interdental flossing and prophylactic polishing completed with fluoride paste.",
    notes: "Gingival bleeding on probing (BOP) noted in lower anterior and molar regions. Oral hygiene instructions (Modified Bass technique) demonstrated.",
    followUp: "Use warm saline rinses & Chlorhexidine mouthwash for 7 days; recall in 6 months.",
  },
  {
    label: "Wisdom / Tooth Extraction",
    diagnosis: "Pericoronitis / Non-restorable grossly carious molar indicated for extraction",
    treatment:
      "Inferior alveolar nerve block + long buccal nerve block administered (2% Lignocaine w/ adrenaline). Mucoperiosteal flap elevated, atraumatic luxation and forceps delivery of tooth completed. Socket curetted, irrigated with normal saline & betadine, hemostasis achieved with sterile gauze pack (3-0 silk suture placed).",
    notes: "Post-extraction instructions explained verbally and in writing (bite on gauze for 45 mins, soft cold diet for 24 hrs, no spitting/smoking).",
    followUp: "Suture removal and healing review after 7 days.",
  },
  {
    label: "Crown / Bridge Prep",
    diagnosis: "Endodontically treated tooth requiring full-coverage prosthetic crown",
    treatment:
      "Anatomical tooth reduction performed (1.5mm occlusal, 1.0mm axial chamfer finish line). Gingival retraction cord packed, dual-phase elastomer/digital impression recorded along with bite registration. Shade selected (Vita A2). Provisional acrylic crown cemented with non-eugenol temporary luting cement.",
    notes: "Abutment walls parallel, adequate ferrule effect (>2mm) verified all around.",
    followUp: "Final Zirconia/PFM crown cementation scheduled in 4 days.",
  },
];

const RX_PRESETS = [
  {
    label: "Antibiotic: Amox + Clav 625mg",
    item: {
      medicine_name: "Tab. Augmentin 625mg (Amoxicillin + Clavulanate)",
      dosage: "1 Tablet",
      timing: "BD after meals (Morning & Night)",
      duration: "5 Days",
      instructions: "Complete full antibiotic course",
    },
  },
  {
    label: "Painkiller: Zerodol-SP",
    item: {
      medicine_name: "Tab. Zerodol-SP (Aceclofenac 100mg + Paracetamol 325mg + Serratiopeptidase 15mg)",
      dosage: "1 Tablet",
      timing: "BD after meals",
      duration: "3 Days",
      instructions: "For dental pain and swelling",
    },
  },
  {
    label: "Anaerobic: Metronidazole 400mg",
    item: {
      medicine_name: "Tab. Flagyl 400mg (Metronidazole)",
      dosage: "1 Tablet",
      timing: "TID after meals",
      duration: "5 Days",
      instructions: "Avoid alcohol during course",
    },
  },
  {
    label: "Gastro-Protective: Pan-40",
    item: {
      medicine_name: "Cap. Pan-40 (Pantoprazole 40mg)",
      dosage: "1 Capsule",
      timing: "OD empty stomach (30 mins before breakfast)",
      duration: "5 Days",
      instructions: "Prevents acidity from painkillers",
    },
  },
  {
    label: "Mouthwash: Chlorhexidine 0.2%",
    item: {
      medicine_name: "Hexidine Mouthwash (Chlorhexidine Gluconate 0.2%)",
      dosage: "10 ml undiluted",
      timing: "BD (30 mins after brushing)",
      duration: "7 Days",
      instructions: "Swish for 30 seconds and spit; do not eat/drink for 30 mins after",
    },
  },
];

export default function DoctorWorkspacePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Agenda Filter State
  const [dateFilterMode, setDateFilterMode] = useState<"all" | "today" | "custom">("all");
  const [customDate, setCustomDate] = useState("");
  const [agendaSearch, setAgendaSearch] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);

  // Interactive Odontogram & Vitals State
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>([]);
  const [toothConditionMap, setToothConditionMap] = useState<Record<string, string>>({});
  const [activeConditionBrush, setActiveConditionBrush] = useState<string>("Caries / Decay");
  const [vitals, setVitals] = useState({
    bp: "120/80",
    pulse: "74",
    spo2: "99",
    rbs: "",
  });

  // Treatment Record Form State
  const [toothNumber, setToothNumber] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [treatmentPerformed, setTreatmentPerformed] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [treatmentError, setTreatmentError] = useState<string | null>(null);
  const [treatmentSuccess, setTreatmentSuccess] = useState(false);

  // Radiograph / Document Upload State
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState("DENTAL_XRAY");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Prescription Form State
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [rxNotes, setRxNotes] = useState("Warm saline rinses 3–4 times daily after meals.");
  const [rxFollowUpDate, setRxFollowUpDate] = useState("");
  const [rxItems, setRxItems] = useState([
    {
      medicine_name: "Tab. Augmentin 625mg (Amoxicillin + Clavulanate)",
      dosage: "1 Tablet",
      timing: "BD after meals",
      duration: "5 Days",
      instructions: "Complete full course",
    },
  ]);
  const [rxError, setRxError] = useState<string | null>(null);

  // Doctor Agenda Query
  const { data: agenda = [], isLoading: isAgendaLoading } = useQuery({
    queryKey: ["doctorAgenda", dateFilterMode, customDate],
    queryFn: async () => {
      if (dateFilterMode === "today") {
        const todayStr = new Date().toISOString().split("T")[0];
        return api.getAdminAppointments({ date: todayStr });
      }
      if (dateFilterMode === "custom" && customDate) {
        return api.getAdminAppointments({ date: customDate });
      }
      return api.getAdminAppointments({});
    },
  });

  const filteredAgenda = useMemo(() => {
    if (!agendaSearch.trim()) return agenda;
    const q = agendaSearch.toLowerCase();
    return agenda.filter(
      (a: any) =>
        (a.patient_name || "").toLowerCase().includes(q) ||
        (a.service_name || "").toLowerCase().includes(q) ||
        (a.patient_phone || "").toLowerCase().includes(q)
    );
  }, [agenda, agendaSearch]);

  // Query Full Patient Profile (Allergies, Blood Group, DOB, Past Visits)
  const { data: patientDetail } = useQuery({
    queryKey: ["patientDetail", selectedAppointment?.patient_id],
    queryFn: () => api.getPatientDetail(selectedAppointment.patient_id),
    enabled: !!selectedAppointment?.patient_id,
  });

  // Query Treatment Record for Selected Appointment
  const { data: treatmentRecord, refetch: refetchTreatment } = useQuery({
    queryKey: ["treatmentRecord", selectedAppointment?.id],
    queryFn: () => api.getTreatmentRecord(selectedAppointment.id),
    enabled: !!selectedAppointment?.id,
    retry: false,
  });

  // Query Patient Documents (X-rays & Reports)
  const { data: patientDocs = [], refetch: refetchDocs } = useQuery({
    queryKey: ["patientDocs", selectedAppointment?.patient_id],
    queryFn: () => api.getPatientDocuments(selectedAppointment.patient_id),
    enabled: !!selectedAppointment?.patient_id,
  });

  // Query Patient Prescriptions History
  const { data: patientRxs = [], refetch: refetchRxs } = useQuery({
    queryKey: ["patientRxs", selectedAppointment?.patient_id],
    queryFn: () => api.getPatientPrescriptions(selectedAppointment.patient_id),
    enabled: !!selectedAppointment?.patient_id,
  });

  // Appointment Status Mutation (Check-in / Complete)
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateAppointmentStatus(id, status, `Updated from Doctor Clinical Workspace`),
    onSuccess: (updated) => {
      setSelectedAppointment((prev: any) => (prev ? { ...prev, status: updated.status } : prev));
      queryClient.invalidateQueries({ queryKey: ["doctorAgenda"] });
    },
  });

  // Save Treatment Record Mutation
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

  // Upload Radiograph / Document Mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!uploadFile || !selectedAppointment?.patient_id) {
        throw new Error("Please select a file to upload.");
      }
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("document_type", uploadType);
      if (uploadDescription.trim()) {
        fd.append("description", uploadDescription.trim());
      }
      return api.uploadDocument(selectedAppointment.patient_id, fd);
    },
    onSuccess: () => {
      setShowUploadForm(false);
      setUploadFile(null);
      setUploadDescription("");
      setUploadError(null);
      refetchDocs();
    },
    onError: (err: any) => {
      setUploadError(err.message || "Failed to upload document.");
    },
  });

  // Create Prescription Mutation
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

  // Toggle Tooth on FDI Odontogram
  const handleToggleTooth = (fdi: string) => {
    const quadrantNum = fdi[0];
    const toothIdx = fdi[1];
    const archLabel =
      quadrantNum === "1"
        ? "UR"
        : quadrantNum === "2"
        ? "UL"
        : quadrantNum === "3"
        ? "LL"
        : "LR";
    const desc = `#${fdi} (${archLabel} ${TOOTH_NAMES[toothIdx] || "Tooth"})`;

    setSelectedTeeth((prev) => {
      const exists = prev.includes(fdi);
      const next = exists ? prev.filter((t) => t !== fdi) : [...prev, fdi];
      const formatted = next
        .map((code) => {
          const cond =
            code === fdi && !exists
              ? activeConditionBrush
              : toothConditionMap[code] || activeConditionBrush;
          return `FDI #${code} [${cond}]`;
        })
        .join(", ");
      setToothNumber(formatted);
      return next;
    });

    setToothConditionMap((prev) => ({
      ...prev,
      [fdi]: activeConditionBrush,
    }));

    if (!diagnosis && activeConditionBrush) {
      setDiagnosis(`${activeConditionBrush} involving ${desc}`);
    }
  };

  const handleApplyTemplate = (tpl: (typeof CLINICAL_TEMPLATES)[number]) => {
    setDiagnosis(tpl.diagnosis);
    setTreatmentPerformed(tpl.treatment);
    const vitalsSummary = `[Vitals: BP ${vitals.bp} mmHg, Pulse ${vitals.pulse} bpm, SpO2 ${vitals.spo2}%${
      vitals.rbs ? `, RBS ${vitals.rbs} mg/dL` : ""
    }] `;
    setClinicalNotes(vitalsSummary + tpl.notes);
    setFollowUpNotes(tpl.followUp);
  };

  const handleSaveTreatment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis || !clinicalNotes || !treatmentPerformed) {
      setTreatmentError("Diagnosis, clinical notes, and treatment performed are required.");
      return;
    }
    const vitalsPrefix = clinicalNotes.includes("[Vitals:")
      ? ""
      : `[Vitals: BP ${vitals.bp} mmHg, HR ${vitals.pulse} bpm, SpO2 ${vitals.spo2}%${
          vitals.rbs ? `, RBS ${vitals.rbs} mg/dL` : ""
        }] `;
    treatmentMutation.mutate({
      tooth_number: toothNumber || undefined,
      diagnosis,
      clinical_notes: vitalsPrefix + clinicalNotes,
      treatment_performed: treatmentPerformed,
      follow_up_recommendation: followUpNotes || undefined,
    });
  };

  const handleAddRxItem = () => {
    setRxItems([
      ...rxItems,
      {
        medicine_name: "",
        dosage: "1 Tablet",
        timing: "BD after meals",
        duration: "3 Days",
        instructions: "",
      },
    ]);
  };

  const handleAddPresetRx = (presetItem: (typeof RX_PRESETS)[number]["item"]) => {
    setRxItems((prev) => [...prev, { ...presetItem }]);
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

  const handlePrintPrescription = (rx: any) => {
    const printWin = window.open("", "_blank", "width=800,height=700");
    if (!printWin) return;
    const rowsHtml = (rx.items || [])
      .map(
        (it: any, i: number) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${i + 1}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;font-weight:600;">${it.medicine_name}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${it.dosage}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${it.timing}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${it.duration}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#475569;">${it.instructions || "-"}</td>
        </tr>`
      )
      .join("");

    printWin.document.write(`
      <html>
        <head>
          <title>Prescription - ${selectedAppointment?.patient_name || "Patient"}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
            .header { border-bottom: 2px solid #ef4444; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
            th { text-align: left; background: #f8fafc; padding: 8px; border-bottom: 2px solid #cbd5e1; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h2 style="margin:0;color:#b91c1c;">KUMAR DENTAL CLINIC</h2>
              <p style="margin:4px 0 0;font-size:12px;color:#475569;">A-6, Yogeshwar Jyot Society, Gotri, Vadodara • +91 98240 37497</p>
            </div>
            <div style="text-align:right;font-size:12px;">
              <strong>${rx.doctor_name || selectedAppointment?.doctor_name || user?.profile?.full_name || "Dr. Kumar M. Tipnis"}</strong><br/>
              Date: ${new Date(rx.created_at).toLocaleDateString()}
            </div>
          </div>
          <p style="font-size:13px;"><strong>Patient:</strong> ${selectedAppointment?.patient_name} &nbsp;|&nbsp; <strong>Procedure:</strong> ${selectedAppointment?.service_name}</p>
          <h3 style="margin-top:20px;">℞ Medications</h3>
          <table>
            <thead>
              <tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Timing</th><th>Duration</th><th>Instructions</th></tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          ${rx.notes ? `<p style="margin-top:16px;font-size:13px;"><strong>Advice / Instructions:</strong> ${rx.notes}</p>` : ""}
          ${rx.follow_up_date ? `<p style="font-size:13px;"><strong>Next Review Date:</strong> ${rx.follow_up_date}</p>` : ""}
          <div style="margin-top:56px;text-align:right;font-size:12px;">
            <p>_____________________________<br/>Authorized Doctor Signature</p>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-slate-800" />
            Doctor Clinical Workspace
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Interactive FDI dental odontogram, chairside vitals, SOAP clinical templates, e-prescriptions & radiograph inspection
          </p>
        </div>
        {selectedAppointment && (
          <div className="flex flex-wrap items-center gap-2">
            {selectedAppointment.status === "CONFIRMED" && (
              <button
                onClick={() =>
                  statusMutation.mutate({ id: selectedAppointment.id, status: "CHECKED_IN" })
                }
                disabled={statusMutation.isPending}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <UserCheck className="w-4 h-4" />
                Check In to Chair
              </button>
            )}
            {selectedAppointment.status !== "COMPLETED" && (
              <button
                onClick={() =>
                  statusMutation.mutate({ id: selectedAppointment.id, status: "COMPLETED" })
                }
                disabled={statusMutation.isPending}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Mark Visit Completed
              </button>
            )}
            <button
              onClick={() => setShowPrescriptionModal(true)}
              className="px-3.5 py-2 bg-teal-600 text-black rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Pill className="w-4 h-4" />
              Write e-Prescription (℞)
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Left Agenda Queue (1 col) & Right Clinical Operatory (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Patient Agenda & Case Queue */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4 h-fit">
          <div className="border-b border-slate-100 pb-3 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Clinical Case Queue</h2>
              <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {filteredAgenda.length} cases
              </span>
            </div>

            {/* Filter Pills: All Cases | Today | Custom Date */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDateFilterMode("all")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                  dateFilterMode === "all"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                All Active
              </button>
              <button
                type="button"
                onClick={() => setDateFilterMode("today")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                  dateFilterMode === "today"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!customDate) {
                    setCustomDate(new Date().toISOString().split("T")[0]);
                  }
                  setDateFilterMode("custom");
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                  dateFilterMode === "custom"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                By Date
              </button>
            </div>

            {dateFilterMode === "custom" && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full text-xs p-2 border border-slate-200 rounded-xl bg-slate-50"
              />
            )}

            {/* Patient Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={agendaSearch}
                onChange={(e) => setAgendaSearch(e.target.value)}
                placeholder="Search patient or procedure..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2.5 max-h-[680px] overflow-y-auto pr-1">
            {isAgendaLoading ? (
              <p className="text-xs text-slate-400 text-center py-8">Loading clinical schedule...</p>
            ) : filteredAgenda.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-xs text-slate-400">No appointments match this filter.</p>
                {dateFilterMode !== "all" && (
                  <button
                    type="button"
                    onClick={() => setDateFilterMode("all")}
                    className="text-xs font-semibold text-slate-700 underline"
                  >
                    Show all scheduled cases
                  </button>
                )}
              </div>
            ) : (
              filteredAgenda.map((app: any) => (
                <div
                  key={app.id}
                  onClick={() => {
                    setSelectedAppointment(app);
                    setSelectedTeeth([]);
                    setToothNumber("");
                    setDiagnosis("");
                    setClinicalNotes("");
                    setTreatmentPerformed("");
                    setFollowUpNotes("");
                    setTreatmentSuccess(false);
                    setTreatmentError(null);
                  }}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedAppointment?.id === app.id
                      ? "border-red-500 bg-slate-50 shadow-sm ring-1 ring-red-500/30"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-900">{app.patient_name}</span>
                    <span className="font-mono text-[11px] text-slate-600">
                      {app.appointment_date} • {app.start_time}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 font-medium">{app.service_name}</p>
                  {app.chief_complaint && (
                    <p className="text-[10px] text-slate-500 mt-1 truncate">
                      CC: {app.chief_complaint}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px]">
                    <span className="text-slate-400">{app.doctor_name}</span>
                    <span
                      className={`font-bold uppercase ${
                        app.status === "COMPLETED"
                          ? "text-slate-500"
                          : app.status === "CHECKED_IN"
                          ? "text-blue-600"
                          : app.status === "CONFIRMED"
                          ? "text-emerald-600"
                          : "text-amber-600"
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

        {/* Right Column (2 cols): Active Operatory & EHR Charting */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedAppointment ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-12 text-center space-y-3">
              <Stethoscope className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-base text-slate-700">
                Select a Patient from the Clinical Queue
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Click any appointment on the left to launch the interactive 32-tooth FDI odontogram, review medical allergies, record chairside vitals, apply clinical templates, or issue a printable e-prescription.
              </p>
            </div>
          ) : (
            <>
              {/* 1. Patient Clinical Summary & Medical Alert Banner */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-lg font-bold text-slate-900">
                        {selectedAppointment.patient_name}
                      </h2>
                      {patientDetail?.blood_group && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-[11px] flex items-center gap-1 border border-slate-200">
                          <Droplets className="w-3 h-3 text-red-500" />
                          {patientDetail.blood_group}
                        </span>
                      )}
                      {patientDetail?.gender && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium text-[11px]">
                          {patientDetail.gender}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Procedure:{" "}
                      <span className="font-semibold text-slate-800">
                        {selectedAppointment.service_name}
                      </span>{" "}
                      • Date: {selectedAppointment.appointment_date} at {selectedAppointment.start_time}
                      {patientDetail?.phone && (
                        <span className="ml-2 inline-flex items-center gap-1 text-slate-600">
                          • <Phone className="w-3 h-3" /> {patientDetail.phone}
                        </span>
                      )}
                    </p>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                    {selectedAppointment.status}
                  </span>
                </div>

                {/* Allergy Alert & Chief Complaint Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                      patientDetail?.allergies
                        ? "bg-red-50/70 border-red-300 text-red-900"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    <ShieldAlert
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        patientDetail?.allergies ? "text-red-600" : "text-slate-400"
                      }`}
                    />
                    <div>
                      <span className="font-bold block text-[11px] uppercase tracking-wide">
                        Drug & Medical Allergies
                      </span>
                      <span>
                        {patientDetail?.allergies || "No known drug allergies (NKDA) recorded"}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border bg-amber-50/60 border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <span className="font-bold block text-[11px] uppercase tracking-wide">
                        Chief Complaint / Notes
                      </span>
                      <span>
                        {selectedAppointment.chief_complaint ||
                          "Routine dental consultation & evaluation"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Chairside Pre-Procedure Vitals Bar */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 mb-2">
                    <HeartPulse className="w-3.5 h-3.5 text-red-500" />
                    Pre-Procedure Chairside Vitals
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                      <label className="text-[10px] text-slate-400 font-semibold block">
                        Blood Pressure (mmHg)
                      </label>
                      <input
                        type="text"
                        value={vitals.bp}
                        onChange={(e) => setVitals({ ...vitals, bp: e.target.value })}
                        placeholder="120/80"
                        className="w-full text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
                      />
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                      <label className="text-[10px] text-slate-400 font-semibold block">
                        Pulse Rate (bpm)
                      </label>
                      <input
                        type="text"
                        value={vitals.pulse}
                        onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })}
                        placeholder="72"
                        className="w-full text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
                      />
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                      <label className="text-[10px] text-slate-400 font-semibold block">
                        SpO2 (%)
                      </label>
                      <input
                        type="text"
                        value={vitals.spo2}
                        onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                        placeholder="99"
                        className="w-full text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
                      />
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                      <label className="text-[10px] text-slate-400 font-semibold block">
                        Random Blood Sugar (mg/dL)
                      </label>
                      <input
                        type="text"
                        value={vitals.rbs}
                        onChange={(e) => setVitals({ ...vitals, rbs: e.target.value })}
                        placeholder="Optional (e.g. 110)"
                        className="w-full text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Interactive Adult FDI 32-Tooth Odontogram */}
              {!treatmentRecord && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-slate-700" />
                        Interactive FDI Dental Odontogram (Adult 32-Tooth Chart)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Select a clinical finding tag below, then click teeth on the chart to mark affected tooth numbers
                      </p>
                    </div>
                    {selectedTeeth.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTeeth([]);
                          setToothConditionMap({});
                          setToothNumber("");
                        }}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline"
                      >
                        Clear Teeth ({selectedTeeth.length})
                      </button>
                    )}
                  </div>

                  {/* Finding Brush Selector */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      "Caries / Decay",
                      "Pulpitis / RCT",
                      "Crown / Prosthetic",
                      "Extraction Indicated",
                      "Periodontal Pocket",
                      "Fractured / Trauma",
                    ].map((cond) => (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => setActiveConditionBrush(cond)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                          activeConditionBrush === cond
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {cond}
                      </button>
                    ))}
                  </div>

                  {/* Upper Arch (Maxillary: Q1 Right & Q2 Left) */}
                  <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                      <span>Upper Right (Q1)</span>
                      <span>Maxillary Arch</span>
                      <span>Upper Left (Q2)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid grid-cols-8 gap-1">
                        {UPPER_RIGHT_Q1.map((t) => {
                          const active = selectedTeeth.includes(t);
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => handleToggleTooth(t)}
                              title={`Tooth #${t} (${TOOTH_NAMES[t[1]]})`}
                              className={`py-2 rounded-lg text-[11px] font-bold border transition-all flex flex-col items-center ${
                                active
                                  ? "bg-red-50 text-red-700 border-red-500 ring-1 ring-red-400"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                              }`}
                            >
                              <span>{t}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="grid grid-cols-8 gap-1">
                        {UPPER_LEFT_Q2.map((t) => {
                          const active = selectedTeeth.includes(t);
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => handleToggleTooth(t)}
                              title={`Tooth #${t} (${TOOTH_NAMES[t[1]]})`}
                              className={`py-2 rounded-lg text-[11px] font-bold border transition-all flex flex-col items-center ${
                                active
                                  ? "bg-red-50 text-red-700 border-red-500 ring-1 ring-red-400"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                              }`}
                            >
                              <span>{t}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border-t border-dashed border-slate-300 my-2" />

                    {/* Lower Arch (Mandibular: Q4 Right & Q3 Left) */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid grid-cols-8 gap-1">
                        {LOWER_RIGHT_Q4.map((t) => {
                          const active = selectedTeeth.includes(t);
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => handleToggleTooth(t)}
                              title={`Tooth #${t} (${TOOTH_NAMES[t[1]]})`}
                              className={`py-2 rounded-lg text-[11px] font-bold border transition-all flex flex-col items-center ${
                                active
                                  ? "bg-red-50 text-red-700 border-red-500 ring-1 ring-red-400"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                              }`}
                            >
                              <span>{t}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="grid grid-cols-8 gap-1">
                        {LOWER_LEFT_Q3.map((t) => {
                          const active = selectedTeeth.includes(t);
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => handleToggleTooth(t)}
                              title={`Tooth #${t} (${TOOTH_NAMES[t[1]]})`}
                              className={`py-2 rounded-lg text-[11px] font-bold border transition-all flex flex-col items-center ${
                                active
                                  ? "bg-red-50 text-red-700 border-red-500 ring-1 ring-red-400"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                              }`}
                            >
                              <span>{t}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                      <span>Lower Right (Q4)</span>
                      <span>Mandibular Arch</span>
                      <span>Lower Left (Q3)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Clinical Treatment Record Editor (with 1-Click SOAP Templates) */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-5">
                <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-slate-700" />
                    Clinical Treatment Record (SOAP Note)
                  </h3>
                  {treatmentRecord && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                      <FileCheck className="w-3 h-3" /> Finalized & Audited
                    </span>
                  )}
                </div>

                {/* Quick Procedure Templates */}
                {!treatmentRecord && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-slate-600" />
                      1-Click Dental Procedure Templates:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {CLINICAL_TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.label}
                          type="button"
                          onClick={() => handleApplyTemplate(tpl)}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 transition-all"
                        >
                          + {tpl.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {treatmentSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Clinical record saved and synced to the patient&apos;s mobile app.</span>
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
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-slate-400 text-[10px] block font-semibold uppercase">
                          Charted Tooth / Quadrant:
                        </span>
                        <span className="font-bold text-slate-900 mt-0.5 block">
                          {treatmentRecord.tooth_number}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400 text-[10px] block font-semibold uppercase mb-1">
                        Clinical Diagnosis:
                      </span>
                      <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-medium">
                        {treatmentRecord.diagnosis}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-semibold uppercase mb-1">
                        Procedure & Treatment Performed:
                      </span>
                      <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 leading-relaxed">
                        {treatmentRecord.treatment_performed}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-semibold uppercase mb-1">
                        Doctor Clinical Notes & Vitals:
                      </span>
                      <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                        {treatmentRecord.clinical_notes}
                      </p>
                    </div>
                    {treatmentRecord.follow_up_recommendation && (
                      <div>
                        <span className="text-slate-400 text-[10px] block font-semibold uppercase mb-1">
                          Follow-up Recommendation:
                        </span>
                        <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800">
                          {treatmentRecord.follow_up_recommendation}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleSaveTreatment} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Selected Teeth / Quadrant (click Odontogram above or type manually)
                      </label>
                      <input
                        type="text"
                        value={toothNumber}
                        onChange={(e) => setToothNumber(e.target.value)}
                        placeholder="e.g. FDI #16 [Pulpitis / RCT], #17 [Caries / Decay]"
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
                        placeholder="e.g. Symptomatic irreversible pulpitis with apical periodontitis"
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
                        placeholder="Details of anesthesia, isolation, instrumentation, restoration or extraction..."
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Clinical Findings, Vitality Tests & Radiographic Notes *
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={clinicalNotes}
                        onChange={(e) => setClinicalNotes(e.target.value)}
                        placeholder="Percussion/palpation findings, pulp vitality test, canal lengths, BOP..."
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Follow-up Plan & Recall Instruction
                      </label>
                      <input
                        type="text"
                        value={followUpNotes}
                        onChange={(e) => setFollowUpNotes(e.target.value)}
                        placeholder="e.g. Recall in 5 days for obturation & crown preparation"
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={treatmentMutation.isPending}
                        className="px-5 py-2.5 bg-teal-600 text-black rounded-xl text-xs font-semibold flex items-center gap-1.5"
                      >
                        {treatmentMutation.isPending
                          ? "Finalizing..."
                          : "Finalize & Sync Treatment Record"}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* 4. Patient Prescriptions (℞) History & Print */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <Pill className="w-4 h-4 text-slate-700" />
                    Issued e-Prescriptions (℞)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowPrescriptionModal(true)}
                    className="px-3 py-1.5 bg-teal-600 text-black rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Prescription
                  </button>
                </div>

                {patientRxs.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    No prescriptions issued for this patient yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {patientRxs.map((rx: any) => (
                      <div
                        key={rx.id}
                        className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-900">
                              ℞ Issued on {new Date(rx.created_at).toLocaleDateString()}
                            </span>
                            <span className="text-slate-500 ml-2">by {rx.doctor_name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handlePrintPrescription(rx)}
                            className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-800 font-semibold hover:bg-slate-100 flex items-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Print ℞
                          </button>
                        </div>

                        <div className="divide-y divide-slate-200/70 bg-white rounded-lg border border-slate-200 px-3">
                          {rx.items?.map((it: any, idx: number) => (
                            <div key={idx} className="py-2 flex flex-wrap justify-between gap-2">
                              <span className="font-semibold text-slate-800">
                                {idx + 1}. {it.medicine_name}
                              </span>
                              <span className="text-slate-600">
                                {it.dosage} • {it.timing} • {it.duration}
                              </span>
                            </div>
                          ))}
                        </div>

                        {rx.notes && (
                          <p className="text-[11px] text-slate-600 italic">
                            Instructions: {rx.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. Diagnostic Radiographs (IOPA / OPG X-Rays) & Chairside Upload */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-slate-700" />
                    Diagnostic Radiographs (IOPA / OPG) & Clinical Reports
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowUploadForm(!showUploadForm)}
                    className="px-3 py-1.5 bg-teal-600 text-black rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {showUploadForm ? "Close Uploader" : "Upload X-Ray / Report"}
                  </button>
                </div>

                {showUploadForm && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                    {uploadError && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700">
                        {uploadError}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Document Category
                        </label>
                        <select
                          value={uploadType}
                          onChange={(e) => setUploadType(e.target.value)}
                          className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                        >
                          <option value="DENTAL_XRAY">Dental X-Ray (IOPA / OPG / CBCT)</option>
                          <option value="LAB_REPORT">Pathology / Lab Report</option>
                          <option value="CONSENT_FORM">Signed Surgical Consent</option>
                          <option value="CLINICAL_PHOTO">Intraoral Clinical Photograph</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Select File (PNG, JPG, PDF)
                        </label>
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.pdf"
                          onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                          className="w-full p-1.5 border border-slate-200 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Radiographic Findings / Tooth Reference
                      </label>
                      <input
                        type="text"
                        value={uploadDescription}
                        onChange={(e) => setUploadDescription(e.target.value)}
                        placeholder="e.g. Pre-op IOPA #16 showing periapical radiolucency"
                        className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={!uploadFile || uploadMutation.isPending}
                        onClick={() => uploadMutation.mutate()}
                        className="px-4 py-2 bg-teal-600 text-black rounded-lg font-semibold disabled:opacity-50"
                      >
                        {uploadMutation.isPending ? "Uploading..." : "Save to Patient Record"}
                      </button>
                    </div>
                  </div>
                )}

                {patientDocs.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    No digital X-rays or reports uploaded for this patient yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {patientDocs.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between"
                      >
                        <div className="truncate pr-2">
                          <p className="font-semibold text-slate-800 truncate">{doc.file_name}</p>
                          <p className="text-[10px] text-slate-500 uppercase">
                            {doc.document_type} • {(doc.file_size_bytes / 1024).toFixed(0)} KB
                          </p>
                          {doc.description && (
                            <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                              {doc.description}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleViewDocument(doc.id)}
                          className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-semibold hover:bg-slate-100 flex items-center gap-1 shrink-0"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 6. Patient Past Visits Timeline */}
              {patientDetail?.appointments && patientDetail.appointments.length > 1 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-3">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-3">
                    <History className="w-4 h-4 text-slate-700" />
                    Patient Longitudinal Visit History ({patientDetail.appointments.length} visits)
                  </h3>
                  <div className="divide-y divide-slate-100 text-xs">
                    {patientDetail.appointments.slice(0, 6).map((v: any) => (
                      <div key={v.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-slate-800">{v.service_name}</span>
                          <span className="text-slate-500 ml-2">with {v.doctor_name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[11px] text-slate-500">
                            {v.appointment_date} ({v.start_time})
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                            {v.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Write Prescription Modal (with 1-Click Dental Medication Presets) */}
      {showPrescriptionModal && selectedAppointment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Pill className="w-5 h-5 text-slate-800" />
                Sign e-Prescription (℞) for {selectedAppointment.patient_name}
              </h3>
              <button
                onClick={() => setShowPrescriptionModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            {/* 1-Click Dental Regimen Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-500 block">
                Quick-Add Dental Medications:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {RX_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleAddPresetRx(p.item)}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-800"
                  >
                    + {p.label}
                  </button>
                ))}
              </div>
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
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2"
                  >
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
                      placeholder="Medicine name (e.g. Tab. Augmentin 625mg)"
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
                        placeholder="Timing (e.g. BD after food)"
                        value={item.timing}
                        onChange={(e) => handleRxItemChange(idx, "timing", e.target.value)}
                        className="p-2 border border-slate-200 rounded-lg bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Duration (e.g. 5 Days)"
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
                Add Custom Medicine Row
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
                    Post-Procedure Instructions
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
                  className="px-4 py-2 text-xs font-semibold bg-teal-600 text-black rounded-xl"
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
