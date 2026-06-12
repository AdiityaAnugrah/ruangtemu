"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle,
  Clock,
  CreditCard,
  MapPin,
  Settings,
  Shuffle,
  Users,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { cn, formatCurrency } from "@/lib/utils";

export default function AdminPage() {
  const { isAdmin, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/auth/login"); return; }
    if (!isAdmin()) router.push("/dashboard");
  }, [isAuthenticated, isAdmin, router]);

  const { data: overview, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => adminApi.overview().then((r) => r.data),
    enabled: isAdmin(),
    refetchInterval: 30000,
  });

  const pendingPayments = overview?.pendingPayments ?? 0;

  const metrics = [
    {
      label: "Pengguna",
      value: overview?.totalUsers ?? "-",
      caption: "akun user aktif",
      href: "/admin/users",
      icon: Users,
    },
    {
      label: "Booking",
      value: overview?.totalBookings ?? "-",
      caption: `${overview?.confirmedBookings ?? 0} dikonfirmasi`,
      href: "/admin/payments",
      icon: CalendarDays,
    },
    {
      label: "Verifikasi",
      value: pendingPayments,
      caption: pendingPayments > 0 ? "perlu dicek sekarang" : "tidak ada antrian",
      href: "/admin/payments",
      icon: Clock,
      urgent: pendingPayments > 0,
    },
    {
      label: "Revenue",
      value: overview?.totalRevenue ? formatCurrency(overview.totalRevenue) : "-",
      caption: "pembayaran verified",
      href: null,
      icon: BarChart3,
    },
  ];

  const workQueue = [
    {
      href: "/admin/payments",
      title: "Verifikasi pembayaran",
      detail: `${pendingPayments} bukti transfer menunggu keputusan`,
      icon: CreditCard,
      urgent: pendingPayments > 0,
    },
    {
      href: "/admin/dinners",
      title: "Kelola jadwal dinner",
      detail: `${overview?.upcomingDinners ?? 0} dinner mendatang`,
      icon: CalendarDays,
      urgent: false,
    },
    {
      href: "/admin/matching",
      title: "Matching peserta",
      detail: "Preview meja, commit, lalu reveal lokasi",
      icon: Shuffle,
      urgent: false,
    },
    {
      href: "/admin/settings",
      title: "Pengaturan operasional",
      detail: "QRIS, tier default, SMTP, WhatsApp",
      icon: Settings,
      urgent: false,
    },
  ];

  const shortcuts = [
    { href: "/admin/cities", label: "Kota", icon: MapPin },
    { href: "/admin/events", label: "Event", icon: CalendarDays },
    { href: "/admin/users", label: "Pengguna", icon: Users },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Ringkasan hari ini</p>
              <h2 className="mt-1 text-2xl font-bold tracking-normal text-slate-950">Operasional RuangTemu</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Pantau pembayaran, jadwal dinner, matching, dan data pengguna dari satu console.
              </p>
            </div>
            <Link
              href="/admin/payments"
              className={cn(
                "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors",
                pendingPayments > 0
                  ? "bg-slate-950 text-white hover:bg-slate-800"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              <CreditCard className="h-4 w-4" />
              Cek Pembayaran
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <MetricCard key={metric.label} isLoading={isLoading} {...metric} />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Status pembayaran</p>
              <p className="mt-1 text-3xl font-bold">{pendingPayments}</p>
            </div>
            <span className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-lg",
              pendingPayments > 0 ? "bg-amber-400 text-slate-950" : "bg-emerald-400 text-slate-950"
            )}>
              {pendingPayments > 0 ? <Clock className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
            </span>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            {pendingPayments > 0
              ? "Ada pembayaran yang perlu diverifikasi supaya peserta bisa lanjut ke proses matching."
              : "Tidak ada pembayaran pending. Fokus berikutnya bisa ke jadwal dan matching."}
          </p>
          <Link
            href="/admin/payments"
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-slate-950 hover:bg-slate-100"
          >
            Buka Antrian
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-bold text-slate-950">Prioritas Kerja</h2>
            <p className="mt-1 text-sm text-slate-500">Urutan tugas yang paling sering dipakai admin.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {workQueue.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="group grid gap-3 px-5 py-4 transition-colors hover:bg-slate-50 sm:grid-cols-[44px_1fr_24px] sm:items-center">
                  <span className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-lg",
                    item.urgent ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                  )}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-950">{item.title}</span>
                    <span className={cn("mt-0.5 block text-sm", item.urgent ? "font-medium text-amber-700" : "text-slate-500")}>
                      {item.detail}
                    </span>
                  </span>
                  <ArrowUpRight className="hidden h-4 w-4 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:block" />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-950">Shortcut</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {shortcuts.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-h-24 flex-col justify-between rounded-lg border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  <Icon className="h-4 w-4 text-slate-500" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  caption,
  href,
  icon: Icon,
  urgent,
  isLoading,
}: {
  label: string;
  value: any;
  caption: string;
  href: string | null;
  icon: any;
  urgent?: boolean;
  isLoading?: boolean;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg",
          urgent ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
        )}>
          <Icon className="h-4 w-4" />
        </span>
        {href && <ArrowUpRight className="h-4 w-4 text-slate-400" />}
      </div>
      <p className={cn("mt-4 text-2xl font-bold text-slate-950", urgent && "text-amber-700")}>
        {isLoading ? "-" : value}
      </p>
      <p className="mt-1 text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-500">{caption}</p>
    </>
  );

  if (!href) {
    return <div className="rounded-lg border border-slate-200 bg-white p-4">{content}</div>;
  }

  return (
    <Link href={href} className="rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50">
      {content}
    </Link>
  );
}
