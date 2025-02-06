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

  // await getTimeInJakarta();

  // Ambil jamMasuk dan pastikan memiliki tanggal yang sama dengan `newDateIndonesia`
  const jamMasuk = new Date(newDateIndonesia);
  const jamMasukShift = new Date(exits.shift.jamMasuk);
  jamMasuk.setHours(jamMasukShift.getHours(), jamMasukShift.getMinutes(), 0, 0);

  console.log("Jam Masuk Shift:", jamMasuk);

  // Ambil jam dari jamMasuk untuk dibandingkan
  const batasMasuk = jamMasuk.getHours() + 2; // Waktu batas masuk (jamMasuk + 2 jam)

  // Ambil jam dari currentDate untuk perbandingan
  const currentHour = formattedHour.getHours(); // Jam sekarang (format 24 jam)
  console.log("Jam Masuk Shift (Batas Akhir):", batasMasuk);
  console.log("Jam Sekarang:", currentHour);

  // Cek apakah jam absen masuk telah lewat
  if (currentHour > batasMasuk) {
    return sendResponse(res, 400, "Jam absen Masuk telah lewat");
  }

  // if (currentHour > tenAM) {
  //   return sendResponse(res, 400, "Jam absen Masuk telah lewat");
  // }

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
    select: {
      shift: {
        select: {
          jamPulang: true,
          jamMasuk: true,
        },
      },
      pulang: true,
    },
  });

  // select

  if (!exits) {
    return sendResponse(res, 404, "Data absen tidak ditemukan");
  }

  // await getTimeInJakarta();

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

  // Ambil jam dari currentDate untuk perbandingan
  const currentHour = formattedHour.getHours(); // Jam sekarang (format 24 jam)
  console.log("Jam Pulang Shift:", tenAM);
  console.log("Jam Sekarang:", currentHour);

  // Cek apakah jam absen pulang telah lewat
  if (currentHour > tenAM) {
    console.log("Jam Pulang Shift:", tenAM);
    console.log("Jam Sekarang:", currentHour);
    return sendResponse(res, 400, "Jam absen Pulang telah lewat");
  }

  if (exits.pulang !== null) {
    return sendResponse(res, 400, "Anda sudah absen pulang");
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
    // Mendapatkan waktu Indonesia (Asia/Jakarta) dan set ke jam 00:00:00
    const currentDate = DateTime.now().setZone("Asia/Jakarta").startOf("day");
    // console.log("Current Date (Indonesia Time):", currentDate.toISODate());

    // Mengambil data absensi yang tanggalnya sudah lewat
    const data = await prisma.absensi.findMany({
      where: {
        OR: [{ isDelete: false }, { isDelete: null }],
        tanggal: {
          lt: currentDate.toJSDate(), // Konversi ke format Date untuk Prisma
        },
        hadir: null,
        OR: [{ pulang: null }, { datang: null }],
      },
    });

    console.log("Data absensi yang ditemukan:", data);

    // Jika ada data absensi yang sesuai, update status hadir menjadi "tidak_hadir"
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

      console.log(
        "Status hadir berhasil diupdate menjadi 'tidak_hadir' untuk absensi dengan ID:",
        data.map((item) => item.id)
      );
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
