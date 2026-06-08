import { prisma } from "./prisma";

function normalize(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function formatLocation(cityName: string, areaName: string) {
  return `${cityName} - ${areaName}`;
}

export async function isAvailableLocation(value?: string | null): Promise<boolean> {
  if (!value) return false;
  const target = normalize(value);
  const cities = await prisma.city.findMany({
    where: { isActive: true },
    select: { name: true, areas: true },
  });

  return cities.some((city) => {
    if (normalize(city.name) === target) return true;

    const areas = JSON.parse(city.areas) as string[];
    return areas.some((area) => normalize(formatLocation(city.name, area)) === target);
  });
}

export function locationCityName(value?: string | null): string {
  return (value ?? "").split(" - ")[0].trim();
}
