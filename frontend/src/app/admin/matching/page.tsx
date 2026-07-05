"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, MapPin, Play, Plus, Shuffle, UserRound, Users } from "lucide-react";
import { dinnersApi, matchingApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { formatDate } from "@/lib/utils";
import { confirmAction } from "@/components/ui/toaster";

const genderLabel: Record<string, string> = {
  MALE: "Laki-laki",
  FEMALE: "Perempuan",
  OTHER: "Lainnya",
};

const genderBadgeClass: Record<string, string> = {
  MALE: "bg-blue-50 text-blue-700 border-blue-100",
  FEMALE: "bg-pink-50 text-pink-700 border-pink-100",
  OTHER: "bg-purple-50 text-purple-700 border-purple-100",
};

function ParticipantCard({
  participant,
  tables,
  onMove,
  isMoving,
  showMove = false,
}: {
  participant: any;
  tables?: any[];
  onMove?: (bookingId: string, tableId: string | null) => void;
  isMoving?: boolean;
  showMove?: boolean;
}) {
  const gender = participant.gender ? genderLabel[participant.gender] ?? participant.gender : "Gender belum diisi";
  const badgeClass = participant.gender ? genderBadgeClass[participant.gender] ?? "bg-slate-50 text-slate-700 border-slate-100" : "bg-amber-50 text-amber-700 border-amber-100";

  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-900">{participant.name}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badgeClass}`}>
              <UserRound className="h-3 w-3" /> {gender}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {participant.age || "-"} tahun
            </span>
          </div>
        </div>
      </div>

      {participant.location && (
        <p className="mt-2 flex items-center gap-1 text-xs text-gray-500">
          <MapPin className="h-3 w-3" /> {participant.location}
        </p>
      )}

      {participant.interests?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {participant.interests.slice(0, 3).map((interest: string) => (
            <span key={interest} className="rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-600">{interest}</span>
          ))}
        </div>
      )}

      {participant.matchProfile && (
        <div className="mt-2 space-y-1 text-xs text-gray-500">
          {[participant.matchProfile.activity, participant.matchProfile.industry].filter(Boolean).length > 0 && (
            <p>{[participant.matchProfile.activity, participant.matchProfile.industry].filter(Boolean).join(" · ")}</p>
          )}
          {participant.matchProfile.socialComfort && <p>Nyaman ngobrol: {participant.matchProfile.socialComfort}/5</p>}
          {participant.matchProfile.personalityType && <p>Tipe: {participant.matchProfile.personalityType}</p>}
          {participant.matchProfile.conversationTopics?.length > 0 && (
            <p>Topik: {participant.matchProfile.conversationTopics.slice(0, 3).join(", ")}</p>
          )}
          {participant.matchProfile.leisureTopics?.length > 0 && (
            <p>Waktu luang: {participant.matchProfile.leisureTopics.slice(0, 3).join(", ")}</p>
          )}
        </div>
      )}

      {showMove && tables && onMove && (
        <div className="mt-3">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">Pindahkan ke</label>
          <select
            disabled={isMoving}
            defaultValue=""
            onChange={(e) => {
              const value = e.target.value;
              if (!value) return;
              onMove(participant.bookingId, value === "UNASSIGN" ? null : value);
              e.currentTarget.value = "";
            }}
            className="min-h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:opacity-50"
          >
            <option value="">Pilih meja...</option>
            {tables.map((table) => (
              <option key={table.id} value={table.id}>{table.name}</option>
            ))}
            <option value="UNASSIGN">Belum dialokasikan</option>
          </select>
        </div>
      )}
    </div>
  );
}

