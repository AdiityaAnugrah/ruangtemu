import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

export function formatDate(date: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("id-ID", opts ?? { weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(new Date(date));
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING_PAYMENT: "Menunggu Pembayaran",
    PENDING_VERIFICATION: "Menunggu Verifikasi",
    CONFIRMED: "Dikonfirmasi",
    MATCHED: "Sudah Dicocokkan",
    CANCELLED: "Dibatalkan",
    REFUNDED: "Dikembalikan",
    OPEN: "Terbuka",
    MATCHING: "Proses Matching",
    COMPLETED: "Selesai",
  };
  return map[status] ?? status;
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    PENDING_PAYMENT:     "bg-yellow-100 text-yellow-700",
    PENDING_VERIFICATION:"bg-brand-100 text-brand-700",
    CONFIRMED:           "bg-teal-100 text-teal-700",
    MATCHED:             "bg-teal-500 text-white",
    CANCELLED:           "bg-red-100 text-red-600",
    REFUNDED:            "bg-cream-200 text-brown-500",
    OPEN:                "bg-teal-100 text-teal-700",
    MATCHING:            "bg-brand-100 text-brand-700",
    COMPLETED:           "bg-cream-200 text-brown-500",
  };
  return map[status] ?? "bg-cream-200 text-brown-500";
}
