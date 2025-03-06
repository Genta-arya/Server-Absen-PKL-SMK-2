import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../Library/CreateToken.js";
import { sendResponse } from "../Utils/Response.js";
import { prisma } from "../Config/Prisma.js";
import logger from "../Logging/logger.js";

export const middleware = async (req, res, next) => {
  // Ambil token dari cookie atau header Authorization
  const authHeader = req.headers.authorization;
  let token = req.cookies.token || (authHeader && authHeader.split(" ")[1]);

  logger.info("Token:", token);

  if (!token) {
    return sendResponse(res, 403, "Silahkan login terlebih dahulu");
  }

  try {
    // Verifikasi JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Simpan data user di request
    next(); // Lanjut ke request berikutnya
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      // Cari user dengan token ini
      const find = await prisma.user.findFirst({
        where: { token },
      });

      // Jika ditemukan, hapus token dari database
      if (find) {
        await prisma.user.update({
          where: { id: find.id },
          data: { token: null },
        });
      }

      return sendResponse(res, 403, "Sesi login telah habis, silahkan login kembali.");
    }

    return sendResponse(res, 500, "Terjadi kesalahan pada server");
  }
};
