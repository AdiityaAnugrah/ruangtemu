"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppBottomNav } from "@/components/layout/AppBottomNav";
import { authApi, citiesApi, interestsApi, usersApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, "Gunakan format internasional, contoh +6281234567890")
  .optional()
  .or(z.literal(""));

const schema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  phone: phoneSchema,
  gender: z.string().min(1, "Jenis kelamin wajib"),
  birthDate: z.string().min(1, "Tanggal lahir wajib"),
  city: z.string().min(1, "Wilayah domisili wajib"),
  bio: z.string().max(500).optional(),
});

type FormData = z.infer<typeof schema>;

export default function ProfilePage() {
  const { isAuthenticated, updateUser, clearAuth } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [interestError, setInterestError] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) router.push("/auth/login");
  }, [isAuthenticated, router]);

  const { data: profile } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me().then((r) => r.data),
    enabled: isAuthenticated(),
  });

  const { data: interests = [] } = useQuery({
    queryKey: ["interests"],
    queryFn: () => interestsApi.list().then((r) => r.data),
  });

  const { data: cities = [] } = useQuery({
    queryKey: ["cities"],
    queryFn: () => citiesApi.list().then((r) => r.data),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!profile) return;
    reset({
      name: profile.name,
      phone: profile.phone ?? "",
      gender: profile.gender ?? "",
      birthDate: profile.birthDate ? profile.birthDate.split("T")[0] : "",
      city: profile.city ?? "",
      bio: profile.bio ?? "",
    });
    setSelectedInterests(profile.interests?.map((item: any) => item.interestId) ?? []);
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
        birthDate: new Date(data.birthDate).toISOString(),
        interestIds: selectedInterests,
      });
    },
    onSuccess: (res) => {
      updateUser({ name: res.data.name, avatarUrl: res.data.avatarUrl });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    meta: { successMessage: "Profil berhasil disimpan", errorTitle: "Profil gagal disimpan" },
  });

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      if (next.length >= 3) setInterestError("");
      return next;
    });
  };

  const handleLogout = () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) authApi.logout(refreshToken).catch(() => {});
    clearAuth();
    router.push("/");
  };

  return (
    <main className="min-h-dvh bg-[#fff1d8] text-slate-950">
      <div className="mx-auto w-full max-w-[430px] px-7 pb-[calc(env(safe-area-inset-bottom,0px)+112px)] pt-[calc(env(safe-area-inset-top,0px)+32px)]">
        <p className="text-base font-black text-[#c29254]">Profil Saya</p>
        <h1 className="mt-2 text-[30px] font-black leading-tight tracking-[-0.03em]">
          Atur data diri kamu
        </h1>

        <form onSubmit={handleSubmit((data) => update.mutate(data))} className="mt-8 space-y-6">
          <ProfileField label="Nama">
            <input {...register("name")} className="register-pill-input" placeholder="Nama kamu" />
            {errors.name && <ErrorText message={errors.name.message} />}
          </ProfileField>

          <ProfileField label="Nomor WA">
            <input {...register("phone")} className="register-pill-input" inputMode="tel" placeholder="+6281234567890" />
            {errors.phone && <ErrorText message={errors.phone.message} />}
          </ProfileField>

          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "FEMALE", label: "Cewek", color: "bg-[#bf8ab2]" },
              { value: "MALE", label: "Cowok", color: "bg-[#8bb1b8]" },
            ].map((item) => (
              <label key={item.value} className="relative">
                <input {...register("gender")} type="radio" value={item.value} className="peer sr-only" />
                <span className={cn("flex min-h-[68px] items-center justify-center rounded-[28px] text-lg font-black text-white", item.color, "peer-checked:ring-4 peer-checked:ring-slate-950/80")}>
                  {item.label}
                </span>
              </label>
            ))}
          </div>
          {errors.gender && <ErrorText message={errors.gender.message} />}

          <ProfileField label="Tanggal lahir">
            <input {...register("birthDate")} type="date" className="register-pill-input text-[#d8b27c]" />
            {errors.birthDate && <ErrorText message={errors.birthDate.message} />}
          </ProfileField>

          <ProfileField label="Wilayah domisili">
            <select {...register("city")} className="register-pill-input appearance-none" disabled={cities.length === 0}>
              <option value="">Pilih wilayah</option>
              {cities.map((city: any) => (
                <optgroup key={city.id} label={city.name}>
                  {city.areas.map((area: string) => (
                    <option key={`${city.name}-${area}`} value={`${city.name} - ${area}`}>
                      {area}, {city.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {errors.city && <ErrorText message={errors.city.message} />}
          </ProfileField>

          <ProfileField label="Bio">
            <textarea
              {...register("bio")}
              rows={3}
              className="w-full resize-none rounded-[30px] border-0 bg-white px-6 py-5 text-base font-semibold text-slate-950 outline-none placeholder:text-[#e0bd8b] focus:ring-4 focus:ring-[#d7a072]/25"
              placeholder="Ceritakan sedikit tentang dirimu"
            />
          </ProfileField>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[15px] font-bold text-[#c29254]">Minat obrolan</p>
              <span className="text-xs font-black text-[#c29254]">{selectedInterests.length}/3+</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {interests.map((interest: any) => {
                const active = selectedInterests.includes(interest.id);
                return (
                  <button
                    key={interest.id}
                    type="button"
                    onClick={() => toggleInterest(interest.id)}
                    className={cn(
                      "flex min-h-[62px] items-center justify-center rounded-[24px] px-3 text-center text-sm font-black",
                      active ? "bg-slate-950 text-white" : "bg-white text-[#c29254]"
                    )}
                  >
                    {interest.name}
                  </button>
                );
              })}
            </div>
            {interestError && <ErrorText message={interestError} />}
          </section>

          {update.error && (update.error as any).message !== "Pilih minimal 3 minat" && (
            <div className="rounded-[24px] border border-red-100 bg-white px-5 py-4 text-sm font-semibold leading-6 text-red-600">
              {(update.error as any).response?.data?.message ?? "Gagal menyimpan"}
            </div>
          )}

          <button type="submit" disabled={update.isPending} className="register-primary-button">
            {update.isPending ? "Menyimpan..." : "Simpan Profil"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-5 flex min-h-14 w-full items-center justify-center rounded-[24px] border-2 border-slate-950 text-sm font-black text-slate-950"
        >
          Keluar
        </button>
      </div>

      <AppBottomNav />
    </main>
  );
}

function ProfileField({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="mb-3 block text-[15px] font-bold text-[#c29254]">{label}</span>
      {children}
    </label>
  );
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-2 text-sm font-bold leading-5 text-red-600">{message}</p>;
}
