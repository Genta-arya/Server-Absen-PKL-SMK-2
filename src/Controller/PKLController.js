import { prisma } from "../Config/Prisma.js";
import dayjs from "dayjs";
import { sendError, sendResponse } from "../Utils/Response.js";
import { sendNotificationEmail } from "./EmailController.js";
import { DateTime } from "luxon";

const BATCH_SIZE = 50;

export const createPKLWithAbsensi = async (req, res) => {
  const { name, address, start_date, end_date, creatorId, shifts } = req.body;

  if (
    !name ||
    !address ||
    !start_date ||
    !end_date ||
    !creatorId ||
    !Array.isArray(shifts)
  ) {
    return sendResponse(res, 400, "Invalid request");
  }

  try {
    // Validasi tanggal mulai dan selesai
    const start = dayjs(start_date);
    const end = dayjs(end_date);
    if (start.isAfter(end)) {
      return sendResponse(
        res,
        400,
        "Tanggal mulai harus sebelum tanggal selesai."
      );
    }

    // Validasi shift
    const allUsers = new Set(); // Untuk mencegah siswa muncul di shift lain
    for (const shift of shifts) {
      const { jamMasuk, jamPulang, users } = shift;

      if (!jamMasuk || !jamPulang || !Array.isArray(users)) {
        return sendResponse(res, 400, "Data shift tidak valid.");
      }

      // Validasi jam masuk dan jam pulang
      if (dayjs(jamMasuk).isAfter(dayjs(jamPulang))) {
        return sendResponse(
          res,
          400,
          `Jam masuk (${jamMasuk}) tidak boleh lebih besar dari jam pulang (${jamPulang}).`
        );
      }

      // Validasi pengguna yang sudah ada di shift lain
      for (const user of users) {
        if (allUsers.has(user)) {
          return sendResponse(
            res,
            400,
            `Pengguna dengan ID ${user} sudah ditambahkan di shift lain.`
          );
        }
        allUsers.add(user);
      }
    }

    const existingPkl = await prisma.pkl.findMany({
      where: {
        users: {
          some: {
            id: {
              in: [...allUsers], // Mengecek jika ada pengguna yang sudah ada di PKL lain
            },
          },
        },
        isDelete: false,
      },
      select: {
        id: true,
        name: true,
        creator: {
          select: {
            name: true,
          },
        },
      },
    });

    if (existingPkl.length > 0) {
      return sendResponse(
        res,
        400,
        " Siswa yang sudah ada di pkl tidak boleh ditambahkan lagi"
      );
    }

    // Buat PKL baru
    const newPkl = await prisma.pkl.create({
      data: {
        name,
        alamat: address,
        tanggal_mulai: new Date(start_date),
        tanggal_selesai: new Date(end_date),
        creatorId,
        users: {
          connect:
            allUsers.size > 0
              ? [...allUsers].map((userId) => ({ id: userId }))
              : [],
        },
      },
    });

    let createdShifts = [];

    // Proses pembuatan shift dan mengaitkan pengguna
    const shiftPromises = shifts.map(async (shift) => {
      const { name, jamMasuk, jamPulang, users } = shift;

      // Membuat shift untuk PKL
      const createdShift = await prisma.shift.create({
        data: {
          name,
          jamMasuk: new Date(jamMasuk),
          jamPulang: new Date(jamPulang),
          pklId: newPkl.id,
          users: {
            connect: users.map((userId) => ({ id: userId })),
          },
        },
      });

      createdShifts.push(createdShift);
    });

    // Tunggu hingga semua shift selesai dibuat
    await Promise.all(shiftPromises);

    // Tunggu hingga semua shift selesai
    await Promise.all(shiftPromises);

    // Pembuatan absensi untuk setiap shift dan tanggal
    const dates = [];
    for (
      let date = start;
      date.isBefore(end) || date.isSame(end);
      date = date.add(1, "day")
    ) {
      dates.push(date.format("YYYY-MM-DD"));
    }

    let absensiData = [];
    shifts.forEach((shift, shiftIndex) => {
      shift.users.forEach((userId) => {
        dates.forEach((date) => {
          // Cek apakah absensi sudah ada untuk tanggal dan user yang sama
          const existingAbsensi = absensiData.find(
            (absensi) =>
              absensi.user_id === userId &&
              absensi.tanggal.getTime() === new Date(date).getTime()
          );

          // Jika belum ada absensi untuk user pada tanggal tersebut
          if (!existingAbsensi) {
            absensiData.push({
              pkl_id: newPkl.id,
              shift_id: createdShifts[shiftIndex].id, // Pastikan shift_id disertakan untuk absensi pada shift pertama
              user_id: userId,
              tanggal: new Date(date),
            });
          }
        });
      });
    });

    // Masukkan absensi ke dalam database
    const BATCH_SIZE = 100000;
    const batchPromises = [];
    for (let i = 0; i < absensiData.length; i += BATCH_SIZE) {
      const batch = absensiData.slice(i, i + BATCH_SIZE);
      batchPromises.push(prisma.absensi.createMany({ data: batch }));
    }

    console.log(`Memulai insert ${absensiData.length} data absensi...`);
    await Promise.all(batchPromises);
    console.log("Insert absensi selesai.");

    const absensiBaru = await prisma.absensi.findMany({
      where: {
        user_id: { in: absensiData.map((a) => a.user_id) },
        pkl_id: { in: absensiData.map((a) => a.pkl_id) },
        tanggal: { in: absensiData.map((a) => a.tanggal) },
      },
    });

    if (absensiBaru.length === 0) {
      throw new Error(
        "Tidak ada data absensi yang ditemukan! Periksa proses penyimpanan absensi."
      );
    }

    console.log(`Mengambil kembali data absensi dari database...`);

    console.log("Jumlah data di database setelah insert:", absensiBaru.length);
    console.log("Contoh data absensi:", absensiBaru.slice(0, 5)); // Lihat 5 data pertama

    console.log(
      `Ditemukan ${absensiBaru.length} data absensi, lanjut membuat laporan...`
    );
    const userAbsensiCounts = absensiBaru.reduce((acc, absensi) => {
      acc[absensi.user_id] = (acc[absensi.user_id] || 0) + 1;
      return acc;
    }, {});

    const firstUserAbsensiCount = Object.values(userAbsensiCounts)[0]; // Ambil nilai pertama
    console.log(`Jumlah absensi user pertama: ${firstUserAbsensiCount}`);

    const laporanData = absensiBaru.map((absensi) => ({
      tanggal: absensi.tanggal ?? new Date(),
      absensi_id: absensi.id,
      pembimbingId: creatorId ?? "default_pembimbing",
      pkl_id: absensi.pkl_id ?? "unknown_pkl",
      user_id: absensi.user_id ?? "unknown_user",
    }));

    const laporanPromises = [];
    for (let i = 0; i < laporanData.length; i += BATCH_SIZE) {
      const batch = laporanData.slice(i, i + BATCH_SIZE);
      laporanPromises.push(prisma.laporan.createMany({ data: batch }));
    }
    await Promise.all(laporanPromises);
    const lengthAbsensi = firstUserAbsensiCount;
    const jumlahMinggu = Math.ceil(lengthAbsensi / 7); // Pembagian jumlah absensi per 7 hari = jumlah minggu

    // Membuat laporan mingguan sesuai dengan jumlah minggu
    const laporanMingguanPromises = [];

    // Mengelompokkan data berdasarkan user_id
    const userAbsensiGrouped = absensiBaru.reduce((acc, absensi) => {
      if (!acc[absensi.user_id]) {
        acc[absensi.user_id] = [];
      }
      acc[absensi.user_id].push(absensi);
      return acc;
    }, {});

    for (let userId in userAbsensiGrouped) {
      const absensiUser = userAbsensiGrouped[userId];
      const jumlahMinggu = Math.ceil(absensiUser.length / 7); // Menghitung minggu per user
      console.log(`User ${userId} memiliki ${jumlahMinggu} minggu`);

      for (let i = 0; i < jumlahMinggu; i++) {
        const startIndex = i * 7;
        const endIndex = Math.min((i + 1) * 7, absensiUser.length);

        const mingguAbsensi = absensiUser.slice(startIndex, endIndex);

        laporanMingguanPromises.push(
          prisma.laporanMingguan.create({
            data: {
              pkl_id: newPkl.id,
              absensi_id: mingguAbsensi[0]?.id ?? "unknown_absensi", // Gunakan absensi pertama dalam minggu
              user_id: mingguAbsensi[0]?.user_id ?? "unknown_user", // Sesuaikan user_id
              pembimbingId: creatorId,
              status_selesai: "Belum",
              status: true,
            },
          })
        );
      }
    }

    // Tunggu hingga semua laporan mingguan selesai dibuat
    await Promise.all(laporanMingguanPromises);

    console.log(
      `User ${absensiBaru[0]?.user_id} memiliki ${lengthAbsensi} absensi.`
    );
    console.log(`Jumlah minggu yang dihitung: ${jumlahMinggu}`);

    console.log(
      `Membuat ${jumlahMinggu} laporan mingguan untuk user ${absensiBaru[0]?.user_id}`
    );

    // Tunggu hingga semua laporan mingguan selesai dibuat
    await Promise.all(laporanMingguanPromises);

    const emailList = await prisma.user.findMany({
      where: {
        id: { in: [...allUsers] }, // Menggunakan ID dari user yang ada dalam PKL
      },
      select: {
        email: true,
      },
    });

    const emails = emailList.map((user) => user.email);
    // ambil data user pkl yg baru dibuat

    const pklData = await prisma.pkl.findFirst({
      where: {
        id: newPkl.id,
      },
      select: {
        id: true,
        name: true,
        tanggal_mulai: true,
        tanggal_selesai: true,
        creator: {
          select: {
            name: true,
          },
        },
      },
    });
    // map kan data name creator dan pkl name
    if (!pklData) {
      console.error("PKL tidak ditemukan atau tidak valid.");
    } else {
      // Ambil nama PKL dan nama creator
      const pklname = pklData.name;
      const creatorName = pklData.creator?.name || "Unknown";
      const formatTanggal = (tanggal) => {
        return new Intl.DateTimeFormat("id-ID", {
          weekday: "long", // Nama hari (Senin, Selasa, ...)
          day: "numeric", // Tanggal (1, 2, 3, ...)
          month: "long", // Nama bulan (Januari, Februari, ...)
          year: "numeric", // Tahun (2025, 2026, ...)
        }).format(new Date(tanggal));
      };

      // Contoh penggunaan
      const tanggalMulai = formatTanggal(pklData.tanggal_mulai);
      const tanggalSelesai = formatTanggal(pklData.tanggal_selesai);

      // Kirim email
      sendNotificationEmail(emails, {
        pklname,
        creatorName,
        tanggalMulai,
        tanggalSelesai,
      });
    }

    return sendResponse(
      res,
      201,
      "PKL and absensi created successfully",
      newPkl
    );
  } catch (error) {
    console.error(error);
    return sendError(res, error);
  }
};

