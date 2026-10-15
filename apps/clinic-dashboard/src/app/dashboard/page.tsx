"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Users,
  Activity,
  ArrowUpRight,
  PlusCircle,
  FileText,
  Stethoscope,
} from "lucide-react";

export default function DashboardOverviewPage() {
  const router = useRouter();
  const { user, isDoctor } = useAuth();

  const { data: kpis, isLoading: isKpiLoading } = useQuery({
    queryKey: ["dashboardKpis"],
    queryFn: () => api.getDashboardKpis(),
    refetchInterval: 15000,
  });

  const { data: todayAppointments = [], isLoading: isAppLoading } = useQuery({
    queryKey: ["todayAppointments"],
    queryFn: () => {
      const todayStr = new Date().toISOString().split("T")[0];
      return api.getAdminAppointments({ date: todayStr });
    },
    refetchInterval: 15000,
  });

  const cards = [
    {
      title: "Today's Appointments",
      value: kpis?.today_total ?? 0,
      icon: CalendarDays,
      color: "text-teal-600 bg-teal-50 border-teal-200",
      link: "/dashboard/appointments",
    },
    {
      title: "Pending Review",
      value: kpis?.pending_review ?? 0,
      icon: Clock,
      color: "text-amber-600 bg-amber-50 border-amber-200",
      highlight: (kpis?.pending_review ?? 0) > 0,
      link: "/dashboard/appointments?status=PENDING_REVIEW",
    },
    {
      title: "Confirmed",
      value: kpis?.confirmed ?? 0,
      icon: CheckCircle2,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
      link: "/dashboard/appointments?status=CONFIRMED",
    },
    {
      title: "Completed",
      value: kpis?.completed ?? 0,
      icon: UserCheck,
      color: "text-blue-600 bg-blue-50 border-blue-200",
      link: "/dashboard/appointments?status=COMPLETED",
    },
    {
      title: "Cancellation Requests",
      value: kpis?.cancellation_requests ?? 0,
      icon: AlertTriangle,
      color: "text-rose-600 bg-rose-50 border-rose-200",
      highlight: (kpis?.cancellation_requests ?? 0) > 0,
      link: "/dashboard/appointments?status=CANCELLATION_REQUESTED",
    },
    {
      title: "Pending Follow-ups",
      value: kpis?.upcoming_follow_ups ?? 0,
      icon: Activity,
      color: "text-indigo-600 bg-indigo-50 border-indigo-200",
      link: "/dashboard/follow-ups",
    },
    {
      title: "Total Patients",
      value: kpis?.total_patients ?? 0,
      icon: Users,
      color: "text-slate-700 bg-slate-100 border-slate-200",
      link: "/dashboard/patients",
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Welcome & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Clinic Operational Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time status for Kumar Dental Clinic • Logged in as{" "}
            <span className="font-semibold text-teal-700">{user?.role}</span>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => router.push("/dashboard/patients")}
            className="px-3.5 py-2 text-xs font-semibold bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 shadow-sm flex items-center gap-1.5 transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5 text-slate-500" />
            New Patient
          </button>
          <button
            onClick={() => router.push("/dashboard/appointments")}
            className="px-3.5 py-2 text-xs font-semibold bg-teal-600 text-white rounded-xl hover:bg-teal-700 shadow-md shadow-teal-600/20 flex items-center gap-1.5 transition-all"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Appointment Desk
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              onClick={() => router.push(c.link)}
              className={`p-4 bg-white rounded-2xl border shadow-sm cursor-pointer hover:shadow-md transition-all ${
                c.highlight ? "border-amber-300 ring-2 ring-amber-400/20" : "border-slate-200/80"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`p-2 rounded-xl border ${c.color}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">
                {isKpiLoading ? "..." : c.value}
              </p>
              <p className="text-[11px] font-medium text-slate-500 mt-1 truncate">
                {c.title}
              </p>
            </div>
          );
        })}
      </div>

      {/* Today's Agenda & Operational Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Agenda */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Today&apos;s Appointments</h2>
              <p className="text-xs text-slate-500">Live operatory schedule</p>
            </div>
            <button
              onClick={() => router.push("/dashboard/appointments")}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700"
            >
              View Full Calendar →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Dentist</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isAppLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Loading schedule...
                    </td>
                  </tr>
                ) : todayAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No appointments scheduled for today yet.
                    </td>
                  </tr>
                ) : (
                  todayAppointments.map((app: any) => (
                    <tr
                      key={app.id}
                      onClick={() => router.push(`/dashboard/appointments?selected=${app.id}`)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {app.start_time} - {app.end_time}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">{app.patient_name}</p>
                        <p className="text-[10px] text-slate-400">{app.patient_phone || "No phone"}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{app.service_name}</td>
                      <td className="py-3 px-4 text-slate-600">{app.doctor_name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Operational Activity Stream */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">Recent Operational Activity</h2>
            <p className="text-xs text-slate-500">Audit trail of booking transitions</p>
          </div>
          <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
            {!kpis?.recent_activity || kpis.recent_activity.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No recent events logged.</p>
            ) : (
              kpis.recent_activity.map((act: any) => (
                <div key={act.id} className="text-xs p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-teal-700 uppercase">
                      {act.to_status}
                    </span>
                    <span className="text-slate-400">
                      {new Date(act.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{act.notes}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
