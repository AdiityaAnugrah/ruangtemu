"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminApi, assetUrl } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { ArrowLeft, CheckCircle, Plus, Save, Trash2, Upload } from "lucide-react";

type TierRow = {
  label: string;
  price: string;
};

const fallbackTiers: TierRow[] = [
  { label: "Casual", price: "175000" },
  { label: "Premium", price: "275000" },
];

function parseTierRows(value?: string): TierRow[] {
  if (!value) return fallbackTiers;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return fallbackTiers;
    const rows = parsed
      .map((tier) => ({
        label: String(tier?.label ?? ""),
        price: String(tier?.price ?? ""),
      }))
      .filter((tier) => tier.label.trim() || tier.price.trim());
    return rows.length > 0 ? rows : fallbackTiers;
  } catch {
    return fallbackTiers;
  }
}

export default function AdminSettingsPage() {
  const { isAdmin, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const qrisRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [tierRows, setTierRows] = useState<TierRow[]>(fallbackTiers);
  const [tierError, setTierError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/auth/login"); return; }
    if (!isAdmin()) router.push("/dashboard");
  }, [isAuthenticated, isAdmin, router]);

  const { data: settings = {} } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => adminApi.settings().then((r) => r.data),
  });

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      setFormData(settings);
      setTierRows(parseTierRows(settings.default_budget_tiers));
    }
  }, [settings]);

  const updateSettings = useMutation({
    mutationFn: (data: Record<string, string>) => adminApi.updateSettings(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    meta: { successMessage: "Pengaturan berhasil disimpan", errorTitle: "Pengaturan gagal disimpan" },
  });

  const uploadQris = useMutation({
    mutationFn: (file: File) => adminApi.uploadQris(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-settings"] }),
    meta: { successMessage: "QRIS berhasil diupload", errorTitle: "Upload QRIS gagal" },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const toSave: Record<string, string> = {};
    Object.entries(formData).forEach(([k, v]) => {
      if (k !== "default_budget_tiers" && !v.includes("***")) toSave[k] = v;
    });

    const cleanedTiers = tierRows.map((tier) => ({
      label: tier.label.trim(),
      price: Number(tier.price),
    }));
    const invalidTier = cleanedTiers.some((tier) => !tier.label || !Number.isInteger(tier.price) || tier.price <= 0);
    if (cleanedTiers.length === 0 || invalidTier) {
      setTierError("Setiap tier wajib punya nama dan harga lebih dari 0.");
      return;
    }

    setTierError("");
    toSave.default_budget_tiers = JSON.stringify(cleanedTiers);
    updateSettings.mutate(toSave);
  };

  const addTier = () => {
    setTierRows((rows) => [...rows, { label: "", price: "" }]);
  };

  const updateTier = (index: number, field: keyof TierRow, value: string) => {
    setTierRows((rows) => rows.map((tier, i) => (i === index ? { ...tier, [field]: value } : tier)));
    if (tierError) setTierError("");
  };

  const removeTier = (index: number) => {
    setTierRows((rows) => rows.filter((_, i) => i !== index));
  };

  const settingGroups = [
    {
      title: "Pembayaran",
      keys: ["payment_deadline_hours"],
      labels: { payment_deadline_hours: "Batas Pembayaran (jam)" },
    },
    {
      title: "SMTP (Email)",
      keys: ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from"],
      labels: { smtp_host: "Host", smtp_port: "Port", smtp_user: "Username", smtp_pass: "Password", smtp_from: "Pengirim" },
      sensitive: ["smtp_pass"],
    },
    {
      title: "WhatsApp Gateway",
      keys: ["wa_gateway_provider", "wa_gateway_token"],
      labels: { wa_gateway_provider: "Provider (fonnte/wablas)", wa_gateway_token: "Token" },
      sensitive: ["wa_gateway_token"],
    },
    {
      title: "Matching",
      keys: ["matching_age_tolerance"],
      labels: { matching_age_tolerance: "Toleransi Usia (tahun)" },
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center gap-4">
          <Link href="/admin" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> Admin
          </Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-lg font-bold text-gray-900">Pengaturan</h1>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* QRIS Upload */}
        <div className="bg-white rounded-2xl border p-6">
          <h2 className="font-bold text-gray-900 mb-4">Gambar QRIS</h2>
          {settings?.qris_image_url && settings.qris_image_url !== "***configured***" && (
            <div className="mb-4 text-center">
              <img src={assetUrl(settings.qris_image_url)} alt="QRIS saat ini" className="mx-auto w-32 h-32 object-contain rounded-xl border" />
              <p className="text-xs text-gray-400 mt-2">QRIS saat ini</p>
            </div>
          )}
          <input ref={qrisRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadQris.mutate(f); }} />
          <button onClick={() => qrisRef.current?.click()} disabled={uploadQris.isPending}
            className="flex items-center gap-2 rounded-xl border-2 border-dashed border-brand-300 px-5 py-3 text-sm text-brand-600 hover:bg-brand-50 transition-colors w-full justify-center disabled:opacity-50">
            <Upload className="h-4 w-4" />
            {uploadQris.isPending ? "Mengupload..." : "Upload Gambar QRIS"}
          </button>
          {uploadQris.isSuccess && (
            <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-green-600">
              <CheckCircle className="h-3.5 w-3.5" />
              QRIS berhasil diupload
            </p>
          )}
        </div>

        {/* Other settings */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border bg-white p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-gray-900">Tier Dinner Default</h2>
                <p className="mt-1 text-sm text-gray-500">Dipakai otomatis saat admin membuat dinner baru.</p>
              </div>
              <button
                type="button"
                onClick={addTier}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-300 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50"
              >
                <Plus className="h-4 w-4" /> Tambah Tier
              </button>
            </div>

            <div className="space-y-3">
              {tierRows.map((tier, index) => (
                <div key={index} className="grid gap-3 rounded-xl border border-cream-200 bg-cream-50 p-3 sm:grid-cols-[1fr_180px_44px] sm:items-end">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Nama tier</label>
                    <input
                      value={tier.label}
                      onChange={(e) => updateTier(index, "label", e.target.value)}
                      placeholder="Contoh: Casual"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Harga</label>
                    <input
                      type="number"
                      min={1}
                      value={tier.price}
                      onChange={(e) => updateTier(index, "price", e.target.value)}
                      placeholder="175000"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTier(index)}
                    disabled={tierRows.length <= 1}
                    className="flex min-h-11 items-center justify-center rounded-xl border border-red-200 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Hapus tier"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {tierError && (
              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {tierError}
              </div>
            )}
          </div>

          {settingGroups.map((group) => (
            <div key={group.title} className="bg-white rounded-2xl border p-6">
              <h2 className="font-bold text-gray-900 mb-4">{group.title}</h2>
              <div className="space-y-4">
                {group.keys.map((key) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{(group.labels as any)[key]}</label>
                    <input
                      type={group.sensitive?.includes(key) ? "password" : "text"}
                      value={formData[key] ?? ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={group.sensitive?.includes(key) ? "Kosong = tidak diubah" : ""}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button type="submit" disabled={updateSettings.isPending}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
            <Save className="h-4 w-4" />
            {updateSettings.isPending ? "Menyimpan..." : saved ? "Tersimpan" : "Simpan Pengaturan"}
          </button>
        </form>
      </div>
    </div>
  );
}
