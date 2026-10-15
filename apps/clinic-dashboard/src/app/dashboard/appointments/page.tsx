"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import {
  CalendarDays,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  Search,
  Plus,
  RefreshCw,
  AlertCircle,
  Calendar,
} from "lucide-react";

export default function AppointmentsPage() {
  const queryClient = useQueryClient();
  const { user, isDoctor } = useAuth();

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [doctorFilter, setDoctorFilter] = useState<string>("");
  const [selectedApp, setSelectedApp] = useState<any | null>(null);

  // Action Modals State
  const [actionType, setActionType] = useState<"CONFIRM" | "CANCEL" | "RESCHEDULE" | "CHECKIN" | "COMPLETE" | null>(null);
  const [reasonInput, setReasonInput] = useState("");
  const [newDateInput, setNewDateInput] = useState("");
  const [newTimeInput, setNewTimeInput] = useState("10:00");

  // Create Appointment Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPatientId, setNewPatientId] = useState("");
  const [newDoctorId, setNewDoctorId] = useState("");
  const [newServiceId, setNewServiceId] = useState("");
  const [newAppDate, setNewAppDate] = useState("");
  const [newAppTime, setNewAppTime] = useState("10:00");
  const [newComplaint, setNewComplaint] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Queries
  const { data: appointments = [], isLoading, refetch } = useQuery({
    queryKey: ["appointments", statusFilter, dateFilter, doctorFilter],
    queryFn: () =>
      api.getAdminAppointments({
        status: statusFilter || undefined,
        date: dateFilter || undefined,
        doctor_id: doctorFilter || undefined,
      }),
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => api.getDoctors(),
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => api.getServices(),
  });

  const { data: patientsData } = useQuery({
    queryKey: ["patientsList"],
    queryFn: () => api.getPatients(undefined, 1, 100),
  });

  // Mutation for updating appointment status
  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      notes,
      extra,
    }: {
      id: string;
      status: string;
      notes?: string;
      extra?: any;
    }) => api.updateAppointmentStatus(id, status, notes, extra),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardKpis"] });
      setActionType(null);
      setSelectedApp(null);
      setReasonInput("");
    },
    onError: (err: any) => {
      alert(err.message || "Failed to update appointment status.");
    },
  });

  // Mutation for creating appointment
  const createMutation = useMutation({
    mutationFn: (data: any) => api.createAppointmentDirect(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardKpis"] });
      setShowCreateModal(false);
      setCreateError(null);
      setNewComplaint("");
    },
    onError: (err: any) => {
      setCreateError(err.message || "Failed to create appointment.");
    },
  });

  const handleActionSubmit = () => {
    if (!selectedApp || !actionType) return;

    if (actionType === "CONFIRM") {
      statusMutation.mutate({
        id: selectedApp.id,
        status: "CONFIRMED",
        notes: "Confirmed by clinic staff.",
      });
    } else if (actionType === "CANCEL") {
      statusMutation.mutate({
        id: selectedApp.id,
        status: "CANCELLED",
        notes: reasonInput,
        extra: { cancellation_reason: reasonInput },
      });
    } else if (actionType === "CHECKIN") {
      statusMutation.mutate({
        id: selectedApp.id,
        status: "CHECKED_IN",
        notes: "Patient arrived and checked in at reception desk.",
      });
    } else if (actionType === "COMPLETE") {
      statusMutation.mutate({
        id: selectedApp.id,
        status: "COMPLETED",
        notes: "Treatment completed by doctor.",
      });
    } else if (actionType === "RESCHEDULE") {
      statusMutation.mutate({
        id: selectedApp.id,
        status: "RESCHEDULE_PROPOSED",
        notes: reasonInput || "Reschedule proposed by clinic.",
        extra: {
          proposed_new_date: newDateInput,
          proposed_new_time: newTimeInput,
        },
      });
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientId || !newDoctorId || !newServiceId || !newAppDate || !newAppTime) {
      setCreateError("Please fill out all required fields.");
      return;
    }
    createMutation.mutate({
      patient_id: newPatientId,
      doctor_id: newDoctorId,
      service_id: newServiceId,
      appointment_date: newAppDate,
      start_time: newAppTime,
      chief_complaint: newComplaint,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Appointment Desk</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage review requests, confirmations, rescheduling, and live status transitions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-teal-600/20 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            Schedule Appointment
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 pr-2">
          <Filter className="w-3.5 h-3.5" />
          Filters:
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        >
          <option value="">All Statuses</option>
          <option value="PENDING_REVIEW">Pending Review</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CHECKED_IN">Checked In</option>
          <option value="RESCHEDULE_PROPOSED">Reschedule Proposed</option>
          <option value="CANCELLATION_REQUESTED">Cancellation Requested</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        {/* Date Filter */}
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        />

        {/* Doctor Filter */}
        <select
          value={doctorFilter}
          onChange={(e) => setDoctorFilter(e.target.value)}
          className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        >
          <option value="">All Dentists</option>
          {doctors.map((d: any) => (
            <option key={d.id} value={d.id}>
              {d.full_name}
            </option>
          ))}
        </select>

        {(statusFilter || dateFilter || doctorFilter) && (
          <button
            onClick={() => {
              setStatusFilter("");
              setDateFilter("");
              setDoctorFilter("");
            }}
            className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Appointments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Patient</th>
                <th className="py-3.5 px-4">Dental Service</th>
                <th className="py-3.5 px-4">Assigned Doctor</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading appointments...
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No appointments match the selected filters.
                  </td>
                </tr>
              ) : (
                appointments.map((app: any) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div>{app.appointment_date}</div>
                      <div className="text-[11px] font-normal text-slate-500">
                        {app.start_time} - {app.end_time}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{app.patient_name}</p>
                      <p className="text-[11px] text-slate-400">{app.patient_phone || "No phone"}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-slate-800">{app.service_name}</p>
                      {app.chief_complaint && (
                        <p className="text-[10px] text-slate-400 truncate max-w-xs">
                          {app.chief_complaint}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {app.doctor_name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          app.status === "CONFIRMED"
                            ? "bg-emerald-100 text-emerald-800"
                            : app.status === "PENDING_REVIEW"
                            ? "bg-amber-100 text-amber-800"
                            : app.status === "CHECKED_IN"
                            ? "bg-blue-100 text-blue-800"
                            : app.status === "COMPLETED"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {app.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {app.status === "PENDING_REVIEW" && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedApp(app);
                                setActionType("CONFIRM");
                              }}
                              className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Confirm
                            </button>
                            <button
                              onClick={() => {
                                setSelectedApp(app);
                                setActionType("RESCHEDULE");
                              }}
                              className="px-2.5 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              Reschedule
                            </button>
                            <button
                              onClick={() => {
                                setSelectedApp(app);
                                setActionType("CANCEL");
                              }}
                              className="px-2.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </>
                        )}

                        {app.status === "CONFIRMED" && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedApp(app);
                                setActionType("CHECKIN");
                              }}
                              className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Check In
                            </button>
                            <button
                              onClick={() => {
                                setSelectedApp(app);
                                setActionType("CANCEL");
                              }}
                              className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-semibold"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {app.status === "CHECKED_IN" && (
                          <button
                            onClick={() => {
                              setSelectedApp(app);
                              setActionType("COMPLETE");
                            }}
                            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                          >
                            Mark Completed
                          </button>
                        )}

                        {app.status === "CANCELLATION_REQUESTED" && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedApp(app);
                                setActionType("CANCEL");
                              }}
                              className="px-2.5 py-1.5 bg-rose-600 text-white hover:bg-rose-700 rounded-lg text-xs font-semibold"
                            >
                              Approve Cancel
                            </button>
                            <button
                              onClick={() => {
                                setSelectedApp(app);
                                setActionType("CONFIRM");
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold"
                            >
                              Keep Confirmed
                            </button>
                          </>
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

      {/* Action Dialog Modal */}
      {actionType && selectedApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-base text-slate-900">
              {actionType === "CONFIRM" && "Confirm Appointment"}
              {actionType === "CANCEL" && "Cancel / Reject Appointment"}
              {actionType === "CHECKIN" && "Check In Patient"}
              {actionType === "COMPLETE" && "Complete Appointment"}
              {actionType === "RESCHEDULE" && "Propose Reschedule Time"}
            </h3>

            <p className="text-xs text-slate-600">
              Appointment for <span className="font-semibold">{selectedApp.patient_name}</span> on{" "}
              <span className="font-semibold">{selectedApp.appointment_date}</span> at{" "}
              <span className="font-semibold">{selectedApp.start_time}</span> ({selectedApp.service_name}).
            </p>

            {(actionType === "CANCEL" || actionType === "RESCHEDULE") && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for {actionType === "CANCEL" ? "Cancellation" : "Rescheduling"}
                </label>
                <textarea
                  rows={2}
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="Enter notes to notify patient..."
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            )}

            {actionType === "RESCHEDULE" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newDateInput}
                    onChange={(e) => setNewDateInput(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-xl bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Time
                  </label>
                  <input
                    type="time"
                    required
                    value={newTimeInput}
                    onChange={(e) => setNewTimeInput(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-xl bg-slate-50"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setActionType(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Dismiss
              </button>
              <button
                onClick={handleActionSubmit}
                disabled={statusMutation.isPending}
                className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl shadow-sm"
              >
                {statusMutation.isPending ? "Updating..." : "Confirm Action"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Appointment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Direct Appointment Booking</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">
                ✕
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Patient *
                </label>
                <select
                  required
                  value={newPatientId}
                  onChange={(e) => setNewPatientId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                >
                  <option value="">-- Choose Patient --</option>
                  {patientsData?.items?.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.phone || "No phone"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dentist *
                  </label>
                  <select
                    required
                    value={newDoctorId}
                    onChange={(e) => setNewDoctorId(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  >
                    <option value="">-- Choose Doctor --</option>
                    {doctors.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dental Service *
                  </label>
                  <select
                    required
                    value={newServiceId}
                    onChange={(e) => setNewServiceId(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  >
                    <option value="">-- Choose Service --</option>
                    {services.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.duration_minutes}m)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newAppDate}
                    onChange={(e) => setNewAppDate(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={newAppTime}
                    onChange={(e) => setNewAppTime(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chief Complaint / Visit Notes
                </label>
                <textarea
                  rows={2}
                  value={newComplaint}
                  onChange={(e) => setNewComplaint(e.target.value)}
                  placeholder="Patient's primary symptoms or procedure requested..."
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-sm"
                >
                  {createMutation.isPending ? "Creating..." : "Confirm & Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
