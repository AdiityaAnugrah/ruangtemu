"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, ImageUp, Plus, XCircle } from "lucide-react";
import { assetUrl, citiesApi, eventsApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { confirmAction } from "@/components/ui/toaster";

const emptyForm = {
  title: "",
  slug: "",
  description: "",
  date: "",
  cityId: "",
  price: 0,
  capacity: 30,
  status: "OPEN",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function AdminEventsPage() {
  const { isAdmin, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/auth/login"); return; }
    if (!isAdmin()) router.push("/dashboard");
  }, [isAuthenticated, isAdmin, router]);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["admin-events"],
    queryFn: () => eventsApi.listAll().then((r) => r.data),
    enabled: isAdmin(),
  });

  const { data: cities = [], isLoading: citiesLoading } = useQuery({
    queryKey: ["cities"],
    queryFn: () => citiesApi.list().then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: () => eventsApi.create({
      title: form.title,
      slug: form.slug || slugify(form.title),
      description: form.description,
      date: new Date(form.date).toISOString(),
      cityId: form.cityId || null,
      price: Number(form.price),
      capacity: Number(form.capacity),
      status: form.status,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-events"] });
      setForm(emptyForm);
      setShowCreate(false);
    },
    meta: { successMessage: "Event berhasil dibuat", errorTitle: "Event gagal dibuat" },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => eventsApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-events"] }),
    meta: { successMessage: "Status event berhasil diperbarui", errorTitle: "Status event gagal diperbarui" },
  });

  const cancel = useMutation({
    mutationFn: (id: string) => eventsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-events"] }),
    meta: { successMessage: "Event berhasil dibatalkan", errorTitle: "Event gagal dibatalkan" },
  });

  const uploadPoster = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => eventsApi.uploadPoster(id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-events"] }),
    meta: { successMessage: "Poster event berhasil diupload", errorTitle: "Poster gagal diupload" },
  });

  const updateTitle = (title: string) => {
    setForm((prev) => ({ ...prev, title, slug: prev.slug ? prev.slug : slugify(title) }));
  };

  const handleToggleStatus = async (event: any) => {
    const nextStatus = event.status === "OPEN" ? "CLOSED" : "OPEN";
    const ok = await confirmAction({
      title: nextStatus === "CLOSED" ? "Tutup event?" : "Buka event?",
      description: nextStatus === "CLOSED"
        ? "Registrasi baru untuk event ini akan ditutup."
        : "Event ini akan bisa menerima registrasi lagi.",
      confirmText: nextStatus === "CLOSED" ? "Tutup" : "Buka",
      variant: nextStatus === "CLOSED" ? "danger" : "default",
    });
    if (ok) updateStatus.mutate({ id: event.id, status: nextStatus });
  };

  const handleCancel = async (event: any) => {
    const ok = await confirmAction({
      title: "Batalkan event?",
      description: "Event akan dibatalkan dan tidak tampil sebagai event yang bisa diikuti.",
      confirmText: "Batalkan",
      variant: "danger",
    });
    if (ok) cancel.mutate(event.id);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-4 w-4" /> Admin
            </Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-lg font-bold text-gray-900">Event</h1>
          </div>
          <button
            onClick={() => setShowCreate((value) => !value)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" /> Buat Event
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {showCreate && (
          <form
            onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
            className="mb-6 rounded-2xl border bg-white p-6"
          >
            <h2 className="mb-4 font-bold text-gray-900">Buat Event Baru</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Judul</label>
                <input value={form.title} onChange={(e) => updateTitle(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Slug</label>
                <input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Tanggal</label>
                <input type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Kota</label>
                <select value={form.cityId} onChange={(e) => setForm({ ...form, cityId: e.target.value })} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300">
                  <option value="">{citiesLoading ? "Memuat kota..." : "Tanpa kota khusus"}</option>
                  {cities.map((city: any) => <option key={city.id} value={city.id}>{city.name}</option>)}
                </select>
                {!citiesLoading && cities.length === 0 && (
                  <p className="mt-1 text-xs text-red-500">Belum ada kota aktif. Aktifkan kota di menu Kelola Kota.</p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Harga</label>
                <input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Kapasitas</label>
                <input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Deskripsi</label>
                <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </div>
            </div>

            {create.error && (
              <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {(create.error as any).response?.data?.message ?? "Gagal membuat event"}
              </div>
            )}

            <div className="mt-5 flex gap-3">
              <button disabled={create.isPending || !form.title || !form.date || !form.description} className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                {create.isPending ? "Membuat..." : "Simpan Event"}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border px-5 py-2.5 text-sm hover:bg-gray-50">Batal</button>
            </div>
          </form>
        )}

        {isLoading ? (
          <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-2xl bg-gray-200 animate-pulse" />)}</div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl border bg-white py-16 text-center text-sm text-gray-500">Belum ada event.</div>
        ) : (
          <div className="space-y-4">
            {events.map((event: any) => (
              <div key={event.id} className="rounded-2xl border bg-white p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex gap-4">
                    <div className="h-24 w-32 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
                      {event.posterUrl ? (
                        <img src={assetUrl(event.posterUrl)} alt={event.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                          <Calendar className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-bold text-gray-900">{event.title}</h2>
                        <span className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-medium",
                          event.status === "OPEN" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        )}>
                          {event.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{formatDate(event.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
                      <p className="mt-1 text-sm text-gray-500">{formatCurrency(event.price)} - {event._count?.registrations ?? 0}/{event.capacity} registrasi</p>
                      <Link href={`/events/${event.slug}`} className="mt-2 inline-block text-sm text-brand-600 hover:underline">Lihat halaman publik</Link>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <input
                      id={`poster-${event.id}`}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadPoster.mutate({ id: event.id, file });
                      }}
                    />
                    <label htmlFor={`poster-${event.id}`} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
                      <ImageUp className="h-3.5 w-3.5" /> Poster
                    </label>
                    <button
                      onClick={() => handleToggleStatus(event)}
                      disabled={updateStatus.isPending}
                      className="rounded-xl border px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {event.status === "OPEN" ? "Tutup" : "Buka"}
                    </button>
                    <button
                      onClick={() => handleCancel(event)}
                      disabled={cancel.isPending || event.status === "CANCELLED"}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-red-100 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Batalkan
                    </button>
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
