"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Bell, MapPin, Phone, Clock, Check } from "lucide-react";

export default function Header() {
  const [showNotifications, setShowNotifications] = useState(false);

  const { data: notifications = [], refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.getNotifications(),
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter((n: any) => !n.read_at).length;

  const handleMarkRead = async (id: string) => {
    await api.markNotificationRead(id);
    refetch();
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10 shrink-0">
      {/* Clinic Operational Badge */}
      <div className="flex items-center gap-6 text-xs text-slate-600">
        <div className="flex items-center gap-1.5 font-medium">
          <Clock className="w-3.5 h-3.5 text-teal-600" />
          <span>Mon–Sat: 10AM–1PM & 5PM–8PM</span>
          <span className="text-slate-400">|</span>
          <span className="text-rose-500 font-semibold">Sun Closed</span>
        </div>
        <div className="hidden lg:flex items-center gap-1.5 text-slate-500">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span>A-6, Yogeshwar Jyot Society, Gotri, Vadodara</span>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-slate-500">
          <Phone className="w-3.5 h-3.5 text-slate-400" />
          <span>+91 98240 37497</span>
        </div>
      </div>

      {/* Action Center & Notifications */}
      <div className="flex items-center gap-4 relative">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {showNotifications && (
          <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in slide-in-from-top-2">
            <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-xs text-slate-800">Clinic Alerts</h3>
              <span className="text-[10px] text-teal-600 font-medium">
                {unreadCount} new
              </span>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No active notifications
                </div>
              ) : (
                notifications.slice(0, 5).map((n: any) => (
                  <div key={n.id} className="p-3 text-xs hover:bg-slate-50 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800">{n.title}</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">{n.body}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {!n.read_at && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        title="Mark as read"
                        className="text-slate-400 hover:text-teal-600 p-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
