"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield, UserCheck, UserX } from "lucide-react";
import { usersApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { cn, formatDate } from "@/lib/utils";
import { confirmAction } from "@/components/ui/toaster";

export default function AdminUsersPage() {
  const { isAdmin, isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/auth/login"); return; }
    if (!isAdmin()) router.push("/dashboard");
  }, [isAuthenticated, isAdmin, router]);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => usersApi.listAdmin().then((r) => r.data),
    enabled: isAdmin(),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: "USER" | "ADMIN" }) => usersApi.setRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
    meta: { successMessage: "Role pengguna berhasil diperbarui", errorTitle: "Role gagal diperbarui" },
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, isSuspended }: { id: string; isSuspended: boolean }) => usersApi.setSuspend(id, isSuspended),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
    meta: { successMessage: "Status pengguna berhasil diperbarui", errorTitle: "Status pengguna gagal diperbarui" },
  });

  const handleRoleChange = async (targetUser: any) => {
    const nextRole = targetUser.role === "ADMIN" ? "USER" : "ADMIN";
    const ok = await confirmAction({
      title: nextRole === "ADMIN" ? "Jadikan admin?" : "Jadikan user?",
      description: `${targetUser.name} akan memiliki akses ${nextRole === "ADMIN" ? "panel admin" : "pengguna biasa"}.`,
      confirmText: nextRole === "ADMIN" ? "Jadikan Admin" : "Jadikan User",
      variant: nextRole === "ADMIN" ? "default" : "danger",
    });
    if (ok) roleMutation.mutate({ id: targetUser.id, role: nextRole });
  };

  const handleSuspendChange = async (targetUser: any) => {
    const nextSuspended = !targetUser.isSuspended;
    const ok = await confirmAction({
      title: nextSuspended ? "Suspend pengguna?" : "Aktifkan pengguna?",
      description: nextSuspended
        ? `${targetUser.name} tidak dapat memakai akun sampai statusnya diaktifkan kembali.`
        : `${targetUser.name} akan dapat memakai akun kembali.`,
      confirmText: nextSuspended ? "Suspend" : "Aktifkan",
      variant: nextSuspended ? "danger" : "default",
    });
    if (ok) suspendMutation.mutate({ id: targetUser.id, isSuspended: nextSuspended });
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u: any) =>
      [u.name, u.email, u.phone, u.city].some((value) => String(value ?? "").toLowerCase().includes(q))
    );
  }, [users, search]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center gap-4">
          <Link href="/admin" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> Admin
          </Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-lg font-bold text-gray-900">Pengguna</h1>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-500">{users.length} akun terdaftar</p>
            <h2 className="text-xl font-bold text-gray-900">Kelola pengguna</h2>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, HP, kota..."
            className="w-full sm:w-80 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-gray-200 animate-pulse" />)}</div>
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-2xl border bg-white py-14 text-center text-sm text-gray-500">Tidak ada pengguna yang cocok.</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border bg-white">
            <div className="hidden md:grid grid-cols-[1.5fr_1fr_120px_110px_220px] gap-4 border-b bg-gray-50 px-5 py-3 text-xs font-semibold uppercase text-gray-500">
              <span>Pengguna</span>
              <span>Kota / HP</span>
              <span>Booking</span>
              <span>Status</span>
              <span>Aksi</span>
            </div>

            <div className="divide-y">
              {filteredUsers.map((u: any) => {
                const isSelf = u.id === user?.id;
                return (
                  <div key={u.id} className="grid gap-4 px-5 py-4 md:grid-cols-[1.5fr_1fr_120px_110px_220px] md:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{u.name}</p>
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          u.role === "ADMIN" ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-600"
                        )}>
                          {u.role}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{u.email}</p>
                      <p className="mt-1 text-xs text-gray-400">Daftar {formatDate(u.createdAt, { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>

                    <div className="text-sm text-gray-600">
                      <p>{u.city || "-"}</p>
                      <p className="text-xs text-gray-400">{u.phone || "No HP belum diisi"}</p>
                    </div>

                    <p className="text-sm font-medium text-gray-700">{u._count?.bookings ?? 0} booking</p>

                    <span className={cn(
                      "w-fit rounded-full px-2.5 py-1 text-xs font-medium",
                      u.isSuspended ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                    )}>
                      {u.isSuspended ? "Suspended" : "Aktif"}
                    </span>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleRoleChange(u)}
                        disabled={isSelf || roleMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {u.role === "ADMIN" ? <UserCheck className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                        {u.role === "ADMIN" ? "Jadikan User" : "Jadikan Admin"}
                      </button>
                      <button
                        onClick={() => handleSuspendChange(u)}
                        disabled={isSelf || suspendMutation.isPending}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium disabled:opacity-50",
                          u.isSuspended ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-700 hover:bg-red-200"
                        )}
                      >
                        <UserX className="h-3.5 w-3.5" />
                        {u.isSuspended ? "Aktifkan" : "Suspend"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
