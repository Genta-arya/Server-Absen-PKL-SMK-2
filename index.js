import express from "express";
import { createServer } from "http";
import cors from "cors";
import { AuthRoutes } from "./src/Routes/AuthRoutes.js";
import { PKLRoutes } from "./src/Routes/PKLRoutes.js";
import cron from "node-cron";
import { deleteAllPkl, updateStatusPKLCron } from "./src/Controller/PKLController.js";
import { Server as SocketIOServer } from "socket.io";
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
dotenv.config();

const app = express();
const PORT = process.env.PORT;
const httpServer = createServer(app);

// const transporter = nodemailer.createTransport({
//   service: "SMTP",
//   host: "mail.mgentaarya.my.id",
//   port: 465,
//   secure: true, // menggunakan SSL
//   auth: {
//     user: "admin@mgentaarya.my.id",
//     pass: "Genta@456", // Gantilah dengan password email Anda
//   },
// });

const transporter = nodemailer.createTransport({
  service: "SMTP",
  host: "mail.smkn2ketapang.sch.id",
  port: 465,
  secure: true, // menggunakan SSL

  auth: {
    user: "system-pkl@smkn2ketapang.sch.id",
    pass: "Genta@456", // Gantilah dengan password email Anda
  },
});

export const sendEmail = (to, subject, body) => {
  console.log(to);
  const htmlContent = fs.readFileSync(
    path.join(path.resolve(), "src", "Email", "index.html"),
    "utf-8"
  );

  const customizedContent = htmlContent
    .replace("{{subject}}", subject)
    .replace("{{pklname}}", body.pklname)
    .replace("{{creatorName}}", body.creatorName);

  const mailOptions = {
    from: '"No-Reply " <system-pkl@smkn2ketapang.sch.id>',
    to: to.join(","),
    subject: subject,
    html: customizedContent,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("Error sending email:", error);
    } else {
      console.log(`Email sent to: ${mailOptions.to}`);
      console.log(`Response: ${info.response}`);
    }
  });
};

export const sendNotificationEmail = (emailList, existingPkl) => {
  const subject = "Notifikasi";

  const pklname = `${existingPkl.name}`;
  const creatorName = `${existingPkl.creator.name}`;
  const body = {
    pklname,
    creatorName,
  };

  sendEmail(emailList, subject, body);
};

// const db = mysql.createConnection({
//   host: "amplangema.my.id",
//   port: 3306,
//   user: "afyungs2_siakel", // Ganti dengan username MySQL Anda
//   password: "Genta456", // Ganti dengan password MySQL Anda
//   database: "afyungs2_siakel", // Ganti dengan nama database Anda
// });

// db.connect((err) => {
//   if (err) {
//     console.error("Koneksi database gagal:", err);
//   } else {
//     console.log("Terhubung ke database.");
//   }
// });
// const BATCH_SIZE = 100;

// const processBatch = async (batch) => {
//   const hashedBatch = await Promise.all(
//     batch.map(async (row) => {
//       const hashedPassword = await bcrypt.hash(row.nim, 10);
//       return [uuidv4(), row.nim, row.name, hashedPassword, "user"];
//     })
//   );
//   return hashedBatch;
// };

// Fungsi untuk memeriksa dan membuat kelas jika belum ada
// const findOrCreateKelas = async (kelasNama) => {
//   // Cari kelas berdasarkan nama
//   let kelas = await prisma.kelas.findFirst({
//     where: {
//       nama: kelasNama,
//     },
//   });

//   // Jika kelas tidak ada, buat kelas baru
//   if (!kelas) {
//     kelas = await prisma.kelas.create({
//       data: {
//         nama: kelasNama,
//       },
//     });
//     console.log(`Kelas ${kelasNama} berhasil dibuat.`);
//   } else {
//     console.log(`Kelas ${kelasNama} sudah ada.`);
//   }

//   return kelas;
// };

// // Fungsi untuk mengimpor CSV dan menambahkan kelas
// const importCsvToDatabase = async (filePath) => {
//   const users = [];
//   const promises = [];

//   const stream = createReadStream(filePath).pipe(csv({ separator: ";" }));

