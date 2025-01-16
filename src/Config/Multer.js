import multer from "multer";
import path from "path";
import fs from "fs";

const __dirname = path.resolve(); // Mendapatkan direktori root proyek

// Konfigurasi penyimpanan dengan logika folder tujuan berdasarkan jenis file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadDir = path.join(__dirname, "Public/Images");

    // Menentukan direktori tujuan berdasarkan jenis file
    if (file.fieldname === "image") {
      uploadDir = path.join(uploadDir, "Profile"); // Gambar profile
    } else if (file.fieldname === "images") {
      uploadDir = path.join(uploadDir, "absensi"); // Gambar absensi
    }

    // Membuat folder jika belum ada
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir); // Tentukan folder penyimpanan
  },
  filename: (req, file, cb) => {
    const fileNameWithoutSpaces = file.originalname.replace(/\s+/g, "-");
    const uniqueName = `${Date.now()}-${fileNameWithoutSpaces}`;
    cb(null, uniqueName); // Menentukan nama file unik
  },
});

const fileFilter = (req, file, cb) => {
  const allowedFileTypes = /jpeg|jpg|png|gif/;
  const isMimeTypeAllowed = allowedFileTypes.test(file.mimetype);
  const isExtNameAllowed = allowedFileTypes.test(
    path.extname(file.originalname).toLowerCase()
  );

  if (isMimeTypeAllowed && isExtNameAllowed) {
    cb(null, true);
  } else {
    const error = new Error(
      "Hanya file gambar (JPEG, JPG, PNG, GIF) yang diperbolehkan"
    );
    error.status = 400;
    return cb(error, false);
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Batas ukuran file: 5MB
  fileFilter,
});

// Middleware untuk upload satu gambar (misal: foto profil)
export const uploadImage = upload.single("image");

// Middleware untuk upload beberapa gambar (misal: gambar absensi)
export const uploadImages = upload.array("images", 3); // Maksimal 3 gambar untuk absensi
