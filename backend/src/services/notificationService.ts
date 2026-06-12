import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { getEnvBackedSetting } from "../lib/settings";
import nodemailer from "nodemailer";

interface UserLike { id: string; email: string; name: string; phone?: string | null }
interface BookingLike { id: string; dinner: { date: Date; city: { name: string } }; budgetTier: { label: string; price: number } }

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
}

async function getEmailConfig(): Promise<EmailConfig> {
  const host = await getEnvBackedSetting("smtp_host", "SMTP_HOST");
  const port = parseInt(await getEnvBackedSetting("smtp_port", "SMTP_PORT", "587"), 10);
  const secure = (await getEnvBackedSetting("smtp_secure", "SMTP_SECURE", "false")) === "true";
  const user = await getEnvBackedSetting("smtp_user", "SMTP_USER");
  const pass = await getEnvBackedSetting("smtp_pass", "SMTP_PASS");
  const from = await getEnvBackedSetting("smtp_from", "SMTP_FROM", "RuangTemu <noreply@ruangtemu.biz.id>");

  return { host, port: Number.isFinite(port) ? port : 587, secure, user: user || undefined, pass: pass || undefined, from };
}

function getTransport(config: EmailConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user ? {
      user: config.user,
      pass: config.pass,
    } : undefined,
  });
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const config = await getEmailConfig();
  if (!config.host) {
    logger.info({ to, subject }, "SMTP not configured, skipping email");
    return;
  }

  try {
    const transport = getTransport(config);
    await transport.sendMail({
      from: config.from,
      to,
      subject,
      html,
    });
  } catch (err) {
    logger.error({ err, to, subject }, "Failed to send email");
  }
}

async function sendWA(phone: string, message: string): Promise<void> {
  const token = await getEnvBackedSetting("wa_gateway_token", "WA_TOKEN");
  const provider = await getEnvBackedSetting("wa_gateway_provider", "WA_PROVIDER", "fonnte");

  if (!token || !phone) {
    logger.info({ phone, provider }, "WA not configured, skipping");
    return;
  }

  try {
    if (provider === "fonnte") {
      await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: { Authorization: token, "Content-Type": "application/json" },
        body: JSON.stringify({ target: phone, message }),
      });
    }
    // tambah provider lain di sini (wablas, dll)
  } catch (err) {
    logger.error({ err, phone, provider }, "Failed to send WA");
  }
}

async function recordNotification(userId: string, channel: string, type: string, payload: object): Promise<void> {
  await prisma.notification.create({
    data: { userId, channel, type, payload, sentAt: new Date() },
  });
}

