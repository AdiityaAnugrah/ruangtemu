import { PrismaClient, Gender, Role } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

function adminSeedConfig() {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@ruangtemu.biz.id";
  const name = process.env.SEED_ADMIN_NAME || "Admin Ruang Temu";
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (process.env.NODE_ENV === "production" && !password) {
    throw new Error("SEED_ADMIN_PASSWORD wajib diisi saat seed production");
  }

  return {
    email,
    name,
    password: password || "Admin@12345",
  };
}

async function main() {
  const interestNames = [
    "Teknologi", "Startup", "Kuliner", "Travel", "Olahraga",
    "Musik", "Film", "Seni", "Literatur", "Fotografi",
    "Gaming", "Kesehatan", "Keuangan", "Mode", "Lingkungan",
    "Pendidikan", "Sosial", "Bisnis", "Desain", "Psikologi",
  ];

  for (const name of interestNames) {
    await prisma.interest.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("Interests seeded");

  const cities = [
    { name: "Magelang", areas: JSON.stringify(["Magelang Kota", "Mungkid", "Borobudur", "Muntilan"]), isActive: true },
    { name: "Purworejo", areas: JSON.stringify(["Purworejo Kota", "Kutoarjo", "Bayan", "Grabag"]), isActive: true },
  ];

  await prisma.city.updateMany({
    where: { name: { notIn: cities.map((city) => city.name) } },
    data: { isActive: false },
  });

  for (const city of cities) {
    await prisma.city.upsert({
      where: { name: city.name },
      update: { areas: city.areas, isActive: city.isActive },
      create: city,
    });
  }
  console.log("Cities seeded");

  const seedAdmin = adminSeedConfig();
  const adminHash = await argon2.hash(seedAdmin.password);
  const admin = await prisma.user.upsert({
    where: { email: seedAdmin.email },
    update: { role: Role.ADMIN, isVerified: true, isSuspended: false },
    create: {
      email: seedAdmin.email,
      name: seedAdmin.name,
      passwordHash: adminHash,
      role: Role.ADMIN,
      isVerified: true,
      gender: Gender.OTHER,
    },
  });
  console.log("Admin user seeded:", admin.email);

  const settings = [
    { key: "qris_image_url", value: "" },
    { key: "payment_deadline_hours", value: "24" },
    { key: "default_budget_tiers", value: JSON.stringify([{ label: "Casual", price: 175000 }, { label: "Premium", price: 275000 }]) },
    { key: "matching_age_tolerance", value: "7" },
    { key: "wa_gateway_provider", value: "fonnte" },
    { key: "wa_gateway_token", value: "" },
    { key: "smtp_host", value: "" },
    { key: "smtp_port", value: "587" },
    { key: "smtp_user", value: "" },
    { key: "smtp_pass", value: "" },
    { key: "smtp_from", value: "RuangTemu <noreply@ruangtemu.biz.id>" },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log("Default settings seeded");

  console.log("\nSeed selesai");
  console.log(`Admin: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
