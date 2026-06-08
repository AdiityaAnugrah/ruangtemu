"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, MapPin } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { citiesApi } from "@/lib/api";
import { motion } from "framer-motion";

export function CitiesSection() {
  const { data: cities = [] } = useQuery({
    queryKey: ["cities"],
    queryFn: () => citiesApi.list().then((r) => r.data),
  });

  return (
    <section id="kota" className="bg-cream-100 py-14 md:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <span className="section-tag mb-3 inline-flex">Kota Dinner</span>
            <h2 className="mt-3 text-2xl font-extrabold text-teal-600 sm:text-3xl">
              Pilih kota terdekat.
            </h2>
          </div>
          <Link href="/dinners" className="hidden items-center gap-1 text-sm font-semibold text-brand-500 transition-colors hover:text-brand-600 md:flex">
            Lihat semua <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {cities.map((city: any, i: number) => (
            <motion.div
              key={city.id}
              initial={{ opacity: 0, scale: 0.94 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, delay: i * 0.04 }}
              viewport={{ once: true }}
            >
              <Link
                href={`/dinners?cityId=${city.id}`}
                className="group flex min-h-[112px] flex-col rounded-3xl border border-cream-200 bg-white p-4 text-left shadow-warm-sm transition-all hover:border-brand-300 hover:shadow-warm active:scale-[0.98]"
              >
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                  <MapPin className="h-5 w-5" />
                </span>
                <span className="text-sm font-bold text-teal-700">{city.name}</span>
                <span className="mt-0.5 text-2xs text-brown-400">{city.areas?.length ?? 0} area</span>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-cream-200 bg-white p-5 shadow-warm-sm">
          <p className="text-sm font-semibold text-teal-700">Belum ada kotamu?</p>
          <p className="mb-4 mt-1 text-xs leading-5 text-brown-400">Kirim request kota, kami catat dan prioritaskan untuk jadwal berikutnya.</p>
          <CityRequestForm />
        </div>
      </div>
    </section>
  );
}

function CityRequestForm() {
  const [cityName, setCityName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityName.trim()) return;
    await citiesApi.requestCity({ cityName, email: email || undefined });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-teal-600">
        <CheckCircle2 className="h-4 w-4 text-brand-500" />
        Terima kasih. Kota kamu sudah kami catat.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <input
        value={cityName}
        onChange={(e) => setCityName(e.target.value)}
        placeholder="Nama kota"
        required
        className="input-warm flex-1 text-sm"
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email opsional"
        type="email"
        className="input-warm flex-1 text-sm"
      />
      <button type="submit" className="btn-primary rounded-xl px-5 py-2.5 text-sm sm:w-auto">
        Request
      </button>
    </form>
  );
}
