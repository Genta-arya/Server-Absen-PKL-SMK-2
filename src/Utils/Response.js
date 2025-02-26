import { prisma } from "../Config/Prisma";

export const sendResponse = async (res, statusCode, message, data = null) => {
  const responsePayload = {
    message,
  };
  console.log("LOG: " + message + "," + statusCode);

  if (data) {
    responsePayload.data = data;
  }
  // simpan ke database
  await prisma.lOG.create({
    data: {
      error: message,
      code: statusCode,
      date: new Date(),
    },
  });

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
      date: new Date(),
    },
  });

  console.log("LOG: " + error + "," + customMessage);

  return res.status(500).json({ message: customMessage, Detail: error });
};
