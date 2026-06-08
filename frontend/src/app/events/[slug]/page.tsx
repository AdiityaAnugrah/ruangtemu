"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, CheckCircle, Users } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { assetUrl, eventsApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { formatCurrency, formatDate } from "@/lib/utils";
import { confirmAction } from "@/components/ui/toaster";

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
    if (!isAuthenticated()) { router.push("/auth/login"); return; }
    const ok = await confirmAction({
      title: "Daftar event?",
      description: `Kamu akan mendaftar ke ${event.title}.`,
      confirmText: "Daftar",
    });
    if (ok) register.mutate();
  };

  if (isLoading) return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>
      <Footer />
    </>
  );

  if (!event) return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center"><p>Event tidak ditemukan</p></div>
      <Footer />
    </>
  );

  const registeredCount = event._count?.registrations ?? 0;
  const isFull = registeredCount >= event.capacity;
  const isOpen = event.status === "OPEN" && !isFull;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-cream-100 pb-24 md:pb-0">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <Link href="/events" className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> Kembali ke Event
          </Link>

          <div className="card-warm overflow-hidden">
            {event.posterUrl ? (
              <img src={assetUrl(event.posterUrl)} alt={event.title} className="aspect-video w-full object-cover" />
            ) : (
              <div className="aspect-video bg-gradient-to-br from-brand-100 to-orange-100" />
            )}

            <div className="grid gap-6 p-6 lg:grid-cols-[1fr_280px]">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {formatDate(event.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
                  <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {registeredCount}/{event.capacity} peserta</span>
                </div>
                <p className="mt-6 whitespace-pre-line text-sm leading-7 text-gray-700">{event.description}</p>
              </div>

              <div className="rounded-2xl border border-cream-200 bg-cream-100 p-5">
                <p className="text-sm text-gray-500">Harga</p>
                <p className="mt-1 text-2xl font-bold text-brand-600">{formatCurrency(event.price)}</p>
                <p className="mt-3 text-sm text-gray-500">
                  {isFull ? "Kapasitas sudah penuh." : `${event.capacity - registeredCount} kursi tersisa.`}
                </p>

                {register.isSuccess ? (
                  <div className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-700">
                    <CheckCircle className="mb-2 h-5 w-5" />
                    Registrasi berhasil. Detail pembayaran akan dikirim oleh admin.
                  </div>
                ) : (
                  <button
                    onClick={handleRegister}
                    disabled={!isOpen || register.isPending}
                    className="mt-5 w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {register.isPending ? "Mendaftar..." : isFull ? "Penuh" : event.status !== "OPEN" ? "Ditutup" : "Daftar Event"}
                  </button>
                )}

                {register.error && (
                  <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                    {(register.error as any).response?.data?.message ?? "Registrasi gagal"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
