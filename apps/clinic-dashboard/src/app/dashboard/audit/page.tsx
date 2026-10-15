"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { ShieldAlert, ShieldCheck, Clock, RefreshCw } from "lucide-react";

export default function AuditLogsPage() {
  const { isAdmin } = useAuth();

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["auditLogs"],
    queryFn: () => api.getAuditLogs(100),
    enabled: !!isAdmin,
  });

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-800">Security Clearance Required</h2>
        <p className="text-xs text-slate-500">
          Audit logs contain sensitive diagnostic access records and are strictly restricted to Administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-teal-600" />
            Security & Compliance Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable log of clinical data access, status transitions, prescription authoring, and file views
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm"
          title="Refresh audit trail"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Staff Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-sans">
                    Loading security audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-sans">
                    No security audit logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 font-sans">
                      {log.actor_name || log.actor_id || "System"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 font-bold text-[10px] uppercase border border-teal-200/60 font-sans">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-sans">
                      <span className="font-semibold text-slate-800">{log.target_type}</span>
                      {log.target_id && <span className="text-[10px] text-slate-400 block truncate max-w-xs">{log.target_id}</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-500 truncate max-w-xs">
                      {log.metadata_json ? JSON.stringify(log.metadata_json) : "—"}
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
