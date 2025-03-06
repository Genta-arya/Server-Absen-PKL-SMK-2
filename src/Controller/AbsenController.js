import {
  newDateIndonesia,
  formattedHour,
  getTimeInJakarta,
} from "../Config/Constans.js";
import { prisma } from "../Config/Prisma.js";
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
    },
  });

  if (!exits) {
    return sendResponse(res, 404, "Data absen tidak ditemukan");
  }



  const result = await getTimeInJakarta();

  if (!result) {
    console.error("❌ Tidak bisa mendapatkan waktu Jakarta.");
    return;
  }

  const { formattedHour, newDateIndonesia } = result;

  // Coba parse menggunakan Date biasa
  const dateIndonesia = new Date(newDateIndonesia);

  // Validasi apakah Date berhasil dibuat
  if (isNaN(dateIndonesia.getTime())) {
    console.error(
      "❌ Invalid Date setelah konversi dari newDateIndonesia:",
      newDateIndonesia
    );
    return;
  }

  // Ambil jamMasuk dan pastikan memiliki tanggal yang sama dengan `newDateIndonesia`
  const jamMasuk = new Date(newDateIndonesia);
  const jamMasukShift = new Date(exits.shift.jamMasuk);
  jamMasuk.setHours(jamMasukShift.getHours(), jamMasukShift.getMinutes(), 0, 0);

  console.log("Jam Masuk Shift:", jamMasuk);

  // Ambil jam dari jamMasuk untuk dibandingkan
  const batasMasuk = new Date(jamMasuk); // Buat salinan objek Date
  batasMasuk.setMinutes(batasMasuk.getMinutes() + 15); // Tambahkan 15 menit

  const [currentHour, currentMinute] = formattedHour.split(":").map(Number);
  const batasMasukHour = batasMasuk.getHours();
  const batasMasukMinute = batasMasuk.getMinutes();
  console.log("Jam Masuk Shift (Batas Akhir):", batasMasuk);
  console.log("Jam Sekarang:", currentHour);


  if (
    currentHour > batasMasukHour ||
    (currentHour === batasMasukHour && currentMinute > batasMasukMinute)
  ) {
    return sendResponse(res, 400, "Jam absen masuk telah lewat");
  }

  

  if (exits.hadir === "hadir") {
    return sendResponse(res, 400, "Anda sudah absen masuk");
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
    return sendResponse(res, 200, "Berhasil absen masuk", jam_masuk);
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
    select: {
      shift: {
        select: {
          jamPulang: true,
          jamMasuk: true,
        },
      },
      datang: true,
      pulang: true,
    },
  });

  // select

  if (!exits) {
    return sendResponse(res, 404, "Data absen tidak ditemukan");
  }



  const result = await getTimeInJakarta();

  if (!result) {
    console.error("❌ Tidak bisa mendapatkan waktu Jakarta.");
    return;
  }

  const { formattedHour, newDateIndonesia } = result;

  // Coba parse menggunakan Date biasa
  const dateIndonesia = new Date(newDateIndonesia);

  // Validasi apakah Date berhasil dibuat
  if (isNaN(dateIndonesia.getTime())) {
    console.error(
      "❌ Invalid Date setelah konversi dari newDateIndonesia:",
      newDateIndonesia
    );
    return;
  }

  console.log("Waktu Indonesia saat ini:", newDateIndonesia);

  // Ambil jamPulang dan pastikan memiliki tanggal yang sama dengan `newDateIndonesia`
  const jamPulang = new Date(newDateIndonesia);
  const jamPulangShift = new Date(exits.shift.jamPulang);
  jamPulang.setHours(
    jamPulangShift.getHours(),
    jamPulangShift.getMinutes(),
    0,
    0
  );

  console.log("Jam Pulang Shift:", jamPulang);

  // Ambil jam dari jamPulang untuk dibandingkan
  const tenAM = jamPulang.getHours() + 2; // Waktu batas pulang (jamPulang + 1 jam)
  const batasPulangHour = jamPulang.getHours() + 2;
const batasPulangMinute = jamPulang.getMinutes();


  // Ambil jam dari currentDate untuk perbandingan
  // const currentHour = formattedHour.getHours(); // Jam sekarang (format 24 jam)
  const [currentHour, currentMinute] = formattedHour.split(":").map(Number);
  console.log("Jam Pulang Shift:", tenAM);
  console.log("Jam Sekarang:", currentHour);

  
  
