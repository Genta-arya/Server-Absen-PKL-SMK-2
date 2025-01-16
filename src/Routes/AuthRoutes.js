import express from "express";
import {
  checkLogin,
  getSingleUser,
  getUserByRole,
  handleLogin,
  handleLogout,
  handleRegister,
  updateFotoProfile,
  updatePassword,
  updatePasswordUser,
} from "../Controller/AuthController.js";
import { uploadImage } from "../Config/Multer.js";

export const AuthRoutes = express.Router();

AuthRoutes.post("/register", handleRegister);
AuthRoutes.post("/login", handleLogin);
AuthRoutes.post("/session", checkLogin);
AuthRoutes.post("/logout/:id", handleLogout);
AuthRoutes.post("/update/password/:id", updatePassword);
AuthRoutes.post("/update/user/password/:id", updatePasswordUser);
AuthRoutes.get("/user/:role", getUserByRole);
AuthRoutes.post("/update/profile/:id", uploadImage, updateFotoProfile);
AuthRoutes.get("/detail/user/:id", getSingleUser);
