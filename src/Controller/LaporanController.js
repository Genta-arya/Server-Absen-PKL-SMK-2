import { prisma } from "../Config/Prisma.js";
import { sendError, sendResponse } from "../Utils/Response.js";

export const getLaporanByuser = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return sendResponse(res, 400, "Invalid request");
  }
  try {
    

    const data = await prisma.laporan.findMany({
      where: {
        user_id: id,
        pkl: {
          isDelete: false,
        },
        OR: [
          { absensi: { hadir: "hadir" } },
          { absensi: { hadir: "selesai" } },
          { absensi: { hadir: null } },
        ],
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
  const exitsUser = await prisma.user.findUnique({
    where: { id },
  });
  if (!exitsUser) {
    return sendResponse(res, 404, "User tidak ditemukan");
  }
  try {
    const exitsLaporan = await prisma.laporan.findUnique({
      where: {
        user_id: exitsUser.id,
      },
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
        id: exitsLaporan.pembimbingId,
      },
      select: {
        name: true,
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

export const getLaporanMingguanByuser = async (req, res) => {
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

    const data = await prisma.laporanMingguan.findMany({
      where: {
        user_id: exitsUser.id,
        pkl: {
          isDelete: false,
        },
      },
      select: {
        id: true,

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

export const getSingleLaporanMingguan = async (req, res) => {
  const { id } = req.params;
  console.log(id);
  if (!id) {
    return sendResponse(res, 400, "Invalid request");
  }
  try {
    const exitsLaporan = await prisma.laporanMingguan.findUnique({
      where: { id },
      select: {
        id: true,
        pembimbingId: true,
        nama_instruktur: true,

        catatan: true,
        nama_pekerjaan: true,

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
        id: exitsLaporan.pembimbingId,
      },
      select: {
        name: true,
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

export const uploadLaporanHarian = async (req, res) => {
  const { id } = req.params;
  const { data } = req.body;
  if (!id) {
    return sendResponse(res, 400, "Invalid request");
  }

  try {
    const exitsLaporan = await prisma.laporan.findUnique({
      where: { id },
      select: {
        fotos: {
          select: {
            id: true,
            foto_url: true,
          },
        },
        absensi_id: true,
      },
    });
    if (!exitsLaporan) {
      return sendResponse(res, 404, "Laporan tidak ditemukan");
    }
    const {
      pembimbingId,
      nama_instruktur,
      pelaksanaan_kegiatan,
      catatan_instruktur,
      nama_pekerjaan,
      perencanaan_kegiatan,

      tanggal,

      fotos, // Array foto dari frontend
    } = data;

    if (
      !pembimbingId ||
      !nama_instruktur ||
      !pelaksanaan_kegiatan ||
      !catatan_instruktur ||
      !nama_pekerjaan ||
      !perencanaan_kegiatan ||
      !tanggal ||
      !fotos
    ) {
      return sendResponse(res, 400, "Invalid request");
    }

    const fotoArray = Array.isArray(fotos) ? fotos : [];

    // validasi max fotoArray hanya 3
    if (fotoArray.length > 3) {
      return sendResponse(res, 400, "Maksimal 3 foto");
    }

    // check sudah absen atau belum
    const checkAbsenMasuk = await prisma.absensi.findUnique({
      where: {
        id: exitsLaporan.absensi_id,
      },
      select: {
        datang: true,
        pulang: true,
      },
    });
    if (!checkAbsenMasuk) {
      return sendResponse(
        res,
        400,
        "Tidak bisa upload laporan , absensi anda tidak ditemukan"
      );
    }

    if (!checkAbsenMasuk.datang) {
      return sendResponse(
        res,
        400,
        "Tidak bisa upload laporan , anda belum absen masuk"
      );
    }

    if (!checkAbsenMasuk.pulang) {
      return sendResponse(
        res,
        400,
        "Tidak bisa upload laporan , anda belum absen pulang"
      );
    }

    const updatedLaporan = await prisma.laporan.update({
      where: { id },
      data: {
        pembimbingId,
        catatan_instruktur,
        nama_instruktur,
        pelaksanaan_kegiatan,
        nama_pekerjaan,
        perencanaan_kegiatan,
        status_selesai:
          exitsLaporan.fotos.length > 0 || fotoArray.length > 0
            ? "Selesai"
            : "Belum",
        tanggal,
      },
    });

    const existingFotos = await prisma.foto_laporan.findMany({
      where: {
        laporan_id: id,
        foto_url: { in: fotoArray.map((foto) => foto.foto_url) },
      },
      select: { foto_url: true },
    });

    const existingFotoUrls = existingFotos.map((foto) => foto.foto_url);

    const newFotos = fotoArray.filter(
      (foto) => !existingFotoUrls.includes(foto.foto_url)
    );

    if (newFotos.length > 0) {
      await prisma.foto_laporan.createMany({
        data: newFotos.map((foto) => ({
          laporan_id: id,
          foto_url: foto.foto_url,
        })),
      });
    } else {
      console.log(
        "Semua foto sudah ada di database, tidak ada yang ditambahkan."
      );
    }
    const updatedFotos = await prisma.foto_laporan.findMany({
      where: { laporan_id: id },
      select: { id: true, foto_url: true },
    });

    return sendResponse(
      res,
      200,
      "Data laporan berhasil disubmit",
      { ...updatedLaporan, fotos: updatedFotos } // **Tambahkan `fotos` ke response**
    );
  } catch (error) {
    console.log(error);
    sendError(res, error);
  }
};

export const uploadLaporanHarianMingguan = async (req, res) => {
  const { id } = req.params;
  const { data } = req.body;
  if (!id) {
    return sendResponse(res, 400, "Invalid request");
  }

  try {
    const exitsLaporan = await prisma.laporanMingguan.findUnique({
      where: { id },
      select: {
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
    const {
      pembimbingId,
      nama_instruktur,

      catatan,
      nama_pekerjaan,

      fotos, // Array foto dari frontend
    } = data;

    if (
      !pembimbingId ||
      !nama_instruktur ||
      !catatan ||
      !nama_pekerjaan ||
      !fotos
    ) {
      return sendResponse(res, 400, "Invalid request");
    }

    const fotoArray = Array.isArray(fotos) ? fotos : [];

    // validasi max fotoArray hanya 3
    if (fotoArray.length > 3) {
      return sendResponse(res, 400, "Maksimal 3 foto");
    }

    const updatedLaporan = await prisma.laporanMingguan.update({
      where: { id },
      data: {
        pembimbingId,
        nama_instruktur,
        catatan,
        nama_pekerjaan,

        status_selesai:
          exitsLaporan.fotos.length > 0 || fotoArray.length > 0
            ? "Selesai"
            : "Belum",
      },
    });

    const existingFotos = await prisma.foto_laporan.findMany({
      where: {
        laporan_mingguan_id: id,
        foto_url: { in: fotoArray.map((foto) => foto.foto_url) },
      },
      select: { foto_url: true },
    });

    const existingFotoUrls = existingFotos.map((foto) => foto.foto_url);

    const newFotos = fotoArray.filter(
      (foto) => !existingFotoUrls.includes(foto.foto_url)
    );

    if (newFotos.length > 0) {
      await prisma.foto_laporan.createMany({
        data: newFotos.map((foto) => ({
          laporan_mingguan_id: id,
          foto_url: foto.foto_url,
        })),
      });
    } else {
      console.log(
        "Semua foto sudah ada di database, tidak ada yang ditambahkan."
      );
    }
    const updatedFotos = await prisma.foto_laporan.findMany({
      where: { laporan_mingguan_id: id },
      select: { id: true, foto_url: true },
    });

    return sendResponse(
      res,
      200,
      "Data laporan berhasil disubmit",
      { ...updatedLaporan, fotos: updatedFotos } // **Tambahkan `fotos` ke response**
    );
  } catch (error) {
    console.log(error);
    sendError(res, error);
  }
};

export const deleteSingleImage = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return sendResponse(res, 400, "Invalid request");
  }
  try {
    const exitsImage = await prisma.foto_laporan.findUnique({
      where: { id },
    });
    if (!exitsImage) {
      return sendResponse(res, 404, "Image tidak ditemukan");
    }
    const deletedImage = await prisma.foto_laporan.delete({
      where: { id },
    });
    return sendResponse(res, 200, "Data berhasil dihapus", deletedImage);
  } catch (error) {
    console.log(error);
    sendError(res, error);
  }
};
