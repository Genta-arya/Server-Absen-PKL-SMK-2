import {
  getTimeInJakarta,
  image_url,
  newDateIndonesia,
} from "../Config/Constans.js";
import { prisma } from "../Config/Prisma.js";
import { createToken, JWT_SECRET } from "../Library/CreateToken.js";
import { sendError, sendResponse } from "../Utils/Response.js";
import { isValidRole } from "../Utils/Role.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { CreateCookie } from "../Config/Cookie.js";
import logger from "../Logging/logger.js";

export const handleRegister = async (req, res) => {
  const { nim, password, role, name } = req.body;
  if (!nim) {
    return sendResponse(res, 400, "Mohon lengkapi nim", nim);
  }

  if (!name) {
    return sendResponse(res, 400, "Mohon lengkapi nama", nim);
  }

  if (nim.length >= 20) {
    return sendResponse(
      res,
      400,
      "NIM tidak boleh lebih dari 20 karakter",
      nim
    );
  }

  if (!password) {
    return sendResponse(res, 400, "Mohon lengkapi password", nim);
  }

  if (!role) {
    return sendResponse(
      res,
      400,
      "Role tidak valid. Pilih antara pembimbing , user dan admin.",
      nim
    );
  }

  const user = await prisma.user.findUnique({
    where: { nim: nim },
  });

  if (user) {
    return sendResponse(res, 409, "NIM sudah terdaftar", nim);
  }

  if (!isValidRole(role)) {
    return sendResponse(
      res,
      400,
      "Role tidak valid. Pilih antara MHS atau DOSEN.",
      nim
    );
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        nim: nim,
        password: hashedPassword,
        name,
        role,
        avatar: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
      },
    });

    return sendResponse(res, 201, "Pendaftaran berhasil", nim);
  } catch (error) {
    sendError(res, error);
  }
};

export const handleLogin = async (req, res) => {
  const { nim, password } = req.body;

  if (!nim) {
    return sendResponse(res, 400, "Mohon lengkapi nim", nim);
  }

  if (!password) {
    return sendResponse(res, 400, "Mohon lengkapi password", nim);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { nim },
    });

    if (!user) {
      return sendResponse(res, 400, "NIM tidak ditemukan", nim);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return sendResponse(res, 400, "NIM atau password salah", nim);
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

    CreateCookie(res, getUser.token);

    return sendResponse(res, 200, "Login berhasil", getUser.id, getUser);
  } catch (error) {
    sendError(res, error);
  }
};

// export const checkLogin = async (req, res) => {
// };

