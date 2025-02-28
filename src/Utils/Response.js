import { prisma } from "../Config/Prisma.js";

export const sendResponse = async (res, statusCode, message, data = null) => {
  const responsePayload = {
    message,
  };
  console.log("LOG: " + message + "," + statusCode);

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
  // simpan ke database
  await prisma.lOG.create({
    data: {
      error: error,
      code: 500,
    },
  });

  console.log("LOG: " + error + "," + customMessage);

  return res.status(500).json({ message: customMessage, Detail: error });
};
