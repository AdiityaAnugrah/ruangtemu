"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CalendarDays, Sparkles, Users } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { assetUrl, eventsApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function EventsPage() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => eventsApi.list().then((r) => r.data),
  });

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-cream-100 pb-24 md:pb-0">
        <div className="bg-teal-500 px-4 py-10">
          <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
            <h1 className="text-3xl font-extrabold text-white">Event Khusus</h1>
            <p className="mt-2 text-sm text-teal-200">Pengalaman lain di luar dinner reguler.</p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-72 animate-pulse rounded-3xl bg-cream-200" />)}
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-3xl border border-cream-200 bg-white py-16 text-center shadow-warm-sm">
              <Sparkles className="mx-auto mb-4 h-12 w-12 text-brown-300" />
              <p className="text-lg font-semibold text-teal-700">Belum ada event aktif</p>
              <p className="mt-2 text-sm text-brown-400">Pantau terus untuk event berikutnya.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event: any) => (
                <Link key={event.id} href={`/events/${event.slug}`} className="card-warm group block overflow-hidden transition-all hover:shadow-warm-lg active:scale-[0.98]">
                  {event.posterUrl ? (
                    <div className="aspect-video overflow-hidden">
                      <img src={assetUrl(event.posterUrl)} alt={event.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    </div>
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-teal-500">
                      <Sparkles className="h-10 w-10 text-brand-300" />
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-teal-700 transition-colors group-hover:text-brand-600">{event.title}</h3>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-brown-400">
                      <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{formatDate(event.date, { day: "numeric", month: "short", year: "numeric" })}</span>
                      <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{event.capacity} kursi</span>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-lg font-bold text-brand-600">{formatCurrency(event.price)}</span>
                      <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">Daftar</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
