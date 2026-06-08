"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { authApi, citiesApi, usersApi, interestsApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, "Gunakan format internasional, contoh +6281234567890")
  .optional()
  .or(z.literal(""));

const schema = z.object({
  name: z.string().min(2),
  phone: phoneSchema,
  gender: z.string().min(1, "Jenis kelamin wajib").refine((value) => ["MALE", "FEMALE", "OTHER"].includes(value), "Jenis kelamin wajib"),
  birthDate: z.string().min(1, "Tanggal lahir wajib"),
  city: z.string().min(1, "Wilayah domisili wajib"),
  bio: z.string().max(500).optional(),
});

type FormData = z.infer<typeof schema>;

export default function ProfilePage() {
  const { isAuthenticated, updateUser } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [interestError, setInterestError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (!isAuthenticated()) router.push("/auth/login"); }, [isAuthenticated, router]);

  const { data: profile } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me().then((r) => r.data),
    enabled: isAuthenticated(),
  });

  const { data: allInterests = [] } = useQuery({
    queryKey: ["interests"],
    queryFn: () => interestsApi.list().then((r) => r.data),
  });

  const { data: cities = [] } = useQuery({
    queryKey: ["cities"],
    queryFn: () => citiesApi.list().then((r) => r.data),
  });

  useEffect(() => {
    if (profile?.interests) {
      setSelectedInterests(profile.interests.map((ui: any) => ui.interestId));
    }
  }, [profile]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name,
        phone: profile.phone ?? "",
        gender: profile.gender ?? "",
        birthDate: profile.birthDate ? profile.birthDate.split("T")[0] : "",
        city: profile.city ?? "",
        bio: profile.bio ?? "",
      });
    }
  }, [profile, reset]);

  const update = useMutation({
    mutationFn: (data: FormData) => {
      if (selectedInterests.length < 3) {
        setInterestError("Pilih minimal 3 minat");
        return Promise.reject(new Error("Pilih minimal 3 minat"));
      }

      setInterestError("");
      return usersApi.updateProfile({
        ...data,
        phone: data.phone || null,
        gender: data.gender,
        birthDate: new Date(data.birthDate).toISOString(),
        interestIds: selectedInterests,
      });
    },
    onSuccess: (res) => {
      updateUser({ name: res.data.name, avatarUrl: res.data.avatarUrl });
      qc.invalidateQueries({ queryKey: ["me"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    meta: { successMessage: "Profil berhasil disimpan", errorTitle: "Profil gagal disimpan" },
  });

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      {
        const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
        if (next.length >= 3) setInterestError("");
        return next;
      }
    );
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-cream-100 pb-24 md:pb-0">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <h1 className="text-2xl font-extrabold text-teal-700 mb-6">Profil Saya</h1>

          <form onSubmit={handleSubmit((d) => update.mutate(d))} className="space-y-6">
            <div className="card-warm p-6 space-y-4">
              <h2 className="font-semibold text-teal-700">Informasi Dasar</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Lengkap</label>
                <input {...register("name")} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">No. HP</label>
                  <input
                    {...register("phone")}
                    placeholder="+6281234567890"
                    autoComplete="tel"
                    inputMode="tel"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                  {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
                  {!errors.phone && <p className="mt-1 text-xs text-gray-400">Awali dengan kode negara, tanpa spasi.</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Jenis Kelamin</label>
                  <select {...register("gender")} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white">
                    <option value="">Pilih...</option>
                    <option value="MALE">Pria</option>
                    <option value="FEMALE">Wanita</option>
                    <option value="OTHER">Lainnya</option>
                  </select>
                  {errors.gender && <p className="mt-1 text-xs text-red-500">{errors.gender.message}</p>}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal Lahir</label>
                  <input {...register("birthDate")} type="date" className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
                  {errors.birthDate && <p className="mt-1 text-xs text-red-500">{errors.birthDate.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Wilayah Domisili</label>
                  <select {...register("city")} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" disabled={cities.length === 0}>
                    <option value="">Pilih wilayah</option>
                    {cities.map((city: any) => (
                      <optgroup key={city.id} label={city.name}>
                        {city.areas.map((area: string) => (
                          <option key={`${city.name}-${area}`} value={`${city.name} - ${area}`}>{area}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
                <textarea {...register("bio")} rows={3} placeholder="Ceritakan sedikit tentang dirimu..." className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
              </div>
            </div>

            <div className="card-warm p-6">
              <h2 className="font-semibold text-teal-700 mb-4">Minat & Hobi</h2>
              <div className="flex flex-wrap gap-2">
                {allInterests.map((interest: any) => (
                  <button
                    type="button"
                    key={interest.id}
                    onClick={() => toggleInterest(interest.id)}
                    className={cn(
                      "min-h-11 rounded-full px-4 py-2 text-sm font-medium transition-colors border",
                      selectedInterests.includes(interest.id)
                        ? "bg-brand-500 text-white border-brand-500"
                        : "bg-white text-gray-600 border-gray-300 hover:border-brand-300"
                    )}
                  >
                    {interest.name}
                  </button>
                ))}
              </div>
              {interestError && <p className="mt-2 text-xs text-red-500">{interestError}</p>}
            </div>

            {update.error && (update.error as any).message !== "Pilih minimal 3 minat" && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {(update.error as any).response?.data?.message ?? "Gagal menyimpan"}
              </div>
            )}

            <button
              type="submit"
              disabled={update.isPending}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
            >
              <Save className="h-4 w-4" />
              {update.isPending ? "Menyimpan..." : saved ? "Tersimpan" : "Simpan Profil"}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
