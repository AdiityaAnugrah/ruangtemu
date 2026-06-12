"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/ui/brand-mark";

export default function RegisterSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace("/dashboard");
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-teal-900 px-6 text-cream-100">
      <div className="flex flex-col items-center">
        <span className="mb-4 flex h-20 w-20 items-center justify-center rounded-[28px] bg-cream-100">
          <BrandMark className="h-14 w-14 rounded-2xl" />
        </span>
        <p className="text-2xl font-black tracking-[-0.03em] text-cream-100">RuangTemu</p>
        <p className="mt-2 max-w-xs text-center text-sm font-semibold leading-6 text-cream-300">
          Menyiapkan ruang untuk cerita baik dan pertemuan baru...
        </p>
      </div>
    </main>
  );
}
