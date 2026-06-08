"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, CalendarDays, ChevronRight, Clock, User, UtensilsCrossed } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { notificationsApi, usersApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { cn, formatCurrency, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";

export default function DashboardPage() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) router.push("/auth/login");
  }, [isAuthenticated, router]);

  const { data: bookings = [] } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: () => usersApi.myBookings().then((r) => r.data),
    enabled: isAuthenticated(),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["my-notifications"],
    queryFn: () => notificationsApi.list().then((r) => r.data),
    enabled: isAuthenticated(),
  });

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;
  const nextDinner = bookings.find((b: any) => ["CONFIRMED", "MATCHED"].includes(b.status));
  const pendingBooking = bookings.find((b: any) => b.status === "PENDING_PAYMENT");

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-cream-100 pb-24 md:pb-0">
        <div className="bg-teal-500 px-4 pb-14 pt-6">
          <div className="mx-auto max-w-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-teal-200">Selamat datang kembali,</p>
                <h1 className="text-xl font-extrabold text-white">{user?.name?.split(" ")[0]}</h1>
              </div>
              {unreadCount > 0 && (
                <Link href="/dashboard/notifications" className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 transition-colors hover:bg-teal-700" aria-label="Notifikasi">
                  <Bell className="h-5 w-5 text-white" />
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-2xs font-bold text-white">
                    {unreadCount}
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="mx-auto -mt-10 max-w-xl px-4">
          {nextDinner ? (
            <Link href={`/dashboard/bookings/${nextDinner.id}`} className="card-warm mb-4 block border-brand-200 p-5 shadow-coral-glow transition-all hover:shadow-warm-lg">
              <p className="mb-2 flex items-center gap-1.5 text-2xs font-semibold text-brown-400">
                <CalendarDays className="h-3.5 w-3.5 text-brand-500" />
                Dinner berikutmu
              </p>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-bold text-teal-600">{nextDinner.dinner?.city?.name}</p>
                  <p className="mt-0.5 text-sm text-brown-500">
                    {formatDate(nextDinner.dinner?.date, { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                  <p className="mt-0.5 text-xs text-brown-400">{nextDinner.budgetTier?.label} - {formatCurrency(nextDinner.budgetTier?.price)}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className={cn("rounded-full px-2.5 py-1 text-2xs font-semibold", getStatusColor(nextDinner.status))}>
                    {getStatusLabel(nextDinner.status)}
                  </span>
                  {nextDinner.status === "MATCHED" && (
                    <p className="mt-1.5 text-2xs font-semibold text-teal-500">Meja sudah terbentuk</p>
                  )}
                </div>
              </div>
            </Link>
          ) : pendingBooking ? (
            <Link href={`/dashboard/bookings/${pendingBooking.id}`} className="mb-4 block rounded-3xl border border-yellow-200 bg-yellow-50 p-5 shadow-warm transition-all hover:shadow-warm-lg">
              <p className="mb-2 flex items-center gap-1.5 text-2xs font-semibold text-yellow-700">
                <Clock className="h-3.5 w-3.5" />
                Menunggu pembayaran
              </p>
              <p className="font-bold text-teal-600">{pendingBooking.dinner?.city?.name}</p>
              <p className="text-sm text-brown-500">{formatDate(pendingBooking.dinner?.date, { day: "numeric", month: "long" })}</p>
              <p className="mt-2 text-xs font-medium text-yellow-700">Segera upload bukti bayar</p>
            </Link>
          ) : (
            <Link href="/dinners" className="card-warm mb-4 block border-dashed border-brand-200 bg-brand-50 p-5 transition-all hover:bg-brand-100">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white">
                  <UtensilsCrossed className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-teal-600">Cari Dinner</p>
                  <p className="text-xs text-brown-400">Belum ada booking aktif. Pilih jadwal yang cocok.</p>
                </div>
                <ChevronRight className="ml-auto h-4 w-4 flex-shrink-0 text-brand-400" />
              </div>
            </Link>
          )}

          <div className="mb-6 grid grid-cols-2 gap-3">
            {[
              { href: "/dinners", icon: UtensilsCrossed, label: "Jadwal Dinner", sub: "Cari dan pesan", color: "bg-teal-50 text-teal-600 border-teal-200" },
              { href: "/dashboard/bookings", icon: CalendarDays, label: "Booking Saya", sub: `${bookings.length} total`, color: "bg-brand-50 text-brand-600 border-brand-200" },
              { href: "/dashboard/notifications", icon: Bell, label: "Notifikasi", sub: unreadCount > 0 ? `${unreadCount} baru` : "Tidak ada baru", color: "bg-yellow-50 text-yellow-700 border-yellow-200", badge: unreadCount },
              { href: "/dashboard/profile", icon: User, label: "Profil", sub: "Data dan minat", color: "bg-cream-200 text-brown-600 border-cream-300" },
            ].map((item) => (
              <Link key={item.href} href={item.href} className={cn("card-warm relative border p-4 transition-all hover:shadow-warm active:scale-[0.98]", item.color)}>
                {item.badge && item.badge > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-2xs font-bold text-white">
                    {item.badge}
                  </span>
                )}
                <div className={cn("mb-3 flex h-9 w-9 items-center justify-center rounded-xl", item.color)}>
                  <item.icon className="h-4 w-4" />
                </div>
                <p className="text-sm font-semibold text-teal-700">{item.label}</p>
                <p className="mt-0.5 text-2xs text-brown-400">{item.sub}</p>
              </Link>
            ))}
          </div>

          {bookings.length > 0 && (
            <div className="card-warm p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-teal-700">Booking Terbaru</h3>
                <Link href="/dashboard/bookings" className="text-xs font-semibold text-brand-500">Lihat semua</Link>
              </div>
              <div className="space-y-2.5">
                {bookings.slice(0, 3).map((b: any) => (
                  <Link key={b.id} href={`/dashboard/bookings/${b.id}`} className="flex items-center justify-between rounded-xl bg-cream-100 p-3 transition-colors hover:bg-cream-200">
                    <div>
                      <p className="text-sm font-semibold text-teal-700">{b.dinner?.city?.name}</p>
                      <p className="mt-0.5 text-xs text-brown-400">
                        {formatDate(b.dinner?.date, { day: "numeric", month: "short" })} - {b.budgetTier?.label}
                      </p>
                    </div>
                    <span className={cn("rounded-full px-2 py-0.5 text-2xs font-semibold", getStatusColor(b.status))}>
                      {getStatusLabel(b.status)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
