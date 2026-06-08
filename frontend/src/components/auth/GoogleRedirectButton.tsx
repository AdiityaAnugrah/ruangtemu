"use client";

import { useState } from "react";
import { API_BASE_URL } from "@/lib/api";

export function GoogleRedirectButton() {
  const [redirecting, setRedirecting] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!clientId) return null;

  const handleClick = () => {
    setRedirecting(true);
    const redirectTo = `${window.location.origin}/auth/google/callback`;
    const params = new URLSearchParams({ redirectTo });
    window.location.href = `${API_BASE_URL}/auth/google/start?${params.toString()}`;
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={redirecting}
      className="flex min-h-11 w-full items-center justify-center gap-3 rounded-full border border-cream-300 bg-white px-5 py-3 text-sm font-semibold text-brown-700 shadow-warm-sm transition-colors hover:bg-cream-100 disabled:opacity-60"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-base font-bold text-blue-600">G</span>
      {redirecting ? "Mengalihkan..." : "Lanjutkan dengan Google"}
    </button>
  );
}
