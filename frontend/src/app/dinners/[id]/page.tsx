"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, CheckCircle, CheckCircle2, MapPin, Users, WalletCards } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { assetUrl, bookingsApi, dinnersApi, settingsApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { cn, formatCurrency, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import { confirmAction } from "@/components/ui/toaster";

export default function DinnerDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: dinner, isLoading } = useQuery({
    queryKey: ["dinner", id],
    queryFn: () => dinnersApi.get(id).then((r) => r.data),
  });

  const { data: settings } = useQuery({
    queryKey: ["qris-public"],
    queryFn: () => settingsApi.public().then((r) => r.data).catch(() => ({})),
  });

  const book = useMutation({
    mutationFn: () => bookingsApi.create({ dinnerId: id, budgetTierId: selectedTier! }),
    onSuccess: (res) => {
      setBookingSuccess(res.data.id);
      qc.invalidateQueries({ queryKey: ["dinner"] });
    },
    meta: { successMessage: "Booking berhasil dibuat", errorTitle: "Booking gagal" },
  });

  const handleBook = async () => {
    if (!isAuthenticated()) { router.push("/auth/login"); return; }
    if (!selectedTier) return;
    const tier = dinner.budgetTiers?.find((item: any) => item.id === selectedTier);
    const ok = await confirmAction({
      title: "Pesan dinner?",
      description: tier ? `Kamu akan membuat booking dengan tier ${tier.label} senilai ${formatCurrency(tier.price)}.` : "Booking akan dibuat untuk jadwal dinner ini.",
      confirmText: "Pesan",
    });
    if (ok) book.mutate();
  };

  if (isLoading) return (
    <>
      <Navbar />
      <div className="flex min-h-screen items-center justify-center bg-cream-100">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
      <Footer />
    </>
  );

  if (!dinner) return (
    <>
      <Navbar />
      <div className="flex min-h-screen items-center justify-center bg-cream-100"><p>Dinner tidak ditemukan</p></div>
      <Footer />
    </>
  );

  if (bookingSuccess) return (
    <>
      <Navbar />
      <div className="flex min-h-screen items-center justify-center bg-cream-100 px-4">
        <div className="card-warm w-full max-w-md p-8 text-center shadow-warm">
          <CheckCircle className="mx-auto mb-4 h-16 w-16 text-teal-500" />
          <h2 className="mb-2 text-2xl font-bold text-teal-700">Booking berhasil</h2>
          <p className="mb-6 text-sm leading-6 text-brown-500">Selesaikan pembayaran QRIS untuk mengunci kursimu.</p>
          <Link href={`/dashboard/bookings/${bookingSuccess}`} className="btn-primary w-full rounded-xl">
            Lihat Pembayaran
          </Link>
          <Link href="/dashboard" className="mt-3 block text-sm text-brown-400 hover:underline">Ke Dashboard</Link>
        </div>
      </div>
      <Footer />
    </>
  );

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-cream-100 pb-24 md:pb-0">
        <div className="bg-teal-500 px-4 pb-12 pt-6">
          <div className="mx-auto max-w-4xl">
            <Link href="/dinners" className="mb-5 flex min-h-11 w-fit items-center gap-2 text-sm text-teal-100 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Jadwal Dinner
            </Link>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm text-teal-200">
                  <MapPin className="h-4 w-4" />
                  {dinner.city?.name}
                </div>
                <h1 className="text-2xl font-extrabold leading-tight text-white">
                  Dinner {formatDate(dinner.date, { weekday: "long", day: "numeric", month: "long" })}
                </h1>
                <p className="mt-2 text-sm font-medium text-brand-200">Mulai pukul {dinner.startTime} WIB</p>
              </div>
              <span className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", getStatusColor(dinner.status))}>
                {getStatusLabel(dinner.status)}
              </span>
            </div>
          </div>
        </div>

        <div className="mx-auto -mt-7 grid max-w-4xl grid-cols-1 gap-5 px-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <div className="card-warm p-5">
              <div className="grid grid-cols-2 gap-3">
                <InfoBox icon={Users} label="Ukuran Meja" value={`Maks. ${dinner.maxPerTable} orang`} />
                <InfoBox icon={MapPin} label="Lokasi" value={dinner.venueName} />
                <InfoBox icon={CalendarDays} label="Tanggal" value={formatDate(dinner.date, { day: "numeric", month: "short", year: "numeric" })} />
                <InfoBox icon={WalletCards} label="Pembayaran" value="QRIS" />
              </div>
            </div>

            <div className="card-warm p-5">
              <h3 className="mb-4 font-bold text-teal-700">Yang sudah termasuk</h3>
              <ul className="space-y-3 text-sm text-brown-600">
                {[
                  "Makanan dan minuman sesuai tier",
                  "Matching dengan peserta lain berdasarkan minat",
                  "Meja kecil agar percakapan lebih nyaman",
                  "Lokasi restoran pilihan yang diumumkan H-1",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <div className="card-warm p-5">
              <h3 className="mb-4 font-bold text-teal-700">Pilih Budget Tier</h3>
              <div className="space-y-3">
                {dinner.budgetTiers?.map((tier: any) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelectedTier(tier.id)}
                    className={cn(
                      "min-h-16 w-full rounded-2xl border-2 p-4 text-left transition-all",
                      selectedTier === tier.id ? "border-brand-500 bg-brand-50" : "border-cream-300 bg-white hover:border-brand-300"
                    )}
                  >
                    <div className="font-semibold text-teal-700">{tier.label}</div>
                    <div className="mt-1 text-lg font-bold text-brand-600">{formatCurrency(tier.price)}</div>
                  </button>
                ))}
              </div>

              {book.error && (
                <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {(book.error as any).response?.data?.message ?? "Booking gagal"}
                </div>
              )}

              <button onClick={handleBook} disabled={!selectedTier || dinner.status !== "OPEN" || book.isPending} className="btn-primary mt-4 w-full rounded-xl">
                {book.isPending ? "Memproses..." : dinner.status !== "OPEN" ? getStatusLabel(dinner.status) : "Pesan Sekarang"}
              </button>

              <p className="mt-3 text-center text-xs text-brown-400">Pembayaran via QRIS. Batas bayar 24 jam.</p>
            </div>

            {settings?.qris_image_url && (
              <div className="card-warm p-5 text-center">
                <p className="mb-3 text-sm font-medium text-brown-500">QRIS Pembayaran</p>
                <img src={assetUrl(settings.qris_image_url)} alt="QRIS" className="mx-auto h-32 w-32 object-contain" />
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function InfoBox({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-cream-100 p-4">
      <div className="mb-1 flex items-center gap-2 text-xs text-brown-400">
        <Icon className="h-4 w-4 text-brand-500" />
        {label}
      </div>
      <p className="text-sm font-semibold text-teal-700">{value}</p>
    </div>
  );
}
