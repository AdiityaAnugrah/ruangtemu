"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight, Calendar, Sparkles } from "lucide-react";
import { assetUrl, eventsApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { motion } from "framer-motion";

export function EventsSection() {
  const { data: events = [] } = useQuery({
    queryKey: ["events-landing"],
    queryFn: () => eventsApi.list().then((r) => r.data.slice(0, 3)),
  });

  if (events.length === 0) return null;

  return (
    <section className="bg-teal-500 py-14 md:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-teal-600 px-4 py-1.5 text-xs font-semibold uppercase text-teal-200">
              <Sparkles className="h-3.5 w-3.5" />
              Event Khusus
            </span>
            <h2 className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">
              Aktivitas lain di luar dinner.
            </h2>
          </div>
          <Link href="/events" className="hidden items-center gap-1 text-sm font-semibold text-brand-300 transition-colors hover:text-brand-200 md:flex">
            Semua event <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {events.map((event: any, i: number) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <Link href={`/events/${event.slug}`} className="group block overflow-hidden rounded-3xl border border-teal-400 bg-teal-600 transition-all hover:bg-teal-700 hover:shadow-teal-glow">
                {event.posterUrl ? (
                  <div className="aspect-video overflow-hidden">
                    <img src={assetUrl(event.posterUrl)} alt={event.title} className="h-full w-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-105" />
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-teal-700">
                    <Sparkles className="h-10 w-10 text-brand-300" />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="mb-2 text-sm font-bold leading-snug text-white transition-colors group-hover:text-brand-300">{event.title}</h3>
                  <div className="mb-3 flex items-center gap-1.5 text-xs text-teal-300">
                    <Calendar className="h-3 w-3" />
                    {formatDate(event.date, { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-brand-300">{formatCurrency(event.price)}</span>
                    <span className="rounded-full bg-brand-500 px-2.5 py-0.5 text-2xs font-semibold text-white">Daftar</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 text-center md:hidden">
          <Link href="/events" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-300 hover:text-brand-200">
            Lihat semua event <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
