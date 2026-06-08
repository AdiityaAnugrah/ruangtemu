"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info" | "warning";
type ConfirmVariant = "default" | "danger";

type ToastPayload = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastState = Required<Omit<ToastPayload, "description">> & {
  id: string;
  description?: string;
};

type ConfirmPayload = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
};

type ConfirmState = Required<Omit<ConfirmPayload, "description">> & {
  id: string;
  description?: string;
  resolve: (value: boolean) => void;
};

let nextToastId = 0;
let nextConfirmId = 0;

export function toast(payload: ToastPayload | string) {
  if (typeof window === "undefined") return;

  const detail: ToastPayload = typeof payload === "string" ? { title: payload } : payload;
  window.dispatchEvent(new CustomEvent("ruangtemu:toast", { detail }));
}

export function confirmAction(payload: ConfirmPayload): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);

  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent("ruangtemu:confirm", {
      detail: {
        ...payload,
        resolve,
      },
    }));
  });
}

const toastStyles: Record<ToastVariant, { icon: typeof CheckCircle2; wrap: string; iconWrap: string }> = {
  success: {
    icon: CheckCircle2,
    wrap: "border-teal-100 bg-white text-teal-700",
    iconWrap: "bg-teal-50 text-teal-600",
  },
  error: {
    icon: XCircle,
    wrap: "border-red-100 bg-white text-red-700",
    iconWrap: "bg-red-50 text-red-600",
  },
  warning: {
    icon: AlertTriangle,
    wrap: "border-brand-100 bg-white text-brown-700",
    iconWrap: "bg-brand-50 text-brand-600",
  },
  info: {
    icon: Info,
    wrap: "border-cream-200 bg-white text-brown-700",
    iconWrap: "bg-cream-100 text-brown-600",
  },
};

function readableError(error: unknown, fallback = "Terjadi kesalahan. Coba lagi.") {
  const err = error as any;
  return err?.response?.data?.message ?? err?.message ?? fallback;
}

export function mutationToast(title: string, variant: ToastVariant = "success", description?: string) {
  toast({ title, description, variant });
}

export function mutationErrorToast(error: unknown, title = "Aksi gagal") {
  toast({ title, description: readableError(error), variant: "error" });
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  useEffect(() => {
    const onToast = (event: Event) => {
      const payload = (event as CustomEvent<ToastPayload>).detail;
      const id = `toast-${++nextToastId}`;
      const item: ToastState = {
        id,
        title: payload.title,
        description: payload.description,
        variant: payload.variant ?? "info",
        duration: payload.duration ?? 4200,
      };

      setToasts((current) => [item, ...current].slice(0, 4));
      window.setTimeout(() => {
        setToasts((current) => current.filter((toastItem) => toastItem.id !== id));
      }, item.duration);
    };

    const onConfirm = (event: Event) => {
      const payload = (event as CustomEvent<ConfirmPayload & { resolve: (value: boolean) => void }>).detail;
      setConfirm({
        id: `confirm-${++nextConfirmId}`,
        title: payload.title,
        description: payload.description,
        confirmText: payload.confirmText ?? "Konfirmasi",
        cancelText: payload.cancelText ?? "Batal",
        variant: payload.variant ?? "default",
        resolve: payload.resolve,
      });
    };

    window.addEventListener("ruangtemu:toast", onToast);
    window.addEventListener("ruangtemu:confirm", onConfirm);
    return () => {
      window.removeEventListener("ruangtemu:toast", onToast);
      window.removeEventListener("ruangtemu:confirm", onConfirm);
    };
  }, []);

  const confirmIconClass = useMemo(() => (
    confirm?.variant === "danger" ? "bg-red-50 text-red-600" : "bg-brand-50 text-brand-600"
  ), [confirm?.variant]);

  const closeConfirm = (value: boolean) => {
    setConfirm((current) => {
      current?.resolve(value);
      return null;
    });
  };

  return (
    <>
      <div className="fixed bottom-20 left-4 right-4 z-[80] flex flex-col gap-3 md:bottom-6 md:left-auto md:right-6 md:w-96" aria-live="polite" aria-atomic="true">
        {toasts.map((item) => {
          const style = toastStyles[item.variant];
          const Icon = style.icon;
          return (
            <div
              key={item.id}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-warm-lg backdrop-blur animate-slide-up",
                style.wrap
              )}
              role={item.variant === "error" ? "alert" : "status"}
            >
              <div className={cn("mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl", style.iconWrap)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{item.title}</p>
                {item.description && <p className="mt-0.5 text-xs leading-5 text-brown-500">{item.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => setToasts((current) => current.filter((toastItem) => toastItem.id !== item.id))}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-brown-300 transition-colors hover:bg-cream-100 hover:text-brown-600"
                aria-label="Tutup notifikasi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {confirm && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-teal-950/35 px-4 py-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby={`${confirm.id}-title`}>
          <div className="w-full max-w-md rounded-3xl border border-cream-200 bg-white p-5 shadow-warm-lg animate-slide-up">
            <div className="flex items-start gap-3">
              <div className={cn("flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl", confirmIconClass)}>
                {confirm.variant === "danger" ? <AlertTriangle className="h-5 w-5" /> : <Info className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <h2 id={`${confirm.id}-title`} className="text-base font-extrabold text-teal-700">{confirm.title}</h2>
                {confirm.description && <p className="mt-1 text-sm leading-6 text-brown-500">{confirm.description}</p>}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className="min-h-11 rounded-full border-2 border-cream-300 bg-white px-4 py-2.5 text-sm font-semibold text-brown-600 transition-colors hover:bg-cream-100"
              >
                {confirm.cancelText}
              </button>
              <button
                type="button"
                onClick={() => closeConfirm(true)}
                className={cn(
                  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition-all active:scale-95",
                  confirm.variant === "danger" ? "bg-red-500 hover:bg-red-600" : "bg-brand-500 hover:bg-brand-600 shadow-coral-glow"
                )}
              >
                {confirm.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function LoadingLabel({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Loader2 className="h-4 w-4 animate-spin" />
      {children}
    </>
  );
}
