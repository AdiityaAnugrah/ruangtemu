"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Clock, MapPin, Upload, Users, XCircle } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { assetUrl, bookingsApi, settingsApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { cn, formatCurrency, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import { confirmAction } from "@/components/ui/toaster";

export default function BookingDetailPage() {
  const { id } = useParams() as { id: string };
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const qc = useQueryClient();

  useEffect(() => { if (!isAuthenticated()) router.push("/auth/login"); }, [isAuthenticated, router]);

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => bookingsApi.get(id).then((r) => r.data),
    enabled: !!id,
  });

  const { data: settings } = useQuery({
    queryKey: ["settings-public"],
    queryFn: () => settingsApi.public().then((r) => r.data).catch(() => ({})),
  });

  const upload = useMutation({
    mutationFn: (file: File) => bookingsApi.uploadProof(id, file),
    onSuccess: () => {
      setUploadSuccess(true);
      qc.invalidateQueries({ queryKey: ["booking", id] });
    },
    meta: { successMessage: "Bukti transfer berhasil diupload", errorTitle: "Upload bukti gagal" },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await confirmAction({
      title: "Upload bukti transfer?",
      description: "Pastikan gambar jelas dan nominal transfer sudah sesuai.",
      confirmText: "Upload",
    });
    if (ok) upload.mutate(file);
    else e.target.value = "";
  };

  if (isLoading) return (
    <>
      <Navbar />
      <div className="flex min-h-screen items-center justify-center bg-cream-100"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>
      <Footer />
    </>
  );

  if (!booking) return (
    <>
      <Navbar />
      <div className="flex min-h-screen items-center justify-center bg-cream-100"><p>Booking tidak ditemukan</p></div>
      <Footer />
    </>
  );

  const payment = booking.payment;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-cream-100 pb-24 md:pb-0">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
          <Link href="/dashboard/bookings" className="mb-6 flex min-h-11 items-center gap-2 text-sm text-brown-500 hover:text-teal-600">
            <ArrowLeft className="h-4 w-4" /> Riwayat Booking
          </Link>

          <div className="card-warm mb-4 p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-teal-700">Detail Booking</h1>
                <p className="mt-1 text-sm text-brown-400">ID: {booking.id.slice(0, 8)}</p>
              </div>
              <span className={cn("rounded-full px-3 py-1.5 text-xs font-medium", getStatusColor(booking.status))}>
                {getStatusLabel(booking.status)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Kota" value={booking.dinner?.city?.name} />
              <Info label="Tanggal" value={formatDate(booking.dinner?.date, { day: "numeric", month: "short", year: "numeric" })} />
              <Info label="Waktu" value={`${booking.dinner?.startTime} WIB`} />
              <Info label="Tier" value={booking.budgetTier?.label} />
            </div>

            {booking.status === "MATCHED" && booking.table && (
              <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-teal-700">
                  <Users className="h-4 w-4" />
                  Kamu sudah dicocokkan di {booking.table.name}
                </p>
                {booking.dinner?.venueName && booking.dinner.venueName !== "Akan diumumkan H-1" && (
                  <div className="mt-2 text-sm text-teal-700">
                    <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {booking.dinner.venueName}</p>
                    <p className="mt-0.5 text-xs text-brown-500">{booking.dinner.venueAddress}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {payment && (
            <div className="card-warm p-5">
              <h2 className="mb-4 font-bold text-teal-700">Pembayaran</h2>

              <div className="mb-4 flex items-center justify-between">
                <span className="text-brown-500">Total</span>
                <span className="text-xl font-bold text-brand-600">{formatCurrency(payment.amount)}</span>
              </div>

              {payment.status === "VERIFIED" && (
                <StatusBox icon={CheckCircle} tone="green" text="Pembayaran telah diverifikasi" />
              )}
              {payment.status === "REJECTED" && (
                <div className="mb-4 rounded-xl bg-red-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="text-sm font-medium text-red-700">Pembayaran ditolak</span>
                  </div>
                  {payment.note && <p className="ml-8 mt-1 text-xs text-red-600">Alasan: {payment.note}</p>}
                  <p className="ml-8 mt-1 text-xs text-red-500">Silakan upload ulang bukti pembayaran.</p>
                </div>
              )}
              {payment.status === "PENDING" && booking.status === "PENDING_VERIFICATION" && (
                <StatusBox icon={Clock} tone="blue" text="Menunggu verifikasi admin (1x24 jam)" />
              )}

              {["PENDING_PAYMENT", "PENDING_VERIFICATION"].includes(booking.status) && payment.status !== "VERIFIED" && (
                <div className="space-y-4">
                  {settings?.qris_image_url && (
                    <div className="text-center">
                      <p className="mb-3 text-sm font-medium text-brown-500">Scan QRIS untuk Pembayaran</p>
                      <img src={assetUrl(settings.qris_image_url)} alt="QRIS" className="mx-auto h-44 w-44 rounded-xl border object-contain" />
                      <p className="mt-2 text-xs text-brown-400">Transfer tepat sejumlah <strong>{formatCurrency(payment.amount)}</strong></p>
                    </div>
                  )}

                  {!payment.proofUrl || payment.status === "REJECTED" ? (
                    <div>
                      <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                      <button onClick={() => fileRef.current?.click()} disabled={upload.isPending} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-300 py-4 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-50 disabled:opacity-50">
                        <Upload className="h-4 w-4" />
                        {upload.isPending ? "Mengupload..." : "Upload Bukti Transfer"}
                      </button>
                      {uploadSuccess && (
                        <p className="mt-2 flex items-center justify-center gap-1 text-xs text-teal-600">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Bukti berhasil diupload, menunggu verifikasi.
                        </p>
                      )}
                      {upload.error && <p className="mt-2 text-center text-xs text-red-500">{(upload.error as any).response?.data?.message}</p>}
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="mb-2 text-sm text-brown-500">Bukti Pembayaran</p>
                      <img src={assetUrl(payment.proofUrl)} alt="Bukti" className="mx-auto max-h-48 rounded-xl border object-contain" />
                    </div>
                  )}

                  <p className="text-center text-xs text-brown-400">
                    Batas pembayaran: {payment.expiredAt ? formatDate(payment.expiredAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-cream-100 p-4">
      <p className="mb-1 text-xs text-brown-400">{label}</p>
      <p className="font-semibold text-teal-700">{value}</p>
    </div>
  );
}

function StatusBox({ icon: Icon, text, tone }: { icon: any; text: string; tone: "green" | "blue" }) {
  const classes = tone === "green" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700";
  const iconClasses = tone === "green" ? "text-green-500" : "text-blue-500";
  return (
    <div className={cn("mb-4 flex items-center gap-3 rounded-xl px-4 py-3", classes)}>
      <Icon className={cn("h-5 w-5", iconClasses)} />
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}
