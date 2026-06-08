import { prisma } from "./prisma";

export async function getSetting(key: string, fallback = ""): Promise<string> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  return setting?.value || fallback;
}

export async function getEnvBackedSetting(key: string, envKey: string, fallback = ""): Promise<string> {
  const value = await getSetting(key);
  return value || process.env[envKey] || fallback;
}

export async function getNumberSetting(key: string, envKey: string, fallback: number): Promise<number> {
  const value = await getEnvBackedSetting(key, envKey, String(fallback));
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