export const addSiswaToExistingPKL = async (req, res) => {
  const { pkl_id, shift_data } = req.body;

  if (
    !pkl_id ||
    !shift_data ||
    !Array.isArray(shift_data) ||
    shift_data.length === 0
  ) {
    return sendResponse(res, 400, "Invalid request");
  }

  try {
    for (const shift of shift_data) {
      const { shift_name, jam_masuk, jam_keluar, user_id } = shift;

      // Pastikan nama shift ada
      if (!shift_name) {
        return sendResponse(res, 400, "Nama shift harus diisi");
      }

      // Validasi jam masuk dan jam keluar
      if (!jam_masuk || !jam_keluar) {
        return sendResponse(res, 400, "Jam masuk dan jam keluar harus diisi");
      }

      // Cek apakah jam masuk lebih besar dari jam keluar
      if (jam_masuk >= jam_keluar) {
        return sendResponse(
          res,
          400,
          `Jam masuk shift ${shift_name} tidak boleh lebih besar dari jam keluar.`
        );
      }

      // Validasi user_id
      if (!Array.isArray(user_id) || user_id.length === 0) {
        return sendResponse(
          res,
          400,
          `User ID untuk shift ${shift_name} harus diisi`
        );
      }
    }

    // Mendapatkan tanggal mulai dan selesai PKL
    const existingPkl = await prisma.pkl.findUnique({
      where: { id: pkl_id },
      select: { tanggal_mulai: true, tanggal_selesai: true },
    });

    if (!existingPkl) {
      return sendResponse(res, 404, "PKL tidak ditemukan");
    }

    const { tanggal_mulai, tanggal_selesai } = existingPkl;

    const absensiData = [];
    let currentDate = DateTime.fromJSDate(new Date(tanggal_mulai)).setZone(
      "Asia/Jakarta"
    );

    const endDate = DateTime.fromJSDate(new Date(tanggal_selesai)).setZone(
      "Asia/Jakarta"
    );

    let jsCurrentDate = currentDate.toJSDate();
    jsCurrentDate.setDate(jsCurrentDate.getDate());

    // Kembalikan ke Luxon DateTime setelah modifikasi
    currentDate = DateTime.fromJSDate(jsCurrentDate).setZone("Asia/Jakarta");

    const getCurrentDate = () =>
      DateTime.now().setZone("Asia/Jakarta").toFormat("yyyy-MM-dd");

    while (currentDate <= endDate) {
      // Iterasi melalui setiap shift
      for (const shift of shift_data) {
        const { user_id } = shift;

        // Buat shift baru dan ambil shift_id setelah shift dibuat
        let id_shift = null;

        // Cek apakah shift dengan jam yang sama sudah ada
        const existingShifts = await prisma.shift.findMany({
          where: {
            jamMasuk: DateTime.fromISO(
              `${getCurrentDate()}T${shift.jam_masuk}:00`,
              { zone: "Asia/Jakarta" }
            )
              .toUTC()
              .toJSDate(),
            jamPulang: DateTime.fromISO(
              `${getCurrentDate()}T${shift.jam_keluar}:00`,
              { zone: "Asia/Jakarta" }
            )
              .toUTC()
              .toJSDate(),
          },
        });

        // Jika shift belum ada, buat shift baru
        if (existingShifts.length === 0) {
          const newShift = await prisma.shift.create({
            data: {
              name: shift.shift_name,
              jamMasuk: DateTime.fromISO(
                `${getCurrentDate()}T${shift.jam_masuk}:00`,
                { zone: "Asia/Jakarta" }
              )
                .toUTC()
                .toJSDate(),
              jamPulang: DateTime.fromISO(
                `${getCurrentDate()}T${shift.jam_keluar}:00`,
                { zone: "Asia/Jakarta" }
              )
                .toUTC()
                .toJSDate(),

              pkl: { connect: { id: pkl_id } },
              users: {
                connect: shift.user_id.map((id) => ({ id })),
              },
            },
          });
          id_shift = newShift.id;
        } else {
          id_shift = existingShifts[0].id;
        }

        // Iterasi setiap user_id untuk shift tersebut dan tambahkan ke absensi
        user_id.forEach((userId) => {
          absensiData.push({
            pkl_id,
            user_id: userId,
            tanggal: new Date(currentDate),
            shift_id: id_shift,
          });
        });
      }

      currentDate = currentDate.plus({ days: 1 });
    }

    if (absensiData.length > 0) {
      const BATCH_SIZE = 100;
      const batchPromises = [];
      for (let i = 0; i < absensiData.length; i += BATCH_SIZE) {
        const batch = absensiData.slice(i, i + BATCH_SIZE);
        batchPromises.push(prisma.absensi.createMany({ data: batch }));
      }
      await Promise.all(batchPromises);
    }

    const absensiBaru = await prisma.absensi.findMany({
      where: {
        user_id: { in: absensiData.map((a) => a.user_id) },
        pkl_id: { in: absensiData.map((a) => a.pkl_id) },
        tanggal: { in: absensiData.map((a) => a.tanggal) },
      },
    });

    const findCreator = await prisma.pkl.findFirst({
      where: {
        id: pkl_id,
      },
    });

    if (absensiBaru.length === 0) {
      return sendResponse(res, 400, "Data absensi tidak ditemukan");
    }

    console.log(
      `Ditemukan ${absensiBaru.length} data absensi, lanjut membuat laporan...`
    );

    const userAbsensiCounts = absensiBaru.reduce((acc, absensi) => {
      acc[absensi.user_id] = (acc[absensi.user_id] || 0) + 1;
      return acc;
    }, {});

    const firstUserAbsensiCount = Object.values(userAbsensiCounts)[0]; // Ambil nilai pertama
    console.log(`Jumlah absensi user pertama: ${firstUserAbsensiCount}`);

    const laporanData = absensiBaru.map((absensi) => ({
      tanggal: absensi.tanggal ?? new Date(),
      absensi_id: absensi.id,
      pembimbingId: findCreator.creatorId ?? "default_pembimbing",
      pkl_id: pkl_id ?? "unknown_pkl",
      user_id: absensi.user_id ?? "unknown_user",
    }));

    const laporanPromises = [];
    for (let i = 0; i < laporanData.length; i += BATCH_SIZE) {
      const batch = laporanData.slice(i, i + BATCH_SIZE);
      laporanPromises.push(prisma.laporan.createMany({ data: batch }));
    }
    await Promise.all(laporanPromises);

    const userAbsensiGrouped = absensiBaru.reduce((acc, absensi) => {
      if (!acc[absensi.user_id]) {
        acc[absensi.user_id] = [];
      }
      acc[absensi.user_id].push(absensi);
      return acc;
    }, {});

    console.log("Jumlah absensi per user:", userAbsensiGrouped);

    const lengthAbsensi = firstUserAbsensiCount;
    // Pembagian jumlah absensi per 7 hari = jumlah minggu

    const laporanMingguanPromises = [];

    for (let userId in userAbsensiGrouped) {
      const absensiUser = userAbsensiGrouped[userId];
      const jumlahMinggu = Math.ceil(absensiUser.length / 7);

      for (let i = 0; i < jumlahMinggu; i++) {
        const startIndex = i * 7;
        const endIndex = Math.min((i + 1) * 7, absensiUser.length);

        const mingguAbsensi = absensiUser.slice(startIndex, endIndex);

        laporanMingguanPromises.push(
          prisma.laporanMingguan.create({
            data: {
              pkl_id: pkl_id ?? "unknown_pkl",
              absensi_id: absensiBaru[0]?.id ?? "unknown_absensi",
              user_id: mingguAbsensi[0]?.user_id ?? "unknown_user",
              pembimbingId: findCreator.creatorId ?? "default_pembimbing",
              status_selesai: "Belum",
              status: true,
            },
          })
        );
      }
    }

    // Tunggu hingga semua laporan mingguan selesai dibuat
    await Promise.all(laporanMingguanPromises);

    // Hubungkan semua user ke PKL
    await prisma.pkl.update({
      where: { id: pkl_id },
      data: {
        users: {
          connect: shift_data.flatMap((shift) =>
            shift.user_id.map((id) => ({ id }))
          ),
        },
      },
    });

    return sendResponse(
      res,
      200,
      "Siswa berhasil ditambahkan ke PKL, data shift diperbarui, dan absensi telah dibuat"
    );
  } catch (error) {
    console.error(error);
    return sendError(res, error);
  }
};

