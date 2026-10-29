"use client";

import React from "react";
import Link from "next/navigation";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Stethoscope,
  FileText,
  Clock,
  Settings,
  ShieldAlert,
  LogOut,
  Sparkles,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAdmin, isDoctor } = useAuth();

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["ADMIN", "RECEPTIONIST", "DOCTOR"],
    },
    {
      label: "Appointments",
      href: "/dashboard/appointments",
      icon: CalendarDays,
      roles: ["ADMIN", "RECEPTIONIST", "DOCTOR"],
    },
    {
      label: "Patients",
      href: "/dashboard/patients",
      icon: Users,
      roles: ["ADMIN", "RECEPTIONIST", "DOCTOR"],
    },
    {
      label: "Doctor Workspace",
      href: "/dashboard/doctor",
      icon: Stethoscope,
      roles: ["DOCTOR", "ADMIN"],
    },
    {
      label: "Medical Documents",
      href: "/dashboard/documents",
      icon: FileText,
      roles: ["DOCTOR", "ADMIN", "RECEPTIONIST"],
    },
    {
      label: "Follow-ups",
      href: "/dashboard/follow-ups",
      icon: Clock,
      roles: ["ADMIN", "RECEPTIONIST", "DOCTOR"],
    },
    {
      label: "Clinic Settings",
      href: "/dashboard/settings",
      icon: Settings,
      roles: ["ADMIN"],
    },
    {
      label: "Audit Logs",
      href: "/dashboard/audit",
      icon: ShieldAlert,
      roles: ["ADMIN"],
    },
  ];

  const visibleItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col min-h-screen border-r border-slate-800 shrink-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-11 h-12 rounded-xl overflow-hidden bg-white border border-slate-700 flex items-center justify-center shrink-0 shadow-lg">
          <img
            src="/logo.jpg"
            alt="Kumar Dental Clinic Logo"
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h1 className="font-bold text-base tracking-wide text-white flex items-center gap-1.5">
            Kumar Dental
          </h1>
          <p className="text-xs text-teal-400 font-medium">Vadodara • Est. 1988</p>
        </div>
      </div>

      {/* Role Pill */}
      <div className="px-6 py-3 bg-slate-800/40 border-b border-slate-800/60 flex items-center justify-between text-xs">
        <span className="text-slate-400">Current Role:</span>
        <span className="px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider text-[10px] bg-teal-950 text-teal-300 border border-teal-800/60">
          {user?.role}
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-teal-600 text-white shadow-md shadow-teal-900/40 font-semibold"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Footer & Logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between mb-3">
          <div className="truncate pr-2">
            <p className="text-xs font-semibold text-slate-200 truncate">
              {user?.profile?.full_name || user?.email}
            </p>
            <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/50 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