//   for await (const row of stream) {
//     const userId = uuidv4();
//     const nim = row.nim;
//     const name = row.name;
//     const kelas = row.kelas;

//     // Cek apakah kelas sudah ada
//     const kelasData = await findOrCreateKelas(kelas);

//     // Hash password jika perlu
//     const hashedPassword = await bcrypt.hash(nim, 10);

//     // Buat user
//     const userData = {
//       id: userId,
//       nim: nim,
//       name: name,
//       password: hashedPassword,
//       role: "user",
//     };

//     // Tambahkan user ke array
//     users.push(userData);

//     // Simpan relasi antara user dan kelas
//     promises.push(
//       prisma.user.upsert({
//         where: { nim: nim }, // Upsert berdasarkan nim agar tidak duplikat
//         update: {},
//         create: userData,
//       }).then((user) => {
//         return prisma.kelas.update({
//           where: { id: kelasData.id },
//           data: {
//             users: {
//               connect: { id: user.id },
//             },
//           },
//         });
//       })
//     );
//   }

//   // Tunggu semua promise selesai
//   await Promise.all(promises);

//   console.log("CSV berhasil diimpor. Data telah ditambahkan.");
// };

// Import CSV

// const filePath = path.join(path.resolve(), "Public", "CSV", "Data.csv");
// if (fs.existsSync(filePath)) {
//   console.log("File CSV ditemukan. Memulai impor data...");
//   importCsvToDatabase(filePath);
// } else {
//   console.error("File CSV tidak ditemukan. Proses impor dibatalkan.");
// }

// cron.schedule("*/10 * * * * *", () => {
//   console.log("Sending email every 10 seconds...");
//   sendEmail(["mgentaarya@gmail.com"], "Test Email");
// });

// Middleware
app.use(express.json({ limit: "150mb" }));
app.use(express.urlencoded({ limit: "150mb", extended: true }));
const allowedOrigins = [
  "http://localhost:5173",
  "https://siabsen.apiservices.my.id",
  "https://sipkl.smkn2ketapang.sch.id",
];

export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
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
    optionsSuccessStatus: 200,
    credentials: true,
  })
);

// Cron Job 8 bulan sekali
cron.schedule("0 0 1 1,9 *", () => {
  deleteAllPkl();
  console.log("Cron job dijalankan setiap 8 bulan sekali");
});

// Cron Job Update Status absen

cron.schedule("0 * * * *", async () => {
  try {
    console.log("Menjalankan cron job updateStatusCron...");
    await updateStatusCron(); // Memanggil fungsi update status
    await updateStatusPKLCron();
  } catch (error) {
    console.error("Terjadi kesalahan saat menjalankan cron job:", error);
  }
});

// cron.schedule('* * * * *', async () => {
//   try {
//     console.log("Menjalankan cron job updateStatusCron...");
//     // Panggil fungsi pada 0 detik
//     await updateStatusCron();

//     // Panggil fungsi pada 20 detik
//     setTimeout(async () => await updateStatusCron(), 10000); // 20 detik

//     // Panggil fungsi pada 40 detik
//     setTimeout(async () => await updateStatusCron(), 20000); // 40 detik
//   } catch (error) {
//     console.error("Terjadi kesalahan saat menjalankan cron job:", error);
//   }
// });
// Endpoints
app.use("/api/auth", AuthRoutes);
app.use("/api/pkl", PKLRoutes);
app.use("/api/absensi", AbsensRoutes);
app.use("/api/report", LaporanRoutes);
app.use("/image", express.static("Public/Images/Profile"));

// Realtime notification
// io.on("connection", (socket) => {
//   // console.log("A user connected");
//   socket.on("joinRoom", (userId) => {
//     socket.join(userId);
//     console.log(`User dengan ID ${userId} bergabung ke room`);
//   });

//   socket.on("ping", (timestamp) => {
//     // Mengirimkan kembali waktu respons
//     console.log("Pong received:", timestamp);
//     socket.emit("pong", timestamp);
//   });

//   socket.on("disconnect", () => {
//     console.log("User disconnected");
//   });
// });
app.get("/api/connection", (req, res) => { 
  const timestamp = Date.now();
  res.json({ timestamp });
});

httpServer.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
