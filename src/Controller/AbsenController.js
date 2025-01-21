import { prisma } from "../Config/Prisma.js";
import { sendError, sendResponse } from "../Utils/Response.js";

export const updateAbsensi = async (req, res) => {
  const { id } = req.params;
  const { jam_masuk } = req.body;

  if (!id || !jam_masuk) {
    return sendResponse(res, 400, "Invalid request");
  }

  // jam masuk harus format isoString
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(jam_masuk)) {
    return sendResponse(res, 400, "Invalid Jam masuk");
  }

  const exits = await prisma.absensi.findUnique({
    where: { id },
  });

  if (!exits) {
    return sendResponse(res, 404, "Data absen tidak ditemukan");
  }
  try {
    await prisma.absensi.update({
      where: {
        id,
      },
      data: {
        datang: jam_masuk,
        hadir: "hadir"
      },
    });
    return sendResponse(res, 200, "Berhasil absen" , jam_masuk);
  } catch (error) {
    sendError(res, error);
  }
};
