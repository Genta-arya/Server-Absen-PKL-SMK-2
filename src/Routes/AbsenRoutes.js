import express from "express";
import { updateAbsensi } from "../Controller/AbsenController.js";

export const AbsensRoutes = express.Router();

AbsensRoutes.post("/hadir/:id", updateAbsensi);