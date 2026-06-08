"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, ClipboardCheck, XCircle } from "lucide-react";
import { assetUrl, paymentsApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { formatCurrency, formatDate } from "@/lib/utils";
import { confirmAction } from "@/components/ui/toaster";

export default function AdminPaymentsPage() {
  const { isAdmin, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const [rejectNote, setRejectNote] = useState<{ id: string; note: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/auth/login"); return; }
    if (!isAdmin()) router.push("/dashboard");
  }, [isAuthenticated, isAdmin, router]);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["admin-pending-payments"],
    queryFn: () => paymentsApi.pending().then((r) => r.data),
    refetchInterval: 30000,
  });

  const verify = useMutation({
    mutationFn: (id: string) => paymentsApi.verify(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-pending-payments"] }),
    meta: { successMessage: "Pembayaran berhasil diverifikasi", errorTitle: "Verifikasi pembayaran gagal" },
  });

  const reject = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => paymentsApi.reject(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-pending-payments"] });
      setRejectNote(null);
    },
    meta: { successMessage: "Pembayaran berhasil ditolak", errorTitle: "Penolakan pembayaran gagal" },
  });

  const handleVerify = async (payment: any) => {
    const ok = await confirmAction({
      title: "Verifikasi pembayaran?",
      description: `Booking ${payment.booking?.user?.name ?? "pengguna"} akan dikonfirmasi dan peserta masuk ke proses matching.`,
      confirmText: "Verifikasi",
    });
    if (ok) verify.mutate(payment.id);
  };

  const handleReject = async (payment: any) => {
    const ok = await confirmAction({
      title: "Tolak pembayaran?",
      description: "Peserta akan diminta upload ulang bukti pembayaran. Pastikan alasan penolakan sudah jelas.",
      confirmText: "Tolak",
      variant: "danger",
    });
    if (ok) reject.mutate({ id: payment.id, note: rejectNote?.note ?? "" });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4">
          <Link href="/admin" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> Admin
          </Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-lg font-bold text-gray-900">Verifikasi Pembayaran</h1>
          {payments.length > 0 && <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-xs text-white">{payments.length}</span>}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {isLoading ? (
          <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-200" />)}</div>
        ) : payments.length === 0 ? (
          <div className="rounded-2xl border bg-white py-16 text-center">
            <ClipboardCheck className="mx-auto mb-3 h-12 w-12 text-teal-500" />
            <p className="font-medium text-gray-700">Tidak ada pembayaran yang perlu diverifikasi</p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((p: any) => (
              <div key={p.id} className="rounded-2xl border bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-bold text-gray-900">{p.booking?.user?.name}</span>
                      <span className="text-xs text-gray-500">{p.booking?.user?.email}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {p.booking?.dinner?.city?.name} - {p.booking?.dinner?.date ? formatDate(p.booking.dinner.date, { day: "numeric", month: "short", year: "numeric" }) : "-"}
                    </p>
                    <p className="mt-0.5 text-sm text-gray-500">Tier: {p.booking?.budgetTier?.label}</p>
                    <p className="mt-2 text-lg font-bold text-brand-600">{formatCurrency(p.amount)}</p>
                    <p className="mt-1 text-xs text-gray-400">Upload: {formatDate(p.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>

                  {p.proofUrl && (
                    <div className="flex-shrink-0">
                      <a href={assetUrl(p.proofUrl)} target="_blank" rel="noopener noreferrer">
                        <img src={assetUrl(p.proofUrl)} alt="Bukti" className="h-24 w-24 rounded-xl border object-cover transition-opacity hover:opacity-80" />
                      </a>
                    </div>
                  )}
                </div>

                {rejectNote?.id === p.id ? (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={rejectNote?.note ?? ""}
                      onChange={(e) => rejectNote && setRejectNote({ ...rejectNote, note: e.target.value })}
                      placeholder="Alasan penolakan..."
                      className="min-h-11 flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                    />
                    <button
                      onClick={() => handleReject(p)}
                      disabled={reject.isPending}
                      className="min-h-11 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
                    >
                      Tolak
                    </button>
                    <button
                      onClick={() => setRejectNote(null)}
                      className="min-h-11 rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleVerify(p)}
                      disabled={verify.isPending}
                      className="flex min-h-11 items-center gap-2 rounded-xl bg-green-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" /> Verifikasi
                    </button>
                    <button
                      onClick={() => setRejectNote({ id: p.id, note: "" })}
                      className="flex min-h-11 items-center gap-2 rounded-xl border border-red-300 px-5 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4" /> Tolak
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
