import express from "express";

import {
    deleteSingleImage,
  getLaporanByuser,
  getLaporanMingguanByuser,
  getSingleLaporan,
  getSingleLaporanMingguan,
  uploadLaporanHarian,
} from "../Controller/LaporanController.js";
import { middleware } from "../midleware/midleware.js";

export const LaporanRoutes = express.Router();

LaporanRoutes.get("/laporan/:id", middleware, getLaporanByuser);
LaporanRoutes.get(
  "/laporan/mingguan/:id",
  middleware,
  getLaporanMingguanByuser
);
LaporanRoutes.get("/data/laporan/:id", middleware, getSingleLaporan);
LaporanRoutes.get(
  "/data/laporan/mingguan/:id",
  middleware,
  getSingleLaporanMingguan
);
LaporanRoutes.post("/laporan/harian/:id", middleware, uploadLaporanHarian);
LaporanRoutes.delete("/delete/image/:id", middleware, deleteSingleImage);