export const getDataPklCreator = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return sendResponse(res, 400, "Invalid request");
  }
  const findUser = await prisma.user.findFirst();
  if (!findUser) {
    return sendResponse(res, 404, "User not found");
  }
  try {
    const data = await prisma.pkl.findMany({
      where: {
        creatorId: id,
        OR: [{ isDelete: false }, { isDelete: null }],
      },
    });

    return sendResponse(res, 200, "Data ditemukan", data);
  } catch (error) {
    sendError(res, error);
  }
};

export const getSinglePkl = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return sendResponse(res, 400, "Invalid request");
  }
  try {
    const data = await prisma.pkl.findUnique({
      where: {
        id,
        OR: [{ isDelete: false }, { isDelete: null }],
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            nim: true,
            avatar: true,
          },
        },
        shifts: {
          where: {
            isDelete: false,
          },
          select: {
            id: true,
            name: true,

            jamMasuk: true,
            jamPulang: true,
          },
        },
      },
    });

    if (!data) {
      return sendResponse(res, 404, "Data tidak ditemukan", data);
    }
    return sendResponse(res, 200, "Data ditemukan", data);
  } catch (error) {
    sendError(res, error);
  }
};

export const EditPkl = async (req, res) => {
  const { id } = req.params;
  const { name, alamat, grupUrl } = req.body;

  if (!id || !name || !alamat || !grupUrl) {
    return sendResponse(res, 400, "Invalid request");
  }

  const checkPkl = await prisma.pkl.findUnique({
    where: {
      id,
    },
  });
  if (!checkPkl) {
    return sendResponse(res, 404, "Data PKL tidak ditemukan");
  }
  try {
    const update = await prisma.pkl.update({
      where: {
        id,
      },
      data: {
        name,
        alamat,
        link_grup: grupUrl,
      },
    });
    return sendResponse(res, 200, "Data berhasil diupdate", update);
  } catch (error) {
    sendError(res, error);
  }
};

