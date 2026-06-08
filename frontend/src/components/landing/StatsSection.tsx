"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { MapPinned, Ticket, Users, UtensilsCrossed } from "lucide-react";
import { settingsApi } from "@/lib/api";

type PublicOverview = {
  activeCities: number;
  upcomingDinners: number;
  activeEvents: number;
  confirmedParticipants: number;
};

export function StatsSection() {
  const { data: overview } = useQuery<PublicOverview>({
    queryKey: ["public-overview"],
    queryFn: () => settingsApi.overview().then((r) => r.data),
  });

  const stats = [
    { value: overview ? String(overview.confirmedParticipants) : "-", label: "Peserta", icon: Users },
    { value: overview ? String(overview.upcomingDinners) : "-", label: "Dinner", icon: UtensilsCrossed },
    { value: overview ? String(overview.activeCities) : "-", label: "Kota", icon: MapPinned },
    { value: overview ? String(overview.activeEvents) : "-", label: "Event", icon: Ticket },
  ];

  return (
    <section className="bg-teal-500 py-7">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-4 gap-2 text-center">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              viewport={{ once: true }}
              className="rounded-2xl px-2 py-3"
            >
              <stat.icon className="mx-auto mb-2 h-5 w-5 text-brand-300" />
              <div className="text-xl font-extrabold text-white sm:text-2xl">{stat.value}</div>
              <div className="mt-0.5 text-2xs font-medium text-teal-100 sm:text-xs">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
