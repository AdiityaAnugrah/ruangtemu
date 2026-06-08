"use client";

import { motion } from "framer-motion";
import { CalendarCheck, CreditCard, UtensilsCrossed } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: CalendarCheck,
    title: "Pilih Jadwal",
    description: "Cari dinner di kota kamu, pilih tanggal, lalu ambil tier budget yang paling cocok.",
    color: "bg-brand-100 border-brand-200",
    numColor: "text-brand-500",
  },
  {
    step: "02",
    icon: CreditCard,
    title: "Bayar QRIS",
    description: "Scan QRIS dan upload bukti pembayaran. Admin akan verifikasi sebelum kursimu dikunci.",
    color: "bg-teal-50 border-teal-200",
    numColor: "text-teal-500",
  },
  {
    step: "03",
    icon: UtensilsCrossed,
    title: "Datang Dinner",
    description: "H-1 kamu menerima lokasi dan info meja. Tinggal datang dan mulai ngobrol.",
    color: "bg-cream-200 border-cream-300",
    numColor: "text-brown-500",
  },
];

export function HowItWorks() {
  return (
    <section id="cara-kerja" className="bg-white py-14 md:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-9 text-center">
          <span className="section-tag mb-3">Cara Kerja</span>
          <h2 className="mt-3 text-2xl font-extrabold text-teal-600 sm:text-3xl lg:text-4xl">
            Dari booking sampai duduk semeja.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-brown-400 sm:text-base">
            Prosesnya dibuat singkat supaya kamu fokus ke pengalaman bertemu orang baru.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: i * 0.12 }}
              viewport={{ once: true }}
              className={`rounded-3xl border p-5 ${step.color}`}
            >
              <div className="mb-4 flex items-center gap-3">
                <span className={`text-3xl font-black ${step.numColor} opacity-35`}>{step.step}</span>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-teal-600 shadow-warm-sm">
                  <step.icon className="h-5 w-5" />
                </span>
              </div>
              <h3 className="mb-2 text-base font-bold text-teal-700">{step.title}</h3>
              <p className="text-sm leading-relaxed text-brown-500">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
