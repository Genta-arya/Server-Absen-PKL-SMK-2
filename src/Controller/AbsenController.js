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

  const newDateIndonesia = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Jakarta",
    hour12: false,
  });
  const currentDate = new Date(newDateIndonesia);
  const jamMasuk = new Date(exits.shift.jamMasuk);

  const tenAM = jamMasuk.getHours() + 2; // Mendapatkan jam dari jamPulang (format 24 jam)

  // Ambil jam dari currentDate untuk perbandingan
  const currentHour = currentDate.getHours(); // Jam sekarang (format 24 jam)
  console.log("Jam Masuk Shift:", tenAM);
  console.log("Jam Sekarang:", currentHour);

  if (currentHour > tenAM) {
    return sendResponse(res, 400, "Jam absen Masuk telah lewat");
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

  // const newDateIndonesia = new Date().toLocaleString("en-US", {
  //   timeZone: "Asia/Jakarta",
  //   hour12: false,
  // });
  // const currentDate = new Date(newDateIndonesia); // Waktu saat ini di Jakarta (UTC+7)

  // // Ambil jamPulalng dan konversi ke Date object
  // const jamPulang = new Date(exits.shift.jamPulang); // Pastikan jamPulang dalam format yang benar

  // // Ambil jam dari jamPulang untuk dibandingkan
  // const tenAM = jamPulang.getHours() + 2; // Mendapatkan jam dari jamPulang (format 24 jam)

  // // Ambil jam dari currentDate untuk perbandingan
  // const currentHour = currentDate.getHours(); // Jam sekarang (format 24 jam)
  // console.log("Jam Pulang Shift:", tenAM);
  // console.log("Jam Sekarang:", currentHour);
  // // Cek apakah jam absen pulang telah lewat
  // if (currentHour > tenAM) {
  //   console.log("Jam Pulang Shift:", tenAM);
  //   console.log("Jam Sekarang:", currentHour);
  //   return sendResponse(res, 400, "Jam absen Pulang telah lewat");
  // }

  // Dapatkan waktu saat ini dalam zona waktu Indonesia (WIB, UTC+7)
  const currentDate = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Ambil bagian tanggal & waktu dari formatter
  const parts = formatter.formatToParts(currentDate);
  const year = parts.find((p) => p.type === "year").value;
  const month = parts.find((p) => p.type === "month").value;
  const day = parts.find((p) => p.type === "day").value;
  const hour = parts.find((p) => p.type === "hour").value;
  const minute = parts.find((p) => p.type === "minute").value;
  const second = parts.find((p) => p.type === "second").value;

  // Buat objek Date yang benar-benar di zona WIB
  const newDateIndonesia = new Date(
    `${year}-${month}-${day}T${hour}:${minute}:${second}+07:00`
  );

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
  const currentHour = newDateIndonesia.getHours(); // Jam sekarang (format 24 jam)
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
    // Mendapatkan waktu Indonesia
    const newDateIndonesia = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Jakarta",
      hour12: false,
    });

    const currentDate = new Date(newDateIndonesia);
    currentDate.setHours(0, 0, 0, 0);
    console.log("Current Date (Indonesia Time):", currentDate);

    // Mengambil data absensi yang tanggalnya sudah lewat
    const data = await prisma.absensi.findMany({
      where: {
        OR: [{ isDelete: false }, { isDelete: null }],
        tanggal: {
          lt: currentDate, // hanya ambil data dengan tanggal sebelum hari ini
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
            in: data.map((item) => item.id), // Menggunakan ID data yang sudah diambil
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
  }
};