export default function AdminMatchingPage() {
  const { isAdmin, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const [selectedDinner, setSelectedDinner] = useState<string | null>(null);
  const [mode, setMode] = useState<"AUTO" | "MANUAL">("AUTO");
  const [preview, setPreview] = useState<any>(null);
  const [commitResult, setCommitResult] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/auth/login"); return; }
    if (!isAdmin()) router.push("/dashboard");
  }, [isAuthenticated, isAdmin, router]);

  const { data: dinners = [] } = useQuery({
    queryKey: ["admin-dinners-matching"],
    queryFn: () => dinnersApi.listAll().then((r) => r.data.filter((d: any) => ["OPEN", "MATCHING"].includes(d.status))),
  });

  useEffect(() => {
    const dinnerId = new URLSearchParams(window.location.search).get("dinnerId");
    if (dinnerId) setSelectedDinner(dinnerId);
  }, []);

  const selectedDinnerData = useMemo(() => dinners.find((dinner: any) => dinner.id === selectedDinner), [dinners, selectedDinner]);

  const manualBoard = useQuery({
    queryKey: ["manual-matching-board", selectedDinner],
    queryFn: () => matchingApi.manualBoard(selectedDinner!).then((r) => r.data),
    enabled: !!selectedDinner && mode === "MANUAL",
  });

  const previewMutation = useMutation({
    mutationFn: (dinnerId: string) => matchingApi.preview(dinnerId),
    onSuccess: (res) => setPreview(res.data),
    meta: { silentToast: true },
  });

  const commitMutation = useMutation({
    mutationFn: (dinnerId: string) => matchingApi.commit(dinnerId),
    onSuccess: (res) => {
      setCommitResult(res.data);
      qc.invalidateQueries({ queryKey: ["admin-dinners-matching"] });
      qc.invalidateQueries({ queryKey: ["manual-matching-board", selectedDinner] });
    },
    meta: { successMessage: "Matching otomatis berhasil di-commit", errorTitle: "Commit matching gagal" },
  });

  const setupManual = useMutation({
    mutationFn: (dinnerId: string) => matchingApi.setupManual(dinnerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manual-matching-board", selectedDinner] });
      qc.invalidateQueries({ queryKey: ["admin-dinners-matching"] });
    },
    meta: { successMessage: "Mode manual matching siap", errorTitle: "Gagal menyiapkan manual matching" },
  });

  const createTable = useMutation({
    mutationFn: (dinnerId: string) => matchingApi.createManualTable(dinnerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["manual-matching-board", selectedDinner] }),
    meta: { successMessage: "Meja baru ditambahkan", errorTitle: "Gagal menambah meja" },
  });

  const moveBooking = useMutation({
    mutationFn: ({ bookingId, tableId }: { bookingId: string; tableId: string | null }) => matchingApi.moveBooking(bookingId, tableId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["manual-matching-board", selectedDinner] }),
    meta: { successMessage: "Peserta berhasil dipindahkan", errorTitle: "Gagal memindahkan peserta" },
  });

  const handleCommit = async () => {
    if (!selectedDinner) return;
    const ok = await confirmAction({
      title: "Commit matching otomatis?",
      description: "Hasil preview otomatis akan diterapkan ke booking peserta dan susunan meja lama akan diganti.",
      confirmText: "Commit",
    });
    if (ok) commitMutation.mutate(selectedDinner);
  };

  const handleSetupManual = async () => {
    if (!selectedDinner) return;
    const ok = await confirmAction({
      title: "Siapkan matching manual?",
      description: "Sistem akan membuat meja kosong sesuai jumlah peserta. Setelah itu admin bisa memindahkan peserta satu per satu.",
      confirmText: "Siapkan Manual",
    });
    if (ok) setupManual.mutate(selectedDinner);
  };

  const manualTables = manualBoard.data?.tables ?? [];
  const manualUnassigned = manualBoard.data?.unassigned ?? [];
  const manualMatchedCount = manualTables.reduce((sum: number, table: any) => sum + table.participants.length, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4">
          <Link href="/admin" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> Admin
          </Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-lg font-bold text-gray-900">Proses Matching</h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 rounded-2xl border bg-white p-6">
          <h2 className="mb-4 font-bold text-gray-900">Pilih Nongkrong</h2>
          {dinners.length === 0 ? (
            <p className="text-sm text-gray-500">Tidak ada jadwal nongkrong yang siap untuk matching</p>
          ) : (
            <div className="space-y-3">
              {dinners.map((dinner: any) => (
                <button
                  type="button"
                  key={dinner.id}
                  onClick={() => { setSelectedDinner(dinner.id); setPreview(null); setCommitResult(null); }}
                  className={`w-full cursor-pointer rounded-xl border p-4 text-left transition-all ${selectedDinner === dinner.id ? "border-brand-500 bg-brand-50" : "hover:border-gray-300"}`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{dinner.city?.name} - {formatDate(dinner.date, { weekday: "long", day: "numeric", month: "long" })}</p>
                      <p className="text-sm text-gray-500">{dinner._count?.bookings ?? 0} booking</p>
                    </div>
                    <span className="w-fit rounded-full bg-green-100 px-2.5 py-1 text-xs text-green-700">{dinner.status}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedDinner && (
          <div className="mb-6 rounded-2xl border bg-white p-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "AUTO", label: "Auto Matching", icon: Shuffle },
                { value: "MANUAL", label: "Manual Matching", icon: Users },
              ].map((item) => {
                const Icon = item.icon;
                const active = mode === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setMode(item.value as "AUTO" | "MANUAL")}
                    className={`flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold ${
                      active ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selectedDinner && mode === "AUTO" && (
          <>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => previewMutation.mutate(selectedDinner)}
                disabled={previewMutation.isPending}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-300 bg-brand-50 px-5 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-100 disabled:opacity-50"
              >
                <Eye className="h-4 w-4" />
                {previewMutation.isPending ? "Memuat..." : "Preview Otomatis"}
              </button>
              {preview && (
                <button
                  onClick={handleCommit}
                  disabled={commitMutation.isPending}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  <Play className="h-4 w-4" />
                  {commitMutation.isPending ? "Memproses..." : "Commit Auto Matching"}
                </button>
              )}
            </div>

            {preview && (
              <div className="mb-6 rounded-2xl border bg-white p-6">
                <h2 className="mb-4 font-bold text-gray-900">Preview Auto Matching</h2>
                <p className="mb-4 text-sm text-gray-500">Peserta tidak teralokasi: <strong>{preview.unassigned}</strong></p>
                <div className="space-y-4">
                  {preview.tables.map((table: any, i: number) => (
                    <div key={i} className="rounded-xl bg-gray-50 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-gray-800">Meja {i + 1} ({table.participants.length} orang)</p>
                        {typeof table.tableScore === "number" && (
                          <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">Skor {table.tableScore}</span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                        {table.participants.map((participant: any) => (
                          <ParticipantCard key={participant.bookingId ?? participant.userId} participant={participant} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {selectedDinner && mode === "MANUAL" && (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-white p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-bold text-gray-900">Manual Matching</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedDinnerData?.city?.name ? `${selectedDinnerData.city.name} · ` : ""}
                    Cocokkan peserta dengan memilih meja secara manual.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleSetupManual}
                    disabled={setupManual.isPending}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    <Users className="h-4 w-4" /> {setupManual.isPending ? "Menyiapkan..." : "Siapkan Manual"}
                  </button>
                  <button
                    type="button"
                    onClick={() => selectedDinner && createTable.mutate(selectedDinner)}
                    disabled={createTable.isPending}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" /> Tambah Meja
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Meja</p>
                  <p className="text-2xl font-bold text-slate-900">{manualTables.length}</p>
                </div>
                <div className="rounded-xl bg-green-50 p-4">
                  <p className="text-xs text-green-600">Sudah ditempatkan</p>
                  <p className="text-2xl font-bold text-green-700">{manualMatchedCount}</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-4">
                  <p className="text-xs text-amber-600">Belum ditempatkan</p>
                  <p className="text-2xl font-bold text-amber-700">{manualUnassigned.length}</p>
                </div>
              </div>
            </div>

            {manualBoard.isLoading ? (
              <div className="rounded-2xl border bg-white p-6 text-sm text-gray-500">Memuat board manual...</div>
            ) : manualTables.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <h3 className="font-bold text-amber-800">Board manual belum disiapkan</h3>
                <p className="mt-1 text-sm text-amber-700">Klik <strong>Siapkan Manual</strong> untuk membuat meja kosong terlebih dahulu.</p>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border bg-white p-6">
                  <h3 className="mb-4 font-bold text-gray-900">Belum Ditempatkan ({manualUnassigned.length})</h3>
                  {manualUnassigned.length === 0 ? (
                    <p className="text-sm text-gray-500">Semua peserta sudah masuk meja.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {manualUnassigned.map((participant: any) => (
                        <ParticipantCard
                          key={participant.bookingId}
                          participant={participant}
                          tables={manualTables}
                          showMove
                          isMoving={moveBooking.isPending}
                          onMove={(bookingId, tableId) => moveBooking.mutate({ bookingId, tableId })}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {manualTables.map((table: any) => (
                    <div key={table.id} className="rounded-2xl border bg-white p-5">
                      <div className="mb-4 flex items-center justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-gray-900">{table.name}</h3>
                          <p className="text-sm text-gray-500">{table.participants.length} peserta</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          Manual
                        </span>
                      </div>
                      {table.participants.length === 0 ? (
                        <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">Meja masih kosong.</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {table.participants.map((participant: any) => (
                            <ParticipantCard
                              key={participant.bookingId}
                              participant={participant}
                              tables={manualTables}
                              showMove
                              isMoving={moveBooking.isPending}
                              onMove={(bookingId, tableId) => moveBooking.mutate({ bookingId, tableId })}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {commitResult && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-6">
            <h3 className="mb-2 font-bold text-green-800">Matching Berhasil</h3>
            <p className="text-sm text-green-700">{commitResult.tablesCreated} meja dibuat, {commitResult.participantsMatched} peserta dicocokkan.</p>
            <p className="mt-1 text-xs text-green-600">Notifikasi sudah dikirim ke semua peserta.</p>
          </div>
        )}
      </main>
    </div>
  );
}
