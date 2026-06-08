"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, CheckCircle2, CreditCard, UtensilsCrossed, XCircle } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { usersApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { cn, formatCurrency, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";

export default function BookingsPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => { if (!isAuthenticated()) router.push("/auth/login"); }, [isAuthenticated, router]);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: () => usersApi.myBookings().then((r) => r.data),
    enabled: isAuthenticated(),
  });

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-cream-100 pb-24 md:pb-0">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="mb-6 flex min-h-11 items-center gap-2 text-sm text-brown-500 hover:text-teal-600">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <h1 className="mb-6 text-2xl font-extrabold text-teal-700">Riwayat Booking</h1>

          {isLoading ? (
            <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-3xl bg-cream-200" />)}</div>
          ) : bookings.length === 0 ? (
            <div className="card-warm py-16 text-center">
              <UtensilsCrossed className="mx-auto mb-4 h-12 w-12 text-brown-300" />
              <p className="font-medium text-teal-700">Belum ada booking</p>
              <Link href="/dinners" className="btn-primary mt-4 rounded-xl px-5 py-2.5 text-sm">Cari Dinner</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((b: any) => (
                <Link key={b.id} href={`/dashboard/bookings/${b.id}`} className="card-warm block p-5 transition-all hover:shadow-warm active:scale-[0.98]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-teal-700">{b.dinner?.city?.name}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-brown-500">
                        <CalendarDays className="h-3.5 w-3.5 text-brand-500" />
                        {formatDate(b.dinner?.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} - {b.dinner?.startTime}
                      </p>
                      <p className="mt-1 text-sm text-brown-400">{b.budgetTier?.label} - {formatCurrency(b.budgetTier?.price)}</p>
                    </div>
                    <div className="text-right">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", getStatusColor(b.status))}>
                        {getStatusLabel(b.status)}
                      </span>
                      {b.payment && (
                        <PaymentStatus status={b.payment.status} />
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function PaymentStatus({ status }: { status: string }) {
  if (status === "VERIFIED") {
    return <p className="mt-2 flex items-center justify-end gap-1 text-xs text-teal-600"><CheckCircle2 className="h-3.5 w-3.5" />Terverifikasi</p>;
  }
  if (status === "REJECTED") {
    return <p className="mt-2 flex items-center justify-end gap-1 text-xs text-red-500"><XCircle className="h-3.5 w-3.5" />Ditolak</p>;
  }
  return <p className="mt-2 flex items-center justify-end gap-1 text-xs text-brown-400"><CreditCard className="h-3.5 w-3.5" />Menunggu</p>;
}
