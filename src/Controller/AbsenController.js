import {
  newDateIndonesia,
  formattedHour,
  getTimeInJakarta,
} from "../Config/Constans.js";
import { prisma } from "../Config/Prisma.js";
import logger from "../Logging/logger.js";
import { sendError, sendResponse } from "../Utils/Response.js";
import { DateTime } from "luxon";
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
    select: {
      shift: {
        select: {
          jamPulang: true,
          jamMasuk: true,
        },
      },

      user_id: true,
    },
  });

  if (!exits) {
    return sendResponse(res, 404, "Data absen tidak ditemukan", exits.user_id);
  }

  const result = await getTimeInJakarta();

  if (!result) {
    logger.error("❌ Tidak bisa mendapatkan waktu Jakarta.", exits.user_id);
    return;
  }

  const { formattedHour, newDateIndonesia } = result;

  // Coba parse menggunakan Date biasa
  const dateIndonesia = new Date(newDateIndonesia);

  // Validasi apakah Date berhasil dibuat
  if (isNaN(dateIndonesia.getTime())) {
    logger.error(
      "❌ Invalid Date setelah konversi dari newDateIndonesia:",
      newDateIndonesia,
      exits.user_id
    );
    return;
  }

  // Ambil jamMasuk dan pastikan memiliki tanggal yang sama dengan `newDateIndonesia`
  const jamMasuk = new Date(newDateIndonesia);
  const jamMasukShift = new Date(exits.shift.jamMasuk);
  jamMasuk.setHours(jamMasukShift.getHours(), jamMasukShift.getMinutes(), 0, 0);

  logger.info("Jam Masuk Shift:", jamMasuk, exits.user_id);

  // Ambil jam dari jamMasuk untuk dibandingkan
  const batasMasuk = new Date(jamMasuk); // Buat salinan objek Date
  batasMasuk.setMinutes(batasMasuk.getMinutes() + 15); // Tambahkan 15 menit

  const [currentHour, currentMinute] = formattedHour.split(":").map(Number);
  const batasMasukHour = batasMasuk.getHours();
  const batasMasukMinute = batasMasuk.getMinutes();
  logger.info("Jam Masuk Shift (Batas Akhir):", batasMasuk, exits.user_id);
  logger.info("Jam Sekarang:", currentHour, exits.user_id);

  if (
    currentHour > batasMasukHour ||
    (currentHour === batasMasukHour && currentMinute > batasMasukMinute)
  ) {
    return sendResponse(res, 400, "Jam absen masuk telah lewat", exits.user_id);
  }

  if (exits.hadir === "hadir") {
    return sendResponse(res, 400, "Anda sudah absen masuk", exits.user_id);
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

    return sendResponse(
      res,
      200,
      "Berhasil absen masuk",
      exits.user_id,
      jam_masuk
    );
  } catch (error) {
    sendError(res, error);
  }
};

// export const updateAbsensi = async (req, res) => {
// };

// export const absenPulang = async (req, res) => {
// };

