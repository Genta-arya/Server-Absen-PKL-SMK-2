import express from "express";
import { absenPulang, getDataAbsen, updateAbsensi } from "../Controller/AbsenController.js";
import { middleware } from "../midleware/midleware.js";

export const AbsensRoutes = express.Router();

AbsensRoutes.post("/hadir/:id",middleware, updateAbsensi);
AbsensRoutes.post("/pulang/:id",middleware, absenPulang);
AbsensRoutes.get("/detail/:id",middleware, getDataAbsen);