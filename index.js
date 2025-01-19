import express from "express";
import { createServer } from "http";
import cors from "cors";
import { AuthRoutes } from "./src/Routes/AuthRoutes.js";
import { PKLRoutes } from "./src/Routes/PKLRoutes.js";
import cron from "node-cron";
import { deleteAllPkl } from "./src/Controller/PKLController.js";
import { Server as SocketIOServer } from "socket.io";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT;
const httpServer = createServer(app);

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
