import { prisma } from "../Config/Prisma.js";
import logger from "../Logging/logger.js";

export const sendResponse = async (
  res,
  statusCode,
  message,
  uid = null,
  data = null
) => {
  const responsePayload = {
    message,
  };
  logger.info("LOG: " + message + ", " + `ID:${uid || "-"}` + "," + " Status:" + statusCode);

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

  return res.status(500).json({ message: customMessage, Detail: error });
};
