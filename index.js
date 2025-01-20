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
dotenv.config();

const app = express();
const PORT = process.env.PORT;
const httpServer = createServer(app);

const transporter = nodemailer.createTransport({
  service: 'SMTP', 
  host: 'mail.mgentaarya.my.id',
  port: 465,
  secure: true, // menggunakan SSL
  auth: {
    user: 'admin@mgentaarya.my.id',
    pass: 'Genta@456',  // Gantilah dengan password email Anda
  },
});

export const sendEmail = (to, subject, text) => {
  const mailOptions = {
    from: 'admin@mgentaarya.my.id',
    to: to.join(','), // Menggabungkan array alamat email menjadi string, dipisahkan oleh koma
    subject: subject,
    text: text,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error sending email:', error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
};

// Menjalankan cronjob setiap jam
// cron.schedule('*/10 * * * * *', () => {
//   console.log('Sending email every 10 seconds...');
//   sendEmail();
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
app.use("/image", express.static("Public/Images/Profile"));

// Realtime notification
io.on("connection", (socket) => {
 

  socket.on("joinRoom", (userId) => {
    socket.join(userId);
    console.log(`User dengan ID ${userId} bergabung ke room`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