export const deletePkl = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return sendResponse(res, 400, "Invalid request");
  }
  try {
    const checkPkl = await prisma.pkl.findUnique({
      where: {
        id,
      },
    });
    if (!checkPkl) {
      return sendResponse(res, 404, "Data PKL tidak ditemukan");
    }

    await prisma.absensi.updateMany({
      where: {
        pkl_id: id,
      },
      data: {
        isDelete: true,
      },
    });
    const deletePkl = await prisma.pkl.update({
      where: {
        id,
      },
      data: {
        isDelete: true,
      },
    });

    await prisma.shift.updateMany({
      where: {
        pklId: id,
      },
      data: {
        isDelete: true,
      },
    });
    return sendResponse(res, 200, "Data berhasil dihapus", deletePkl);
  } catch (error) {
    sendError(res, error);
  }
};

export const deleteAllPkl = async (req, res) => {
  try {
    const deletePkl = await prisma.pkl.deleteMany({
      where: {
        isDelete: true,
      },
    });
    console.log(" Data PKL berhasil dihapus", deletePkl);
  } catch (error) {
    console.log(error);
  }
};

export const updateStatusPkl = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return sendResponse(res, 400, "Invalid request");
  }
  try {
    const checkPkl = await prisma.pkl.findUnique({
      where: {
        id,
      },
      select: {
        status: true,
        tanggal_selesai: true,
      },
    });
    if (!checkPkl) {
      return sendResponse(res, 404, "Data PKL tidak ditemukan");
    }

    const newDateIndonesia = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Jakarta",
    });
    const currentDate = new Date(newDateIndonesia);

    const currentDateOnly = new Date(
      currentDate.toLocaleDateString("en-US", { timeZone: "Asia/Jakarta" })
    );

    const checkPklTanggalSelesai = new Date(
      checkPkl.tanggal_selesai.toLocaleString("en-US", {
        timeZone: "Asia/Jakarta",
      })
    );

    const checkPklTanggalSelesaiOnly = new Date(
      checkPklTanggalSelesai.toLocaleDateString("en-US", {
        timeZone: "Asia/Jakarta",
      })
    );

    console.log("currentDateOnly", currentDateOnly);
    console.log("checkPklTanggalSelesaiOnly", checkPklTanggalSelesaiOnly);

    if (!checkPkl.status && currentDateOnly > checkPklTanggalSelesaiOnly) {
      console.log("Periode PKL sudah selesai");
      return sendResponse(
        res,
        400,
        "Periode PKL sudah selesai , Tidak bisa diaktifkan kembali"
      );
    }

    const update = await prisma.pkl.update({
      where: {
        id,
      },
      data: {
        status: !checkPkl.status,
      },
    });
    return sendResponse(res, 200, "Data PKL berhasil diupdate", update);
  } catch (error) {
    console.log(error);
    sendError(res, error);
  }
};

