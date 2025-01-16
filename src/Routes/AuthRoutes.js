import express from "express";
import { checkLogin, getUserByRole, handleLogin, handleLogout, handleRegister, updatePassword } from "../Controller/AuthController.js";


export const AuthRoutes = express.Router();

AuthRoutes.post("/register", handleRegister);
AuthRoutes.post("/login", handleLogin);
AuthRoutes.post("/session", checkLogin);
AuthRoutes.post("/logout/:id", handleLogout);
AuthRoutes.post("/update/password/:id", updatePassword);
AuthRoutes.get("/user/:role", getUserByRole);