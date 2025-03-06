import { prisma } from "../Config/Prisma.js";
import logger from "../Logging/logger.js";

export const sendResponse = async (res, statusCode, message, data = null) => {
  const responsePayload = {
    message,
  };
  logger.info("LOG: " + message + "," + statusCode);

  if (data) {
    responsePayload.data = data;
  }

  return res.status(statusCode).json(responsePayload);
};

export const sendError = async (
  res,
  error,
  customMessage = "Terjadi kesalahan pada server"
) => {

  logger.error("LOG: " + error);
  // simpan ke database

  await prisma.lOG.create({
    data: {
      error: error || "Error tidak diketahui",
      code: 500,
    },
  })
  // await prisma.lOG.create({
  //   data: {
  //     error: error || "-",
  //     code: 500,
  //   },
  // });

 

  return res.status(500).json({ message: customMessage, Detail: error });
};
