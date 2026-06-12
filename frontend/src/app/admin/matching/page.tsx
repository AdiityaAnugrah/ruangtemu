"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, MapPin, Play } from "lucide-react";
import { dinnersApi, matchingApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { formatDate } from "@/lib/utils";
import { confirmAction } from "@/components/ui/toaster";

export default function AdminMatchingPage() {
  const { isAdmin, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const [selectedDinner, setSelectedDinner] = useState<string | null>(null);
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
    },
    meta: { successMessage: "Matching berhasil di-commit", errorTitle: "Commit matching gagal" },
  });

  const handleCommit = async () => {
    if (!selectedDinner) return;
    const ok = await confirmAction({
      title: "Commit matching?",
      description: "Hasil preview akan diterapkan ke booking peserta dan status booking akan berubah.",
      confirmText: "Commit",
    });
    if (ok) commitMutation.mutate(selectedDinner);
  };

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

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 rounded-2xl border bg-white p-6">
          <h2 className="mb-4 font-bold text-gray-900">Pilih Dinner</h2>
          {dinners.length === 0 ? (
            <p className="text-sm text-gray-500">Tidak ada dinner yang siap untuk matching</p>
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
                      <p className="text-sm text-gray-500">{dinner._count?.bookings ?? 0} booking confirmed</p>
                    </div>
                    <span className="w-fit rounded-full bg-green-100 px-2.5 py-1 text-xs text-green-700">{dinner.status}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedDinner && (
          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => previewMutation.mutate(selectedDinner)}
              disabled={previewMutation.isPending}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-300 bg-brand-50 px-5 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-100 disabled:opacity-50"
            >
              <Eye className="h-4 w-4" />
              {previewMutation.isPending ? "Memuat..." : "Preview"}
            </button>
            {preview && (
              <button
                onClick={handleCommit}
                disabled={commitMutation.isPending}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                {commitMutation.isPending ? "Memproses..." : "Commit Matching"}
              </button>
            )}
          </div>
        )}

        {preview && (
          <div className="mb-6 rounded-2xl border bg-white p-6">
            <h2 className="mb-4 font-bold text-gray-900">Preview Matching</h2>
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
                      <div key={participant.userId} className="rounded-xl border bg-white p-3">
                        <p className="text-sm font-medium text-gray-900">{participant.name}</p>
                        <p className="text-xs text-gray-500">{participant.age} tahun</p>
                        {participant.location && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="h-3 w-3" /> {participant.location}
                          </p>
                        )}
                        {participant.interests.length > 0 && (
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
                            {participant.matchProfile.conversationTopics?.length > 0 && (
                              <p>Topik: {participant.matchProfile.conversationTopics.slice(0, 3).join(", ")}</p>
                            )}
                            {participant.matchProfile.leisureTopics?.length > 0 && (
                              <p>Waktu luang: {participant.matchProfile.leisureTopics.slice(0, 3).join(", ")}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {commitResult && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
            <h3 className="mb-2 font-bold text-green-800">Matching Berhasil</h3>
            <p className="text-sm text-green-700">{commitResult.tablesCreated} meja dibuat, {commitResult.participantsMatched} peserta dicocokkan.</p>
            <p className="mt-1 text-xs text-green-600">Notifikasi sudah dikirim ke semua peserta.</p>
          </div>
        )}
      </main>
    </div>
  );
}
