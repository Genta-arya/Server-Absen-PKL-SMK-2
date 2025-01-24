import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../Library/CreateToken.js";
import { sendResponse } from "../Utils/Response.js";

export const middleware = (req, res, next) => {
  // Ambil Authorization header
  const authHeader = req.headers["authorization"];
  console.log(process.env.JWT_SECRET);
  // Periksa apakah header Authorization ada dan formatnya benar
  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return sendResponse(res, 401, "Authorization header missing or invalid");
  }

  // Ambil token dari header
  const token = authHeader.split(" ")[1];
  console.log(token);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();
  } catch (err) {
    console.log(err);
    return res.status(403).json({ message: "Sesi login telah habis" });
  }
};
