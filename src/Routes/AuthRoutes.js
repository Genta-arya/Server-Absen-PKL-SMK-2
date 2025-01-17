import express from "express";
import {
  checkLogin,
  getSingleUser,
  getUserByRole,
  handleLogin,
  handleLogout,
  handleRegister,
  updateDataUser,
  updateFotoProfile,
  updatePassword,
  updatePasswordUser,
} from "../Controller/AuthController.js";
import { uploadImage } from "../Config/Multer.js";

export const AuthRoutes = express.Router();

// authentikasi
AuthRoutes.post("/register", handleRegister);
AuthRoutes.post("/login", handleLogin);
AuthRoutes.post("/session", checkLogin);
AuthRoutes.post("/logout/:id", handleLogout);

// update profil
AuthRoutes.post("/update/password/:id", updatePassword);
AuthRoutes.post("/update/user/password/:id", updatePasswordUser);
AuthRoutes.post("/update/profile/:id", uploadImage, updateFotoProfile);
AuthRoutes.post("/update/user/:id", updateDataUser);

// data user
AuthRoutes.get("/user/:role", getUserByRole);
AuthRoutes.get("/detail/user/:id", getSingleUser);
