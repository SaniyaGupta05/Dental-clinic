"use client";

import React, { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { Sparkles, Shield, Stethoscope, Lock, Mail, AlertCircle, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("dr.kumar@kumardentalclinic.com");
  const [password, setPassword] = useState("DrKumar@2026");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Failed to authenticate. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-teal-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/80 p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-20 h-24 mx-auto rounded-2xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center shadow-lg">
            <img
              src="/logo.jpg"
              alt="Kumar Dental Clinic Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Doctor Portal
          </h1>
          <p className="text-xs text-slate-500">
            Kumar Dental Clinic • Vadodara (Est. 1988)
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Staff Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@kumardentalclinic.com"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-white hover:bg-red-50 active:bg-red-100 disabled:opacity-50 text-[#d72323] border-2 border-[#d72323] rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? "Authenticating..." : "Sign In to Clinic Portal"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Role Quick-Fill Demo Bar */}
        <div className="pt-4 border-t border-slate-100">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-2.5">
            Quick Sign-In by Role
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              id="quickfill-reception"
              onClick={() => handleQuickFill("reception@kumardentalclinic.com", "Reception@2026")}
              className="px-2.5 py-2 bg-slate-100 hover:bg-teal-50 hover:border-teal-200 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 hover:text-teal-700 text-center transition-all"
            >
              Reception
            </button>
            <button
              type="button"
              id="quickfill-dr-kumar"
              onClick={() => handleQuickFill("dr.kumar@kumardentalclinic.com", "DrKumar@2026")}
              className="px-2.5 py-2 bg-slate-100 hover:bg-teal-50 hover:border-teal-200 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 hover:text-teal-700 text-center transition-all"
            >
              Dr. Kumar
            </button>
            <button
              type="button"
              id="quickfill-dr-neha"
              onClick={() => handleQuickFill("dr.neha@kumardentalclinic.com", "DrNeha@2026")}
              className="px-2.5 py-2 bg-slate-100 hover:bg-teal-50 hover:border-teal-200 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 hover:text-teal-700 text-center transition-all"
            >
              Dr. Neha
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
