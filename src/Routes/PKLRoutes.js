import express from "express";
import {
  addSiswaToExistingPKL,
  createPKLWithAbsensi,
  deletePkl,
  EditPkl,
  getAllPkl,
  getAnggotaPkl,
  getDataPklCreator,
  getSinglePkl,
  removeSiswaFromPkl,
  updateStatusPkl,
} from "../Controller/PKLController.js";
import { middleware } from "../midleware/midleware.js";

export const PKLRoutes = express.Router();

// pkl
PKLRoutes.post("/create", middleware, createPKLWithAbsensi);
PKLRoutes.get("/creator/:id", middleware, getDataPklCreator);
PKLRoutes.put("/add/siswa", middleware, addSiswaToExistingPKL);
PKLRoutes.post("/daftar/pkl", middleware, getAllPkl);
PKLRoutes.get("/detail/:id", middleware, getSinglePkl);
PKLRoutes.put("/edit/:id", middleware, EditPkl);
PKLRoutes.put("/delete/:id", middleware, deletePkl);
PKLRoutes.put("/status/:id", middleware, updateStatusPkl);
PKLRoutes.put("/remove/siswa/:id", middleware, removeSiswaFromPkl);
PKLRoutes.get("/anggota/:id", middleware, getAnggotaPkl);
