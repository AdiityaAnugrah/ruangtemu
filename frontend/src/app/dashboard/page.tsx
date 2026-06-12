"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, ChevronDown, ChevronRight, MapPin, Ticket } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppBottomNav } from "@/components/layout/AppBottomNav";
import { BrandMark } from "@/components/ui/brand-mark";
import { citiesApi, dinnersApi, eventsApi } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

type CityOption = { id: string; name: string };
type DinnerOption = {
  id: string;
  date: string;
  startTime: string;
  city?: { id: string; name: string };
  status: string;
};
type EventOption = {
  id: string;
  title: string;
  slug: string;
  date: string;
};

export default function DashboardPage() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const [selectedCityId, setSelectedCityId] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) router.push("/auth/login");
  }, [isAuthenticated, router]);

  const { data: cities = [] } = useQuery({
    queryKey: ["cities"],
    queryFn: () => citiesApi.list().then((r) => r.data as CityOption[]),
    enabled: isAuthenticated(),
  });

  useEffect(() => {
    if (!selectedCityId && cities[0]?.id) setSelectedCityId(cities[0].id);
  }, [cities, selectedCityId]);

  const selectedCity = useMemo(
    () => cities.find((city) => city.id === selectedCityId) ?? cities[0],
    [cities, selectedCityId]
  );

  const { data: dinners = [] } = useQuery({
    queryKey: ["dashboard-dinners", selectedCityId],
    queryFn: () => dinnersApi.list({ cityId: selectedCityId || undefined, status: "OPEN" }).then((r) => r.data as DinnerOption[]),
    enabled: isAuthenticated(),
  });

  const { data: events = [] } = useQuery({
    queryKey: ["dashboard-events"],
    queryFn: () => eventsApi.list().then((r) => r.data as EventOption[]),
    enabled: isAuthenticated(),
  });

  const firstName = user?.name?.split(" ")[0] || "Teman";
  const featuredEvent = events[0];

  return (
    <main className="min-h-dvh bg-[#fff1d8] text-slate-950">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-7 pb-[calc(env(safe-area-inset-bottom,0px)+96px)] pt-[calc(env(safe-area-inset-top,0px)+24px)]">
        <header className="mb-9 flex items-center justify-between">
          <Link href="/" className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-700 to-[#8f3f68]">
            <BrandMark className="h-11 w-11 rounded-full" />
          </Link>
        </header>

        <section>
          <p className="text-base font-black tracking-[-0.02em]">Hai {firstName}!</p>
          <h1 className="mt-3 text-[30px] font-black leading-tight tracking-[-0.03em]">
            Kamu mau dinner kapan?
          </h1>

          <div className="relative mt-8 inline-flex">
            <MapPin className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-950" />
            <select
              value={selectedCityId}
              onChange={(event) => setSelectedCityId(event.target.value)}
              className="min-h-[54px] appearance-none rounded-full border-2 border-slate-950 bg-transparent py-3 pl-12 pr-12 text-base font-black outline-none"
              aria-label="Pilih kota"
            >
              {cities.length === 0 ? (
                <option value="">Kota</option>
              ) : (
                cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-950" />
          </div>
        </section>

        <section className="mt-8 space-y-2.5">
          {featuredEvent && (
            <DashboardPill
              href={`/events/${featuredEvent.slug}`}
              title={featuredEvent.title.toUpperCase()}
              subtitle={formatSchedule(featuredEvent.date)}
              variant="featured"
              icon={Ticket}
            />
          )}

          {dinners.length > 0 ? (
            dinners.map((dinner) => (
              <DashboardPill
                key={dinner.id}
                href={`/dinners/${dinner.id}`}
                title={formatDate(dinner.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                subtitle={`${dinner.startTime} WIB${selectedCity?.name ? ` - ${selectedCity.name}` : ""}`}
                icon={CalendarDays}
              />
            ))
          ) : (
            <div className="rounded-[30px] bg-white px-6 py-7 text-center">
              <p className="text-base font-black text-slate-950">Belum ada jadwal di {selectedCity?.name || "kotamu"}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#c29254]">
                Coba cek lagi nanti atau pilih kota lain.
              </p>
            </div>
          )}
        </section>
      </div>

      <AppBottomNav />
    </main>
  );
}

function DashboardPill({
  href,
  icon: Icon,
  subtitle,
  title,
  variant = "default",
}: {
  href: string;
  icon: LucideIcon;
  subtitle: string;
  title: string;
  variant?: "default" | "featured";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-[78px] items-center rounded-[30px] px-10 py-4 text-white transition-transform active:scale-[0.98]",
        variant === "featured" ? "bg-gradient-to-r from-brand-700 to-[#8f3f68]" : "bg-slate-950"
      )}
    >
      <Icon className="mr-4 h-5 w-5 shrink-0 text-cream-100" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-black leading-6">{title}</span>
        <span className="block text-sm font-black leading-5 text-cream-100">{subtitle}</span>
      </span>
      <ChevronRight className="ml-4 h-5 w-5 shrink-0 text-cream-100" />
    </Link>
  );
}

function formatSchedule(date: string) {
  const day = formatDate(date, { day: "numeric", month: "long", year: "numeric" });
  const time = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(date));
  return `${day} - ${time.replace(":", ".")} WIB`;
}
