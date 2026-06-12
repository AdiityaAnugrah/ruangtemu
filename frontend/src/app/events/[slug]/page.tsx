"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, CheckCircle, Users } from "lucide-react";
import { AppBottomNav } from "@/components/layout/AppBottomNav";
import { confirmAction } from "@/components/ui/toaster";
import { assetUrl, eventsApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

export default function EventDetailPage() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", slug],
    queryFn: () => eventsApi.get(slug).then((r) => r.data),
    enabled: !!slug,
  });

  const register = useMutation({
    mutationFn: () => eventsApi.register(event.id),
    meta: { successMessage: "Registrasi event berhasil", errorTitle: "Registrasi event gagal" },
  });

  const handleRegister = async () => {
    if (!isAuthenticated()) {
      router.push("/auth/login");
      return;
    }
    const ok = await confirmAction({
      title: "Daftar event?",
      description: `Kamu akan mendaftar ke ${event.title}.`,
      confirmText: "Daftar",
    });
    if (ok) register.mutate();
  };

  if (isLoading) return <Shell><Spinner /></Shell>;
  if (!event) return <Shell><EmptyState title="Event tidak ditemukan" /></Shell>;

  const registeredCount = event._count?.registrations ?? 0;
  const isFull = registeredCount >= event.capacity;
  const isOpen = event.status === "OPEN" && !isFull;

  return (
    <main className="min-h-dvh bg-[#fff1d8] text-slate-950">
      <div className="mx-auto w-full max-w-[430px] px-7 pb-[calc(env(safe-area-inset-bottom,0px)+96px)] pt-[calc(env(safe-area-inset-top,0px)+20px)]">
        <Link href="/events" className="-ml-3 flex h-12 w-12 items-center justify-center rounded-full active:bg-white/60" aria-label="Kembali">
          <ArrowLeft className="h-8 w-8 stroke-[3]" />
        </Link>

        <section className="mt-4 overflow-hidden rounded-[34px] bg-white">
          {event.posterUrl ? (
            <img src={assetUrl(event.posterUrl)} alt={event.title} className="aspect-[4/3] w-full object-cover" />
          ) : (
            <div className="aspect-[4/3] bg-slate-950 px-6 py-7 text-white">
              <p className="text-sm font-black text-brand-200">RuangTemu Event</p>
              <h1 className="mt-4 text-[34px] font-black leading-tight tracking-[-0.03em]">{event.title}</h1>
            </div>
          )}
          <div className="px-6 py-6">
            <p className="text-base font-black text-[#c29254]">Event</p>
            <h1 className="mt-2 text-[31px] font-black leading-tight tracking-[-0.03em]">{event.title}</h1>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Info icon={Calendar} label="Tanggal" value={formatDate(event.date, { day: "numeric", month: "short", year: "numeric" })} />
              <Info icon={Users} label="Peserta" value={`${registeredCount}/${event.capacity}`} />
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-[32px] bg-white px-6 py-6">
          <h2 className="text-xl font-black tracking-[-0.02em]">Tentang event</h2>
          <p className="mt-4 whitespace-pre-line text-sm font-semibold leading-7 text-[#c29254]">{event.description}</p>
        </section>

        <section className="mt-4 rounded-[32px] bg-slate-950 px-6 py-6 text-white">
          <p className="text-sm font-black text-brand-200">Harga</p>
          <p className="mt-2 text-[30px] font-black tracking-[-0.03em]">{formatCurrency(event.price)}</p>
          <p className="mt-3 text-sm font-bold leading-6 text-cream-100">
            {isFull ? "Kapasitas sudah penuh." : `${event.capacity - registeredCount} kursi tersisa.`}
          </p>

          {register.isSuccess ? (
            <div className="mt-5 rounded-[24px] bg-white px-5 py-4 text-sm font-black leading-6 text-teal-700">
              <CheckCircle className="mb-2 h-5 w-5" />
              Registrasi berhasil. Detail pembayaran akan dikirim oleh admin.
            </div>
          ) : (
            <button
              type="button"
              onClick={handleRegister}
              disabled={!isOpen || register.isPending}
              className="mt-5 min-h-16 w-full rounded-full bg-brand-500 px-6 text-base font-black text-white active:scale-[0.98] disabled:opacity-60"
            >
              {register.isPending ? "Mendaftar..." : isFull ? "Penuh" : event.status !== "OPEN" ? "Ditutup" : "Daftar event"}
            </button>
          )}

          {register.error && (
            <div className="mt-4 rounded-[24px] bg-red-50 px-5 py-4 text-sm font-bold leading-6 text-red-600">
              {(register.error as any).response?.data?.message ?? "Registrasi gagal"}
            </div>
          )}
        </section>
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

function Info({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="rounded-[24px] bg-[#fff1d8] px-4 py-4">
      <div className="flex items-center gap-2 text-xs font-black text-[#c29254]">
        <Icon className="h-4 w-4 text-brand-500" />
        {label}
      </div>
      <p className="mt-2 text-sm font-black leading-5 text-slate-950">{value}</p>
    </div>
  );
}