export const checkLogin = async (req, res) => {
  const token = req.body.token;

  if (!token || typeof token !== "string" || token.trim() === "") {
    return sendResponse(res, 409, "Silahkan Login terlebih dahulu");
  }

  if (token.split(".").length !== 3) {
    return sendResponse(res, 409, "Silahkan Login terlebih dahulu");
  }

  try {
    const getID_PKL = await prisma.user.findFirst({
      where: { token },

      select: {
        Pkl: {
          select: {
            id: true,
          },
        },
        id: true,
      },
    });

    const findUser = await prisma.user.findFirst({
      where: { token },
      select: {
        id: true,
        nim: true,
        name: true,
        email: true,
        noHp: true,
        status_login: true,
        token: true,
        avatar: true,
        role: true,
        Kelas: {
          select: {
            id: true,
            nama: true,
          },
        },
        Pkl: {
          where: {
            isDelete: false,
          },

          include: {
            absensi: {
              where: {
                user_id: getID_PKL.id,
              },
              include: {
                shift: {
                  select: {
                    id: true,
                    name: true,
                    jamMasuk: true,
                    jamPulang: true,
                  },
                },
              },
              orderBy: {
                tanggal: "asc",
              },
            },

            creator: {
              select: {
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });
    jwt.verify(token, JWT_SECRET);
    // await getTimeInJakarta()
    const result = await getTimeInJakarta();

    if (!result) {
      logger.error("❌ Tidak bisa mendapatkan waktu Jakarta." , getID_PKL.id);
      return;
    }

    const { formattedHour, newDateIndonesia } = result;

    // Coba parse menggunakan Date biasa
    const dateIndonesia = new Date(newDateIndonesia);

    // Validasi apakah Date berhasil dibuat
    if (isNaN(dateIndonesia.getTime())) {
      logger.error(
        "❌ Invalid Date setelah konversi dari newDateIndonesia:",
        newDateIndonesia , getID_PKL.id
      );
      return;
    }

    const jakartaOffset = 7 * 60 * 60 * 1000;
    const adjustedDate = new Date(dateIndonesia.getTime() + jakartaOffset);

    const isoDateIndonesia = adjustedDate.toISOString().split("T")[0];

    findUser.DateIndonesia = newDateIndonesia;
    findUser.tanggal = isoDateIndonesia;

    if (!findUser) {
      return sendResponse(res, 409, "Silahkan login terlebih dahulu" , getID_PKL.id);
    }

    CreateCookie(res, token);

    return sendResponse(res, 200, "User ditemukan", findUser.id, findUser);
  } catch (error) {
    const findUsers = await prisma.user.findFirst({
      where: { token },
      select: {
        id: true,
      },
    });
    if (!findUsers) {
      return sendResponse(res, 409, "Silahkan login terlebih dahulu" );
    }
    if (error instanceof jwt.TokenExpiredError) {
      await prisma.user.update({
        where: { id: findUsers.id },
        data: { status_login: false, token: null },
      });
      return sendResponse(res, 409, "Token telah kedaluwarsa");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      await prisma.user.update({
        where: { id: findUsers.id },
        data: { status_login: false, token: null },
      });
      return sendResponse(res, 409, "Token tidak valid atau format salah");
    }
    return sendError(res, error);
  }
};

export const handleLogout = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return sendResponse(res, 400, "ID user tidak ditemukan" , id);
  }
  const checkUser = await prisma.user.findUnique({
    where: { id },
  });
  if (!checkUser) {
    return sendResponse(res, 404, "User tidak ditemukan" ,id);
  }
  try {
    const resposen = await prisma.user.update({
      where: { id },
      data: { status_login: false, token: null },
    });

    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });
    return sendResponse(res, 200, "Logout berhasil", id, resposen);
  } catch (error) {
    sendError(res, error);
  }
};

export const updatePassword = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  if (!id) {
    return sendResponse(res, 400, "Invalid request" ,id);
  }

  try {
    const exitsUser = await prisma.user.findUnique({
      where: { id },
    });
    if (!exitsUser) {
      return sendResponse(res, 404, "User tidak ditemukan" , id);
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const resposen = await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
    return sendResponse(res, 200, "Password berhasil diubah", id, resposen);
  } catch (error) {
    sendError(res, error);
  }
};

export const getUserByRole = async (req, res) => {
  const { role } = req.params;
  if (!role) {
    return sendResponse(res, 400, "Invalid request" , role);
  }
  try {
    const exitsUser = await prisma.user.findMany({
      where: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        nim: true,
        avatar: true,
        Pkl: {
          where: {
            isDelete: false,
          },
        },
        Kelas: {
          select: {
            id: true,
            nama: true,
          },
        },
      },
    });
    // if (!exitsUser) {
    //   return sendResponse(res, 404, "User tidak ditemukan");
    // }
    return sendResponse(res, 200, "User profil berhasil ditemukan", role, exitsUser);
  } catch (error) {
    sendError(res, error);
  }
};

