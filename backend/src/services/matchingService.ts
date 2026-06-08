import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { getNumberSetting } from "../lib/settings";
import { locationCityName } from "../lib/locations";
import { notificationService } from "./notificationService";

interface ParticipantData {
  bookingId: string;
  userId: string;
  age: number;
  interestIds: string[];
  gender: string | null;
  location: string | null;
}

function calculateAge(birthDate: Date): number {
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) return age - 1;
  return age;
}

function interestSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a);
  const intersection = b.filter((x) => setA.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union; // Jaccard
}

function normalize(value?: string | null): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function locationSimilarity(a?: string | null, b?: string | null): number {
  const normalizedA = normalize(a);
  const normalizedB = normalize(b);
  if (!normalizedA || !normalizedB) return 0;
  if (normalizedA === normalizedB) return 1;
  if (normalize(locationCityName(a)) === normalize(locationCityName(b))) return 0.65;
  return 0;
}

function ageSimilarity(a: number, b: number, ageTolerance: number): number {
  if (a <= 0 || b <= 0) return 0.2;
  const diff = Math.abs(a - b);
  if (diff <= ageTolerance) return 1;
  return Math.max(0, 1 - (diff - ageTolerance) / Math.max(ageTolerance, 1));
}

function scorePair(a: ParticipantData, b: ParticipantData, ageTolerance: number): number {
  const interestScore = interestSimilarity(a.interestIds, b.interestIds);
  const locationScore = locationSimilarity(a.location, b.location);
  const ageScore = ageSimilarity(a.age, b.age, ageTolerance);

  return (interestScore * 5) + (locationScore * 2) + (ageScore * 1.5);
}

function genderBalanceScore(table: ParticipantData[], candidate: ParticipantData): number {
  if (!candidate.gender) return 0;
  const sameGenderCount = table.filter((p) => p.gender === candidate.gender).length;
  const lowestCount = Math.min(
    table.filter((p) => p.gender === "MALE").length,
    table.filter((p) => p.gender === "FEMALE").length,
    table.filter((p) => p.gender === "OTHER").length
  );
  return sameGenderCount <= lowestCount ? 0.2 : -0.05;
}

function scoreCandidateForTable(candidate: ParticipantData, table: ParticipantData[], ageTolerance: number): number {
  const pairAverage = table.reduce((sum, participant) => sum + scorePair(candidate, participant, ageTolerance), 0) / table.length;
  return pairAverage + genderBalanceScore(table, candidate);
}

function greedyCluster(participants: ParticipantData[], tableSize: number, ageTolerance: number): ParticipantData[][] {
  const pool = [...participants].sort((a, b) => {
    const interestDiff = b.interestIds.length - a.interestIds.length;
    if (interestDiff !== 0) return interestDiff;
    return a.age - b.age;
  });
  const tables: ParticipantData[][] = [];

  while (pool.length > 0) {
    const table: ParticipantData[] = [pool.shift()!];

    while (table.length < tableSize && pool.length > 0) {
      const candidates = pool
        .map((participant, idx) => ({
          idx,
          score: scoreCandidateForTable(participant, table, ageTolerance),
        }))
        .sort((a, b) => b.score - a.score);

      const best = candidates[0];
      table.push(pool.splice(best.idx, 1)[0]);
    }

    tables.push(table);
  }

  return tables;
}

export const matchingService = {
  async preview(dinnerId: string): Promise<{ tables: { participants: { userId: string; name: string; age: number; location: string | null; interests: string[] }[] }[]; unassigned: number }> {
    const dinner = await prisma.dinner.findUnique({ where: { id: dinnerId } });
    if (!dinner) throw new Error("Dinner tidak ditemukan");

    const ageTolerance = await getNumberSetting("matching_age_tolerance", "MATCHING_AGE_TOLERANCE", 7);

    const bookings = await prisma.booking.findMany({
      where: { dinnerId, status: "CONFIRMED" },
      include: {
        user: {
          include: { interests: { include: { interest: true } } },
        },
      },
    });

    const participants: ParticipantData[] = bookings.map((b) => ({
      bookingId: b.id,
      userId: b.user.id,
      age: b.user.birthDate ? calculateAge(b.user.birthDate) : 0,
      interestIds: b.user.interests.map((ui) => ui.interestId),
      gender: b.user.gender,
      location: b.user.city,
    }));

    const tables = greedyCluster(participants, dinner.maxPerTable, ageTolerance);

    const result = await Promise.all(
      tables.map(async (t) => ({
        participants: await Promise.all(
          t.map(async (p) => {
            const user = await prisma.user.findUnique({
              where: { id: p.userId },
              include: { interests: { include: { interest: true } } },
            });
            return {
              userId: p.userId,
              name: user!.name,
              age: p.age,
              location: user!.city,
              interests: user!.interests.map((ui) => ui.interest.name),
            };
          })
        ),
      }))
    );

    const assignedCount = tables.reduce((sum, t) => sum + t.length, 0);

    return { tables: result, unassigned: participants.length - assignedCount };
  },

  async commit(dinnerId: string): Promise<{ tablesCreated: number; participantsMatched: number }> {
    const dinner = await prisma.dinner.findUnique({ where: { id: dinnerId } });
    if (!dinner) throw new Error("Dinner tidak ditemukan");

    const ageTolerance = await getNumberSetting("matching_age_tolerance", "MATCHING_AGE_TOLERANCE", 7);

    const bookings = await prisma.booking.findMany({
      where: { dinnerId, status: "CONFIRMED" },
      include: {
        user: {
          include: { interests: true },
        },
      },
    });

    const participants: ParticipantData[] = bookings.map((b) => ({
      bookingId: b.id,
      userId: b.user.id,
      age: b.user.birthDate ? calculateAge(b.user.birthDate) : 0,
      interestIds: b.user.interests.map((ui) => ui.interestId),
      gender: b.user.gender,
      location: b.user.city,
    }));

    const tables = greedyCluster(participants, dinner.maxPerTable, ageTolerance);

    let participantsMatched = 0;

    await prisma.$transaction(async (tx) => {
      // Hapus tabel lama
      await tx.dinnerTable.deleteMany({ where: { dinnerId } });

      for (let i = 0; i < tables.length; i++) {
        const tableParticipants = tables[i];
        const tableName = `Meja ${i + 1}`;

        const table = await tx.dinnerTable.create({
          data: { dinnerId, name: tableName },
        });

        for (const p of tableParticipants) {
          await tx.booking.update({
            where: { id: p.bookingId },
            data: { tableId: table.id, status: "MATCHED" },
          });
          participantsMatched++;
        }
      }

      await tx.dinner.update({ where: { id: dinnerId }, data: { status: "MATCHING" } });
    });

    // Kirim notifikasi ke semua peserta yang matched
    for (const t of tables) {
      for (const p of t) {
        try {
          const booking = await prisma.booking.findUnique({
            where: { id: p.bookingId },
            include: {
              user: true,
              table: true,
              dinner: { include: { city: true } },
            },
          });
          if (booking?.user && booking.table && booking.dinner) {
            await notificationService.sendMatchResult(booking.user, {
              id: booking.id,
              table: booking.table,
              dinner: booking.dinner as any,
            });
          }
        } catch (err) {
          logger.error({ err }, "Failed to send match notification");
        }
      }
    }

    logger.info({ dinnerId, tablesCreated: tables.length, participantsMatched }, "Matching completed");

    return { tablesCreated: tables.length, participantsMatched };
  },
};