async function hasLocationRevealNotification(userId: string, dinnerId: string): Promise<boolean> {
  const notifications = await prisma.notification.findMany({
    where: { userId, type: "LOCATION_REVEAL" },
    select: { payload: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return notifications.some((n) => {
    const payload = n.payload as { dinnerId?: string } | null;
    return payload?.dinnerId === dinnerId;
  });
}

export const notificationService = {
  async sendEmailVerificationCode(user: UserLike, code: string, expiresAt: Date) {
    const expires = expiresAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const subject = "Kode Verifikasi Email - RuangTemu";
    const html = `
      <h2>Halo ${user.name},</h2>
      <p>Gunakan kode berikut untuk memverifikasi email akun RuangTemu kamu:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px;">${code}</p>
      <p>Kode ini berlaku sampai pukul <strong>${expires}</strong>.</p>
      <p>Jika kamu tidak membuat akun RuangTemu, abaikan email ini.</p>
      <p>- Tim RuangTemu</p>
    `;

    await sendEmail(user.email, subject, html);
    await recordNotification(user.id, "EMAIL", "EMAIL_VERIFICATION", { expiresAt: expiresAt.toISOString() });
  },

  async sendPaymentConfirmed(user: UserLike, booking: BookingLike) {
    const dinnerDate = new Date(booking.dinner.date).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const amount = booking.budgetTier.price.toLocaleString("id-ID");

    const subject = "Pembayaran Dikonfirmasi - RuangTemu";
    const html = `
      <h2>Halo ${user.name},</h2>
      <p>Pembayaran kamu untuk dinner RuangTemu di <strong>${booking.dinner.city.name}</strong> pada <strong>${dinnerDate}</strong> telah dikonfirmasi!</p>
      <p>Tier: ${booking.budgetTier.label} — Rp ${amount}</p>
      <p>Tunggu informasi meja dan lokasi detail pada H-1 dinner ya.</p>
      <p>Sampai ketemu! 🍽️</p>
      <p>— Tim RuangTemu</p>
    `;

    await sendEmail(user.email, subject, html);

    if (user.phone) {
      const message = `Halo ${user.name}! Pembayaran kamu untuk dinner RuangTemu di ${booking.dinner.city.name} (${dinnerDate}) sudah dikonfirmasi. Tunggu info meja dan lokasi pada H-1 ya! - Tim RuangTemu`;
      await sendWA(user.phone, message);
    }

    await recordNotification(user.id, "EMAIL", "PAYMENT_CONFIRMED", { bookingId: booking.id, amount });
  },

  async sendPaymentRejected(user: UserLike, reason?: string | null) {
    const subject = "Pembayaran Ditolak - RuangTemu";
    const html = `
      <h2>Halo ${user.name},</h2>
      <p>Maaf, bukti pembayaran kamu ditolak.${reason ? ` Alasan: <strong>${reason}</strong>` : ""}</p>
      <p>Silakan upload ulang bukti pembayaran yang sesuai.</p>
      <p>— Tim RuangTemu</p>
    `;
    await sendEmail(user.email, subject, html);
    await recordNotification(user.id, "EMAIL", "PAYMENT_REJECTED", { reason });
  },

  async sendMatchResult(user: UserLike, booking: { id: string; table: { name: string }; dinner: { date: Date; city: { name: string }; venueName?: string | null; venueAddress?: string | null } }) {
    const dinnerDate = new Date(booking.dinner.date).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const subject = "Meja Kamu Sudah Terbentuk! - RuangTemu";
    const html = `
      <h2>Halo ${user.name},</h2>
      <p>Meja dinner kamu di <strong>${booking.dinner.city.name}</strong> sudah terbentuk!</p>
      <p>Kamu berada di <strong>${booking.table.name}</strong>.</p>
      <p>Tanggal: <strong>${dinnerDate}</strong></p>
      <p>Lokasi detail akan dikirimkan pada H-1 dinner. Stay tuned!</p>
      <p>— Tim RuangTemu</p>
    `;
    await sendEmail(user.email, subject, html);
    await recordNotification(user.id, "EMAIL", "MATCH_READY", { bookingId: booking.id, tableName: booking.table.name });
  },

  async sendLocationReveal(user: UserLike, dinner: {
    id: string;
    date: Date;
    city: { name: string };
    venueName: string;
    venueAddress: string;
    arrivalTime: string;
    reservationName: string;
    hostName?: string | null;
    hostPhone?: string | null;
    venueNotes?: string | null;
  }) {
    if (await hasLocationRevealNotification(user.id, dinner.id)) return false;

    const dinnerDate = new Date(dinner.date).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const subject = "Lokasi Dinner Diumumkan! - RuangTemu";
    const html = `
      <h2>Halo ${user.name},</h2>
      <p>Lokasi dinner RuangTemu besok sudah tersedia!</p>
      <p><strong>Tanggal:</strong> ${dinnerDate}</p>
      <p><strong>Tempat:</strong> ${dinner.venueName}</p>
      <p><strong>Alamat:</strong> ${dinner.venueAddress}</p>
      <p><strong>Jam kedatangan:</strong> ${dinner.arrivalTime}</p>
      <p><strong>Reservasi atas nama:</strong> ${dinner.reservationName}</p>
      ${dinner.hostName || dinner.hostPhone ? `<p><strong>PIC:</strong> ${[dinner.hostName, dinner.hostPhone].filter(Boolean).join(" - ")}</p>` : ""}
      ${dinner.venueNotes ? `<p><strong>Catatan:</strong> ${dinner.venueNotes}</p>` : ""}
      <p>Info meja kamu bisa dilihat di detail booking RuangTemu.</p>
      <p>Selamat menikmati dinner!</p>
      <p>- Tim RuangTemu</p>
    `;
    await sendEmail(user.email, subject, html);
    if (user.phone) {
      const pic = dinner.hostName || dinner.hostPhone ? ` PIC: ${[dinner.hostName, dinner.hostPhone].filter(Boolean).join(" - ")}.` : "";
      const notes = dinner.venueNotes ? ` Catatan: ${dinner.venueNotes}.` : "";
      const message = `Lokasi dinner RuangTemu (${dinnerDate}): ${dinner.venueName}, ${dinner.venueAddress}. Datang: ${dinner.arrivalTime}. Reservasi: ${dinner.reservationName}.${pic}${notes} Info meja ada di detail booking. - Tim RuangTemu`;
      await sendWA(user.phone, message);
    }
    await recordNotification(user.id, "EMAIL", "LOCATION_REVEAL", {
      dinnerId: dinner.id,
      venueName: dinner.venueName,
      venueAddress: dinner.venueAddress,
      arrivalTime: dinner.arrivalTime,
      reservationName: dinner.reservationName,
    });
    return true;
  },

  async sendDinnerReminder(user: UserLike, dinner: { id: string; date: Date; city: { name: string }; startTime: string }) {
    const dinnerDate = new Date(dinner.date).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const subject = "Reminder: Dinner RuangTemu Hari Ini!";
    const html = `
      <h2>Halo ${user.name},</h2>
      <p>Jangan lupa, dinner RuangTemu kamu <strong>hari ini</strong>!</p>
      <p><strong>Tanggal:</strong> ${dinnerDate}</p>
      <p><strong>Jam:</strong> ${dinner.startTime}</p>
      <p><strong>Kota:</strong> ${dinner.city.name}</p>
      <p>Selamat menikmati! 🍽️</p>
      <p>— Tim RuangTemu</p>
    `;
    await sendEmail(user.email, subject, html);
    await recordNotification(user.id, "EMAIL", "REMINDER", { dinnerId: dinner.id });
  },
};
