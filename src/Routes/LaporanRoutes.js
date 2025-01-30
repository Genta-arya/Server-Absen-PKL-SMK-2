import express from "express";

import { getLaporanByuser } from "../Controller/LaporanController.js";
import { middleware } from "../midleware/midleware.js";

export const LaporanRoutes = express.Router();

LaporanRoutes.get("/laporan/:id",middleware, getLaporanByuser);

