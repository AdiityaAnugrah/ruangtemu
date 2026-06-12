import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { getNumberSetting } from "../lib/settings";
import { locationCityName } from "../lib/locations";
import { notificationService } from "./notificationService";

interface ParticipantData {
  bookingId: string;
  userId: string;
  name: string;
  age: number;
  interestIds: string[];
  interestNames: string[];
  gender: string | null;
  location: string | null;
  activity: string | null;
  industry: string | null;
  socialComfort: number | null;
  leisureTopics: string[];
  conversationTopics: string[];
  smokes: boolean | null;
  drinksAlcohol: boolean | null;
  dietaryNotes: string | null;
}

type PreviewParticipant = {
  userId: string;
  name: string;
  age: number;
  location: string | null;
  interests: string[];
  matchProfile: {
    activity: string | null;
    industry: string | null;
    socialComfort: number | null;
    leisureTopics: string[];
    conversationTopics: string[];
    smokes: boolean | null;
    drinksAlcohol: boolean | null;
    dietaryNotes: string | null;
  };
};

function calculateAge(birthDate: Date): number {
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) return age - 1;
  return age;
}

function normalize(value?: string | null): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeArray(values: string[]): string[] {
  return values.map(normalize).filter(Boolean);
}

function jsonStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function similarity(a: string[], b: string[]): number {
  const normalizedA = normalizeArray(a);
  const normalizedB = normalizeArray(b);
  if (normalizedA.length === 0 || normalizedB.length === 0) return 0;
  const setA = new Set(normalizedA);
  const intersection = normalizedB.filter((x) => setA.has(x)).length;
  const union = new Set([...normalizedA, ...normalizedB]).size;
  return union === 0 ? 0 : intersection / union;
}

