import express from "express";
import { middleware } from "../midleware/midleware.js";
import {
  createBerita,
  deleteBerita,
  EditBerita,
  getBerita,
  updateStatusBerita,
} from "../Controller/BeritaController.js";
export const BeritaRoutes = express.Router();

BeritaRoutes.post("/create", middleware, createBerita);
BeritaRoutes.get("/list", middleware, getBerita);
BeritaRoutes.put("/update/:id", middleware, EditBerita);
BeritaRoutes.patch("/update/status/:id", middleware, updateStatusBerita);
BeritaRoutes.delete("/delete/:id", middleware, deleteBerita);
