import express from "express";
import { absenPulang, updateAbsensi } from "../Controller/AbsenController.js";

export const AbsensRoutes = express.Router();

AbsensRoutes.post("/hadir/:id", updateAbsensi);
AbsensRoutes.post("/pulang/:id", absenPulang);