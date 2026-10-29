"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity, Shield, ArrowRight, Stethoscope } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if staff token exists
    const token = typeof window !== "undefined" ? localStorage.getItem("staff_access_token") : null;
    if (token) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center p-6 text-center">
      <div className="w-24 h-28 rounded-2xl overflow-hidden bg-white border-2 border-white/20 flex items-center justify-center mb-6 shadow-2xl">
        <img
          src="/logo.jpg"
          alt="Kumar Dental Clinic Logo"
          className="w-full h-full object-cover"
        />
      </div>
      
      <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        Kumar Dental Clinic
      </h1>
      <p className="mt-2 text-sm text-teal-400 font-medium">
        Vadodara, Gujarat • Est. 1988
      </p>
      
      <p className="mt-4 text-slate-400 max-w-md text-sm">
        Redirecting you to the Clinic Management Portal...
      </p>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#fee2e2] hover:bg-[#fecaca] font-semibold text-[#dc2626] border-2 border-[#ef4444] transition-all"
        >
          <Shield className="w-4 h-4" /> Go to Staff Login <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#fee2e2] hover:bg-[#fecaca] font-semibold text-[#dc2626] border-2 border-[#ef4444] transition-all"
        >
          <Stethoscope className="w-4 h-4" /> Direct to Dashboard
        </Link>
      </div>
    </div>
  );
}
