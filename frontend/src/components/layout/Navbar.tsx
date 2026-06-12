"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, CalendarDays, ChevronDown, Home, Menu, Settings, User, X } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { BrandMark } from "@/components/ui/brand-mark";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { user, clearAuth, isAuthenticated, isAdmin } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const authenticated = mounted && isAuthenticated();
  const admin = mounted && isAdmin();

  useEffect(() => {
    setMounted(true);
  }, []);

  const navLinks = [
    { href: "/dinners", label: "Jadwal Dinner" },
    { href: "/events", label: "Event" },
    { href: "/#cara-kerja", label: "Cara Kerja" },
    { href: "/#kota", label: "Kota" },
  ];

  const handleLogout = () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      import("@/lib/api").then(({ authApi }) => authApi.logout(refreshToken).catch(() => {}));
    }
    clearAuth();
    window.location.href = "/";
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-cream-200 bg-white/95 shadow-warm-sm backdrop-blur-md">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between md:h-16">
            <Link href="/" className="flex min-h-11 items-center gap-2">
              <BrandMark className="h-9 w-9" />
              <span className="text-lg font-bold text-teal-500">RuangTemu</span>
            </Link>

            <div className="hidden items-center gap-1 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "bg-brand-100 text-brand-600"
                      : "text-brown-500 hover:bg-cream-200 hover:text-teal-500"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="hidden items-center gap-2 md:flex">
              {authenticated ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex min-h-11 items-center gap-2 rounded-full border border-cream-300 bg-white py-1.5 pl-2 pr-3 transition-all hover:border-brand-300 hover:bg-cream-100"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="max-w-24 truncate text-sm font-medium text-brown-700">{user?.name?.split(" ")[0]}</span>
                    <ChevronDown className={cn("h-3.5 w-3.5 text-brown-400 transition-transform", dropdownOpen && "rotate-180")} />
                  </button>

                  {dropdownOpen && (
                    <>
                      <button className="fixed inset-0 z-40 cursor-default" onClick={() => setDropdownOpen(false)} aria-label="Tutup menu" />
                      <div className="absolute right-0 z-50 mt-2 w-52 animate-slide-up rounded-2xl border border-cream-200 bg-white p-1.5 shadow-warm-lg">
                        <div className="mb-1 px-3 py-2">
                          <p className="text-xs text-brown-400">Masuk sebagai</p>
                          <p className="truncate text-sm font-semibold text-teal-600">{user?.name}</p>
                        </div>
                        <hr className="mb-1 border-cream-200" />
                        {[
                          { href: "/dashboard", label: "Dashboard" },
                          { href: "/dashboard/profile", label: "Profil Saya" },
                          { href: "/dashboard/bookings", label: "Riwayat Booking" },
                        ].map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setDropdownOpen(false)}
                            className="flex min-h-10 items-center rounded-xl px-3 py-2 text-sm text-brown-700 transition-colors hover:bg-cream-100"
                          >
                            {item.label}
                          </Link>
                        ))}
                        {admin && (
                          <>
                            <hr className="my-1 border-cream-200" />
                            <Link
                              href="/admin"
                              onClick={() => setDropdownOpen(false)}
                              className="flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-teal-600 transition-colors hover:bg-teal-50"
                            >
                              <Settings className="h-4 w-4" />
                              Admin Panel
                            </Link>
                          </>
                        )}
                        <hr className="my-1 border-cream-200" />
                        <button onClick={handleLogout} className="w-full rounded-xl px-3 py-2 text-left text-sm text-red-500 transition-colors hover:bg-red-50">
                          Keluar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/auth/login" className="rounded-xl px-4 py-2 text-sm font-medium text-brown-600 transition-colors hover:bg-cream-200 hover:text-teal-600">
                    Masuk
                  </Link>
                  <Link href="/auth/register" className="btn-primary px-5 py-2 text-sm">
                    Daftar
                  </Link>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 md:hidden">
              {authenticated && (
                <Link href="/dashboard/notifications" className="relative flex h-11 w-11 items-center justify-center rounded-xl hover:bg-cream-200" aria-label="Notifikasi">
                  <Bell className="h-5 w-5 text-brown-500" />
                </Link>
              )}
              <button
                type="button"
                onClick={() => setMobileOpen(!mobileOpen)}
                className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-cream-200"
                aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
              >
                {mobileOpen ? <X className="h-5 w-5 text-teal-500" /> : <Menu className="h-5 w-5 text-brown-600" />}
              </button>
            </div>
          </div>

          {mobileOpen && (
            <div className="animate-slide-up pb-4 md:hidden">
              <div className="space-y-1 pt-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex min-h-11 items-center rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                      pathname === link.href ? "bg-brand-100 text-brand-600" : "text-brown-600 hover:bg-cream-200"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <hr className="my-3 border-cream-200" />
              {authenticated ? (
                <div className="space-y-1">
                  <div className="px-4 py-2">
                    <p className="text-xs text-brown-400">Halo,</p>
                    <p className="font-semibold text-teal-600">{user?.name}</p>
                  </div>
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center rounded-xl px-4 py-2.5 text-sm text-brown-600 hover:bg-cream-200">Dashboard</Link>
                  <Link href="/dashboard/profile" onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center rounded-xl px-4 py-2.5 text-sm text-brown-600 hover:bg-cream-200">Profil Saya</Link>
                  {admin && <Link href="/admin" onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center rounded-xl px-4 py-2.5 text-sm font-semibold text-teal-600 hover:bg-teal-50">Admin Panel</Link>}
                  <button onClick={handleLogout} className="w-full rounded-xl px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50">Keluar</button>
                </div>
              ) : (
                <div className="flex gap-3 px-2">
                  <Link href="/auth/login" onClick={() => setMobileOpen(false)} className="min-h-11 flex-1 rounded-xl border border-cream-300 px-4 py-2.5 text-center text-sm font-medium text-brown-600 hover:bg-cream-100">
                    Masuk
                  </Link>
                  <Link href="/auth/register" onClick={() => setMobileOpen(false)} className="min-h-11 flex-1 rounded-xl bg-brand-500 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-600">
                    Daftar
                  </Link>
                </div>
              )}
            </div>
          )}
        </nav>
      </header>

      <BottomNav pathname={pathname} isAuthenticated={authenticated} />
    </>
  );
}

function BottomNav({ pathname, isAuthenticated }: { pathname: string; isAuthenticated: boolean }) {
  const items = isAuthenticated
    ? [
        { href: "/dashboard", icon: Home, label: "Beranda", match: (path: string) => path === "/dashboard" },
        { href: "/dashboard/bookings", icon: CalendarDays, label: "Aktivitas", match: (path: string) => path.startsWith("/dashboard/bookings") },
        { href: "/dashboard/profile", icon: User, label: "Profil Saya", match: (path: string) => path.startsWith("/dashboard/profile") },
      ]
    : [
        { href: "/", icon: Home, label: "Beranda", match: (path: string) => path === "/" },
        { href: "/dinners", icon: CalendarDays, label: "Dinner", match: (path: string) => path.startsWith("/dinners") },
        { href: "/auth/login", icon: User, label: "Masuk", match: (path: string) => path.startsWith("/auth") },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#ead5b5] bg-[#fff1d8]/95 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-[430px] grid-cols-3 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] pt-3">
        {items.map((item) => {
          const isActive = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-black",
                isActive ? "text-slate-950" : "text-[#d7c29f]"
              )}
            >
              <item.icon className="h-7 w-7" fill={isActive ? "currentColor" : "none"} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
