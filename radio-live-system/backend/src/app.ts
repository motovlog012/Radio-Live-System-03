import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth.routes";
import songsRoutes from "./routes/songs.routes";
import playlistRoutes from "./routes/playlist.routes";
import requestsRoutes from "./routes/requests.routes";
import scheduleRoutes from "./routes/schedule.routes";
import announcementRoutes from "./routes/announcement.routes";
import broadcastRoutes from "./routes/broadcast.routes";
import uploadRoutes from "./routes/upload.routes";

export function createApp() {
  const app = express();

  // Railway (dan kebanyakan PaaS) menempatkan app di belakang reverse proxy.
  // Wajib di-set agar secure cookie, rate-limit, dan req.ip bekerja dengan benar.
  app.set("trust proxy", 1);

  // CORS_ORIGIN bisa berisi lebih dari satu domain, dipisah koma.
  const allowedOrigins = (process.env.CORS_ORIGIN || "*")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    helmet({
      // Izinkan file di /uploads (audio) diakses dari domain frontend yang berbeda.
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error("Origin tidak diizinkan oleh CORS policy."));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());

  // Sajikan file lagu yang diupload secara statis
  app.use("/uploads", express.static(path.join(process.cwd(), process.env.UPLOAD_DIR || "uploads")));

  // Rate limit global sederhana (anti brute-force / spam request lagu)
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Terlalu banyak permintaan. Coba lagi sebentar." },
    })
  );

  app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

  app.use("/api/auth", authRoutes);
  app.use("/api/songs", songsRoutes);
  app.use("/api/playlists", playlistRoutes);
  app.use("/api/requests", requestsRoutes);
  app.use("/api/schedules", scheduleRoutes);
  app.use("/api/announcements", announcementRoutes);
  app.use("/api/broadcast", broadcastRoutes);
  app.use("/api/upload", uploadRoutes);

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || "Terjadi kesalahan pada server." });
  });

  return app;
}
