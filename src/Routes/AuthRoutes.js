import express from "express";
import {
  checkLogin,
  createKelas,
  deleteKelas,
  getKelas,
  getSingleUser,
  getUserByRole,
  handleLogin,
  handleLogout,
  handleRegister,
  updateDataUser,
  updateDataUserAdmin,
  updateFotoProfile,
  updateKelas,
  updatePassword,
  updatePasswordUser,
  updateSingleProfile,
} from "../Controller/AuthController.js";

import { middleware } from "../midleware/midleware.js";

export const AuthRoutes = express.Router();

// authentikasi
AuthRoutes.post("/register", handleRegister);
AuthRoutes.post("/login", handleLogin);
AuthRoutes.post("/session",middleware,checkLogin);
AuthRoutes.post("/logout/:id",middleware, handleLogout);

// update profil
AuthRoutes.post("/update/password/:id",middleware, updatePassword);
AuthRoutes.post("/update/user/password/:id",middleware, updatePasswordUser);

// AuthRoutes.post("/update/profile/:id", uploadImage, updateFotoProfile);
AuthRoutes.post("/update/profile/:id",middleware, updateFotoProfile);
AuthRoutes.post("/update/user/:id",middleware, updateDataUser);
AuthRoutes.post("/update/users/:id",middleware, updateDataUserAdmin);

// data user
AuthRoutes.get("/user/:role",middleware, getUserByRole);
AuthRoutes.get("/detail/user/:id",middleware, getSingleUser);
AuthRoutes.put("/update/single/user/:id",middleware, updateSingleProfile);
// data Kelas
AuthRoutes.get("/kelas",middleware, getKelas);
AuthRoutes.post("/create/kelas",middleware, createKelas);
AuthRoutes.put("/kelas/:id",middleware, updateKelas);
AuthRoutes.delete("/kelas/:id",middleware, deleteKelas);