export const absenPulang = async (req, res) => {
  const { id } = req.params;
  const { jam_pulang, gps_pulang } = req.body;

  if (!id || !jam_pulang || !gps_pulang) {
    return sendResponse(res, 400, "Invalid request");
  }

  // jam masuk harus format isoString
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(jam_pulang)) {
    return sendResponse(res, 400, "Invalid Jam masuk");
  }

  const exits = await prisma.absensi.findUnique({
    where: { id },
    select: {
      shift: {
        select: {
          jamPulang: true,
          jamMasuk: true,
        },
      },
      user_id: true,
      datang: true,
      pulang: true,
    },
  });

  // select

  if (!exits) {
    return sendResponse(res, 404, "Data absen tidak ditemukan", exits.user_id);
  }

  const result = await getTimeInJakarta();

  if (!result) {
    logger.error(
      "❌ Tidak bisa mendapatkan waktu Jakarta.",
      exits.user_id,
      result
    );
    return;
  }

  const { formattedHour, newDateIndonesia } = result;

  // Coba parse menggunakan Date biasa
  const dateIndonesia = new Date(newDateIndonesia);

  // Validasi apakah Date berhasil dibuat
  if (isNaN(dateIndonesia.getTime())) {
    logger.error(
      "❌ Invalid Date setelah konversi dari newDateIndonesia:",
      newDateIndonesia,
      exits.user_id
    );
    return;
  }

  logger.info("Waktu Indonesia saat ini:", newDateIndonesia, exits.user_id);

  // Ambil jamPulang dan pastikan memiliki tanggal yang sama dengan `newDateIndonesia`
  const jamPulang = new Date(newDateIndonesia);
  const jamPulangShift = new Date(exits.shift.jamPulang);
  jamPulang.setHours(
    jamPulangShift.getHours(),
    jamPulangShift.getMinutes(),
    0,
    0
  );

  logger.info("Jam Pulang Shift:", jamPulang, exits.user_id);

  // Ambil jam dari jamPulang untuk dibandingkan
  const tenAM = jamPulang.getHours() + 2; // Waktu batas pulang (jamPulang + 1 jam)
  const batasPulangHour = jamPulang.getHours() + 2;
  const batasPulangMinute = jamPulang.getMinutes();

  // Ambil jam dari currentDate untuk perbandingan
  // const currentHour = formattedHour.getHours(); // Jam sekarang (format 24 jam)
  const [currentHour, currentMinute] = formattedHour.split(":").map(Number);
  logger.info("Jam Pulang Shift:", tenAM, exits.user_id);
  logger.info("Jam Sekarang:", currentHour, exits.user_id);

  if (
    currentHour > batasPulangHour ||
    (currentHour === batasPulangHour && currentMinute > batasPulangMinute)
  ) {
    return sendResponse(
      res,
      400,
      "Jam absen Pulang telah lewat",
      exits.user_id
    );
  }

  if (exits.pulang !== null) {
    return sendResponse(res, 400, "Anda sudah absen pulang", exits.user_id);
  }

  if (exits.datang === null) {
    return sendResponse(res, 400, "Anda belum absen masuk", exits.user_id);
  }
  try {
    const checkAbsenMasuk = await prisma.absensi.findUnique({
      where: {
        id,
      },
      select: {
        datang: true,
      },
    });

    if (!checkAbsenMasuk) {
      return sendResponse(
        res,
        400,
        "Tidak bisa absen pulang, Anda belum absen masuk",
        exits.user_id
      );
    }
    await prisma.absensi.update({
      where: {
        id,
      },
      data: {
        pulang: jam_pulang,
        gps_pulang: gps_pulang,
        hadir: "selesai",
      },
    });
    return sendResponse(
      res,
      200,
      "Berhasil absen pulang",
      exits.user_id,
      jam_pulang
    );
  } catch (error) {
    sendError(res, error);
  }
};

export const getDataAbsen = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return sendResponse(res, 400, "Invalid request");
  }

  try {
    const data = await prisma.absensi.findUnique({
      where: {
        id,
      },
      include: {
        pkl: {
          where: {
            isDelete: false,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            nim: true,
          },
        },
      },
    });

    return sendResponse(res, 200, "Data ditemukan", data.user.id, data);
  } catch (error) {
    sendError(res, error);
  }
};

export const updateStatusCron = async (req, res) => {
  try {
    const currentDate = DateTime.now().setZone("Asia/Jakarta").startOf("day");

    const data = await prisma.absensi.findMany({
      where: {
        OR: [{ isDelete: false }, { isDelete: null }],
        tanggal: {
          lt: currentDate.toJSDate(), // Hanya data sebelum hari ini
        },

        pulang: null, // Pulang juga kosong
      },
    });

    logger.info(currentDate);

    if (data.every((item) => item.hadir === "tidak_hadir")) {
      logger.info(
        `Semua absensi tanggal sebelum hari ini sudah memiliki status "tidak_hadir"`
      );
      return;
    }

    if (data.length > 0) {
      logger.info(`Terdapat ${data.length} absensi yang belum lengkap`);

      await prisma.absensi.updateMany({
        where: {
          id: {
            in: data.map((item) => item.id),
          },
        },
        data: {
          hadir: "tidak_hadir",
        },
      });
    } else {
      logger.info("Tidak ada absensi yang perlu diperbarui.");
    }
  } catch (error) {
    logger.error("Terjadi kesalahan saat memperbarui status absensi:", error);
    res.status(500).json({ error: "Gagal memperbarui status absensi." });
  }
};

