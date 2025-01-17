
import express from "express";
import { createServer } from "http";
import cors from "cors";
import { AuthRoutes } from "./src/Routes/AuthRoutes.js";
import { PKLRoutes } from "./src/Routes/PKLRoutes.js";


const app = express();
const PORT = 8080;
const httpServer = createServer(app);
app.use(express.json());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Endpoints
app.use("/api/auth",AuthRoutes)
app.use("/api/pkl", PKLRoutes);
app.use("/image", express.static("Public/Images/Profile"));


httpServer.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
  });
  