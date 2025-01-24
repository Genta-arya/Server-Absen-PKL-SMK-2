import express from "express";
import { absenPulang, getDataAbsen, updateAbsensi } from "../Controller/AbsenController.js";

export const AbsensRoutes = express.Router();

AbsensRoutes.post("/hadir/:id", updateAbsensi);
AbsensRoutes.post("/pulang/:id", absenPulang);
AbsensRoutes.get("/detail/:id", getDataAbsen);