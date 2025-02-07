import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../Library/CreateToken.js";
import { sendResponse } from "../Utils/Response.js";
import { prisma } from "../Config/Prisma.js";

export const middleware = async (req, res, next) => {
 
  const token = req.cookies.token; 


  if (!token) {
    return sendResponse(res, 403, "Silahkan login terlebih dahulu");
  }

  try {
 
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; 
    next(); 
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
   
      const find = await prisma.user.findFirst({
        where: { token },
      });

      if (find) {
        await prisma.user.update({
          where: { id: find.id },
          data: { token: null },
        });
      }

      return sendResponse(res, 403, "Sesi login telah habis");
    }
    
    return sendResponse(res, 500, "Terjadi kesalahan pada server");
  }
};