"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronDown, ChevronRight, MapPin, SearchX } from "lucide-react";
import { AppBottomNav } from "@/components/layout/AppBottomNav";
import { citiesApi, dinnersApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function DinnersPage() {
  const [selectedCityId, setSelectedCityId] = useState("");

  const { data: cities = [] } = useQuery({
    queryKey: ["cities"],
    queryFn: () => citiesApi.list().then((r) => r.data),
  });

  useEffect(() => {
    if (!selectedCityId && cities[0]?.id) setSelectedCityId(cities[0].id);
  }, [cities, selectedCityId]);

  const { data: dinners = [], isLoading } = useQuery({
    queryKey: ["dinners", selectedCityId],
    queryFn: () => dinnersApi.list({ cityId: selectedCityId || undefined }).then((r) => r.data),
  });

  return (
    <main className="min-h-dvh bg-[#fff1d8] text-slate-950">
      <div className="mx-auto w-full max-w-[430px] px-7 pb-[calc(env(safe-area-inset-bottom,0px)+96px)] pt-[calc(env(safe-area-inset-top,0px)+32px)]">
        <p className="text-base font-black text-[#c29254]">Dinner</p>
        <h1 className="mt-2 text-[30px] font-black leading-tight tracking-[-0.03em]">
          Pilih jadwal yang cocok
        </h1>

        <div className="relative mt-7 inline-flex">
          <MapPin className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-950" />
          <select
            value={selectedCityId}
            onChange={(event) => setSelectedCityId(event.target.value)}
            className="min-h-[54px] appearance-none rounded-full border-2 border-slate-950 bg-transparent py-3 pl-12 pr-12 text-base font-black outline-none"
            aria-label="Pilih kota"
          >
            {cities.map((city: any) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-950" />
        </div>

        <section className="mt-8 space-y-2.5">
          {isLoading ? (
            [1, 2, 3].map((item) => <div key={item} className="h-[78px] animate-pulse rounded-[30px] bg-white/70" />)
          ) : dinners.length === 0 ? (
            <div className="rounded-[30px] bg-white px-6 py-10 text-center">
              <SearchX className="mx-auto h-10 w-10 text-[#c29254]" />
              <p className="mt-4 text-base font-black">Belum ada dinner</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#c29254]">Coba pilih kota lain atau cek lagi nanti.</p>
            </div>
          ) : (
            dinners.map((dinner: any) => (
              <Link
                key={dinner.id}
                href={`/dinners/${dinner.id}`}
                className="flex min-h-[78px] items-center rounded-[30px] bg-slate-950 px-6 py-4 text-white active:scale-[0.98]"
              >
                <CalendarDays className="mr-4 h-5 w-5 shrink-0 text-cream-100" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-black">
                    {formatDate(dinner.date, { weekday: "long", day: "numeric", month: "long" })}
                  </span>
                  <span className="block text-sm font-black text-cream-100">
                    {dinner.startTime} WIB
                    {dinner.budgetTiers?.[0]?.price ? ` - mulai ${formatCurrency(dinner.budgetTiers[0].price)}` : ""}
                  </span>
                </span>
                <ChevronRight className="ml-4 h-5 w-5 shrink-0 text-cream-100" />
              </Link>
            ))
          )}
        </section>
      </div>

      <AppBottomNav />
    </main>
  );
}
