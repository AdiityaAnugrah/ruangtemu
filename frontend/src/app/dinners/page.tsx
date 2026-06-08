"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { ChevronRight, MapPin, SearchX, Users } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { citiesApi, dinnersApi } from "@/lib/api";
import { cn, formatCurrency, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";

export default function DinnersPage() {
  const [selectedCity, setSelectedCity] = useState("");

  const { data: cities = [] } = useQuery({ queryKey: ["cities"], queryFn: () => citiesApi.list().then((r) => r.data) });
  const { data: dinners = [], isLoading } = useQuery({
    queryKey: ["dinners", selectedCity],
    queryFn: () => dinnersApi.list({ cityId: selectedCity || undefined }).then((r) => r.data),
  });

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-cream-100 pb-24 md:pb-0">
        <div className="bg-teal-500 px-4 pb-10 pt-6">
          <div className="mx-auto max-w-5xl">
            <h1 className="mb-1 text-2xl font-extrabold text-white">Jadwal Dinner</h1>
            <p className="text-sm text-teal-200">Pilih dinner di kotamu dan pesan sekarang.</p>
          </div>
        </div>

        <div className="mx-auto -mt-4 max-w-5xl px-4">
          <div className="mb-5 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedCity("")}
              className={cn(
                "min-h-10 flex-shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all",
                !selectedCity ? "bg-brand-500 text-white shadow-coral-glow" : "border border-cream-300 bg-white text-brown-600 hover:border-brand-300"
              )}
            >
              Semua
            </button>
            {cities.map((city: any) => (
              <button
                key={city.id}
                onClick={() => setSelectedCity(city.id)}
                className={cn(
                  "min-h-10 flex-shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all",
                  selectedCity === city.id ? "bg-brand-500 text-white shadow-coral-glow" : "border border-cream-300 bg-white text-brown-600 hover:border-brand-300"
                )}
              >
                {city.name}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-52 animate-pulse rounded-3xl bg-cream-200" />)}
            </div>
          ) : dinners.length === 0 ? (
            <div className="rounded-3xl border border-cream-200 bg-white py-16 text-center shadow-warm-sm">
              <SearchX className="mx-auto mb-4 h-12 w-12 text-brown-300" />
              <p className="text-lg font-bold text-teal-600">Belum ada dinner</p>
              <p className="mx-auto mt-1 max-w-xs text-sm leading-6 text-brown-400">Coba pilih kota lain atau request kota di halaman utama.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {dinners.map((dinner: any) => (
                <Link key={dinner.id} href={`/dinners/${dinner.id}`} className="card-warm group block overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-warm-lg active:scale-[0.98]">
                  <div className="bg-teal-500 p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="mb-1.5 flex items-center gap-1.5 text-xs text-teal-200">
                          <MapPin className="h-3 w-3" /> {dinner.city.name}
                        </div>
                        <p className="text-lg font-extrabold leading-tight text-white">
                          {formatDate(dinner.date, { weekday: "short", day: "numeric", month: "short" })}
                        </p>
                        <p className="mt-0.5 text-xs text-teal-200">{dinner.startTime} WIB</p>
                      </div>
                      <span className={cn("rounded-full px-2 py-1 text-2xs font-semibold", getStatusColor(dinner.status))}>
                        {getStatusLabel(dinner.status)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="mb-3 flex items-center gap-1.5 text-xs text-brown-400">
                      <Users className="h-3.5 w-3.5" /> Maks. {dinner.maxPerTable} orang/meja
                    </div>
                    <div className="space-y-1.5">
                      {dinner.budgetTiers?.map((tier: any) => (
                        <div key={tier.id} className="flex items-center justify-between rounded-xl bg-cream-100 px-3 py-2">
                          <span className="text-xs font-medium text-brown-600">{tier.label}</span>
                          <span className="text-xs font-bold text-teal-600">{formatCurrency(tier.price)}</span>
                        </div>
                      ))}
                    </div>
                    {dinner.status === "OPEN" && (
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs font-semibold text-brand-500">Pesan sekarang</span>
                        <ChevronRight className="h-4 w-4 text-brand-400 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    )}
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
