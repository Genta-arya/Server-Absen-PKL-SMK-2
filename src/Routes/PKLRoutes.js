import express from "express";
import { addSiswaToExistingPKL, createPKLWithAbsensi, deletePkl, EditPkl, getDataPklCreator, getSinglePkl, updateStatusPkl, } from "../Controller/PKLController.js";

export const PKLRoutes = express.Router();

PKLRoutes.post("/create", createPKLWithAbsensi);
PKLRoutes.get("/creator/:id", getDataPklCreator);
PKLRoutes.put("/add/siswa", addSiswaToExistingPKL);
PKLRoutes.get("/detail/:id", getSinglePkl);
PKLRoutes.put("/edit/:id", EditPkl);
PKLRoutes.put("/delete/:id", deletePkl);
PKLRoutes.put("/status/:id", updateStatusPkl);
