"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Clock, Plus, CheckCircle2, AlertCircle, Filter } from "lucide-react";

export default function FollowUpsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("PENDING");

  const { data: followUps = [], isLoading, refetch } = useQuery({
    queryKey: ["followUps", statusFilter],
    queryFn: () => api.listFollowUps(statusFilter || undefined),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateFollowUpStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followUps"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardKpis"] });
    },
    onError: (err: any) => {
      alert(err.message || "Failed to update follow-up task.");
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Follow-up Tasks & Reminders</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track postoperative dental checkups, suture removals, and clinical recall schedules
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
        <span className="text-xs font-semibold text-slate-500">Status Filter:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white"
        >
          <option value="">All Tasks</option>
          <option value="PENDING">Pending Action</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Task Description</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Loading follow-up tasks...
                  </td>
                </tr>
              ) : followUps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No follow-ups found.
                  </td>
                </tr>
              ) : (
                followUps.map((task: any) => (
                  <tr key={task.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{task.due_date}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{task.patient_name}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800">{task.title}</p>
                      {task.notes && <p className="text-[11px] text-slate-400">{task.notes}</p>}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          task.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {task.status !== "COMPLETED" && (
                        <button
                          onClick={() => updateMutation.mutate({ id: task.id, status: "COMPLETED" })}
                          disabled={updateMutation.isPending}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Mark Completed
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
