"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { GoogleRedirectButton } from "@/components/auth/GoogleRedirectButton";
import { BrandLogo } from "@/components/ui/brand-mark";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

const schema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [showPass, setShowPass] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const login = useMutation({
    mutationFn: (data: FormData) => authApi.login(data),
    onSuccess: (res) => {
      const { user, accessToken, refreshToken } = res.data;
      setAuth(user, accessToken, refreshToken);
      router.push(user.role === "ADMIN" ? "/admin" : "/dashboard");
    },
    meta: { successMessage: "Login berhasil", errorTitle: "Login gagal" },
  });

  const loginError = login.error as any;
  const loginErrorMessage = loginError
    ? loginError.response?.data?.message ?? "Tidak bisa terhubung ke server."
    : null;

  return (
    <main className="min-h-dvh bg-[#fff1d8] text-slate-950">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] pt-[calc(env(safe-area-inset-top,0px)+18px)]">
        <header className="flex h-12 items-center justify-between">
          <Link
            href="/"
            className="-ml-2 flex h-12 w-12 items-center justify-center rounded-full text-slate-950 active:bg-white/50"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-9 w-9 stroke-[3]" />
          </Link>
          <Link href="/auth/register" className="rounded-full px-3 py-2 text-sm font-bold text-[#c29254]">
            Daftar
          </Link>
        </header>

        <section className="flex flex-1 flex-col justify-center py-8">
          <div className="mb-9 text-center">
            <BrandLogo className="mx-auto h-24 w-24 bg-transparent" />
            <h1 className="mt-6 text-[31px] font-black leading-tight tracking-[-0.03em]">Masuk ke RuangTemu</h1>
            <p className="mx-auto mt-3 max-w-xs text-sm font-semibold leading-6 text-[#c29254]">
              Lanjutkan cerita baik, persahabatan, dan pertemuan baru kamu.
            </p>
          </div>

          <GoogleRedirectButton />

          {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-white" />
              <span className="text-xs font-bold text-[#c29254]">atau masuk dengan email</span>
              <span className="h-px flex-1 bg-white" />
            </div>
          )}

          <form onSubmit={handleSubmit((data) => login.mutate(data))} className="space-y-6">
            <div>
              <label className="mb-3 block text-[15px] font-bold text-[#c29254]">Email</label>
              <input
                {...register("email")}
                type="email"
                className="register-pill-input"
                autoComplete="email"
                placeholder="kamu@email.com"
              />
              {errors.email && <ErrorText message={errors.email.message} />}
            </div>

            <div>
              <label className="mb-3 block text-[15px] font-bold text-[#c29254]">Password</label>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPass ? "text" : "password"}
                  className="register-pill-input pr-16"
                  autoComplete="current-password"
                  placeholder="Password kamu"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-[#c29254] active:bg-[#fff1d8]"
                  aria-label={showPass ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <ErrorText message={errors.password.message} />}
            </div>

            {loginErrorMessage && (
              <div className="rounded-[24px] border border-red-100 bg-white px-5 py-4 text-sm font-semibold leading-6 text-red-600">
                {loginErrorMessage}
              </div>
            )}

            <button type="submit" disabled={login.isPending} className="register-primary-button">
              {login.isPending ? "Masuk..." : "Masuk"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-2 text-sm font-bold leading-5 text-red-600">{message}</p>;
}
