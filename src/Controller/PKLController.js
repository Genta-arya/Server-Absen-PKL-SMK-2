import { prisma } from "../Config/Prisma.js";
import dayjs from "dayjs";
import { sendError, sendResponse } from "../Utils/Response.js";
import { io } from "../../index.js";

const BATCH_SIZE = 50;

export const createPKLWithAbsensi = async (req, res) => {
  const { name, address, user_id, start_date, end_date, creatorId } = req.body;

  if (!name || !address || !user_id || !start_date || !end_date || !creatorId) {
    return sendResponse(res, 400, "Invalid request");
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: user_id,
        },
      },
    });

    if (users.length !== user_id.length) {
      return sendResponse(res, 404, "User not found");
    }

    // siswa yang sudah ada di pkl tidak boleh ditambahkan lagi

    const existingPkl = await prisma.pkl.findMany({
      where: {
        users: {
          some: {
            id: {
              in: user_id,
            },
          },
        },
        isDelete: false,
      },
    });

    if (existingPkl.length > 0) {
      return sendResponse(
        res,
        400,
        " Siswa yang sudah ada di pkl tidak boleh ditambahkan lagi"
      );
    }

    const newPkl = await prisma.pkl.create({
      data: {
        name,
        alamat: address,
        tanggal_mulai: new Date(start_date),
        tanggal_selesai: new Date(end_date),
        creatorId: creatorId,
        users: {
          connect: user_id.map((id) => ({ id })),
        },
      },
    });

    const start = dayjs(start_date);
    const end = dayjs(end_date);

    if (start.isAfter(end)) {
      // hapus lagi pkl
      await prisma.pkl.delete({
        where: { id: newPkl.id },
      });
      console.log(
        "Tanggal mulai harus sebelum tanggal selesai , data pkl di hapus"
      );
      return sendResponse(
        res,
        400,
        "Tanggal mulai harus sebelum tanggal selesai , periksa kembali"
      );
    }

    const dates = [];

    for (
      let date = start;
      date.isBefore(end) || date.isSame(end);
      date = date.add(1, "day")
    ) {
      dates.push(date.format("YYYY-MM-DD"));
    }

    let absensiData = [];
    dates.forEach((date) => {
      user_id.forEach((user) => {
        absensiData.push({
          pkl_id: newPkl.id,
          user_id: user,
          tanggal: new Date(date),
        });
      });
    });

    const batchPromises = [];
    for (let i = 0; i < absensiData.length; i += BATCH_SIZE) {
      const batch = absensiData.slice(i, i + BATCH_SIZE);
      batchPromises.push(prisma.absensi.createMany({ data: batch }));
    }

    await Promise.all(batchPromises);
    user_id.forEach((userId) => {
      io.to(userId).emit("new-pkl-notification", {
        message: `Anda telah ditambahkan ke Praktik Kerja Lapangan: ${newPkl.name}`,
      });
    });

    return sendResponse(res, 201, "PKL created successfully", newPkl);
  } catch (error) {
    sendError(res, error);
  }
};

export const addSiswaToExistingPKL = async (req, res) => {
  const { pkl_id, user_id } = req.body;

  if (!pkl_id || !user_id || !Array.isArray(user_id) || user_id.length === 0) {
    return sendResponse(res, 400, "Invalid request");
  }

  try {
    // Validasi apakah PKL ada
    const existingPkl = await prisma.pkl.findUnique({
      where: { id: pkl_id },
      include: {
        users: true, // Include users to check existing ones
        absensi: true, // Include absensi for generating data
      },
    });

    if (!existingPkl) {
      return sendResponse(res, 404, "PKL not found");
    }

    // Cek apakah siswa sudah ada dalam PKL
    const existingUserIds = existingPkl.users.map((user) => user.id);
    const newUsers = user_id.filter((id) => !existingUserIds.includes(id));
    const duplicateUsers = user_id.filter((id) => existingUserIds.includes(id));

    if (duplicateUsers.length > 0) {
      return sendResponse(
        res,
        400,
        `Siswa dengan ID ${duplicateUsers.join(", ")} sudah ada di PKL ini`
      );
    }

    // // Tambahkan siswa baru ke PKL
    await prisma.pkl.update({
      where: { id: pkl_id },
      data: {
        users: {
          connect: user_id.map((id) => ({ id })),
        },
      },
    });

    // Ambil tanggal absensi dari PKL yang sudah ada data pertama saja
    const uniqueDates = [
      ...new Set(
        existingPkl.absensi.map((absen) => absen.tanggal.toISOString())
      ),
    ];

    if (uniqueDates.length === 0) {
      return sendResponse(res, 400, "Tidak ada data absensi dalam PKL ini");
    }

    // Buat data absensi untuk siswa baru
    const newAbsensiData = [];
    uniqueDates.forEach((tanggal) => {
      newUsers.forEach((id) => {
        newAbsensiData.push({
          pkl_id,
          user_id: id,
          tanggal: new Date(tanggal), // Konversi tanggal menjadi objek Date
        });
      });
    });

    console.log("data absensi", newAbsensiData);

    const BATCH_SIZE = 100;
    const batchPromises = [];
    for (let i = 0; i < newAbsensiData.length; i += BATCH_SIZE) {
      const batch = newAbsensiData.slice(i, i + BATCH_SIZE);
      batchPromises.push(prisma.absensi.createMany({ data: batch }));
    }

    await Promise.all(batchPromises);

    // Kirim notifikasi ke siswa baru
    user_id.forEach((userId) => {
      io.to(userId).emit("new-pkl-notification", {
        message: `Anda telah ditambahkan ke Praktik Kerja Lapangan: ${existingPkl.name}`,
      });
    });

    return sendResponse(res, 200, "Siswa berhasil ditambahkan ke PKL");
  } catch (error) {
    sendError(res, error);
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
  const { name, alamat } = req.body;

  if (!id || !name || !alamat) {
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
    const deletePkl = await prisma.pkl.update({
      where: {
        id,
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
    // new Date pake waktu indonesia
    const newDateIndonesia = new Date().toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
    });
    console.log(
      checkPkl.tanggal_selesai.toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
      })
    );
    console.log(newDateIndonesia);

    if (
      !checkPkl.status &&
      checkPkl.tanggal_selesai.toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
      }) < newDateIndonesia
    ) {
      // true atau false
      console.log("sudah lewat");
      return sendResponse(res, 400, "Tanggal selesai sudah lewat");
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
