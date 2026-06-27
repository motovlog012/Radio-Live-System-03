import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

const uploadDir = path.join(process.cwd(), process.env.UPLOAD_DIR || "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_MIME = [
  "audio/mpeg", // mp3
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/x-flac",
  "audio/aac",
  "audio/ogg",
  "audio/mp4", // m4a
  "audio/x-m4a",
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_UPLOAD_SIZE_MB || 20) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Format audio tidak didukung. Gunakan MP3, WAV, FLAC, AAC, OGG, atau M4A."));
    }
  },
});

// POST /api/upload/song - upload file audio (Admin/Operator/Penyiar)
router.post(
  "/song",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "OPERATOR", "PENYIAR"),
  (req, res) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message || "Upload gagal." });
      }
      if (!req.file) {
        return res.status(400).json({ error: "Tidak ada file yang diunggah." });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      return res.status(201).json({
        filePath: fileUrl,
        originalName: req.file.originalname,
        size: req.file.size,
      });
    });
  }
);

export default router;
