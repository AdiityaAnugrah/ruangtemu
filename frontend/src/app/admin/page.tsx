"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BarChart3, Calendar, CheckCircle, Clock, CreditCard, MapPin, Settings, Users } from "lucide-react";
import { adminApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { BrandMark } from "@/components/ui/brand-mark";
import { formatCurrency } from "@/lib/utils";

export default function AdminPage() {
  const { isAdmin, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/auth/login"); return; }
    if (!isAdmin()) router.push("/dashboard");
  }, [isAuthenticated, isAdmin, router]);

  const { data: overview } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => adminApi.overview().then((r) => r.data),
    enabled: isAdmin(),
    refetchInterval: 30000,
  });

  const metrics = [
    { label: "Total Pengguna", value: overview?.totalUsers ?? "-", icon: Users, color: "bg-blue-50 text-blue-600", href: "/admin/users" },
    { label: "Total Booking", value: overview?.totalBookings ?? "-", icon: Calendar, color: "bg-purple-50 text-purple-600", href: "/admin/payments" },
    { label: "Booking Aktif", value: overview?.confirmedBookings ?? "-", icon: CheckCircle, color: "bg-green-50 text-green-600", href: "/admin/payments" },
    { label: "Pending Verifikasi", value: overview?.pendingPayments ?? "-", icon: Clock, color: "bg-yellow-50 text-yellow-600", href: "/admin/payments?status=pending", badge: true },
    { label: "Dinner Mendatang", value: overview?.upcomingDinners ?? "-", icon: Calendar, color: "bg-brand-50 text-brand-600", href: "/admin/dinners" },
    { label: "Total Revenue", value: overview?.totalRevenue ? formatCurrency(overview.totalRevenue) : "-", icon: BarChart3, color: "bg-emerald-50 text-emerald-600", href: null },
  ];

  const quickLinks = [
    { href: "/admin/payments", label: "Verifikasi Pembayaran", desc: `${overview?.pendingPayments ?? 0} menunggu`, icon: CreditCard, urgent: (overview?.pendingPayments ?? 0) > 0 },
    { href: "/admin/dinners", label: "Kelola Dinner", desc: `${overview?.upcomingDinners ?? 0} dinner aktif`, icon: Calendar, urgent: false },
    { href: "/admin/cities", label: "Kelola Kota", desc: "Lokasi ready", icon: MapPin, urgent: false },
    { href: "/admin/matching", label: "Proses Matching", desc: "Cocokkan peserta", icon: Users, urgent: false },
    { href: "/admin/settings", label: "Pengaturan", desc: "QRIS, tier, notifikasi", icon: Settings, urgent: false },
  ];

  const menuLinks = [
    { href: "/admin/dinners", label: "Dinner" },
    { href: "/admin/cities", label: "Kota" },
    { href: "/admin/payments", label: "Pembayaran" },
    { href: "/admin/matching", label: "Matching" },
    { href: "/admin/users", label: "Pengguna" },
    { href: "/admin/events", label: "Event" },
    { href: "/admin/settings", label: "Pengaturan" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-brand-600">
              <BrandMark className="h-9 w-9" />
              RuangTemu
            </Link>
            <span className="text-gray-300">|</span>
            <span className="text-sm font-medium text-gray-500">Admin Panel</span>
          </div>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">Ke Dashboard User</Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Overview</h1>

        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {metrics.map((metric) => (
            <div key={metric.label} className={`rounded-2xl border bg-white p-4 ${metric.href ? "cursor-pointer transition-all hover:shadow-md" : ""}`}>
              {metric.href ? (
                <Link href={metric.href} className="block">
                  <MetricContent {...metric} />
                </Link>
              ) : (
                <MetricContent {...metric} />
              )}
            </div>
          ))}
        </div>

        <h2 className="mb-4 font-bold text-gray-900">Aksi Cepat</h2>
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href} className={`block rounded-2xl border bg-white p-5 transition-all hover:shadow-md ${link.urgent ? "border-yellow-300 bg-yellow-50" : ""}`}>
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${link.urgent ? "bg-yellow-100 text-yellow-600" : "bg-gray-100 text-gray-600"}`}>
                <link.icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-gray-900">{link.label}</p>
              <p className={`mt-0.5 text-xs ${link.urgent ? "font-medium text-yellow-600" : "text-gray-500"}`}>{link.desc}</p>
            </Link>
          ))}
        </div>

        <h2 className="mb-4 font-bold text-gray-900">Menu Admin</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {menuLinks.map((link) => (
            <Link key={link.href} href={link.href} className="block rounded-xl border bg-white px-4 py-3 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-brand-600">
              {link.label}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

function MetricContent({ label, value, icon: Icon, color, badge }: { label: string; value: any; icon: any; color: string; badge?: boolean }) {
  return (
    <>
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className={`text-xl font-bold text-gray-900 ${badge && value > 0 ? "text-yellow-600" : ""}`}>{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{label}</p>
    </>
  );
}
