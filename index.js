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
import csurf from "csurf";

import dotenv from "dotenv";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { createReadStream } from "fs";
import { AbsensRoutes } from "./src/Routes/AbsenRoutes.js";
import csv from "csv-parser";
import mysql from "mysql2";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "./src/Config/Prisma.js";
import { updateStatusCron } from "./src/Controller/AbsenController.js";
import { LaporanRoutes } from "./src/Routes/LaporanRoutes.js";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import hpp from "hpp";
import mongoSanitize from "express-mongo-sanitize";
import { csrfProtection } from "./src/Config/Cookie.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT;
const httpServer = createServer(app);

app.use(cookieParser());

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    referrerPolicy: { policy: "no-referrer" },
  })
);
app.use(
  hpp({
    checkBody: true,
    checkQuery: true,
    checkBodyOnlyForContentTypes: [
      "application/json",
      "application/x-www-form-urlencoded",
    ],
    whitelist: ["Content-Type", "Authorization"],
  })
);
app.use(
  mongoSanitize({
    replaceWith: "_",
  })
);
app.set("trust proxy", 1);

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 500,
  message: "Terlalu banyak permintaan, coba lagi nanti",
  statusCode: 403,
});


app.use(limiter);
app.use(express.json({ limit: "150mb" }));

const allowedOrigins = [
  "http://localhost:5173",
  "https://digital.smkn2ketapang.sch.id",
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const userAgent = req.headers["user-agent"];

 
  if (allowedOrigins.includes(origin) || userAgent.includes("vercel-cron/1.0")) {
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
//   console.log("Cron job dijalankan setiap 8 bulan sekali");
// });



cron.schedule("*/30 * * * * *", async () => {
  try {
    console.log("Menjalankan cron job updateStatusCron setiap 30 detik...");
    await updateStatusCron();
    await updateStatusPKLCron();
  } catch (error) {
    console.error("Terjadi kesalahan saat menjalankan cron job:", error);
  }
});



app.get("/api/cron", async (req, res) => {
  try {
    console.log("Menjalankan cron job di Vercel...");
    await updateStatusCron();
    await updateStatusPKLCron();
    res.json({ message: "Cron job berhasil dijalankan" });
  } catch (error) {
    console.error("Error menjalankan cron job:", error);
    res.status(500).json({ error: "Cron job gagal" });
  }
});

// Endpoints
app.use("/api/auth", AuthRoutes);
app.use("/api/pkl", PKLRoutes);
app.use("/api/absensi", AbsensRoutes);
app.use("/api/report", LaporanRoutes);
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
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