// export const updateStatusCron = async (req, res) => {
//   try {
//     // Mendapatkan waktu Indonesia
//     const newDateIndonesia = new Date().toLocaleString("en-US", {
//       timeZone: "Asia/Jakarta",
//       hour12: false,
//     });

//     const currentDate = new Date(newDateIndonesia);
//     currentDate.setHours(0, 0, 0, 0);
//     logger.info("Current Date (Indonesia Time):", currentDate);

//     // Mengambil data absensi yang tanggalnya sudah lewat
//     const data = await prisma.absensi.findMany({
//       where: {
//         OR: [{ isDelete: false }, { isDelete: null }],
//         tanggal: {
//           lt: currentDate, // hanya ambil data dengan tanggal sebelum hari ini
//         },
//         hadir: null,
//         OR: [{ pulang: null }, { datang: null }],
//       },
//     });

//     logger.info("Data absensi yang ditemukan:", data);

//     // Jika ada data absensi yang sesuai, update status hadir menjadi "tidak_hadir"
//     if (data.length > 0) {
//       logger.info(`Terdapat ${data.length} absensi yang belum lengkap`);

//       await prisma.absensi.updateMany({
//         where: {
//           id: {
//             in: data.map((item) => item.id), // Menggunakan ID data yang sudah diambil
//           },
//         },
//         data: {
//           hadir: "tidak_hadir",
//         },
//       });

//       logger.info(
//         "Status hadir berhasil diupdate menjadi 'tidak_hadir' untuk absensi dengan ID:",
//         data.map((item) => item.id)
//       );
//     } else {
//       logger.info("Tidak ada absensi yang perlu diperbarui.");
//     }
//   } catch (error) {
//     logger.error("Terjadi kesalahan saat memperbarui status absensi:", error);
//   }
// };

export const rekapDaftarAbsensi = async (req, res) => {
  const { id } = req.params;
  logger.info(id);
  try {
    const data = await prisma.absensi.findMany({
      where: {
        pkl_id: id,
        OR: [{ isDelete: false }, { isDelete: null }],
      },

      select: {
        hadir: true,
        tanggal: true,

        pkl: {
          select: {
            name: true,
            tanggal_mulai: true,
            tanggal_selesai: true,
            alamat: true,
            creator: {
              select: {
                name: true,
              },
            },
          },
        },

        user: {
          select: {
            nim: true,
            name: true,
            shifts: {
              select: {
                name: true,
                jamMasuk: true,
                jamPulang: true,
              },
            },
            Kelas: {
              select: {
                nama: true,
              },
            },
          },
        },
      },
    });

    return sendResponse(res, 200, "Data rekap absen ditemukan ", id, data);
  } catch (error) {
    sendError(res, error);
  }
};

