import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import path from "path";
import { logger } from "./lib/logger";
import { wrapAsyncRouter } from "./lib/asyncRouter";
import { errorHandler } from "./middlewares/errorHandler";
import { startCronJobs } from "./cron/jobs";

import authRouter from "./routes/auth";
import usersRouter from "./routes/users";
import citiesRouter from "./routes/cities";
import dinnersRouter from "./routes/dinners";
import bookingsRouter from "./routes/bookings";
import paymentsRouter from "./routes/payments";
import matchingRouter from "./routes/matching";
import eventsRouter from "./routes/events";
import notificationsRouter from "./routes/notifications";
import testimonialsRouter from "./routes/testimonials";
import interestsRouter from "./routes/interests";
import adminRouter from "./routes/admin";

const app = express();
const PORT = parseInt(process.env.PORT || "3200");
const HOST = process.env.HOST || "127.0.0.1";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3201";

// Security
app.use(helmet());
app.use(cors({
  origin: [FRONTEND_URL, "http://127.0.0.1:3201", "http://localhost:3000", "https://ruangtemu.biz.id"],
  credentials: true,
}));
app.use(compression());

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
app.use(limiter);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Static uploads
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
app.use("/uploads", express.static(path.resolve(UPLOAD_DIR)));

// Routes
app.use("/auth", authLimiter, wrapAsyncRouter(authRouter));
app.use("/users", wrapAsyncRouter(usersRouter));
app.use("/cities", wrapAsyncRouter(citiesRouter));
app.use("/dinners", wrapAsyncRouter(dinnersRouter));
app.use("/bookings", wrapAsyncRouter(bookingsRouter));
app.use("/payments", wrapAsyncRouter(paymentsRouter));
app.use("/matching", wrapAsyncRouter(matchingRouter));
app.use("/events", wrapAsyncRouter(eventsRouter));
app.use("/notifications", wrapAsyncRouter(notificationsRouter));
app.use("/testimonials", wrapAsyncRouter(testimonialsRouter));
app.use("/interests", wrapAsyncRouter(interestsRouter));
app.use("/admin", wrapAsyncRouter(adminRouter));

app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

// Error handler
app.use(errorHandler);

const server = app.listen(PORT, HOST, () => {
  logger.info(`🚀 API server running at http://${HOST}:${PORT}`);
  startCronJobs();
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    logger.error(`Port ${HOST}:${PORT} sudah dipakai. Matikan proses lama atau ubah PORT di .env.`);
    process.exit(1);
  }

  logger.error({ err }, "Server failed to start");
  process.exit(1);
});

export default app;