export const updatePasswordUser = async (req, res) => {
  const { id } = req.params;
  const { password, new_password } = req.body;

  if (!id || !password || !new_password) {
    return sendResponse(res, 400, "Invalid request" , id);
  }

  try {
    const exitsUser = await prisma.user.findUnique({
      where: { id },
    });
    if (!exitsUser) {
      return sendResponse(res, 404, "User tidak ditemukan" , id);
    }

    const isMatch = await bcrypt.compare(password, exitsUser.password);
    if (!isMatch) {
      return sendResponse(res, 400, "Password lama salah , mohon cek kembali" , id);
    }

    if (password === new_password) {
      return sendResponse(
        res,
        400,
        "Password baru tidak boleh sama dengan password lama",
        id
      );
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
    return sendResponse(res, 200, "Password berhasil diubah" , id);
  } catch (error) {
    sendError(res, error);
  }
};

// export const updateFotoProfile = async (req, res) => {
//   const { id } = req.params;
//   const file = req.file;

//   if (!file) {
//     return sendResponse(res, 400, "File tidak ditemukan dalam permintaan.");
//   }

//   if (!id) {
//     return sendResponse(res, 400, "ID pengguna tidak valid.");
//   }

//   try {
//     const exitsUser = await prisma.user.findUnique({
//       where: { id },
//     });

//     if (!exitsUser) {
//       return sendResponse(res, 404, "User tidak ditemukan.");
//     }

//     const oldImagePath = exitsUser.avatar
//       ? path.join(
//           path.resolve(),
//           "Public/Images/Profile",
//           exitsUser.avatar.split("/").pop()
//         )
//       : null;

//     if (oldImagePath && fs.existsSync(oldImagePath)) {
//       fs.unlinkSync(oldImagePath);
//     }
//     let url_image = "";
//     if (process.env.NODE_ENV === "DEV") {
//       url_image = `${image_url}/${file.filename}`;
//     } else {
//       url_image = `${process.env.IMAGE_URL}/${file.filename}`;
//     }

//     const response = await prisma.user.update({
//       where: { id },
//       data: { avatar: url_image },
//     });

//     return sendResponse(res, 200, "Foto berhasil diubah.", response.avatar);
//   } catch (error) {
//     if (
//       file &&
//       fs.existsSync(
//         path.join(path.resolve(), "Public/Images/Profile", file.filename)
//       )
//     ) {
//       fs.unlinkSync(
//         path.join(path.resolve(), "Public/Images/Profile", file.filename)
//       );
//     }

//     sendError(res, error);
//   }
// };

export const updateFotoProfile = async (req, res) => {
  const { id } = req.params;
  const { image_url } = req.body;

  if (!image_url) {
    return sendResponse(
      res,
      400,
      "URL gambar tidak ditemukan dalam permintaan.",
      id
    );
  }
  if (!id) {
    return sendResponse(res, 400, "ID pengguna tidak valid." , id);
  }

  try {
    const exitsUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!exitsUser) {
      return sendResponse(res, 404, "User tidak ditemukan." , id);
    }

    const response = await prisma.user.update({
      where: { id },
      data: { avatar: image_url },
    });

    return sendResponse(res, 200, "Foto berhasil diubah.", response.avatar , id);
  } catch (error) {
    sendError(res, error);
  }
};

export const getSingleUser = async (req, res) => {
  const { id } = req.params;

  // Validasi ID
  if (!id) {
    return sendResponse(res, 400, "Invalid request" , id);
  }

  try {
    const exitsUser = await prisma.user.findFirst({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        nim: true,
        avatar: true,
        Pkl: {
          where: {
            isDelete: false,
          },
          select: {
            id: true,
            name: true,
            alamat: true,
            creatorId: true,
            tanggal_mulai: true,
            tanggal_selesai: true,
            isDelete: true,
            status: true,
            createdAt: true,
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                role: true,
              },
            },
            absensi: {
              where: {
                user_id: id,
                isDelete: null,
              },
              include: {
                shift: {
                  select: {
                    id: true,
                    name: true,
                    jamMasuk: true,
                    jamPulang: true,
                  },
                },
              },
              orderBy: {
                tanggal: "asc",
              },
            },
          },
        },
      },
    });

    // if (!exitsUser) {
    //   return sendResponse(res, 404, "User tidak ditemukan");
    // }

    return sendResponse(res, 200, "User ditemukan", id, exitsUser);
  } catch (error) {
    sendError(res, error);
  }
};

export const updateDataUserAdmin = async (req, res) => {
  const { id } = req.params;
  const { nim, name } = req.body;

  if (!nim || !name) {
    return sendResponse(res, 400, "Field tidak boleh kosong" , id);
  }

  try {
    const exitsUser = await prisma.user.findUnique({
      where: { id },
    });
    if (!exitsUser) {
      return sendResponse(res, 404, "User tidak ditemukan" , id);
    }
    // uniq nim
    const checkNim = await prisma.user.findUnique({
      where: { nim: nim },
    });
    if (checkNim && checkNim.id !== id) {
      return sendResponse(res, 400, "NIM sudah terdaftar" , id);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { nim, name },
    });
    return sendResponse(res, 200, "User berhasil diupdate", id, updatedUser);
  } catch (error) {
    sendError(res, error);
  }
};

