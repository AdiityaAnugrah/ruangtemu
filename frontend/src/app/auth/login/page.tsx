"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { BrandLogo } from "@/components/ui/brand-mark";
import { GoogleRedirectButton } from "@/components/auth/GoogleRedirectButton";

const schema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPass, setShowPass] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const { register, handleSubmit, getValues, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const login = useMutation({
    mutationFn: (data: FormData) => authApi.login(data),
    onSuccess: (res) => {
      const { user, accessToken, refreshToken } = res.data;
      setAuth(user, accessToken, refreshToken);
      router.push(user.role === "ADMIN" ? "/admin" : "/dashboard");
    },
    onError: (error: any) => {
      if (error?.response?.data?.requiresVerification) {
        setVerificationEmail(error.response.data.email ?? getValues("email"));
      }
    },
    meta: { successMessage: "Login berhasil", errorTitle: "Login gagal" },
  });

  const verifyEmail = useMutation({
    mutationFn: () => authApi.verifyEmail({ email: verificationEmail, code: verificationCode }),
    onSuccess: (res) => {
      const { user, accessToken, refreshToken } = res.data;
      setAuth(user, accessToken, refreshToken);
      router.push(user.role === "ADMIN" ? "/admin" : "/dashboard");
    },
    meta: { successMessage: "Email berhasil diverifikasi", errorTitle: "Verifikasi email gagal" },
  });

  const resendVerification = useMutation({
    mutationFn: () => authApi.resendVerification(verificationEmail),
    meta: { successMessage: "Kode verifikasi dikirim ulang", errorTitle: "Gagal mengirim kode" },
  });

  const loginError = login.error as any;
  const loginErrorMessage = loginError
    ? loginError.response?.data?.message ?? "Tidak bisa terhubung ke server. Pastikan API backend berjalan."
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-cream-100">
      <div className="flex items-center justify-between px-4 py-4">
        <Link href="/" className="flex min-h-11 items-center gap-1.5 text-sm text-brown-500 transition-colors hover:text-teal-600">
          <ArrowLeft className="h-4 w-4" /> Beranda
        </Link>
        <Link href="/" className="flex min-h-11 items-center gap-1.5">
          <BrandLogo className="h-12 w-12 bg-transparent" />
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <BrandLogo className="mx-auto mb-4 h-36 w-36 bg-transparent" />
            <h1 className="text-2xl font-extrabold text-teal-600">Selamat datang</h1>
            <p className="mt-1.5 text-sm text-brown-400">
              Belum punya akun?{" "}
              <Link href="/auth/register" className="font-semibold text-brand-500 hover:underline">Daftar gratis</Link>
            </p>
          </div>

          <div className="card-warm p-6 shadow-warm">
            <GoogleRedirectButton />
            {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-cream-200" />
                <span className="text-xs font-medium text-brown-300">atau</span>
                <span className="h-px flex-1 bg-cream-200" />
              </div>
            )}

            <form onSubmit={handleSubmit((d) => login.mutate(d))} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-brown-600">Email</label>
                <input {...register("email")} type="email" placeholder="kamu@email.com" className="input-warm" autoComplete="email" />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-brown-600">Password</label>
                <div className="relative">
                  <input {...register("password")} type={showPass ? "text" : "password"} placeholder="Masukkan password" className="input-warm pr-11" autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-brown-400 hover:text-brown-600" aria-label={showPass ? "Sembunyikan password" : "Tampilkan password"}>
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
              </div>

              {login.error && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600">
                  {loginErrorMessage}
                </div>
              )}

              <button type="submit" disabled={login.isPending} className="btn-primary mt-2 w-full py-3">
                {login.isPending ? "Masuk..." : "Masuk"}
              </button>
            </form>

            {verificationEmail && (
              <div className="mt-5 rounded-2xl border border-brand-100 bg-brand-50 p-4">
                <p className="text-sm font-bold text-teal-700">Verifikasi email</p>
                <p className="mt-1 text-xs leading-5 text-brown-500">
                  Masukkan kode 6 digit yang dikirim ke {verificationEmail}.
                </p>
                <div className="mt-3 flex gap-2">
                  <input
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    placeholder="123456"
                    className="input-warm flex-1 text-center text-base font-bold tracking-[0.25em]"
                  />
                  <button
                    type="button"
                    onClick={() => verifyEmail.mutate()}
                    disabled={verificationCode.length !== 6 || verifyEmail.isPending}
                    className="min-h-11 rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-50"
                  >
                    Verifikasi
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => resendVerification.mutate()}
                  disabled={resendVerification.isPending}
                  className="mt-2 text-xs font-semibold text-brand-600 hover:underline disabled:opacity-50"
                >
                  Kirim ulang kode
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
