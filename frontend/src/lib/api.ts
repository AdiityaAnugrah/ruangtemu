import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3200";
export const API_BASE_URL = BASE_URL;

export function assetUrl(path?: string | null): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
});

// Inject token from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;
      if (refreshToken) {
        try {
          const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefresh } = res.data;
          localStorage.setItem("accessToken", accessToken);
          localStorage.setItem("refreshToken", newRefresh);
          original.headers.Authorization = `Bearer ${accessToken}`;
          return api(original);
        } catch {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          window.location.href = "/auth/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  register: (data: unknown) => api.post("/auth/register", data),
  login: (data: unknown) => api.post("/auth/login", data),
  google: (idToken: string) => api.post("/auth/google", { idToken }),
  verifyEmail: (data: unknown) => api.post("/auth/verify-email", data),
  resendVerification: (email: string) => api.post("/auth/resend-verification", { email }),
  logout: (refreshToken: string) => api.post("/auth/logout", { refreshToken }),
  me: () => api.get("/auth/me"),
};

// Users
export const usersApi = {
  updateProfile: (data: unknown) => api.patch("/users/me", data),
  myBookings: () => api.get("/users/me/bookings"),
  listAdmin: () => api.get("/users"),
  getAdmin: (id: string) => api.get(`/users/${id}`),
  setRole: (id: string, role: string) => api.patch(`/users/${id}/role`, { role }),
  setSuspend: (id: string, isSuspended: boolean) => api.patch(`/users/${id}/suspend`, { isSuspended }),
};

// Cities
export const citiesApi = {
  list: () => api.get("/cities"),
  listAll: () => api.get("/cities/all"),
  create: (data: unknown) => api.post("/cities", data),
  update: (id: string, data: unknown) => api.put(`/cities/${id}`, data),
  delete: (id: string) => api.delete(`/cities/${id}`),
  requestCity: (data: unknown) => api.post("/cities/request", data),
  listRequests: () => api.get("/cities/requests/all"),
};

// Dinners
export const dinnersApi = {
  list: (params?: { cityId?: string; status?: string }) => api.get("/dinners", { params }),
  listAll: () => api.get("/dinners/all"),
  get: (id: string) => api.get(`/dinners/${id}`),
  create: (data: unknown) => api.post("/dinners", data),
  update: (id: string, data: unknown) => api.put(`/dinners/${id}`, data),
  updateStatus: (id: string, status: string) => api.patch(`/dinners/${id}/status`, { status }),
  reveal: (id: string, data: {
    venueName: string;
    venueAddress: string;
    arrivalTime: string;
    reservationName: string;
    hostName?: string;
    hostPhone?: string;
    venueNotes?: string;
    tables?: { id: string; venueTableLabel?: string }[];
  }) => api.patch(`/dinners/${id}/reveal`, data),
  delete: (id: string) => api.delete(`/dinners/${id}`),
};

// Bookings
export const bookingsApi = {
  create: (data: { dinnerId: string; budgetTierId: string }) => api.post("/bookings", data),
  get: (id: string) => api.get(`/bookings/${id}`),
  uploadProof: (id: string, file: File) => {
    const form = new FormData();
    form.append("proof", file);
    return api.post(`/bookings/${id}/upload-proof`, form, { headers: { "Content-Type": "multipart/form-data" } });
  },
  cancel: (id: string) => api.delete(`/bookings/${id}`),
  listAdmin: (params?: { dinnerId?: string; status?: string }) => api.get("/bookings", { params }),
};

// Payments
export const paymentsApi = {
  list: (params?: { status?: string }) => api.get("/payments", { params }),
  pending: () => api.get("/payments/pending"),
  verify: (id: string) => api.patch(`/payments/${id}/verify`),
  reject: (id: string, note?: string) => api.patch(`/payments/${id}/reject`, { note }),
};

// Matching
export const matchingApi = {
  preview: (dinnerId: string) => api.get(`/matching/${dinnerId}/preview`),
  commit: (dinnerId: string) => api.post(`/matching/${dinnerId}/commit`),
  tables: (dinnerId: string) => api.get(`/matching/${dinnerId}/tables`),
  moveBooking: (bookingId: string, tableId: string) => api.patch(`/matching/bookings/${bookingId}/table`, { tableId }),
};

// Events
export const eventsApi = {
  list: () => api.get("/events"),
  listAll: () => api.get("/events/all"),
  get: (slug: string) => api.get(`/events/${slug}`),
  create: (data: unknown) => api.post("/events", data),
  update: (id: string, data: unknown) => api.put(`/events/${id}`, data),
  uploadPoster: (id: string, file: File) => {
    const form = new FormData();
    form.append("poster", file);
    return api.post(`/events/${id}/poster`, form, { headers: { "Content-Type": "multipart/form-data" } });
  },
  delete: (id: string) => api.delete(`/events/${id}`),
  register: (id: string) => api.post(`/events/${id}/register`),
  registrations: (id: string) => api.get(`/events/${id}/registrations`),
};

// Notifications
export const notificationsApi = {
  list: () => api.get("/notifications"),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch("/notifications/read-all/all"),
};

// Testimonials
export const testimonialsApi = {
  list: () => api.get("/testimonials"),
  create: (data: unknown) => api.post("/testimonials", data),
  update: (id: string, data: unknown) => api.patch(`/testimonials/${id}`, data),
  delete: (id: string) => api.delete(`/testimonials/${id}`),
};

// Interests
export const interestsApi = {
  list: () => api.get("/interests"),
  create: (name: string) => api.post("/interests", { name }),
  delete: (id: string) => api.delete(`/interests/${id}`),
};

// Admin
export const adminApi = {
  overview: () => api.get("/admin/overview"),
  settings: () => api.get("/admin/settings"),
  updateSettings: (data: unknown) => api.patch("/admin/settings", data),
  uploadQris: (file: File) => {
    const form = new FormData();
    form.append("qris", file);
    return api.post("/admin/settings/qris", form, { headers: { "Content-Type": "multipart/form-data" } });
  },
};

export const settingsApi = {
  public: () => api.get("/admin/public-settings"),
  overview: () => api.get("/admin/public-overview"),
};
