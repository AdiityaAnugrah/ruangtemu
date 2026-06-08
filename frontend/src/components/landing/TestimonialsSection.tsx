"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { testimonialsApi } from "@/lib/api";

const cardColors = [
  "bg-brand-100 border-brand-200",
  "bg-teal-50 border-teal-200",
  "bg-cream-200 border-cream-300",
  "bg-white border-cream-200",
];

export function TestimonialsSection() {
  const { data: testimonials = [] } = useQuery({
    queryKey: ["testimonials"],
    queryFn: () => testimonialsApi.list().then((r) => r.data),
  });

  if (testimonials.length === 0) return null;

  return (
    <section className="py-14 md:py-20 bg-white overflow-hidden">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="section-tag mb-3">Testimoni</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-teal-600 mt-3">Kata Mereka</h2>
          <p className="mt-2 text-sm text-brown-400">Cerita nyata dari peserta RuangTemu</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {testimonials.map((t: any, i: number) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              viewport={{ once: true }}
              className={`rounded-2xl border p-5 ${cardColors[i % cardColors.length]}`}
            >
              <div className="flex mb-3">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-brown-700 leading-relaxed mb-4">"{t.content}"</p>
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-xs text-teal-700">{t.name}</p>
                  {t.age && <p className="text-2xs text-brown-400">{t.age} tahun</p>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
