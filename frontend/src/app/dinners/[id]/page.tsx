"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, CheckCircle, CheckCircle2, MapPin, Users, WalletCards } from "lucide-react";
import { AppBottomNav } from "@/components/layout/AppBottomNav";
import { confirmAction } from "@/components/ui/toaster";
import { assetUrl, bookingsApi, dinnersApi, settingsApi } from "@/lib/api";
import { cn, formatCurrency, formatDate, getStatusLabel } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

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
      qc.invalidateQueries({ queryKey: ["dinner", id] });
    },
    meta: { successMessage: "Booking berhasil dibuat", errorTitle: "Booking gagal" },
  });

  const handleBook = async () => {
    if (!isAuthenticated()) {
      router.push("/auth/login");
      return;
    }
    if (!selectedTier) return;
    const tier = dinner.budgetTiers?.find((item: any) => item.id === selectedTier);
    const ok = await confirmAction({
      title: "Pesan dinner?",
      description: tier ? `Kamu akan membuat booking ${tier.label} senilai ${formatCurrency(tier.price)}.` : "Booking akan dibuat untuk jadwal dinner ini.",
      confirmText: "Pesan",
    });
    if (ok) book.mutate();
  };

  if (isLoading) return <Shell><Spinner /></Shell>;
  if (!dinner) return <Shell><EmptyState title="Dinner tidak ditemukan" /></Shell>;

  if (bookingSuccess) {
    return (
      <main className="min-h-dvh bg-[#fff1d8] text-slate-950">
        <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-center px-7 pb-[calc(env(safe-area-inset-bottom,0px)+96px)] pt-10 text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-teal-600" />
          <h1 className="mt-5 text-[32px] font-black leading-tight tracking-[-0.03em]">Booking berhasil</h1>
          <p className="mx-auto mt-3 max-w-xs text-sm font-bold leading-6 text-[#c29254]">Selesaikan pembayaran QRIS untuk mengunci kursimu.</p>
          <Link href={`/dashboard/bookings/${bookingSuccess}`} className="register-primary-button mt-8">Lihat pembayaran</Link>
          <Link href="/dashboard" className="mt-4 text-sm font-black text-[#c29254]">Ke dashboard</Link>
        </div>
        <AppBottomNav />
      </main>
    );
  }

  const isOpen = dinner.status === "OPEN";

  return (
    <main className="min-h-dvh bg-[#fff1d8] text-slate-950">
      <div className="mx-auto w-full max-w-[430px] px-7 pb-[calc(env(safe-area-inset-bottom,0px)+96px)] pt-[calc(env(safe-area-inset-top,0px)+20px)]">
        <Link href="/dinners" className="-ml-3 flex h-12 w-12 items-center justify-center rounded-full active:bg-white/60" aria-label="Kembali">
          <ArrowLeft className="h-8 w-8 stroke-[3]" />
        </Link>

        <section className="mt-4 rounded-[34px] bg-slate-950 px-6 py-7 text-white">
          <div className="mb-6 flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-black text-brand-200">
              <MapPin className="h-4 w-4" />
              {dinner.city?.name ?? "Kota pilihan"}
            </p>
            <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-black">{getStatusLabel(dinner.status)}</span>
          </div>
          <h1 className="text-[32px] font-black leading-tight tracking-[-0.03em]">
            Dinner {formatDate(dinner.date, { weekday: "long", day: "numeric", month: "long" })}
          </h1>
          <p className="mt-3 text-sm font-bold leading-6 text-cream-100">Mulai pukul {dinner.startTime} WIB. Dari yang sebelumnya asing menjadi lebih dekat.</p>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3">
          <InfoBox icon={Users} label="Meja" value={`Maks. ${dinner.maxPerTable} orang`} />
          <InfoBox icon={CalendarDays} label="Tanggal" value={formatDate(dinner.date, { day: "numeric", month: "short" })} />
          <InfoBox icon={MapPin} label="Lokasi" value={dinner.venueName ?? "Diumumkan H-1"} />
          <InfoBox icon={WalletCards} label="Bayar" value="QRIS" />
        </section>

        <section className="mt-4 rounded-[32px] bg-white px-6 py-6">
          <h2 className="text-xl font-black tracking-[-0.02em]">Pilih budget</h2>
          <div className="mt-5 space-y-3">
            {dinner.budgetTiers?.map((tier: any) => (
              <button
                key={tier.id}
                type="button"
                onClick={() => setSelectedTier(tier.id)}
                className={cn(
                  "w-full rounded-[26px] px-5 py-5 text-left active:scale-[0.98]",
                  selectedTier === tier.id ? "bg-slate-950 text-white" : "bg-[#fff1d8] text-slate-950"
                )}
              >
                <span className="block text-base font-black">{tier.label}</span>
                <span className={cn("mt-1 block text-xl font-black", selectedTier === tier.id ? "text-brand-200" : "text-[#c29254]")}>
                  {formatCurrency(tier.price)}
                </span>
              </button>
            ))}
          </div>

          {book.error && (
            <div className="mt-4 rounded-[24px] bg-red-50 px-5 py-4 text-sm font-bold leading-6 text-red-600">
              {(book.error as any).response?.data?.message ?? "Booking gagal"}
            </div>
          )}

          <button
            type="button"
            onClick={handleBook}
            disabled={!selectedTier || !isOpen || book.isPending}
            className="register-primary-button mt-5 disabled:opacity-60"
          >
            {book.isPending ? "Memproses..." : !isOpen ? getStatusLabel(dinner.status) : "Pesan sekarang"}
          </button>
          <p className="mt-3 text-center text-xs font-bold leading-5 text-[#c29254]">Pembayaran via QRIS. Batas bayar 24 jam.</p>
        </section>

        <section className="mt-4 rounded-[32px] bg-white px-6 py-6">
          <h2 className="text-xl font-black tracking-[-0.02em]">Yang kamu dapat</h2>
          <div className="mt-5 space-y-4">
            {[
              "Makanan dan minuman sesuai tier",
              "Matching dengan peserta lain berdasarkan minat",
              "Meja kecil agar percakapan terasa nyaman",
              "Lokasi restoran pilihan yang diumumkan H-1",
            ].map((item) => (
              <p key={item} className="flex items-start gap-3 text-sm font-bold leading-6 text-[#c29254]">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-teal-600" />
                {item}
              </p>
            ))}
          </div>
        </section>

        {settings?.qris_image_url && (
          <section className="mt-4 rounded-[32px] bg-white px-6 py-6 text-center">
            <p className="mb-3 text-sm font-black text-[#c29254]">QRIS pembayaran</p>
            <img src={assetUrl(settings.qris_image_url)} alt="QRIS" className="mx-auto h-36 w-36 rounded-[24px] bg-[#fff1d8] object-contain p-3" />
          </section>
        )}
      </div>

      <AppBottomNav />
    </main>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-[#fff1d8] text-slate-950">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] items-center justify-center px-7 pb-28 pt-10">{children}</div>
      <AppBottomNav />
    </main>
  );
}

function Spinner() {
  return <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />;
}

function EmptyState({ title }: { title: string }) {
  return <p className="text-center text-base font-black text-[#c29254]">{title}</p>;
}

function InfoBox({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="rounded-[28px] bg-white px-5 py-5">
      <div className="flex items-center gap-2 text-xs font-black text-[#c29254]">
        <Icon className="h-4 w-4 text-brand-500" />
        {label}
      </div>
      <p className="mt-2 text-sm font-black leading-5 text-slate-950">{value}</p>
    </div>
  );
}
