import express from "express";
import { addSiswaToExistingPKL, createPKLWithAbsensi, deletePkl, EditPkl, getDataPklCreator, getSinglePkl, updateStatusPkl, } from "../Controller/PKLController.js";
import { middleware } from "../midleware/midleware.js";

export const PKLRoutes = express.Router();


// pkl
PKLRoutes.post("/create",middleware, createPKLWithAbsensi);
PKLRoutes.get("/creator/:id",middleware, getDataPklCreator);
PKLRoutes.put("/add/siswa",middleware, addSiswaToExistingPKL);
PKLRoutes.get("/detail/:id",middleware, getSinglePkl);
PKLRoutes.put("/edit/:id",middleware, EditPkl);
PKLRoutes.put("/delete/:id",middleware, deletePkl);
PKLRoutes.put("/status/:id",middleware, updateStatusPkl);
