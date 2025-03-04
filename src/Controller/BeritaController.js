import { prisma } from "../Config/Prisma.js";
import { sendError, sendResponse } from "../Utils/Response.js";

export const createBerita = async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return sendResponse(res, 400, "Field tidak boleh kosong");
  }

  try {
    const createdBerita = await prisma.berita.create({
      data: { title, content },
    });
    return sendResponse(res, 201, "Berita berhasil dibuat", createdBerita);
  } catch (error) {
    sendError(res, error);
  }
};

export const getBerita = async (req, res) => {
  const { role } = req.params;
  try {
    let exitsBerita;
    if (role === "admin") {
      exitsBerita = await prisma.berita.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });
    } else {
      exitsBerita = await prisma.berita.findMany({
        where: {
          status: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    return sendResponse(res, 200, "Berita ditemukan", exitsBerita);
  } catch (error) {
    sendError(res, error);
  }
};

export const EditBerita = async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;
  if (!id) {
    return sendResponse(res, 400, "Invalid request");
  }
  if (!title || !content) {
    return sendResponse(res, 400, "Field tidak boleh kosong");
  }

  const checkData = await prisma.berita.findUnique({
    where: { id },
  });
  if (!checkData) {
    return sendResponse(res, 404, "Berita tidak ditemukan");
  }
  try {
    const updated = await prisma.berita.update({
      where: { id },
      data: { title, content },
    });
    return sendResponse(res, 200, "Berita berhasil diupdate", updated);
  } catch (error) {
    sendError(res, error);
  }
};

export const updateStatusBerita = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!id) {
    return sendResponse(res, 400, "Invalid request");
  }

  const checkData = await prisma.berita.findUnique({
    where: { id },
  });
  if (!checkData) {
    return sendResponse(res, 404, "Berita tidak ditemukan");
  }
  try {
    const updated = await prisma.berita.update({
      where: { id },
      data: { status },
    });
    return sendResponse(res, 200, "Berita berhasil diupdate", updated);
  } catch (error) {
    sendError(res, error);
  }
};

export const deleteBerita = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return sendResponse(res, 400, "Invalid request");
  }
  try {
    const deleted = await prisma.berita.delete({
      where: { id },
    });
    return sendResponse(res, 200, "Berita berhasil dihapus", deleted);
  } catch (error) {
    sendError(res, error);
  }
};
