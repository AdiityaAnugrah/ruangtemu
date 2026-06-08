"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { notificationsApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Bell, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => { if (!isAuthenticated()) router.push("/auth/login"); }, [isAuthenticated, router]);

  const { data: notifications = [] } = useQuery({
    queryKey: ["my-notifications"],
    queryFn: () => notificationsApi.list().then((r) => r.data),
    enabled: isAuthenticated(),
  });

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-notifications"] }),
    meta: { silentToast: true },
  });

  const markOne = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-notifications"] }),
    meta: { silentToast: true },
  });

  const typeLabels: Record<string, string> = {
    PAYMENT_CONFIRMED: "Pembayaran Dikonfirmasi",
    PAYMENT_REJECTED: "Pembayaran Ditolak",
    MATCH_READY: "Matching Selesai",
    LOCATION_REVEAL: "Lokasi Terungkap",
    REMINDER: "Reminder Dinner",
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-cream-100 pb-24 md:pb-0">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
                <ArrowLeft className="h-4 w-4" /> Dashboard
              </Link>
              <h1 className="text-xl font-bold text-teal-700">Notifikasi</h1>
            </div>
            {notifications.some((n: any) => !n.isRead) && (
              <button onClick={() => markAll.mutate()} className="flex items-center gap-1.5 text-sm text-brand-600 hover:underline">
                <CheckCheck className="h-4 w-4" /> Tandai semua dibaca
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="card-warm text-center py-16">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600">Belum ada notifikasi</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n: any) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && markOne.mutate(n.id)}
                  className={cn(
                    "rounded-2xl border p-4 cursor-pointer transition-all",
                    !n.isRead ? "bg-brand-50 border-brand-200 hover:bg-brand-100" : "bg-white hover:bg-cream-50"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{typeLabels[n.type] ?? n.type}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(n.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    {!n.isRead && <div className="h-2.5 w-2.5 rounded-full bg-brand-500 flex-shrink-0 mt-1.5" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
