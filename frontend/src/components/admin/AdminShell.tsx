"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  MapPin,
  Settings,
  Shuffle,
  Ticket,
  Users,
} from "lucide-react";
import { BrandMark } from "@/components/ui/brand-mark";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/payments", label: "Pembayaran", icon: CreditCard },
  { href: "/admin/dinners", label: "Dinner", icon: CalendarDays },
  { href: "/admin/matching", label: "Matching", icon: Shuffle },
  { href: "/admin/cities", label: "Kota", icon: MapPin },
  { href: "/admin/events", label: "Event", icon: Ticket },
  { href: "/admin/users", label: "Pengguna", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function getSectionTitle(pathname: string) {
  const item = navItems
    .filter((nav) => nav.href !== "/admin")
    .find((nav) => pathname.startsWith(nav.href));
  return item?.label ?? "Overview";
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const title = getSectionTitle(pathname);

  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-200 bg-slate-950 text-white lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-white/10 px-5 py-5">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
                <BrandMark className="h-8 w-8" />
              </span>
              <span>
                <span className="block text-sm font-bold leading-5">RuangTemu</span>
                <span className="block text-xs text-slate-400">Admin Console</span>
              </span>
            </Link>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white",
                    active && "bg-white text-slate-950 hover:bg-white hover:text-slate-950"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-4">
            <Link
              href="/dashboard"
              className="flex min-h-11 items-center justify-center rounded-lg border border-white/15 px-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
            >
              Ke Dashboard User
            </Link>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Admin</p>
              <h1 className="text-lg font-bold text-slate-950">{title}</h1>
            </div>
            <Link href="/" className="hidden text-sm font-medium text-slate-500 hover:text-slate-900 sm:block">
              Lihat website
            </Link>
          </div>

          <nav className="scrollbar-none flex gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2 lg:hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-xs font-semibold",
                    active
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-600"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="admin-shell-page mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
