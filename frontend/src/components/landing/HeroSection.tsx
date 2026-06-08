"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, CheckCircle2, MapPin, Ticket, Users, WalletCards } from "lucide-react";
import { dinnersApi, settingsApi } from "@/lib/api";
import { formatCurrency, formatDate, getStatusLabel } from "@/lib/utils";

type PublicOverview = {
  activeCities: number;
  upcomingDinners: number;
  activeEvents: number;
  confirmedParticipants: number;
};

type HeroDinner = {
  id: string;
  date: string;
  startTime: string;
  status: string;
  city?: { name: string };
  budgetTiers?: Array<{ id: string; price: number }>;
};

export function HeroSection() {
  const { data: overview } = useQuery<PublicOverview>({
    queryKey: ["public-overview"],
    queryFn: () => settingsApi.overview().then((r) => r.data),
  });
  const { data: dinners = [], isLoading: dinnersLoading } = useQuery<HeroDinner[]>({
    queryKey: ["hero-dinners"],
    queryFn: () => dinnersApi.list().then((r) => r.data),
  });

  const nextDinner = dinners[0];
  const lowestPrice = nextDinner?.budgetTiers?.reduce<number | null>((lowest, tier) => {
    if (lowest === null) return tier.price;
    return Math.min(lowest, tier.price);
  }, null);
  const heroStats = [
    { icon: CalendarDays, label: overview ? String(overview.upcomingDinners) : "-", sub: "dinner aktif" },
    { icon: MapPin, label: overview ? String(overview.activeCities) : "-", sub: "kota ready" },
    { icon: Ticket, label: overview ? String(overview.activeEvents) : "-", sub: "event aktif" },
  ];

  return (
    <section className="relative overflow-hidden bg-cream-100 px-4 pb-12 pt-6 md:pb-20 md:pt-14">
      <div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-[1fr_0.9fr] md:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="order-2 md:order-1"
        >
          <span className="section-tag mb-4">
            <Users className="h-3.5 w-3.5" />
            Social Dining
          </span>

          <h1 className="max-w-xl text-4xl font-extrabold leading-[1.08] text-teal-500 sm:text-5xl lg:text-6xl">
            Satu meja kecil untuk cerita yang lebih besar.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-brown-500 sm:text-lg">
            Pilih jadwal dinner, bayar dengan QRIS, lalu datang ke meja berisi orang baru yang dipilih berdasarkan usia dan minatmu.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/dinners" className="btn-primary w-full px-7 py-3.5 sm:w-auto">
              Lihat Jadwal
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/auth/register" className="btn-outline w-full px-7 py-3.5 sm:w-auto">
              Buat Akun
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2 sm:max-w-md">
            {heroStats.map((item) => (
              <div key={item.sub} className="rounded-2xl border border-cream-200 bg-white px-3 py-3 shadow-warm-sm">
                <item.icon className="mb-2 h-4 w-4 text-brand-500" />
                <p className="text-sm font-bold text-teal-600">{item.label}</p>
                <p className="text-2xs text-brown-400">{item.sub}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="order-1 md:order-2"
        >
          <div className="relative mx-auto max-w-sm md:max-w-md">
            <div className="overflow-hidden rounded-[2rem] border-4 border-white bg-white shadow-warm-lg">
              <Image
                src="/images/hero-social-dining.png"
                alt="Meja makan hangat untuk dinner grup kecil"
                width={900}
                height={1200}
                priority
                className="aspect-[4/5] w-full object-cover"
              />
            </div>

            <div className="absolute -bottom-5 left-4 right-4 rounded-3xl border border-cream-200 bg-white/95 p-4 shadow-warm backdrop-blur">
              {nextDinner ? (
                <>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-brown-400">Dinner Mendatang</p>
                      <p className="mt-0.5 font-bold text-teal-600">{nextDinner.city?.name ?? "Kota belum diatur"}</p>
                    </div>
                    <span className="badge-coral">{getStatusLabel(nextDinner.status)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-cream-100 p-3">
                      <CalendarDays className="mb-2 h-4 w-4 text-brand-500" />
                      <p className="text-xs font-semibold text-teal-700">
                        {formatDate(nextDinner.date, { weekday: "short", day: "numeric", month: "short" })}, {nextDinner.startTime}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-cream-100 p-3">
                      <WalletCards className="mb-2 h-4 w-4 text-brand-500" />
                      <p className="text-xs font-semibold text-teal-700">
                        {lowestPrice !== null && lowestPrice !== undefined ? `Mulai ${formatCurrency(lowestPrice)}` : "Budget menyusul"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs font-medium text-teal-600">
                    <CheckCircle2 className="h-4 w-4 text-brand-500" />
                    Data jadwal mengikuti pengaturan admin
                  </div>
                </>
              ) : (
                <div className="py-1">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-brown-400">Dinner Mendatang</p>
                      <p className="mt-0.5 font-bold text-teal-600">
                        {dinnersLoading ? "Memuat jadwal..." : "Belum ada dinner aktif"}
                      </p>
                    </div>
                    <span className="badge-coral">Data Admin</span>
                  </div>
                  <div className="rounded-2xl bg-cream-100 p-3 text-xs font-medium leading-6 text-brown-500">
                    {dinnersLoading ? "Jadwal sedang diambil dari database." : "Admin belum membuka jadwal dinner baru."}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
