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
  title: "RuangTemu - Dari Asing Jadi Lebih Dekat",
  description: "Ruang untuk membantu orang saling mengenal dan membangun kedekatan melalui percakapan serta pengalaman bersama.",
  keywords: ["social dining", "networking", "dinner", "ruangtemu"],
  openGraph: {
    title: "RuangTemu - Dari Asing Jadi Lebih Dekat",
    description: "Temukan cerita baik, persahabatan, kolaborasi, kesempatan, dan perjalanan hidup baru bersama RuangTemu.",
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
