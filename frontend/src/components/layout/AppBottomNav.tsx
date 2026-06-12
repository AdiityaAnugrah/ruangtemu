"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

export function AppBottomNav() {
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authenticated = isAuthenticated();

  const items = authenticated
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
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-black",
                active ? "text-slate-950" : "text-[#d7c29f]"
              )}
            >
              <item.icon className="h-7 w-7" fill={active ? "currentColor" : "none"} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
