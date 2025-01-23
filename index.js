import express from "express";
import { createServer } from "http";
import cors from "cors";
import { AuthRoutes } from "./src/Routes/AuthRoutes.js";
import { PKLRoutes } from "./src/Routes/PKLRoutes.js";
import cron from "node-cron";
import { deleteAllPkl } from "./src/Controller/PKLController.js";
import { Server as SocketIOServer } from "socket.io";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { AbsensRoutes } from "./src/Routes/AbsenRoutes.js";
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

// cron.schedule("*/10 * * * * *", () => {
//   console.log("Sending email every 10 seconds...");
//   sendEmail(["mgentaarya@gmail.com"], "Test Email");
// });

export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Cron Job
cron.schedule("0 0 1 * *", () => {
  deleteAllPkl();
  console.log("Cron job dijalankan");
});

// Endpoints
app.use("/api/auth", AuthRoutes);
app.use("/api/pkl", PKLRoutes);
app.use("/api/absensi", AbsensRoutes);
app.use("/image", express.static("Public/Images/Profile"));

// Realtime notification
io.on("connection", (socket) => {
  socket.on("joinRoom", (userId) => {
    socket.join(userId);
    console.log(`User dengan ID ${userId} bergabung ke room`);
  });

  socket.on("ping", (timestamp) => {
    // Mengirimkan kembali waktu respons
    socket.emit("pong", timestamp);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
