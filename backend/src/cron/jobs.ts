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
    await prisma.$transaction([
      prisma.booking.updateMany({
        where: { id: { in: expired.map((b) => b.id) } },
        data: { status: "CANCELLED" },
      }),
      prisma.payment.updateMany({
        where: { bookingId: { in: expired.map((b) => b.id) }, status: "PENDING" },
        data: { status: "REJECTED", note: "Otomatis dibatalkan karena melewati batas waktu pembayaran." },
      }),
    ]);
    logger.info({ count: expired.length }, "Auto-cancelled expired bookings");
  }
}

async function autoCancelExpiredEventRegistrations() {
  const registrations = await prisma.eventRegistration.findMany({
    where: { status: "PENDING_PAYMENT" },
    select: { id: true, payment: true },
  });
  const now = Date.now();
  const expiredIds = registrations.flatMap((registration) => {
    const payment = registration.payment as { expiredAt?: string } | null;
    if (!payment?.expiredAt || new Date(payment.expiredAt).getTime() >= now) return [];
    return [registration.id];
  });

  if (expiredIds.length > 0) {
    const expiredRegistrations = registrations.filter((registration) => expiredIds.includes(registration.id));
    await prisma.$transaction(
      expiredRegistrations.map((registration) => {
        const payment = registration.payment as Record<string, any> | null;
        return prisma.eventRegistration.update({
          where: { id: registration.id },
          data: {
            status: "CANCELLED",
            payment: {
              ...(payment ?? {}),
              status: "REJECTED",
              note: payment?.note ?? "Otomatis dibatalkan karena melewati batas waktu pembayaran.",
            },
          },
        });
      })
    );
    logger.info({ count: expiredIds.length }, "Auto-cancelled expired event registrations");
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
      await autoCancelExpiredEventRegistrations();
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
