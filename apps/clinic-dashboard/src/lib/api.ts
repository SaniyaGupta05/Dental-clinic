const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "https://dental-clinic-ws8b.onrender.com/api/v1"
).replace(/\/+$/, "");

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

class ApiClient {
  private getAuthToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("kumar_staff_token");
  }

  public setAuthToken(token: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("kumar_staff_token", token);
    }
  }

  public clearAuthToken(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("kumar_staff_token");
      localStorage.removeItem("kumar_staff_user");
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getAuthToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorData: any = {};
      try {
        errorData = await res.json();
      } catch {
        errorData = { error: { code: `HTTP_${res.status}`, message: res.statusText } };
      }
      const message = errorData?.error?.message || errorData?.detail || "An error occurred";
      throw new Error(message);
    }

    return res.json();
  }

  // Auth
  async staffLogin(email: string, password: string) {
    const data = await this.request<any>("/auth/staff/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    this.setAuthToken(data.access_token);
    if (typeof window !== "undefined") {
      localStorage.setItem("kumar_staff_user", JSON.stringify(data));
    }
    return data;
  }

  async getMe() {
    return this.request<any>("/auth/me");
  }

  async logout() {
    try {
      await this.request("/auth/logout", { method: "POST" });
    } finally {
      this.clearAuthToken();
    }
  }

  // Dashboard & Admin
  async getDashboardKpis() {
    return this.request<any>("/admin/dashboard");
  }

  async getAdminAppointments(params?: { date?: string; doctor_id?: string; status?: string }) {
    const query = new URLSearchParams();
    if (params?.date) query.append("date", params.date);
    if (params?.doctor_id) query.append("doctor_id", params.doctor_id);
    if (params?.status) query.append("status", params.status);
    return this.request<any[]>(`/admin/appointments?${query.toString()}`);
  }

  async getPatients(queryTerm?: string, page = 1, size = 20) {
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    if (queryTerm) query.append("query", queryTerm);
    return this.request<any>(`/admin/patients?${query.toString()}`);
  }

  async getPatientDetail(patientId: string) {
    return this.request<any>(`/admin/patients/${patientId}`);
  }

  async createPatientAtDesk(data: any) {
    return this.request<any>("/admin/patients", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updatePatient(patientId: string, data: any) {
    return this.request<any>(`/admin/patients/${patientId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deletePatient(patientId: string) {
    return this.request<any>(`/admin/patients/${patientId}`, {
      method: "DELETE",
    });
  }

  async getAuditLogs(limit = 50) {
    return this.request<any[]>(`/admin/audit-logs?limit=${limit}`);
  }

  async getSettings() {
    return this.request<any>("/admin/settings");
  }

  async updateSettings(data: any) {
    return this.request<any>("/admin/settings", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // Appointments
  async updateAppointmentStatus(appointmentId: string, status: string, notes?: string, extra?: any) {
    return this.request<any>(`/appointments/${appointmentId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, notes, ...extra }),
    });
  }

  async createAppointmentDirect(data: any) {
    return this.request<any>("/appointments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Clinical Records & Prescriptions
  async createTreatmentRecord(appointmentId: string, data: any) {
    return this.request<any>(`/clinical/appointments/${appointmentId}/treatment-records`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getTreatmentRecord(appointmentId: string) {
    return this.request<any>(`/clinical/appointments/${appointmentId}/treatment-records`);
  }

  async createPrescription(data: any) {
    return this.request<any>("/clinical/prescriptions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getPatientPrescriptions(patientId: string) {
    return this.request<any[]>(`/clinical/patients/${patientId}/prescriptions`);
  }

  // Documents
  async uploadDocument(patientId: string, formData: FormData) {
    return this.request<any>(`/documents/patients/${patientId}/documents`, {
      method: "POST",
      body: formData,
    });
  }

  async getPatientDocuments(patientId: string) {
    return this.request<any[]>(`/documents/patients/${patientId}/documents`);
  }

  async getDocumentDownloadUrl(documentId: string) {
    return this.request<any>(`/documents/${documentId}/download-url`);
  }

  async deleteDocument(documentId: string) {
    return this.request<any>(`/documents/${documentId}`, {
      method: "DELETE",
    });
  }

  // Notifications & Follow-ups
  async getNotifications() {
    return this.request<any[]>("/notifications");
  }

  async markNotificationRead(id: string) {
    return this.request(`/notifications/${id}/read`, { method: "PATCH" });
  }

  async listFollowUps(status?: string) {
    const q = status ? `?status=${status}` : "";
    return this.request<any[]>(`/notifications/admin/follow-ups${q}`);
  }

  async updateFollowUpStatus(followUpId: string, status: string) {
    return this.request<any>(`/notifications/admin/follow-ups/${followUpId}/status?target_status=${status}`, {
      method: "PATCH",
    });
  }

  // Services & Doctors
  async getServices() {
    return this.request<any[]>("/services");
  }

  async getDoctors() {
    return this.request<any[]>("/services/doctors");
  }

  async getAvailability(doctorId: string, dateStr: string) {
    return this.request<any>(`/availability?doctor_id=${doctorId}&date=${dateStr}`);
  }
}

export const api = new ApiClient();
