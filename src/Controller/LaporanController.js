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
        user_id: exitsUser.id,
        pkl:{
          isDelete: false
        },
        OR: [{ absensi: { hadir: "hadir" } }, { absensi: { hadir: null } }],
      },
      select: {
        id: true,
        tanggal: true,
        status_selesai: true,
      },
    });
    if (!data) {
      return sendResponse(res, 404, "Data tidak ditemukan");
    }

    return sendResponse(res, 200, "Data ditemukan", data);
  } catch (error) {
    console.log(error);
    sendError(res, error);
  }
};

export const getSingleLaporan = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return sendResponse(res, 400, "Invalid request");
  }
  try {
    const exitsLaporan = await prisma.laporan.findUnique({
      where: { id },
      select: {
        id: true,
        pembimbingId: true,
        nama_instruktur: true,
        pelaksanaan_kegiatan: true,
        catatan_instruktur: true,
        nama_pekerjaan: true,
        

        perencanaan_kegiatan: true,

        tanggal: true,
        status_selesai: true,
        fotos: {
          select: {
            id: true,
            foto_url: true,
          },
        },
      },
    });
    if (!exitsLaporan) {
      return sendResponse(res, 404, "Laporan tidak ditemukan");
    }
    const pembimbing = await prisma.user.findUnique({
      where: {
        id: exitsLaporan.pembimbingId, // Menggunakan pembimbingId dari laporan
      },
      select: {
        name: true, // Mengambil nama pembimbing
      },
    });
    const laporanWithPembimbing = {
      ...exitsLaporan,
      nama_pembimbing: pembimbing?.name || "Nama pembimbing tidak ditemukan", // Menambahkan nama pembimbing
    };
    return sendResponse(res, 200, "Data ditemukan", laporanWithPembimbing);
  } catch (error) {
    console.log(error);
    sendError(res, error);
  }
};
