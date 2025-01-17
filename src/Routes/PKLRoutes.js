import express from "express";
import { createPKLWithAbsensi, getDataPklCreator, getSinglePkl } from "../Controller/PKLController.js";

export const PKLRoutes = express.Router();

PKLRoutes.post("/create", createPKLWithAbsensi);
PKLRoutes.get("/creator/:id", getDataPklCreator);
PKLRoutes.get("/detail/:id", getSinglePkl);