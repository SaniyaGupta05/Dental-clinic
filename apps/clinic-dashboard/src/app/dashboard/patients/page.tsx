"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  FileText,
  UserPlus,
} from "lucide-react";

export default function PatientsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Patient Form
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    date_of_birth: "",
    gender: "Male",
    blood_group: "O+",
    allergies: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    address: "",
    city: "Vadodara",
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const { data: patientsData, isLoading } = useQuery({
    queryKey: ["patients", searchTerm],
    queryFn: () => api.getPatients(searchTerm || undefined),
  });

  const { data: patientDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ["patientDetail", selectedPatientId],
    queryFn: () => api.getPatientDetail(selectedPatientId!),
    enabled: !!selectedPatientId,
  });

  // Mutation
  const createPatientMutation = useMutation({
    mutationFn: (data: any) => api.createPatientAtDesk(data),
    onSuccess: (newPatient) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardKpis"] });
      setShowAddModal(false);
      setSelectedPatientId(newPatient.id);
      setFormData({
        first_name: "",
        last_name: "",
        phone: "",
        email: "",
        date_of_birth: "",
        gender: "Male",
        blood_group: "O+",
        allergies: "",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        address: "",
        city: "Vadodara",
      });
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to register patient.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.phone.trim()) {
      setFormError("First name, last name, and phone are mandatory.");
      return;
    }
    const payload = {
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      phone: formData.phone.trim(),
      gender: formData.gender,
      blood_group: formData.blood_group,
      city: formData.city.trim() || "Vadodara",
      date_of_birth: formData.date_of_birth ? formData.date_of_birth : undefined,
      email: formData.email.trim() || undefined,
      allergies: formData.allergies.trim() || undefined,
      emergency_contact_name: formData.emergency_contact_name.trim() || undefined,
      emergency_contact_phone: formData.emergency_contact_phone.trim() || undefined,
      address: formData.address.trim() || undefined,
    };
    createPatientMutation.mutate(payload);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patient Directory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Registered patients, demographic profiles, medical history notes, and visit records
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-teal-600/20 flex items-center gap-1.5 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Register Patient at Desk
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search patients by name, phone number (+91...), or email..."
          className="w-full text-xs bg-transparent border-none text-slate-800 placeholder-slate-400 focus:outline-none"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm("")} className="text-xs text-slate-400 hover:text-slate-600">
            Clear
          </button>
        )}
      </div>

      {/* Main Grid: Directory List and Detail Inspection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Table */}
        <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden ${selectedPatientId ? "lg:col-span-2" : "lg:col-span-3"}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Patient Name</th>
                  <th className="py-3.5 px-4">Phone</th>
                  <th className="py-3.5 px-4">Blood Group</th>
                  <th className="py-3.5 px-4">City</th>
                  <th className="py-3.5 px-4">Total Visits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Loading patient directory...
                    </td>
                  </tr>
                ) : !patientsData?.items || patientsData.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No patients found matching your search.
                    </td>
                  </tr>
                ) : (
                  patientsData.items.map((p: any) => (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedPatientId(p.id)}
                      className={`cursor-pointer transition-colors ${
                        selectedPatientId === p.id ? "bg-teal-50/60 font-semibold" : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">{p.full_name}</p>
                        <p className="text-[11px] text-slate-400">{p.email || "No email"}</p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-mono text-[11px]">
                        {p.phone || "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                          {p.blood_group || "—"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{p.city}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px]">
                          {p.total_appointments} visits
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Patient Detail Drawer */}
        {selectedPatientId && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            {isDetailLoading ? (
              <p className="text-xs text-slate-400 text-center py-12">Loading patient profile...</p>
            ) : !patientDetail ? (
              <p className="text-xs text-slate-400 text-center py-12">Patient details unavailable.</p>
            ) : (
              <>
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{patientDetail.full_name}</h2>
                    <p className="text-xs text-slate-500 font-mono">{patientDetail.phone}</p>
                  </div>
                  <button
                    onClick={() => setSelectedPatientId(null)}
                    className="text-slate-400 hover:text-slate-600 text-sm p-1"
                  >
                    ✕
                  </button>
                </div>

                {/* Demographics & Medical Notes */}
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Gender / Blood:</span>
                      <span className="font-semibold text-slate-800">
                        {patientDetail.gender || "—"} / {patientDetail.blood_group || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Location:</span>
                      <span className="font-semibold text-slate-800">{patientDetail.city}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider block mb-1">
                      Known Allergies:
                    </span>
                    <p className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 font-medium">
                      {patientDetail.allergies || "No recorded drug or contact allergies."}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider block mb-1">
                      Emergency Contact:
                    </span>
                    <p className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-700">
                      {patientDetail.emergency_contact_name || "—"} ({patientDetail.emergency_contact_phone || "—"})
                    </p>
                  </div>
                </div>

                {/* Appointment History */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Appointment History
                  </h3>
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {!patientDetail.appointments || patientDetail.appointments.length === 0 ? (
                      <p className="text-xs text-slate-400">No past visits recorded.</p>
                    ) : (
                      patientDetail.appointments.map((a: any) => (
                        <div key={a.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1">
                          <div className="flex items-center justify-between font-semibold text-slate-800">
                            <span>{a.appointment_date} @ {a.start_time}</span>
                            <span className="text-[10px] font-bold text-teal-700 uppercase">{a.status}</span>
                          </div>
                          <p className="text-[11px] text-slate-500">{a.service_name} • {a.doctor_name}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Register Patient at Desk</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+919824037497"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={formData.blood_group}
                    onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Allergies (e.g. Penicillin, Latex)</label>
                <input
                  type="text"
                  placeholder="None known or specify"
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Phone</label>
                  <input
                    type="text"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPatientMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-sm"
                >
                  {createPatientMutation.isPending ? "Registering..." : "Create Patient Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
