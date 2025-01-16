import { prisma } from "../Config/Prisma.js";
import { createToken, JWT_SECRET } from "../Library/CreateToken.js";
import { sendError, sendResponse } from "../Utils/Response.js";
import { isValidRole } from "../Utils/Role.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const handleRegister = async (req, res) => {
  const { nim, password, role , name } = req.body;
  if (!nim) {
    return sendResponse(res, 400, "Mohon lengkapi nim");
  }

  if (!name) {
    return sendResponse(res, 400, "Mohon lengkapi nama");
  }

  if (nim.length >= 20) {
    return sendResponse(res, 400, "NIM tidak boleh lebih dari 20 karakter");
  }

  if (!password) {
    return sendResponse(res, 400, "Mohon lengkapi password");
  }

  if (!role) {
    return sendResponse(
      res,
      400,
      "Role tidak valid. Pilih antara pembimbing , user dan admin."
    );
  }
  const parseNim = parseInt(nim);

  const user = await prisma.user.findUnique({
    where: { nim: parseNim },
  });

  if (user) {
    return sendResponse(res, 409, "NIM sudah terdaftar");
  }

  if (!isValidRole(role)) {
    return sendResponse(
      res,
      400,
      "Role tidak valid. Pilih antara MHS atau DOSEN."
    );
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        nim: parseNim,
        password: hashedPassword,
        name,
        role,
        avatar: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
      },
    });

    return sendResponse(res, 201, "Pendaftaran berhasil");
  } catch (error) {
    sendError(res, error);
  }
};

export const handleLogin = async (req, res) => {
  const { nim, password } = req.body;

  if (!nim) {
    return sendResponse(res, 400, "Mohon lengkapi nim");
  }

  if (!password) {
    return sendResponse(res, 400, "Mohon lengkapi password");
  }

  try {
    const user = await prisma.user.findUnique({
      where: { nim },
    });

    if (!user) {
      return sendResponse(res, 404, "NIM tidak ditemukan");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return sendResponse(res, 401, "NIM atau password salah");
    }

    const token = createToken({ nim: user.nim, role: user.role });

    if (user.token) {
      await prisma.user.update({
        where: { id: user.id },
        data: { status_login: true },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { token, status_login: true },
      });
    }

    const getUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        nim: true,
        name: true,
        email: true,
        status_login: true,
        token: true,
        avatar: true,
        role: true,
      },
    });

    return sendResponse(res, 200, "Login berhasil", getUser);
  } catch (error) {
    sendError(res, error);
  }
};

export const checkLogin = async (req, res) => {
  const { token } = req.body;

  if (!token || typeof token !== "string" || token.trim() === "") {
    return sendResponse(res, 400, "Silahkan Login terlebih dahulu");
  }

  if (token.split(".").length !== 3) {
    return sendResponse(res, 400, "Silahkan Login terlebih dahulu");
  }

  try {
    jwt.verify(token, JWT_SECRET);
    const findUser = await prisma.user.findFirst({
      where: { token },
      select: {
        id: true,
        nim: true,
        name: true,
        email: true,
        status_login: true,
        token: true,
        avatar: true,
        role: true,
      },
    });

    if (!findUser) {
      return sendResponse(res, 409, "User tidak ditemukan");
    }

    return sendResponse(res, 200, "User ditemukan", findUser);
  } catch (error) {
    const findUser = await prisma.user.findFirst({
      where: { token },
      select: {
        id: true,
      },
    });
    if (!findUser) {
      return sendResponse(res, 409, "User tidak ditemukan");
    }
    if (error instanceof jwt.TokenExpiredError) {
      await prisma.user.update({
        where: { id: findUser.id },
        data: { status_login: false, token: null },
      });
      return sendResponse(res, 409, "Token telah kedaluwarsa");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      await prisma.user.update({
        where: { id: findUser.id },
        data: { status_login: false, token: null },
      });
      return sendResponse(res, 409, "Token tidak valid atau format salah");
    }
    sendError(res, error);
  }
};

export const handleLogout = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return sendResponse(res, 400, "ID user tidak ditemukan");
  }
  const checkUser = await prisma.user.findUnique({
    where: { id },
  });
  if (!checkUser) {
    return sendResponse(res, 404, "User tidak ditemukan");
  }
  try {
    const resposen = await prisma.user.update({
      where: { id },
      data: { status_login: false, token: null },
    });
    return sendResponse(res, 200, "Logout berhasil", resposen);
  } catch (error) {
    sendError(res, error);
  }
};

export const updatePassword = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  if (!id) {
    return sendResponse(res, 400, "Invalid request");
  }

  try {
    const exitsUser = await prisma.user.findUnique({
      where: { id },
    });
    if (!exitsUser) {
      return sendResponse(res, 404, "User tidak ditemukan");
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const resposen = await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
    return sendResponse(res, 200, "Password berhasil diubah", resposen);
  } catch (error) {
    sendError(res, error);
  }
};

export const getUserByRole = async (req, res) => {
  const { role } = req.params;
  if (!role) {
    return sendResponse(res, 400, "Invalid request");
  }
  try {
    const exitsUser = await prisma.user.findMany({
      where: { role },
      select: {
        id : true,
        name: true,
        email: true,
        role: true,
        nim: true,
        avatar: true
        
      }
    });
    if (!exitsUser) {
      return sendResponse(res, 404, "User tidak ditemukan");
    }
    return sendResponse(res, 200, "User ditemukan", exitsUser);
  } catch (error) {
    sendError(res, error);
  }
};
