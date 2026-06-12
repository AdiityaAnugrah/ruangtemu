"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Clock, MapPin, Upload, Users, XCircle } from "lucide-react";
import { AppBottomNav } from "@/components/layout/AppBottomNav";
import { confirmAction } from "@/components/ui/toaster";
import { assetUrl, bookingsApi, settingsApi } from "@/lib/api";
import { cn, formatCurrency, formatDate, getStatusLabel } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

export default function BookingDetailPage() {
  const { id } = useParams() as { id: string };
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated()) router.push("/auth/login");
  }, [isAuthenticated, router]);

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

  if (isLoading) return <Shell><Spinner /></Shell>;
  if (!booking) return <Shell><EmptyState title="Booking tidak ditemukan" /></Shell>;

  const payment = booking.payment;

  return (
    <main className="min-h-dvh bg-[#fff1d8] text-slate-950">
      <div className="mx-auto w-full max-w-[430px] px-7 pb-[calc(env(safe-area-inset-bottom,0px)+96px)] pt-[calc(env(safe-area-inset-top,0px)+20px)]">
        <Link href="/dashboard/bookings" className="-ml-3 flex h-12 w-12 items-center justify-center rounded-full active:bg-white/60" aria-label="Kembali">
          <ArrowLeft className="h-8 w-8 stroke-[3]" />
        </Link>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-base font-black text-[#c29254]">Detail aktivitas</p>
            <h1 className="mt-2 text-[31px] font-black leading-tight tracking-[-0.03em]">Dinner kamu</h1>
            <p className="mt-2 text-sm font-bold text-[#c29254]">ID {booking.id.slice(0, 8)}</p>
          </div>
          <span className={cn("rounded-full px-4 py-2 text-xs font-black", statusClass(booking.status))}>
            {getStatusLabel(booking.status)}
          </span>
        </div>

        <section className="mt-8 rounded-[32px] bg-white px-6 py-6">
          <div className="grid grid-cols-2 gap-3">
            <Info label="Kota" value={booking.dinner?.city?.name ?? "-"} />
            <Info label="Tanggal" value={formatDate(booking.dinner?.date, { day: "numeric", month: "short", year: "numeric" })} />
            <Info label="Waktu" value={`${booking.dinner?.startTime ?? "-"} WIB`} />
            <Info label="Tier" value={booking.budgetTier?.label ?? "-"} />
          </div>

          {booking.status === "MATCHED" && booking.table && (
            <div className="mt-5 rounded-[26px] bg-slate-950 px-5 py-5 text-white">
              <p className="flex items-center gap-2 text-base font-black">
                <Users className="h-5 w-5 text-brand-500" />
                Kamu di {booking.table.name}
              </p>
              {booking.dinner?.venueName && booking.dinner.venueName !== "Akan diumumkan H-1" && (
                <div className="mt-4 space-y-3 text-sm font-semibold leading-6 text-cream-100">
                  <p className="flex items-center gap-2 text-white"><MapPin className="h-4 w-4 text-brand-500" /> {booking.dinner.venueName}</p>
                  <p>{booking.dinner.venueAddress}</p>
                  {booking.dinner.arrivalTime && <p>Jam kedatangan: {booking.dinner.arrivalTime}</p>}
                  {booking.dinner.reservationName && <p>Reservasi: {booking.dinner.reservationName}</p>}
                  <p>Meja: {booking.table.venueTableLabel || booking.table.name}</p>
                  {(booking.dinner.hostName || booking.dinner.hostPhone) && (
                    <p>PIC: {[booking.dinner.hostName, booking.dinner.hostPhone].filter(Boolean).join(" - ")}</p>
                  )}
                  {booking.dinner.venueNotes && <p>Catatan: {booking.dinner.venueNotes}</p>}
                </div>
              )}
            </div>
          )}
        </section>

        {payment && (
          <section className="mt-4 rounded-[32px] bg-white px-6 py-6">
            <p className="text-base font-black text-[#c29254]">Pembayaran</p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <span className="text-sm font-bold text-[#c29254]">Total</span>
              <span className="text-[26px] font-black tracking-[-0.03em] text-slate-950">{formatCurrency(payment.amount)}</span>
            </div>

            {payment.status === "VERIFIED" && <StatusBox icon={CheckCircle} tone="green" text="Pembayaran telah diverifikasi" />}
            {payment.status === "PENDING" && booking.status === "PENDING_VERIFICATION" && <StatusBox icon={Clock} tone="blue" text="Menunggu verifikasi admin" />}
            {payment.status === "REJECTED" && (
              <div className="mt-5 rounded-[24px] bg-red-50 px-5 py-4 text-sm font-bold leading-6 text-red-700">
                <div className="flex items-center gap-2"><XCircle className="h-5 w-5" /> Pembayaran ditolak</div>
                {payment.note && <p className="mt-2 text-red-600">Alasan: {payment.note}</p>}
                <p className="mt-2">Silakan upload ulang bukti pembayaran.</p>
              </div>
            )}

            {["PENDING_PAYMENT", "PENDING_VERIFICATION"].includes(booking.status) && payment.status !== "VERIFIED" && (
              <div className="mt-6 space-y-5">
                {settings?.qris_image_url && (
                  <div className="rounded-[28px] bg-[#fff1d8] px-5 py-5 text-center">
                    <p className="mb-3 text-sm font-black text-[#c29254]">Scan QRIS</p>
                    <img src={assetUrl(settings.qris_image_url)} alt="QRIS" className="mx-auto h-48 w-48 rounded-[24px] bg-white object-contain p-3" />
                    <p className="mt-3 text-xs font-bold leading-5 text-[#c29254]">Transfer tepat sejumlah {formatCurrency(payment.amount)}</p>
                  </div>
                )}

                {!payment.proofUrl || payment.status === "REJECTED" ? (
                  <div>
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={upload.isPending}
                      className="flex min-h-16 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-6 text-base font-black text-white active:scale-[0.98] disabled:opacity-60"
                    >
                      <Upload className="h-5 w-5" />
                      {upload.isPending ? "Mengupload..." : "Upload bukti transfer"}
                    </button>
                    {uploadSuccess && <p className="mt-3 text-center text-sm font-bold text-teal-700">Bukti berhasil diupload, menunggu verifikasi.</p>}
                    {upload.error && <p className="mt-3 text-center text-sm font-bold text-red-600">{(upload.error as any).response?.data?.message}</p>}
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="mb-3 text-sm font-black text-[#c29254]">Bukti Pembayaran</p>
                    <img src={assetUrl(payment.proofUrl)} alt="Bukti" className="mx-auto max-h-56 rounded-[24px] bg-[#fff1d8] object-contain p-2" />
                  </div>
                )}

                <p className="text-center text-xs font-bold leading-5 text-[#c29254]">
                  Batas pembayaran: {payment.expiredAt ? formatDate(payment.expiredAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-"}
                </p>
              </div>
            )}
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

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-[24px] bg-[#fff1d8] px-4 py-4">
      <p className="text-xs font-black text-[#c29254]">{label}</p>
      <p className="mt-1 text-sm font-black leading-5 text-slate-950">{value}</p>
    </div>
  );
}

function StatusBox({ icon: Icon, text, tone }: { icon: any; text: string; tone: "green" | "blue" }) {
  const classes = tone === "green" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700";
  return (
    <div className={cn("mt-5 flex items-center gap-3 rounded-[24px] px-5 py-4 text-sm font-black", classes)}>
      <Icon className="h-5 w-5" />
      {text}
    </div>
  );
}

function statusClass(status: string) {
  if (status === "CONFIRMED" || status === "MATCHED") return "bg-teal-100 text-teal-700";
  if (status === "CANCELLED" || status === "EXPIRED") return "bg-red-100 text-red-700";
  return "bg-brand-100 text-brand-700";
}
