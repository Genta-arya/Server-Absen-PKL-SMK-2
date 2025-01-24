import { prisma } from "../Config/Prisma.js";
import { sendError, sendResponse } from "../Utils/Response.js";

export const updateAbsensi = async (req, res) => {
  const { id } = req.params;
  const { jam_masuk, gps, posisi, foto } = req.body;

  if (!id || !jam_masuk || !gps || !posisi || !foto) {
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

  if (exits.hadir === "hadir") {
    return sendResponse(res, 400, "Anda sudah absen");
  }

  try {
    await prisma.absensi.update({
      where: {
        id,
      },
      data: {
        datang: jam_masuk,
        gps,
        posisi,
        foto,
        hadir: "hadir",
      },
    });
    return sendResponse(res, 200, "Berhasil absen", jam_masuk);
  } catch (error) {
    sendError(res, error);
  }
};

export const absenPulang = async (req, res) => {
  const { id } = req.params;
  const { jam_pulang } = req.body;

  if (!id || !jam_pulang) {
    return sendResponse(res, 400, "Invalid request");
  }

  // jam masuk harus format isoString
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(jam_pulang)) {
    return sendResponse(res, 400, "Invalid Jam masuk");
  }

  const exits = await prisma.absensi.findUnique({
    where: { id },
  });

  if (!exits) {
    return sendResponse(res, 404, "Data absen tidak ditemukan");
  }

  const newDateIndonesia = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Jakarta",
    hour12: false,
  });
  const currentDate = new Date(newDateIndonesia);

  const tenAM = new Date(currentDate);
  tenAM.setHours(10, 0, 0, 0);

  if (currentDate > tenAM) {
    return sendResponse(res, 400, "Jam absen telah lewat");
  }

  if (exits.pulang !== null) {
    return sendResponse(res, 400, "Anda sudah absen");
  }
  try {
    await prisma.absensi.update({
      where: {
        id,
      },
      data: {
        pulang: jam_pulang,
      },
    });
    return sendResponse(res, 200, "Berhasil absen", jam_pulang);
  } catch (error) {
    sendError(res, error);
  }
};