export const removeSiswaFromPkl = async (req, res) => {
  const { id } = req.params; // ID PKL
  const { siswaId, isDelete } = req.body; // ID Siswa

  console.log("id", id);
  console.log("siswaId", siswaId);

  if (!id || !siswaId) {
    return sendResponse(res, 400, "Invalid request");
  }

  try {
    // Periksa apakah data PKL ada
    const checkPkl = await prisma.pkl.findUnique({
      where: { id },
      select: { users: true },
    });

    if (!checkPkl) {
      return sendResponse(res, 404, "Data PKL tidak ditemukan");
    }

    // Hapus siswa dari relasi PKL
    const updatedPkl = await prisma.pkl.update({
      where: { id },
      data: {
        users: {
          disconnect: { id: siswaId }, // Putuskan relasi siswa dari PKL
        },
      },
    });
  

    if (isDelete) {
      await prisma.shift.deleteMany({
        where: { pklId: id },
      });
    }

    // Hapus data absensi siswa terkait PKL ini
    await prisma.absensi.deleteMany({
      where: {
        pkl_id: id,
        user_id: siswaId,
      },
    });

    // hapus data laporan
    await prisma.laporan.deleteMany({
      where: {
        pkl_id: id,
        user_id: siswaId,
      },
    });

    // hapus data laporan mingguan
    await prisma.laporanMingguan.deleteMany({
      where: {
        pkl_id: id,
        user_id: siswaId,
      },
    });

    // hapus relasi siswa dari shift
    //   await prisma.$executeRaw`
    //   DELETE FROM \`_UserShift\`
    //   WHERE B = ${siswaId} AND A IN (
    //     SELECT id FROM \`Shift\` WHERE pklId = ${id}
    //   )
    // `;
    try {
      await prisma.$executeRaw`
    DELETE FROM "_UserShift"
  WHERE "B" = ${siswaId} 
  AND "A" IN (
    SELECT "id" FROM "Shift" WHERE "pklId" = ${id}
  )
  `;
      console.log("Relasi siswa dari shift berhasil dihapus.");
    } catch (error) {
      console.error("Gagal menghapus relasi siswa dari shift:", error);
    }

    return sendResponse(
      res,
      200,
      "Siswa berhasil dihapus dari PKL dan data absensi dihapus",
      updatedPkl
    );
  } catch (error) {
    console.error(error);
    sendError(res, error);
  }
};

