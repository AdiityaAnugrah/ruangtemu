"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Pencil, Plus, Power, RotateCcw, Save, X } from "lucide-react";
import { citiesApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import { confirmAction } from "@/components/ui/toaster";

const emptyForm = {
  name: "",
  areasText: "",
  isActive: true,
};

function parseAreas(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((area) => area.trim())
    .filter(Boolean);
}

function formatAreas(areas?: string[]) {
  return (areas ?? []).join("\n");
}

export default function AdminCitiesPage() {
  const { isAdmin, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/auth/login"); return; }
    if (!isAdmin()) router.push("/dashboard");
  }, [isAuthenticated, isAdmin, router]);

  const { data: cities = [], isLoading } = useQuery({
    queryKey: ["cities-all"],
    queryFn: () => citiesApi.listAll().then((r) => r.data),
    enabled: isAdmin(),
  });

  const activeCount = useMemo(() => cities.filter((city: any) => city.isActive).length, [cities]);

  const create = useMutation({
    mutationFn: () => citiesApi.create({
      name: form.name.trim(),
      areas: parseAreas(form.areasText),
      isActive: form.isActive,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cities-all"] });
      qc.invalidateQueries({ queryKey: ["cities"] });
      setForm(emptyForm);
      setShowCreate(false);
    },
    meta: { successMessage: "Kota berhasil disimpan", errorTitle: "Kota gagal disimpan" },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data?: { name: string; areas: string[]; isActive: boolean } }) => citiesApi.update(id, data ?? {
      name: form.name.trim(),
      areas: parseAreas(form.areasText),
      isActive: form.isActive,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cities-all"] });
      qc.invalidateQueries({ queryKey: ["cities"] });
      setEditingId(null);
      setForm(emptyForm);
    },
    meta: { successMessage: "Kota berhasil diperbarui", errorTitle: "Kota gagal diperbarui" },
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => citiesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cities-all"] });
      qc.invalidateQueries({ queryKey: ["cities"] });
    },
    meta: { successMessage: "Kota berhasil dinonaktifkan", errorTitle: "Kota gagal dinonaktifkan" },
  });

  const startEdit = (city: any) => {
    setShowCreate(false);
    setEditingId(city.id);
    setForm({
      name: city.name,
      areasText: formatAreas(city.areas),
      isActive: city.isActive,
    });
  };

  const cancelForm = () => {
    setShowCreate(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleDeactivate = async (city: any) => {
    const ok = await confirmAction({
      title: `Nonaktifkan ${city.name}?`,
      description: "Kota yang nonaktif tidak akan tampil di pendaftaran dan jadwal publik.",
      confirmText: "Nonaktifkan",
      variant: "danger",
    });
    if (ok) deactivate.mutate(city.id);
  };

  const handleActivate = async (city: any) => {
    const ok = await confirmAction({
      title: `Aktifkan ${city.name}?`,
      description: "Kota ini akan tersedia lagi untuk pendaftaran dan jadwal yang dibuat admin.",
      confirmText: "Aktifkan",
    });
    if (ok) update.mutate({ id: city.id, data: { name: city.name, areas: city.areas ?? [], isActive: true } });
  };

  const canSubmit = form.name.trim().length >= 2 && parseAreas(form.areasText).length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-4 w-4" /> Admin
            </Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-lg font-bold text-gray-900">Kelola Kota</h1>
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              setForm(emptyForm);
              setShowCreate((value) => !value);
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" /> Tambah Kota
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border bg-white p-4">
            <p className="text-xs font-medium text-gray-500">Kota aktif</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{activeCount}</p>
          </div>
          <div className="rounded-2xl border bg-white p-4">
            <p className="text-xs font-medium text-gray-500">Total kota</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{cities.length}</p>
          </div>
          <div className="rounded-2xl border bg-white p-4">
            <p className="text-xs font-medium text-gray-500">Sumber data</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">Database admin</p>
          </div>
        </div>

        {(showCreate || editingId) && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editingId) update.mutate({ id: editingId });
              else create.mutate();
            }}
            className="mb-6 rounded-2xl border bg-white p-5"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-bold text-gray-900">{editingId ? "Edit Kota" : "Tambah Kota"}</h2>
              <button type="button" onClick={cancelForm} className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-gray-100" aria-label="Tutup form">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Nama kota</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={form.isActive ? "active" : "inactive"}
                  onChange={(e) => setForm({ ...form, isActive: e.target.value === "active" })}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Area ready</label>
                <textarea
                  rows={5}
                  value={form.areasText}
                  onChange={(e) => setForm({ ...form, areasText: e.target.value })}
                  className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
                <p className="mt-1 text-xs text-gray-500">Tulis satu area per baris atau pisahkan dengan koma.</p>
              </div>
            </div>

            {(create.error || update.error) && (
              <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {((create.error || update.error) as any).response?.data?.message ?? "Gagal menyimpan kota"}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                disabled={!canSubmit || create.isPending || update.isPending}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> {editingId ? "Simpan Perubahan" : "Simpan Kota"}
              </button>
              <button type="button" onClick={cancelForm} className="min-h-11 rounded-xl border px-5 py-2.5 text-sm hover:bg-gray-50">Batal</button>
            </div>
          </form>
        )}

        {isLoading ? (
          <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-200" />)}</div>
        ) : (
          <div className="space-y-4">
            {cities.map((city: any) => (
              <div key={city.id} className="rounded-2xl border bg-white p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <MapPin className="h-4 w-4 text-brand-500" />
                      <h2 className="font-bold text-gray-900">{city.name}</h2>
                      <span className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium",
                        city.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      )}>
                        {city.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                        {city._count?.dinners ?? 0} dinner
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {city.areas?.map((area: string) => (
                        <span key={area} className="rounded-full bg-cream-100 px-3 py-1 text-xs font-medium text-brown-600">{area}</span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => startEdit(city)}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    {city.isActive ? (
                      <button
                        onClick={() => handleDeactivate(city)}
                        disabled={deactivate.isPending}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-red-100 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
                      >
                        <Power className="h-3.5 w-3.5" /> Nonaktifkan
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivate(city)}
                        disabled={update.isPending}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-green-100 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-200 disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Aktifkan
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
