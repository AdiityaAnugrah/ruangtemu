"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminApi, dinnersApi, citiesApi, matchingApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { formatDate, formatCurrency, getStatusLabel, getStatusColor, cn } from "@/lib/utils";
import { ArrowLeft, Plus, Eye, MapPin, Trash2, XCircle } from "lucide-react";
import { confirmAction } from "@/components/ui/toaster";

const defaultTierTemplate = [
  { label: "Casual", price: 175000 },
  { label: "Premium", price: 275000 },
];

function parseDefaultTiers(value?: string) {
  if (!value) return defaultTierTemplate;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return defaultTierTemplate;
    const tiers = parsed
      .map((tier) => ({
        label: String(tier?.label ?? "").trim(),
        price: Number(tier?.price),
      }))
      .filter((tier) => tier.label && Number.isInteger(tier.price) && tier.price > 0);
    return tiers.length > 0 ? tiers : defaultTierTemplate;
  } catch {
    return defaultTierTemplate;
  }
}

function emptyDinnerForm(tiers = defaultTierTemplate) {
  return {
    cityId: "",
    date: "",
    startTime: "19:00",
    maxPerTable: 6,
    tiers: tiers.map((tier) => ({ ...tier })),
  };
}

export default function AdminDinnersPage() {
  const { isAdmin, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showReveal, setShowReveal] = useState<string | null>(null);
  const [revealData, setRevealData] = useState({
    venueName: "",
    venueAddress: "",
    arrivalTime: "",
    reservationName: "",
    hostName: "",
    hostPhone: "",
    venueNotes: "",
  });
  const [tableLabels, setTableLabels] = useState<Record<string, string>>({});
  const [form, setForm] = useState(emptyDinnerForm());

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/auth/login"); return; }
    if (!isAdmin()) router.push("/dashboard");
  }, [isAuthenticated, isAdmin, router]);

  const { data: dinners = [], isLoading } = useQuery({
    queryKey: ["admin-dinners"],
    queryFn: () => dinnersApi.listAll().then((r) => r.data),
  });

  const { data: cities = [], isLoading: citiesLoading } = useQuery({
    queryKey: ["cities"],
    queryFn: () => citiesApi.list().then((r) => r.data),
  });

  const { data: settings = {} } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => adminApi.settings().then((r) => r.data),
    enabled: isAdmin(),
  });
  const configuredTiers = parseDefaultTiers(settings.default_budget_tiers);

  const { data: matchedTables = [] } = useQuery({
    queryKey: ["matching-tables", showReveal],
    queryFn: () => matchingApi.tables(showReveal!).then((r) => r.data),
    enabled: !!showReveal,
  });

  useEffect(() => {
    if (!showReveal || matchedTables.length === 0) return;
    setTableLabels((current) => {
      const next = { ...current };
      matchedTables.forEach((table: any) => {
        if (next[table.id] === undefined) next[table.id] = table.venueTableLabel ?? "";
      });
      return next;
    });
  }, [showReveal, matchedTables]);

  const create = useMutation({
    mutationFn: () => dinnersApi.create({
      cityId: form.cityId,
      date: new Date(form.date).toISOString(),
      startTime: form.startTime,
      maxPerTable: form.maxPerTable,
      budgetTiers: form.tiers,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-dinners"] });
      setShowCreate(false);
    },
    meta: { successMessage: "Dinner berhasil dibuat", errorTitle: "Dinner gagal dibuat" },
  });

  const reveal = useMutation({
    mutationFn: ({ id, ...data }: {
      id: string;
      venueName: string;
      venueAddress: string;
      arrivalTime: string;
      reservationName: string;
      hostName?: string;
      hostPhone?: string;
      venueNotes?: string;
      tables?: { id: string; venueTableLabel?: string }[];
    }) => dinnersApi.reveal(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-dinners"] });
      setShowReveal(null);
    },
    meta: { successMessage: "Lokasi berhasil direveal", errorTitle: "Reveal lokasi gagal" },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => dinnersApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-dinners"] }),
    meta: { successMessage: "Status dinner berhasil diperbarui", errorTitle: "Status dinner gagal diperbarui" },
  });

  const cancel = useMutation({
    mutationFn: (id: string) => dinnersApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-dinners"] }),
    meta: { successMessage: "Dinner berhasil dibatalkan", errorTitle: "Dinner gagal dibatalkan" },
  });

  const handleReveal = async () => {
    if (!showReveal) return;
    const ok = await confirmAction({
      title: "Reveal lokasi dinner?",
      description: "Nama venue dan alamat akan disimpan, lalu notifikasi dikirim ke peserta yang sudah matched.",
      confirmText: "Reveal",
    });
    if (ok) {
      reveal.mutate({
        id: showReveal,
        ...revealData,
        tables: matchedTables.map((table: any) => ({
          id: table.id,
          venueTableLabel: tableLabels[table.id] ?? "",
        })),
      });
    }
  };

  const openReveal = (dinner: any) => {
    setShowReveal(dinner.id);
    setRevealData({
      venueName: dinner.venueName || "",
      venueAddress: dinner.venueAddress || "",
      arrivalTime: dinner.arrivalTime || dinner.startTime || "",
      reservationName: dinner.reservationName || "",
      hostName: dinner.hostName || "",
      hostPhone: dinner.hostPhone || "",
      venueNotes: dinner.venueNotes || "",
    });
    setTableLabels({});
  };

  const handleToggleBooking = async (dinner: any) => {
    const nextStatus = dinner.status === "OPEN" ? "MATCHING" : "OPEN";
    const ok = await confirmAction({
      title: nextStatus === "MATCHING" ? "Tutup booking dinner?" : "Buka booking lagi?",
      description: nextStatus === "MATCHING"
        ? "Dinner akan masuk tahap matching dan booking baru tidak tampil sebagai jadwal terbuka."
        : "Dinner akan kembali bisa menerima booking dari user.",
      confirmText: nextStatus === "MATCHING" ? "Tutup Booking" : "Buka Lagi",
      variant: nextStatus === "MATCHING" ? "danger" : "default",
    });
    if (ok) updateStatus.mutate({ id: dinner.id, status: nextStatus });
  };

  const handleCancelDinner = async (dinner: any) => {
    const ok = await confirmAction({
      title: "Batalkan dinner?",
      description: "Dinner akan dibatalkan dan tidak tampil sebagai jadwal yang bisa dipesan.",
      confirmText: "Batalkan",
      variant: "danger",
    });
    if (ok) cancel.mutate(dinner.id);
  };

  const toggleCreateForm = () => {
    setShowCreate((current) => {
      const next = !current;
      if (next) setForm(emptyDinnerForm(configuredTiers));
      return next;
    });
  };

  const removeFormTier = (index: number) => {
    setForm((current) => ({
      ...current,
      tiers: current.tiers.filter((_, i) => i !== index),
    }));
  };

  const canReveal = revealData.venueName.trim().length >= 2
    && revealData.venueAddress.trim().length >= 5
    && revealData.arrivalTime.trim().length >= 2
    && revealData.reservationName.trim().length >= 2;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-4 w-4" /> Admin
            </Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-lg font-bold text-gray-900">Kelola Dinner</h1>
          </div>
          <button onClick={toggleCreateForm} className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            <Plus className="h-4 w-4" /> Buat Dinner
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-5 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">Jadwal Dinner</h2>
            <p className="mt-1 text-sm text-slate-500">Buat jadwal, atur status booking, matching, dan reveal lokasi.</p>
          </div>
          <button onClick={toggleCreateForm} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800">
            <Plus className="h-4 w-4" /> Buat Dinner
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="bg-white rounded-2xl border p-6 mb-6">
            <h2 className="font-bold text-gray-900 mb-4">Buat Dinner Baru</h2>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Kota</label>
                <select value={form.cityId} onChange={(e) => setForm({ ...form, cityId: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
                  <option value="">{citiesLoading ? "Memuat kota..." : "Pilih kota..."}</option>
                  {cities.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {!citiesLoading && cities.length === 0 && (
                  <p className="mt-1 text-xs text-red-500">Belum ada kota aktif. Aktifkan kota di menu Kelola Kota.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal</label>
                <input type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Jam Mulai</label>
                <input value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Maks. per Meja</label>
                <input type="number" min={2} max={10} value={form.maxPerTable} onChange={(e) => setForm({ ...form, maxPerTable: +e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Budget Tiers</p>
              {form.tiers.map((t, i) => (
                <div key={i} className="mb-2 grid gap-3 sm:grid-cols-[1fr_1fr_44px]">
                  <input value={t.label} onChange={(e) => { const tiers = [...form.tiers]; tiers[i].label = e.target.value; setForm({ ...form, tiers }); }}
                    placeholder="Label" className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
                  <input type="number" value={t.price} onChange={(e) => { const tiers = [...form.tiers]; tiers[i].price = +e.target.value; setForm({ ...form, tiers }); }}
                    placeholder="Harga (IDR)" className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
                  <button
                    type="button"
                    onClick={() => removeFormTier(i)}
                    disabled={form.tiers.length <= 1}
                    className="flex min-h-11 items-center justify-center rounded-xl border border-red-200 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Hapus tier"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => setForm({ ...form, tiers: [...form.tiers, { label: "", price: 0 }] })}
                className="text-sm text-brand-600 hover:underline">+ Tambah Tier</button>
            </div>
            <div className="flex gap-3">
              <button onClick={() => create.mutate()} disabled={create.isPending || !form.cityId || !form.date}
                className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                {create.isPending ? "Membuat..." : "Buat Dinner"}
              </button>
              <button onClick={() => setShowCreate(false)} className="rounded-xl border px-5 py-2.5 text-sm hover:bg-gray-50">Batal</button>
            </div>
          </div>
        )}

        {/* Reveal modal */}
        {showReveal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
              <h3 className="font-bold text-gray-900">Briefing Lokasi Dinner</h3>
              <p className="mt-1 text-sm text-gray-500">Wajib diisi sebelum lokasi dikirim ke peserta.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input value={revealData.venueName} onChange={(e) => setRevealData({ ...revealData, venueName: e.target.value })}
                  placeholder="Nama resto / venue *" className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
                <input value={revealData.venueAddress} onChange={(e) => setRevealData({ ...revealData, venueAddress: e.target.value })}
                  placeholder="Alamat lengkap *" className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
                <input value={revealData.arrivalTime} onChange={(e) => setRevealData({ ...revealData, arrivalTime: e.target.value })}
                  placeholder="Jam kedatangan, contoh 18:45 *" className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
                <input value={revealData.reservationName} onChange={(e) => setRevealData({ ...revealData, reservationName: e.target.value })}
                  placeholder="Reservasi atas nama *" className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
                <input value={revealData.hostName} onChange={(e) => setRevealData({ ...revealData, hostName: e.target.value })}
                  placeholder="PIC / host di lokasi" className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
                <input value={revealData.hostPhone} onChange={(e) => setRevealData({ ...revealData, hostPhone: e.target.value })}
                  placeholder="Nomor PIC / WhatsApp" className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
                <textarea rows={3} value={revealData.venueNotes} onChange={(e) => setRevealData({ ...revealData, venueNotes: e.target.value })}
                  placeholder="Catatan: dress code, lantai, instruksi check-in, deposit, dll." className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 sm:col-span-2" />
              </div>

              {matchedTables.length > 0 && (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Nomor meja restoran</p>
                  <p className="mt-1 text-xs text-slate-500">Opsional, tapi sebaiknya diisi kalau restoran sudah memberi nomor/area meja.</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {matchedTables.map((table: any) => (
                      <label key={table.id} className="block">
                        <span className="mb-1 block text-xs font-medium text-slate-600">{table.name}</span>
                        <input
                          value={tableLabels[table.id] ?? ""}
                          onChange={(e) => setTableLabels((current) => ({ ...current, [table.id]: e.target.value }))}
                          placeholder="Contoh: Table A3 / Lantai 2"
                          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button onClick={handleReveal} disabled={reveal.isPending || !canReveal}
                  className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                  {reveal.isPending ? "Menyimpan..." : "Simpan & Kirim ke Peserta"}
                </button>
                <button onClick={() => setShowReveal(null)} className="rounded-xl border px-5 py-2.5 text-sm hover:bg-gray-50">Batal</button>
              </div>
            </div>
          </div>
        )}

        {/* Dinner list */}
        {isLoading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-gray-200 animate-pulse" />)}</div>
        ) : (
          <div className="space-y-4">
            {dinners.map((d: any) => (
              <div key={d.id} className="bg-white rounded-2xl border p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-4 w-4 text-brand-500" />
                      <span className="font-bold text-gray-900">{d.city?.name}</span>
                      <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium", getStatusColor(d.status))}>{getStatusLabel(d.status)}</span>
                    </div>
                    <p className="text-sm text-gray-600">{formatDate(d.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} - {d.startTime}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{d._count?.bookings ?? 0} booking</p>
                    <div className="flex gap-2 mt-2">
                      {d.budgetTiers?.map((t: any) => (
                        <span key={t.id} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5">{t.label}: {formatCurrency(t.price)}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {["OPEN", "MATCHING"].includes(d.status) && (
                      <button
                        onClick={() => handleToggleBooking(d)}
                        disabled={updateStatus.isPending}
                        className="flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {d.status === "OPEN" ? "Tutup Booking" : "Buka Lagi"}
                      </button>
                    )}
                    {d.status === "MATCHING" && (
                      <button onClick={() => openReveal(d)}
                        className="flex items-center gap-1 rounded-xl bg-brand-100 text-brand-600 px-3 py-2 text-xs font-medium hover:bg-brand-200">
                        <MapPin className="h-3.5 w-3.5" /> Reveal Lokasi
                      </button>
                    )}
                    <Link href={`/admin/matching?dinnerId=${d.id}`} className="flex items-center gap-1 rounded-xl bg-gray-100 text-gray-600 px-3 py-2 text-xs font-medium hover:bg-gray-200">
                      <Eye className="h-3.5 w-3.5" /> Matching
                    </Link>
                    {!["CANCELLED", "COMPLETED"].includes(d.status) && (
                      <button
                        onClick={() => handleCancelDinner(d)}
                        disabled={cancel.isPending}
                        className="flex items-center gap-1 rounded-xl bg-red-100 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Batalkan
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
