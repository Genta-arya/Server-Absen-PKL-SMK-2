import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../Library/CreateToken.js";
import { sendResponse } from "../Utils/Response.js";
import { prisma } from "../Config/Prisma.js";

export const middleware = async (req, res, next) => {
  // Ambil Authorization header
  const authHeader = req.headers["authorization"];

  // Periksa apakah header Authorization ada dan formatnya benar
  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return sendResponse(res, 403, "Silahkan login terlebih dahulu");
  }

  // Ambil token dari header
  const token = authHeader.split(" ")[1];
  

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();
  } catch (err) {
    if (
      err instanceof jwt.JsonWebTokenError &&
      err.message === "invalid signature"
    ) {
      // Token invalid, atur token menjadi null di database
      const find = await prisma.user.findFirst({
        where: {
          token: token,
        },
      });
       if (!find) {
        return sendResponse(res, 403, "Sesi login telah habis");
      }
      await prisma.user.update({
        where: {
          id: find.id,
        },
        data: {
          token: null, // Atur token menjadi null
        },
      });
    }
    return sendResponse(res, 403, "Sesi login telah habis");
  }
};
