"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { Settings, Save, CheckCircle2, AlertCircle, ShieldAlert } from "lucide-react";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  const [formData, setFormData] = useState({
    clinic_name: "",
    tagline: "",
    phone_primary: "",
    phone_secondary: "",
    phone_landline: "",
    email: "",
    address: "",
    booking_buffer_minutes: 15,
    max_advance_booking_days: 30,
  });
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["clinicSettings"],
    queryFn: () => api.getSettings(),
  });

  useEffect(() => {
    if (settingsData) {
      setFormData({
        clinic_name: settingsData.clinic_name || "",
        tagline: settingsData.tagline || "",
        phone_primary: settingsData.phone_primary || "",
        phone_secondary: settingsData.phone_secondary || "",
        phone_landline: settingsData.phone_landline || "",
        email: settingsData.email || "",
        address: settingsData.address || "",
        booking_buffer_minutes: settingsData.booking_buffer_minutes || 15,
        max_advance_booking_days: settingsData.max_advance_booking_days || 30,
      });
    }
  }, [settingsData]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.updateSettings(data),
    onSuccess: () => {
      setSuccessMsg(true);
      setErrorMsg(null);
      queryClient.invalidateQueries({ queryKey: ["clinicSettings"] });
      setTimeout(() => setSuccessMsg(false), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to update clinic configuration.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-800">Access Restricted</h2>
        <p className="text-xs text-slate-500">
          Clinic operational settings can only be managed by authorized administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clinic Operational Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Verified clinic contact info, opening hours, booking buffers, and clinic profile
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Clinic settings updated successfully.</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Clinic Name</label>
            <input
              type="text"
              required
              value={formData.clinic_name}
              onChange={(e) => setFormData({ ...formData, clinic_name: e.target.value })}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Tagline / Mission</label>
          <input
            type="text"
            value={formData.tagline}
            onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
            className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Mobile / WhatsApp</label>
            <input
              type="text"
              required
              value={formData.phone_primary}
              onChange={(e) => setFormData({ ...formData, phone_primary: e.target.value })}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Secondary Mobile</label>
            <input
              type="text"
              value={formData.phone_secondary}
              onChange={(e) => setFormData({ ...formData, phone_secondary: e.target.value })}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Landline Phone</label>
            <input
              type="text"
              value={formData.phone_landline}
              onChange={(e) => setFormData({ ...formData, phone_landline: e.target.value })}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Address</label>
          <textarea
            rows={2}
            required
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Booking Buffer Between Appointments (Minutes)
            </label>
            <input
              type="number"
              min={0}
              max={60}
              value={formData.booking_buffer_minutes}
              onChange={(e) => setFormData({ ...formData, booking_buffer_minutes: parseInt(e.target.value) || 0 })}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Max Advance Booking Window (Days)
            </label>
            <input
              type="number"
              min={1}
              max={90}
              value={formData.max_advance_booking_days}
              onChange={(e) => setFormData({ ...formData, max_advance_booking_days: parseInt(e.target.value) || 30 })}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50"
            />
          </div>
        </div>

        <div className="flex justify-end pt-3">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
