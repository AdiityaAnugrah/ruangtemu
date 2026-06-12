"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, ChevronRight, CreditCard, SearchX } from "lucide-react";
import { AppBottomNav } from "@/components/layout/AppBottomNav";
import { usersApi } from "@/lib/api";
import { formatCurrency, formatDate, getStatusLabel } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

export default function BookingsPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) router.push("/auth/login");
  }, [isAuthenticated, router]);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: () => usersApi.myBookings().then((r) => r.data),
    enabled: isAuthenticated(),
  });

  return (
    <main className="min-h-dvh bg-[#fff1d8] text-slate-950">
      <div className="mx-auto w-full max-w-[430px] px-7 pb-[calc(env(safe-area-inset-bottom,0px)+96px)] pt-[calc(env(safe-area-inset-top,0px)+32px)]">
        <p className="text-base font-black text-[#c29254]">Aktivitas</p>
        <h1 className="mt-2 text-[30px] font-black leading-tight tracking-[-0.03em]">
          Riwayat dinner kamu
        </h1>

        <div className="mt-8 space-y-3">
          {isLoading ? (
            [1, 2, 3].map((item) => <div key={item} className="h-[86px] animate-pulse rounded-[30px] bg-white/70" />)
          ) : bookings.length === 0 ? (
            <div className="rounded-[30px] bg-white px-6 py-10 text-center">
              <SearchX className="mx-auto h-10 w-10 text-[#c29254]" />
              <p className="mt-4 text-base font-black">Belum ada aktivitas</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#c29254]">Pilih jadwal dinner dan mulai cerita baru.</p>
              <Link
                href="/dashboard"
                className="mt-6 flex min-h-14 items-center justify-center rounded-[24px] bg-slate-950 px-5 text-sm font-black text-white"
              >
                Lihat Jadwal
              </Link>
            </div>
          ) : (
            bookings.map((booking: any) => (
              <Link
                key={booking.id}
                href={`/dashboard/bookings/${booking.id}`}
                className="flex min-h-[86px] items-center rounded-[30px] bg-slate-950 px-6 py-4 text-white active:scale-[0.98]"
              >
                <CalendarDays className="mr-4 h-5 w-5 shrink-0 text-cream-100" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-black">
                    {formatDate(booking.dinner?.date, { weekday: "long", day: "numeric", month: "long" })}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-sm font-black text-cream-100">
                    <CreditCard className="h-3.5 w-3.5" />
                    {booking.budgetTier?.label} - {formatCurrency(booking.budgetTier?.price)}
                  </span>
                  <span className="mt-0.5 block text-xs font-bold text-[#d8c7a9]">{getStatusLabel(booking.status)}</span>
                </span>
                <ChevronRight className="ml-4 h-5 w-5 shrink-0 text-cream-100" />
              </Link>
            ))
          )}
        </div>
      </div>

      <AppBottomNav />
    </main>
  );
}
