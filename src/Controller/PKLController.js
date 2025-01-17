import { prisma } from "../Config/Prisma.js";
import dayjs from "dayjs";

const BATCH_SIZE = 200; 

export const createPKLWithAbsensi = async (req, res) => {
  const { name, address, user_id, start_date, end_date } = req.body;

  console.log(req.body);

  if (!name || !address || !user_id || !start_date || !end_date) {
    return res.status(400).json({ message: "Invalid request" });
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
      return res.status(404).json({ message: "One or more users not found" });
    }

   
    const newPkl = await prisma.pkl.create({
      data: {
        name,
        alamat: address,
        tanggal_mulai: new Date(start_date),
        tanggal_selesai: new Date(end_date),
        users: {
          connect: user_id.map((id) => ({ id })), 
        },
      },
    });

  
    const start = dayjs(start_date);
    const end = dayjs(end_date);

    if (start.isAfter(end)) {
      return res
        .status(400)
        .json({ message: "Start date cannot be after end date" });
    }

    const dates = []; 


    for (let date = start; date.isBefore(end) || date.isSame(end); date = date.add(1, "day")) {
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

    res.json({
      message: "PKL created and absensi generated successfully",
      data: newPkl,
    });
  } catch (error) {
    console.error("Error creating PKL or absensi:", error);
    res.status(500).json({ message: "Error creating PKL or absensi", error });
  }
};

