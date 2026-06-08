import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RuangTemu - Satu Meja, Enam Cerita",
  description: "Platform social dining yang mempertemukan orang baru dalam makan malam grup kecil yang bermakna.",
  keywords: ["social dining", "networking", "dinner", "ruangtemu"],
  openGraph: {
    title: "RuangTemu - Satu Meja, Enam Cerita",
    description: "Bergabunglah dalam dinner seru bersama orang-orang baru yang dipilihkan khusus untukmu.",
    siteName: "RuangTemu",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#204744",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${plusJakarta.variable} font-sans antialiased`} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
