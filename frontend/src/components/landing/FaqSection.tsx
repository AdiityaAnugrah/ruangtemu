"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const faqs = [
  { q: "Siapa saja yang bisa ikut?", a: "Semua orang dewasa dari berbagai latar belakang. Semakin beragam, semakin seru." },
  { q: "Bagaimana proses matching bekerja?", a: "Kami mencocokkan berdasarkan rentang usia yang serupa dan kesamaan minat, agar percakapan tetap natural." },
  { q: "Kapan saya tahu lokasi dinnernya?", a: "Lokasi dikirim H-1 via email dan WhatsApp. Ini bagian dari kejutan yang membuat RuangTemu berbeda." },
  { q: "Bagaimana kalau tiba-tiba tidak bisa hadir?", a: "Pembatalan lebih dari 7 hari sebelum dinner mendapat refund. Di bawah itu tidak bisa refund karena kursi sudah dialokasikan." },
  { q: "Apakah saya bisa memilih teman semeja?", a: "Tidak. Justru itulah serunya. Kami yang carikan. Lengkapi profilmu agar matching lebih tepat." },
  { q: "Berapa orang dalam satu meja?", a: "Maksimal 6 orang per meja. Cukup intim untuk percakapan bermakna, cukup seru untuk dinamika yang menarik." },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("rounded-2xl border transition-all", open ? "border-brand-200 bg-brand-50" : "border-cream-200 bg-white hover:border-cream-300")}>
      <button onClick={() => setOpen(!open)} className="flex min-h-14 w-full items-center justify-between px-5 py-4 text-left">
        <span className="pr-4 text-sm font-semibold text-teal-700">{q}</span>
        <ChevronDown className={cn("h-4 w-4 flex-shrink-0 text-brand-400 transition-transform duration-200", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-4 text-sm leading-relaxed text-brown-500">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FaqSection() {
  return (
    <section id="faq" className="bg-cream-100 py-14 md:py-20">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <span className="section-tag mb-3">FAQ</span>
          <h2 className="mt-3 text-2xl font-extrabold text-teal-600 sm:text-3xl">Pertanyaan Umum</h2>
          <p className="mt-2 text-sm text-brown-400">
            Masih ada pertanyaan?{" "}
            <a href="mailto:halo@ruangtemu.biz.id" className="font-medium text-brand-500 hover:underline">
              halo@ruangtemu.biz.id
            </a>
          </p>
        </div>
        <div className="space-y-2.5">
          {faqs.map((faq) => <FaqItem key={faq.q} {...faq} />)}
        </div>
      </div>
    </section>
  );
}
