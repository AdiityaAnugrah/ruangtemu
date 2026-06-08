"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/ui/brand-mark";
import { useAuthStore } from "@/stores/authStore";

type GoogleCallbackUser = {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
  avatarUrl?: string | null;
};

export default function GoogleCallbackPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState("");

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const callbackError = search.get("error");

    if (callbackError) {
      setError(callbackError);
      return;
    }

    const accessToken = hash.get("accessToken");
    const refreshToken = hash.get("refreshToken");
    const userParam = hash.get("user");

    if (!accessToken || !refreshToken || !userParam) {
      setError("Data login Google tidak lengkap. Silakan coba lagi.");
      return;
    }

    try {
      const user = JSON.parse(userParam) as GoogleCallbackUser;
      setAuth(user, accessToken, refreshToken);
      window.history.replaceState(null, "", "/auth/google/callback");
      router.replace(user.role === "ADMIN" ? "/admin" : "/dashboard/profile");
    } catch {
      setError("Data login Google tidak valid. Silakan coba lagi.");
    }
  }, [router, setAuth]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-100 px-4">
      <div className="card-warm w-full max-w-sm p-6 text-center shadow-warm">
        <BrandLogo className="mx-auto mb-4 h-32 w-32 bg-transparent" />
        <h1 className="text-xl font-extrabold text-teal-700">
          {error ? "Login Google gagal" : "Memproses login Google"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-brown-500">
          {error || "Sebentar, kami sedang menyimpan sesi akun kamu."}
        </p>
        {error && (
          <Link href="/auth/login" className="btn-primary mt-5 w-full rounded-xl">
            Kembali ke Login
          </Link>
        )}
      </div>
    </div>
  );
}
