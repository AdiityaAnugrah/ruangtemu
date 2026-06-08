"use client";

import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect } from "react";
import { useState } from "react";
import { mutationErrorToast, toast, Toaster } from "@/components/ui/toaster";
import { installDomSafetyPatch } from "@/lib/domSafety";
import { useAuthStore } from "@/stores/authStore";

installDomSafetyPatch();

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    installDomSafetyPatch();
    useAuthStore.persist.rehydrate();
    setMounted(true);
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        mutationCache: new MutationCache({
          onSuccess: (_data, _variables, _context, mutation) => {
            const meta = mutation.options.meta as { silentToast?: boolean; successMessage?: string } | undefined;
            if (meta?.silentToast) return;
            toast({ title: meta?.successMessage ?? "Aksi berhasil diproses", variant: "success" });
          },
          onError: (error, _variables, _context, mutation) => {
            const meta = mutation.options.meta as { silentToast?: boolean; errorTitle?: string } | undefined;
            if (meta?.silentToast) return;
            mutationErrorToast(error, meta?.errorTitle ?? "Aksi gagal");
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  if (!mounted) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
