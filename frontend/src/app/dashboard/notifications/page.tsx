"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { AppBottomNav } from "@/components/layout/AppBottomNav";
import { notificationsApi } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

export default function NotificationsPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated()) router.push("/auth/login");
  }, [isAuthenticated, router]);

  const { data: notifications = [] } = useQuery({
    queryKey: ["my-notifications"],
    queryFn: () => notificationsApi.list().then((r) => r.data),
    enabled: isAuthenticated(),
  });

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-notifications"] }),
    meta: { silentToast: true },
  });

  const markOne = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-notifications"] }),
    meta: { silentToast: true },
  });

  const typeLabels: Record<string, string> = {
    PAYMENT_CONFIRMED: "Pembayaran dikonfirmasi",
    PAYMENT_REJECTED: "Pembayaran ditolak",
    MATCH_READY: "Meja sudah terbentuk",
    LOCATION_REVEAL: "Lokasi diumumkan",
    REMINDER: "Reminder dinner",
    EMAIL_VERIFICATION: "Verifikasi email",
  };

  return (
    <main className="min-h-dvh bg-[#fff1d8] text-slate-950">
      <div className="mx-auto w-full max-w-[430px] px-7 pb-[calc(env(safe-area-inset-bottom,0px)+96px)] pt-[calc(env(safe-area-inset-top,0px)+32px)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-base font-black text-[#c29254]">Notifikasi</p>
            <h1 className="mt-2 text-[30px] font-black leading-tight tracking-[-0.03em]">Kabar terbaru</h1>
          </div>
          {notifications.some((item: any) => !item.isRead) && (
            <button
              type="button"
              onClick={() => markAll.mutate()}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-950"
              aria-label="Tandai semua dibaca"
            >
              <CheckCheck className="h-5 w-5" />
            </button>
          )}
        </div>

        <section className="mt-8 space-y-3">
          {notifications.length === 0 ? (
            <div className="rounded-[30px] bg-white px-6 py-10 text-center">
              <Bell className="mx-auto h-10 w-10 text-[#c29254]" />
              <p className="mt-4 text-base font-black">Belum ada notifikasi</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#c29254]">Kabar dinner kamu akan muncul di sini.</p>
            </div>
          ) : (
            notifications.map((notification: any) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => !notification.isRead && markOne.mutate(notification.id)}
                className={cn(
                  "w-full rounded-[30px] px-6 py-5 text-left active:scale-[0.98]",
                  notification.isRead ? "bg-white text-slate-950" : "bg-slate-950 text-white"
                )}
              >
                <span className="flex items-start justify-between gap-4">
                  <span>
                    <span className="block text-base font-black">{typeLabels[notification.type] ?? notification.type}</span>
                    <span className={cn("mt-1 block text-sm font-bold", notification.isRead ? "text-[#c29254]" : "text-cream-100")}>
                      {formatDate(notification.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </span>
                  {!notification.isRead && <span className="mt-2 h-3 w-3 rounded-full bg-brand-500" />}
                </span>
              </button>
            ))
          )}
        </section>
      </div>

      <AppBottomNav />
    </main>
  );
}
