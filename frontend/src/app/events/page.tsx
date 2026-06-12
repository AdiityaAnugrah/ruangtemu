"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { AppBottomNav } from "@/components/layout/AppBottomNav";
import { assetUrl, eventsApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function EventsPage() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => eventsApi.list().then((r) => r.data),
  });

  return (
    <main className="min-h-dvh bg-[#fff1d8] text-slate-950">
      <div className="mx-auto w-full max-w-[430px] px-7 pb-[calc(env(safe-area-inset-bottom,0px)+96px)] pt-[calc(env(safe-area-inset-top,0px)+32px)]">
        <p className="text-base font-black text-[#c29254]">Event</p>
        <h1 className="mt-2 text-[30px] font-black leading-tight tracking-[-0.03em]">
          Pengalaman bersama lainnya
        </h1>

        <section className="mt-8 space-y-3">
          {isLoading ? (
            [1, 2].map((item) => <div key={item} className="h-[180px] animate-pulse rounded-[34px] bg-white/70" />)
          ) : events.length === 0 ? (
            <div className="rounded-[30px] bg-white px-6 py-10 text-center">
              <Sparkles className="mx-auto h-10 w-10 text-[#c29254]" />
              <p className="mt-4 text-base font-black">Belum ada event aktif</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#c29254]">Pantau terus untuk cerita baru berikutnya.</p>
            </div>
          ) : (
            events.map((event: any) => (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="block overflow-hidden rounded-[34px] bg-slate-950 text-white active:scale-[0.98]"
              >
                {event.posterUrl ? (
                  <img src={assetUrl(event.posterUrl)} alt={event.title} className="aspect-[16/9] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-r from-brand-700 to-[#8f3f68]">
                    <Sparkles className="h-10 w-10 text-cream-100" />
                  </div>
                )}
                <div className="flex items-center px-6 py-5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-black">{event.title}</span>
                    <span className="block text-sm font-black text-cream-100">
                      {formatDate(event.date, { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                  </span>
                  <ChevronRight className="ml-4 h-5 w-5 shrink-0 text-cream-100" />
                </div>
              </Link>
            ))
          )}
        </section>
      </div>

      <AppBottomNav />
    </main>
  );
}
