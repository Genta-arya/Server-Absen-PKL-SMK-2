import express from "express";
import { createPKLWithAbsensi } from "../Controller/PKLController.js";

export const PKLRoutes = express.Router();

PKLRoutes.post("/create", createPKLWithAbsensi);