if (currentHour > batasPulangHour || (currentHour === batasPulangHour && currentMinute > batasPulangMinute)) {
  return sendResponse(res, 400, "Jam absen Pulang telah lewat");
}


  if (exits.pulang !== null) {
    return sendResponse(res, 400, "Anda sudah absen pulang");
  }

  if (exits.datang === null) {
    return sendResponse(res, 400, "Anda belum absen masuk");
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
        "Tidak bisa absen pulang, Anda belum absen masuk"
      );
    }
    await prisma.absensi.update({
      where: {
        id,
      },
      data: {
        pulang: jam_pulang,
        hadir: "selesai",
      },
    });
    return sendResponse(res, 200, "Berhasil absen pulang", jam_pulang);
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
            name: true,
            avatar: true,
            nim: true,
          },
        },
      },
    });

    return sendResponse(res, 200, "Data ditemukan", data);
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

    console.log(currentDate);

    if (data.every((item) => item.hadir === "tidak_hadir")) {
      console.log(`selesai`);
      return;
    }

    if (data.length > 0) {
      console.log(`Terdapat ${data.length} absensi yang belum lengkap`);

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
      console.log("Tidak ada absensi yang perlu diperbarui.");
    }
  } catch (error) {
    console.error("Terjadi kesalahan saat memperbarui status absensi:", error);
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
//     console.log("Current Date (Indonesia Time):", currentDate);

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

//     console.log("Data absensi yang ditemukan:", data);

//     // Jika ada data absensi yang sesuai, update status hadir menjadi "tidak_hadir"
//     if (data.length > 0) {
//       console.log(`Terdapat ${data.length} absensi yang belum lengkap`);

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

//       console.log(
//         "Status hadir berhasil diupdate menjadi 'tidak_hadir' untuk absensi dengan ID:",
//         data.map((item) => item.id)
//       );
//     } else {
//       console.log("Tidak ada absensi yang perlu diperbarui.");
//     }
//   } catch (error) {
//     console.error("Terjadi kesalahan saat memperbarui status absensi:", error);
//   }
// };

export const rekapDaftarAbsensi = async (req, res) => {
  const { id } = req.params;
  console.log(id);
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

    return sendResponse(res, 200, "Data rekap absen ditemukan ", data);
  } catch (error) {
    sendError(res, error);
  }
};

export const UpdateStatusAbsen = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const dataEnum = ["selesai", "tidak_hadir", "izin", "libur"];

  if (!id || !status) {
    return sendResponse(res, 400, "Invalid request");
  }

  if (!dataEnum.includes(status)) {
    return sendResponse(res, 400, "Invalid Status");
  }
  try {
    const findData = await prisma.absensi.findUnique({
      where: {
        id,
      },
    });

    if (!findData) {
      return sendResponse(res, 404, "Absensi tidak ditemukan");
    }

    let update;

    if (status === "selesai") {
      console.log(status);
      if (findData.gps === null) {
        return sendResponse(
          res,
          400,
          "Tidak bisa update absensi , karena absensi ini memang tidak hadir"
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
    console.log(refreshedData);
    return sendResponse(res, 200, "Status absensi berhasil diupdate", update);
  } catch (error) {
    sendError(res, error);
  }
};

// export const updateSundayPray = async () => {
//   try {
//     console.log("Menjalankan cron job update Sunday Pray...");

//     // Query langsung ke database untuk mengambil ID yang perlu diperbarui
//     const sundayIds = await prisma.$queryRaw`
//     SELECT id FROM Absensi
//     WHERE (isDelete = FALSE OR isDelete IS NULL)
//     AND DAYOFWEEK(tanggal) = 1
//   `;

//     if (!sundayIds || sundayIds.length === 0) {
//       console.log("Tidak ada data absensi yang perlu diperbarui.");
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

//     console.log(
//       `Berhasil memperbarui ${idsToUpdate.length} data absensi hari Minggu.`
//     );
//   } catch (error) {
//     console.error("Error dalam update Sunday Pray:", error);
//   }
// };
export const updateSundayPray = async () => {
  try {
    console.log("Menjalankan cron job update Sunday Pray...");

    // Query langsung ke database untuk mengambil ID yang perlu diperbarui
    const sundayIds = await prisma.$queryRaw`
    SELECT id FROM Absensi 
    WHERE (isDelete = FALSE OR isDelete IS NULL) 
    AND DAYOFWEEK(tanggal) = 1
    AND (hadir IS NULL OR hadir <> 'libur')
  `;

    if (!sundayIds || sundayIds.length === 0) {
      console.log("Tidak ada data absensi yang perlu diperbarui.");
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

    console.log(
      `Berhasil memperbarui ${idsToUpdate.length} data absensi hari Minggu.`
    );
  } catch (error) {
    console.error("Error dalam update Sunday Pray:", error);
  }
};
