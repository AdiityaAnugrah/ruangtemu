import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { notificationService } from "../services/notificationService";

// Auto-cancel booking yang melebihi deadline pembayaran
async function autoCancelExpiredBookings() {
  const expired = await prisma.booking.findMany({
    where: {
      status: "PENDING_PAYMENT",
      payment: { expiredAt: { lt: new Date() }, status: "PENDING" },
    },
    include: { payment: true },
  });

  if (expired.length > 0) {
    await prisma.booking.updateMany({
      where: { id: { in: expired.map((b) => b.id) } },
      data: { status: "CANCELLED" },
    });
    logger.info({ count: expired.length }, "Auto-cancelled expired bookings");
  }
}

// Kirim notifikasi lokasi H-1 dinner
async function sendLocationRevealNotifications() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const start = new Date(tomorrow);
  start.setHours(0, 0, 0, 0);
  const end = new Date(tomorrow);
  end.setHours(23, 59, 59, 999);

  const dinners = await prisma.dinner.findMany({
    where: {
      date: { gte: start, lte: end },
      status: "CONFIRMED",
      venueName: { not: null },
      venueAddress: { not: null },
    },
    include: { city: true },
  });

  for (const dinner of dinners) {
    if (!dinner.venueName || !dinner.venueAddress) continue;

    const bookings = await prisma.booking.findMany({
      where: { dinnerId: dinner.id, status: "MATCHED" },
      include: { user: true },
    });

    for (const booking of bookings) {
      try {
        await notificationService.sendLocationReveal(booking.user, {
          id: dinner.id,
          date: dinner.date,
          city: dinner.city,
          venueName: dinner.venueName,
          venueAddress: dinner.venueAddress,
          arrivalTime: dinner.arrivalTime || dinner.startTime,
          reservationName: dinner.reservationName || "RuangTemu",
          hostName: dinner.hostName,
          hostPhone: dinner.hostPhone,
          venueNotes: dinner.venueNotes,
        });
      } catch (err) {
        logger.error({ err }, "Failed to send location reveal notification");
      }
    }
    logger.info({ dinnerId: dinner.id }, "Location reveal notifications sent");
  }
}

// Kirim reminder dinner di hari H
async function sendDinnerReminders() {
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  const dinners = await prisma.dinner.findMany({
    where: {
      date: { gte: start, lte: end },
      status: "CONFIRMED",
    },
    include: { city: true },
  });

  for (const dinner of dinners) {
    const bookings = await prisma.booking.findMany({
      where: { dinnerId: dinner.id, status: "MATCHED" },
      include: { user: true },
    });

    for (const booking of bookings) {
      try {
        await notificationService.sendDinnerReminder(booking.user, {
          id: dinner.id,
          date: dinner.date,
          city: dinner.city,
          startTime: dinner.startTime,
        });
      } catch (err) {
        logger.error({ err }, "Failed to send dinner reminder");
      }
    }
  }
}

export function startCronJobs() {
  // Auto-cancel expired bookings: setiap 30 menit
  cron.schedule("*/30 * * * *", async () => {
    try {
      await autoCancelExpiredBookings();
    } catch (err) {
      logger.error({ err }, "Cron: auto-cancel failed");
    }
  });

  // Location reveal: setiap hari jam 08:00 (kirim notif H-1)
  cron.schedule("0 8 * * *", async () => {
    try {
      await sendLocationRevealNotifications();
    } catch (err) {
      logger.error({ err }, "Cron: location reveal failed");
    }
  });

  // Dinner reminder: setiap hari jam 09:00 (di hari H)
  cron.schedule("0 9 * * *", async () => {
    try {
      await sendDinnerReminders();
    } catch (err) {
      logger.error({ err }, "Cron: dinner reminder failed");
    }
  });

  logger.info("Cron jobs started");
}