function exactTextSimilarity(a?: string | null, b?: string | null): number {
  const normalizedA = normalize(a);
  const normalizedB = normalize(b);
  if (!normalizedA || !normalizedB) return 0;
  return normalizedA === normalizedB ? 1 : 0;
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

function socialComfortSimilarity(a?: number | null, b?: number | null): number {
  if (!a || !b) return 0;
  return Math.max(0, 1 - Math.abs(a - b) / 4);
}

function booleanCompatibility(a?: boolean | null, b?: boolean | null): number {
  if (a === null || a === undefined || b === null || b === undefined) return 0.45;
  return a === b ? 1 : 0;
}

function dietaryCompatibility(a?: string | null, b?: string | null): number {
  const normalizedA = normalize(a);
  const normalizedB = normalize(b);
  if (!normalizedA && !normalizedB) return 0.6;
  if (!normalizedA || !normalizedB) return 0.35;
  if (normalizedA === normalizedB) return 1;
  return similarity(normalizedA.split(/[,\s/]+/), normalizedB.split(/[,\s/]+/));
}

function profileCompleteness(participant: ParticipantData): number {
  return [
    participant.age > 0,
    participant.gender,
    participant.location,
    participant.activity,
    participant.industry,
    participant.socialComfort,
    participant.leisureTopics.length > 0,
    participant.conversationTopics.length > 0,
    participant.interestIds.length > 0,
    participant.smokes !== null,
    participant.drinksAlcohol !== null,
  ].filter(Boolean).length;
}

function scorePair(a: ParticipantData, b: ParticipantData, ageTolerance: number): number {
  const conversationScore = similarity(a.conversationTopics, b.conversationTopics);
  const interestScore = similarity(a.interestIds, b.interestIds);
  const leisureScore = similarity(a.leisureTopics, b.leisureTopics);
  const activityScore = exactTextSimilarity(a.activity, b.activity);
  const industryScore = exactTextSimilarity(a.industry, b.industry);
  const socialScore = socialComfortSimilarity(a.socialComfort, b.socialComfort);
  const locationScore = locationSimilarity(a.location, b.location);
  const ageScore = ageSimilarity(a.age, b.age, ageTolerance);
  const smokeScore = booleanCompatibility(a.smokes, b.smokes);
  const alcoholScore = booleanCompatibility(a.drinksAlcohol, b.drinksAlcohol);
  const dietaryScore = dietaryCompatibility(a.dietaryNotes, b.dietaryNotes);

  return (
    conversationScore * 4 +
    interestScore * 3 +
    leisureScore * 2 +
    activityScore * 1.15 +
    industryScore * 1.15 +
    socialScore * 1.4 +
    locationScore * 1.5 +
    ageScore * 1.2 +
    smokeScore * 0.75 +
    alcoholScore * 0.65 +
    dietaryScore * 0.45
  );
}

function genderBalanceScore(table: ParticipantData[], candidate: ParticipantData): number {
  if (!candidate.gender || candidate.gender === "OTHER") return 0;
  const sameGenderCount = table.filter((p) => p.gender === candidate.gender).length;
  const oppositeGenderCount = table.filter((p) => p.gender && p.gender !== candidate.gender && p.gender !== "OTHER").length;
  if (sameGenderCount === 0) return 0.45;
  if (sameGenderCount <= oppositeGenderCount) return 0.2;
  return -0.15;
}

function scoreCandidateForTable(candidate: ParticipantData, table: ParticipantData[], ageTolerance: number): number {
  const pairAverage = table.reduce((sum, participant) => sum + scorePair(candidate, participant, ageTolerance), 0) / table.length;
  return pairAverage + genderBalanceScore(table, candidate);
}

function scoreTable(table: ParticipantData[], ageTolerance: number): number {
  if (table.length <= 1) return 0;
  let total = 0;
  let pairs = 0;
  for (let i = 0; i < table.length; i++) {
    for (let j = i + 1; j < table.length; j++) {
      total += scorePair(table[i], table[j], ageTolerance);
      pairs++;
    }
  }
  return pairs === 0 ? 0 : Number((total / pairs).toFixed(2));
}

function targetTableSizes(totalParticipants: number, maxPerTable: number): number[] {
  if (totalParticipants <= 0) return [];
  const tableCount = Math.ceil(totalParticipants / Math.max(maxPerTable, 1));
  const baseSize = Math.floor(totalParticipants / tableCount);
  const extraSeats = totalParticipants % tableCount;
  return Array.from({ length: tableCount }, (_, index) => baseSize + (index < extraSeats ? 1 : 0));
}

function greedyCluster(participants: ParticipantData[], tableSize: number, ageTolerance: number): ParticipantData[][] {
  const pool = [...participants].sort((a, b) => {
    const completenessDiff = profileCompleteness(b) - profileCompleteness(a);
    if (completenessDiff !== 0) return completenessDiff;
    const interestDiff = b.interestIds.length + b.conversationTopics.length - (a.interestIds.length + a.conversationTopics.length);
    if (interestDiff !== 0) return interestDiff;
    return a.age - b.age;
  });
  const tables: ParticipantData[][] = [];
  const sizes = targetTableSizes(participants.length, tableSize);

  for (const size of sizes) {
    if (pool.length === 0) break;
    const table: ParticipantData[] = [pool.shift()!];

    while (table.length < size && pool.length > 0) {
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

function toParticipant(booking: any): ParticipantData {
  const conversationTopics = jsonStringArray(booking.user.conversationTopics);
  const interestNames = booking.user.interests.map((ui: any) => ui.interest?.name).filter(Boolean);

  return {
    bookingId: booking.id,
    userId: booking.user.id,
    name: booking.user.name,
    age: booking.user.birthDate ? calculateAge(booking.user.birthDate) : 0,
    interestIds: booking.user.interests.map((ui: any) => ui.interestId),
    interestNames,
    gender: booking.user.gender,
    location: booking.user.city,
    activity: booking.user.activity,
    industry: booking.user.industry,
    socialComfort: booking.user.socialComfort,
    leisureTopics: jsonStringArray(booking.user.leisureTopics),
    conversationTopics: conversationTopics.length > 0 ? conversationTopics : interestNames,
    smokes: booking.user.smokes,
    drinksAlcohol: booking.user.drinksAlcohol,
    dietaryNotes: booking.user.dietaryNotes,
  };
}

function previewParticipant(participant: ParticipantData): PreviewParticipant {
  return {
    userId: participant.userId,
    name: participant.name,
    age: participant.age,
    location: participant.location,
    interests: participant.interestNames,
    matchProfile: {
      activity: participant.activity,
      industry: participant.industry,
      socialComfort: participant.socialComfort,
      leisureTopics: participant.leisureTopics,
      conversationTopics: participant.conversationTopics,
      smokes: participant.smokes,
      drinksAlcohol: participant.drinksAlcohol,
      dietaryNotes: participant.dietaryNotes,
    },
  };
}

async function getConfirmedParticipants(dinnerId: string): Promise<ParticipantData[]> {
  const bookings = await prisma.booking.findMany({
    where: { dinnerId, status: "CONFIRMED" },
    include: {
      user: {
        include: { interests: { include: { interest: true } } },
      },
    },
  });

  return bookings.map(toParticipant);
}

export const matchingService = {
  async preview(dinnerId: string): Promise<{ tables: { tableScore: number; participants: PreviewParticipant[] }[]; unassigned: number }> {
    const dinner = await prisma.dinner.findUnique({ where: { id: dinnerId } });
    if (!dinner) throw new Error("Dinner tidak ditemukan");

    const ageTolerance = await getNumberSetting("matching_age_tolerance", "MATCHING_AGE_TOLERANCE", 7);
    const participants = await getConfirmedParticipants(dinnerId);
    const tables = greedyCluster(participants, dinner.maxPerTable, ageTolerance);

    const result = tables.map((table) => ({
      tableScore: scoreTable(table, ageTolerance),
      participants: table.map(previewParticipant),
    }));

    const assignedCount = tables.reduce((sum, t) => sum + t.length, 0);

    return { tables: result, unassigned: participants.length - assignedCount };
  },

  async commit(dinnerId: string): Promise<{ tablesCreated: number; participantsMatched: number }> {
    const dinner = await prisma.dinner.findUnique({ where: { id: dinnerId } });
    if (!dinner) throw new Error("Dinner tidak ditemukan");

    const ageTolerance = await getNumberSetting("matching_age_tolerance", "MATCHING_AGE_TOLERANCE", 7);
    const participants = await getConfirmedParticipants(dinnerId);
    const tables = greedyCluster(participants, dinner.maxPerTable, ageTolerance);

    let participantsMatched = 0;

    await prisma.$transaction(async (tx) => {
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