export const getAnggotaPkl = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return sendResponse(res, 400, "Invalid request");
  }
  try {
    const checkPkl = await prisma.pkl.findUnique({
      where: {
        id,
      },
      select: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            noHp: true,
            role: true,
            nim: true,
            avatar: true,
            Kelas: {
              select: {
                id: true,
                nama: true,
              },
            },
            shifts: {
              select: {
                id: true,
                name: true,
                jamMasuk: true,
                jamPulang: true,
              },
            },
          },
        },
      },
    });
    if (!checkPkl) {
      return sendResponse(res, 404, "Data PKL tidak ditemukan");
    }
    return sendResponse(res, 200, "Data anggota PKL", checkPkl);
  } catch (error) {
    sendError(res, error);
  }
};

export const updateStatusPKLCron = async (req, res) => {
  try {
    // Mendapatkan waktu Indonesia
    const newDateIndonesia = DateTime.now()
      .setZone("Asia/Jakarta")
      .startOf("day");
    // Mengambil data absensi yang tanggalnya sudah lewat
    const data = await prisma.pkl.findMany({
      where: {
        AND: [
          {
            OR: [{ isDelete: false }, { isDelete: null }],
          },
          {
            tanggal_selesai: {
              lt: newDateIndonesia.toJSDate(), // Ambil data dengan tanggal_selesai sebelum hari ini
            },
            status: true,
          },
        ],
      },
    });

    console.log("Data pkl yang ditemukan:", data);

    // Jika ada data absensi yang sesuai, update status hadir menjadi "tidak_hadir"
    if (data.length > 0) {
      console.log(`Terdapat ${data.length} absensi yang belum lengkap`);

      await prisma.pkl.updateMany({
        where: {
          id: {
            in: data.map((item) => item.id), // Menggunakan ID data yang sudah diambil
          },
        },
        data: {
          status: false,
        },
      });

      console.log(
        "Mengupdate status PKL dengan ID:",
        data.map((item) => item.id)
      );
    } else {
      console.log("Tidak ada pkl yang perlu diperbarui.");
    }
  } catch (error) {
    console.error("Terjadi kesalahan saat memperbarui status pkl:", error);
  }
};

export const getAllPkl = async (req, res) => {
  const { role } = req.body;

  if (!role) {
    return sendResponse(res, 400, "Invalid request");
  }

  if (role !== "admin") {
    return sendResponse(res, 400, "Akses ditolak");
  }

  try {
    const data = await prisma.pkl.findMany({
      where: {
        isDelete: false,
      },
      include: {
        creator: {
          select: {
            avatar: true,
            name: true,
            noHp: true,
          },
        },
        users: {
          select: {
            id: true,
            avatar: true,
            name: true,
            noHp: true,
            shifts: {
              where: {
                isDelete: false,
              },

              take: 2, // Ambil hanya satu shift pertama
              select: {
                id: true,
                name: true,
                jamMasuk: true,
                jamPulang: true,
              },
            },
          },
        },
      },
    });

    return sendResponse(res, 200, "Data PKL", data);
  } catch (error) {
    sendError(res, error);
  }
};