export const UpdateStatusAbsen = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const dataEnum = ["selesai", "tidak_hadir", "izin", "libur"];

  if (!id || !status) {
    return sendResponse(res, 400, "Invalid request", id);
  }

  if (!dataEnum.includes(status)) {
    return sendResponse(res, 400, "Invalid Status", id);
  }
  try {
    const findData = await prisma.absensi.findUnique({
      where: {
        id,
      },
    });

    if (!findData) {
      return sendResponse(res, 404, "Absensi tidak ditemukan", id);
    }

    let update;

    if (status === "selesai") {
      logger.info(status);
      if (findData.gps === null) {
        return sendResponse(
          res,
          400,
          "Tidak bisa update absensi , karena absensi ini memang tidak hadir",
          id
        );
      }
      if (findData.datang === null || findData.pulang === null) {
        update = await prisma.absensi.update({
          where: { id },
          data: {
            hadir: "selesai",
            pulang: DateTime.now().setZone("Asia/Jakarta").toJSDate(),
            datang: DateTime.now().setZone("Asia/Jakarta").toJSDate(),
          },
        });
      } else {
        update = await prisma.absensi.update({
          where: { id },
          data: {
            hadir: "selesai",
          },
        });
      }
    } else if (status === "tidak_hadir") {
      if (findData.datang !== null || findData.pulang !== null) {
        update = await prisma.absensi.update({
          where: { id },
          data: {
            hadir: "tidak_hadir",
          },
        });
      } else {
        update = await prisma.absensi.update({
          where: { id },
          data: {
            hadir: "tidak_hadir",
            pulang: null,
            datang: null,
          },
        });
      }
    }
    if (status === "izin") {
      const countIzin = await prisma.absensi.count({
        where: {
          user_id: findData.user_id,
          hadir: "izin",
        },
      });

      if (countIzin >= 3) {
        return res
          .status(400)
          .json({ message: "Batas maksimal izin telah tercapai (3 kali)." });
      }

      update = await prisma.absensi.update({
        where: {
          id,
        },
        data: {
          hadir: status,
        },
      });
    } else {
      update = await prisma.absensi.update({
        where: {
          id,
        },
        data: {
          hadir: status,
        },
      });
    }
    const refreshedData = await prisma.absensi.findUnique({ where: { id } });
    logger.info(refreshedData);
    return sendResponse(
      res,
      200,
      "Status absensi berhasil diupdate",
      id,
      update
    );
  } catch (error) {
    sendError(res, error);
  }
};

// export const updateSundayPray = async () => {
//   try {
//     logger.info("Menjalankan cron job update Sunday Pray...");

//     // Query langsung ke database untuk mengambil ID yang perlu diperbarui
//     const sundayIds = await prisma.$queryRaw`
//     SELECT id FROM Absensi
//     WHERE (isDelete = FALSE OR isDelete IS NULL)
//     AND DAYOFWEEK(tanggal) = 1
//   `;

//     if (!sundayIds || sundayIds.length === 0) {
//       logger.info("Tidak ada data absensi yang perlu diperbarui.");
//       return;
//     }

//     // Ambil hanya ID dari hasil query
//     const idsToUpdate = sundayIds.map((item) => item.id);

//     // Update hanya data yang memenuhi kriteria
//     await prisma.absensi.updateMany({
//       where: {
//         id: { in: idsToUpdate },
//       },
//       data: {
//         hadir: "libur",
//       },
//     });

//     logger.info(
//       `Berhasil memperbarui ${idsToUpdate.length} data absensi hari Minggu.`
//     );
//   } catch (error) {
//     logger.error("Error dalam update Sunday Pray:", error);
//   }
// };
export const updateSundayPray = async () => {
  try {
    logger.info("Menjalankan cron job update Sunday Pray...");

    // Query langsung ke database untuk mengambil ID yang perlu diperbarui
    const sundayIds = await prisma.$queryRaw`
    SELECT id FROM Absensi 
    WHERE (isDelete = FALSE OR isDelete IS NULL) 
    AND DAYOFWEEK(tanggal) = 1
    AND (hadir IS NULL OR hadir <> 'libur')
  `;

    if (!sundayIds || sundayIds.length === 0) {
      logger.info("Tidak ada data absensi yang perlu diperbarui.");
      return;
    }

    // Ambil hanya ID dari hasil query
    const idsToUpdate = sundayIds.map((item) => item.id);

    // Update hanya data yang memenuhi kriteria
    await prisma.absensi.updateMany({
      where: {
        id: { in: idsToUpdate },
      },
      data: {
        hadir: "libur",
      },
    });

    logger.info(
      `Berhasil memperbarui ${idsToUpdate.length} data absensi hari Minggu.`
    );
  } catch (error) {
    logger.error("Error dalam update Sunday Pray:", error);
  }
};
