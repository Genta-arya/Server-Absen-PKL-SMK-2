import express from "express";
import { createServer } from "http";
import cors from "cors";
import { AuthRoutes } from "./src/Routes/AuthRoutes.js";
import { PKLRoutes } from "./src/Routes/PKLRoutes.js";
import cron from "node-cron";
import {
  deleteAllPkl,
  updateStatusPKLCron,
} from "./src/Controller/PKLController.js";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { AbsensRoutes } from "./src/Routes/AbsenRoutes.js";

import {
  updateStatusCron,
  updateSundayPray,
} from "./src/Controller/AbsenController.js";
import { LaporanRoutes } from "./src/Routes/LaporanRoutes.js";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import hpp from "hpp";
import mongoSanitize from "express-mongo-sanitize";

import { BeritaRoutes } from "./src/Routes/BeritaRoutes.js";
import logger, { setSocketIo } from "./src/Logging/logger.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT;
const httpServer = createServer(app);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://monitoring.smkn2ketapang.sch.id",
  "https://digital.smkn2ketapang.sch.id",
  "https://digital-tester.smkn2ketapang.sch.id",
];

app.use(cookieParser());
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
  },
  
  
});

// Hubungkan instance Socket.IO ke logger.js
setSocketIo(io);

// Saat ada client yang terhubung
io.on("connection", (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on("disconnect", () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// app.use(
//   helmet({
//     contentSecurityPolicy: {
//       directives: {
//         defaultSrc: ["'self'"],
//         scriptSrc: ["'self'", "'unsafe-inline'"],
//         objectSrc: ["'none'"],
//         upgradeInsecureRequests: [],
//       },
//     },
//     referrerPolicy: { policy: "no-referrer" },
//   })
// );
// app.use(
//   hpp({
//     checkBody: true,
//     checkQuery: true,
//     checkBodyOnlyForContentTypes: [
//       "application/json",
//       "application/x-www-form-urlencoded",
//     ],
//     whitelist: ["Content-Type", "Authorization"],
//   })
// );
app.use(
  mongoSanitize({
    replaceWith: "_",
  })
);
// app.set("trust proxy", 1);

// const limiter = rateLimit({
//   windowMs: 10 * 60 * 1000,
//   max: 500,
//   message: "Terlalu banyak permintaan, coba lagi nanti",
//   statusCode: 403,
// });

// app.use(limiter);
app.use(express.json({ limit: "150mb" }));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const userAgent = req.headers["user-agent"];

  if (
    allowedOrigins.includes(origin) ||
    userAgent.includes("vercel-cron/1.0")
  ) {
    next();
  } else {
    res.status(403).json({
      message: "Tidak diizinkan untuk mengakses API ini",
      status: 403,
    });
  }
});

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", " X-CSRF-Token"],
    credentials: true,
  })
);

// Cron Job 8 bulan sekali
// cron.schedule("0 0 1 1,9 *", () => {
//   deleteAllPkl();
//   logger.info("Cron job dijalankan setiap 8 bulan sekali");
// });

cron.schedule("*/1 * * * *", async () => {
  try {
    logger.info("Menjalankan cron job updateStatusCron setiap 60 detik...");
    await updateStatusCron();
    await updateStatusPKLCron();
  } catch (error) {
    logger.error("Terjadi kesalahan saat menjalankan cron job:", error);
  }
});

cron.schedule(
  "0 0,5,17 * * *",
  async () => {
    await updateSundayPray();
  },
  {
    scheduled: true,
    timezone: "Asia/Jakarta",
  }
);

await updateSundayPray();
// await updateStatusCron();

app.get("/api/cron", async (req, res) => {
  try {
    logger.info("Menjalankan cron job di Vercel...");
    await updateStatusCron();
    await updateStatusPKLCron();
    res.json({ message: "Cron job berhasil dijalankan" });
  } catch (error) {
    logger.error("Error menjalankan cron job:", error);
    res.status(500).json({ error: "Cron job gagal" });
  }
});

// Endpoints
app.use("/api/auth", AuthRoutes);
app.use("/api/pkl", PKLRoutes);
app.use("/api/absensi", AbsensRoutes);
app.use("/api/report", LaporanRoutes);
app.use("/api/berita", BeritaRoutes);
app.use("/image", express.static("Public/Images/Profile"));
app.get("/api/get-token", (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(403).json({ message: "Silahkan login terlebih dahulu" });
  }
  res.json({ token });
});

app.get("/api/connection", (req, res) => {
  const timestamp = Date.now();
  res.json({ timestamp });
});

httpServer.listen(PORT, () => {
  logger.info(`Server berjalan di http://localhost:${PORT}`);
});