export const updateDataUser = async (req, res) => {
  const { id } = req.params;
  const { nim, name, email, kelas } = req.body;

  if ((!nim || !name || !email, !kelas)) {
    return sendResponse(res, 400, "Field tidak boleh kosong"  , id);
  }
  const checkKelas = await prisma.kelas.findUnique({
    where: { id: kelas },
  });
  if (!checkKelas) {
    return sendResponse(res, 404, "Kelas tidak ditemukan" , id);
  }

  try {
    const exitsUser = await prisma.user.findUnique({
      where: { id },
    });
    if (!exitsUser) {
      return sendResponse(res, 404, "User tidak ditemukan" , id);
    }
    // uniq nim
    const checkNim = await prisma.user.findUnique({
      where: { nim: nim },
    });
    if (checkNim && checkNim.id !== id) {
      return sendResponse(res, 400, "NIM sudah terdaftar" , id);
    }
    // uniq email
    const checkEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (checkEmail && checkEmail.id !== id) {
      return sendResponse(res, 400, "Email sudah terdaftar" , id);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { nim: nim, name, email, Kelas: { connect: { id: kelas } } },
    });
    return sendResponse(res, 200, "User berhasil diupdate", id, updatedUser);
  } catch (error) {
    sendError(res, error);
  }
};

export const createKelas = async (req, res) => {
  const { nama } = req.body;

  if (!nama) {
    return sendResponse(res, 400, "Field tidak boleh kosong" , nama);
  }

  const checkKelas = await prisma.kelas.findFirst({
    where: { nama },
  });
  if (checkKelas) {
    return sendResponse(res, 400, "Kelas sudah terdaftar" , nama);
  }

  try {
    const createdKelas = await prisma.kelas.create({
      data: { nama },
    });
    return sendResponse(res, 201, "Kelas berhasil dibuat", nama, createdKelas);
  } catch (error) {
    sendError(res, error);
  }
};

export const getKelas = async (req, res) => {
  try {
    const exitsKelas = await prisma.kelas.findMany();
    if (!exitsKelas) {
      return sendResponse(res, 404, "Kelas tidak ditemukan");
    }
    return sendResponse(res, 200, "Kelas ditemukan", exitsKelas);
  } catch (error) {
    sendError(res, error);
  }
};

export const updateKelas = async (req, res) => {
  const { id } = req.params;
  const { nama } = req.body;

  if (!id || !nama) {
    return sendResponse(res, 400, "Field tidak boleh kosong" , id);
  }

  const checkKelas = await prisma.kelas.findUnique({
    where: { id },
  });

  if (!checkKelas) {
    return sendResponse(res, 404, "Kelas tidak ditemukan" , id);
  }

  // nama tidka boleh sama keculai id nya
  const checkKelasSame = await prisma.kelas.findFirst({
    where: { id: { not: id }, nama },
  });

  if (checkKelasSame) {
    return sendResponse(res, 400, "Kelas sudah terdaftar" , id);
  }
  try {
    const updatedKelas = await prisma.kelas.update({
      where: { id },
      data: { nama },
    });

    return sendResponse(res, 200, "Kelas berhasil diupdate", id, updatedKelas);
  } catch (error) {
    sendError(res, error);
  }
};

export const deleteKelas = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return sendResponse(res, 400, "Field tidak boleh kosong" , id);
  }

  const checkKelas = await prisma.kelas.findUnique({
    where: { id },
  });

  if (!checkKelas) {
    return sendResponse(res, 404, "Kelas tidak ditemukan" , id);
  }
  try {
    const deletedKelas = await prisma.kelas.delete({
      where: { id },
    });

    return sendResponse(res, 200, "Kelas berhasil dihapus", id, deletedKelas);
  } catch (error) {
    sendError(res, error);
  }
};

export const updateSingleProfile = async (req, res) => {
  const { id } = req.params;

  const { email, noHp } = req.body;
  if (!id) {
    return sendResponse(res, 400, "Invalid request" , id);
  }

  if (!email || !noHp) {
    return sendResponse(res, 400, "Field tidak boleh kosong" , id);
  }
  try {
    const updateProfile = await prisma.user.update({
      where: { id },
      data: {
        email,
        noHp,
      },
    });
    return sendResponse(res, 200, "Profile berhasil diupdate", id, updateProfile);
  } catch (error) {
    sendError(res, error);
  }
};
