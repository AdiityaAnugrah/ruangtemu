import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/ui/brand-mark";

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-[#fff1d8] text-slate-950">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6 pb-[calc(env(safe-area-inset-bottom,0px)+28px)] pt-[calc(env(safe-area-inset-top,0px)+28px)] md:max-w-5xl">
        <header className="flex items-center justify-center">
          <BrandLogo className="h-20 w-20 bg-transparent" />
        </header>

        <section className="flex flex-1 flex-col justify-center py-8">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[38px] bg-teal-900 shadow-warm-lg md:aspect-[16/8]">
            <Image
              src="/images/hero-social-dining.png"
              alt="Suasana dinner RuangTemu"
              fill
              priority
              sizes="(min-width: 768px) 960px, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-teal-900/85 via-teal-900/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-7 text-white">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-100">RuangTemu</p>
              <h1 className="mt-3 text-[34px] font-black leading-none tracking-[-0.04em] md:text-5xl">
                Dari asing jadi lebih dekat.
              </h1>
              <p className="mt-4 max-w-sm text-sm font-semibold leading-6 text-cream-100 md:text-base">
                Ruang untuk saling mengenal lewat percakapan dan pengalaman bersama. Semoga lahir cerita baik, persahabatan, kolaborasi, dan kesempatan baru.
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-3">
            <Link
              href="/auth/register"
              className="flex min-h-[62px] items-center justify-center rounded-[28px] bg-gradient-to-r from-brand-600 to-[#bf8ab2] px-6 text-lg font-black text-white active:scale-[0.98]"
            >
              Daftar
            </Link>
            <Link
              href="/auth/login"
              className="flex min-h-[62px] items-center justify-center rounded-[28px] border-2 border-slate-950 px-6 text-lg font-black text-slate-950 active:scale-[0.98]"
            >
              Masuk
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
