import { prisma } from "../Config/Prisma.js";
import { sendError, sendResponse } from "../Utils/Response.js";

export const getLaporanByuser = async (req, res) => {
  const { id } = req.params;
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
    const data = await prisma.laporan.findMany({
      where: {
        user_id: id,
      },
      select: {
        id: true,
        tanggal: true,
        status_selesai: true,
      },
    });

    return sendResponse(res, 200, "Data ditemukan", data);
  } catch (error) {
    console.log(error);
    sendError(res, error);
  }
};
