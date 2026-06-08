import Link from "next/link";
import { Instagram, Mail, MessageCircle } from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-mark";

export function Footer() {
  return (
    <footer className="bg-teal-500 pb-20 text-teal-100 md:pb-0">
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-4 flex items-center gap-2">
              <div className="inline-flex rounded-2xl bg-cream-100 p-2 shadow-coral-glow ring-1 ring-white/30">
                <BrandLogo className="h-20 w-20" />
              </div>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-teal-200">
              Platform social dining yang mempertemukan orang baru dalam meja kecil yang nyaman.
            </p>
            <div className="mt-5 flex gap-3">
              <a href="https://instagram.com/ruangtemu" target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 transition-colors hover:bg-brand-500" aria-label="Instagram RuangTemu">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="https://wa.me/628xxx" target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 transition-colors hover:bg-brand-500" aria-label="WhatsApp RuangTemu">
                <MessageCircle className="h-4 w-4" />
              </a>
              <a href="mailto:halo@ruangtemu.biz.id" className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 transition-colors hover:bg-brand-500" aria-label="Email RuangTemu">
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">Platform</h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { href: "/dinners", label: "Jadwal Dinner" },
                { href: "/events", label: "Event Khusus" },
                { href: "/auth/register", label: "Daftar Sekarang" },
                { href: "/#cara-kerja", label: "Cara Kerja" },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-teal-200 transition-colors hover:text-brand-300">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">Informasi</h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { href: "/terms", label: "Syarat dan Ketentuan" },
                { href: "/privacy", label: "Kebijakan Privasi" },
                { href: "/#faq", label: "FAQ" },
                { href: "mailto:halo@ruangtemu.biz.id", label: "Kontak Kami" },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-teal-200 transition-colors hover:text-brand-300">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">Siap bergabung?</h4>
            <Link href="/auth/register" className="inline-flex min-h-11 items-center rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-coral-glow transition-colors hover:bg-brand-400">
              Daftar Sekarang
            </Link>
            <p className="mt-3 text-xs leading-relaxed text-teal-300">
              Gratis daftar. Bayar hanya saat kamu booking dinner.
            </p>
          </div>
        </div>

        <hr className="mb-6 mt-10 border-teal-600" />
        <div className="flex flex-col items-center justify-between gap-2 text-xs text-teal-300 md:flex-row">
          <p>Copyright {new Date().getFullYear()} RuangTemu. Dibuat di Indonesia.</p>
          <p>ruangtemu.biz.id</p>
        </div>
      </div>
    </footer>
  );
}
