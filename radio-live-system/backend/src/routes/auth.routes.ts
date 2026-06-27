import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z
    .enum(["SUPER_ADMIN", "ADMIN", "PENYIAR", "OPERATOR", "GURU", "SISWA", "GUEST"])
    .optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Data tidak valid", details: parsed.error.flatten() });
  }
  const { name, email, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Email sudah digunakan." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: role || "SISWA" },
  });

  await prisma.activityLog.create({
    data: { userId: user.id, action: "REGISTER", details: `User ${email} mendaftar` },
  });

  return res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Data tidak valid" });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return res.status(401).json({ error: "Email atau password salah." });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Email atau password salah." });
  }

  const payload = { userId: user.id, role: user.role, email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const isProd = process.env.NODE_ENV === "production";
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProd, // wajib HTTPS di production agar cookie sameSite=none diterima browser
    sameSite: isProd ? "none" : "lax", // "none" diperlukan jika frontend & backend beda domain (Railway/Vercel)
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  await prisma.activityLog.create({
    data: { userId: user.id, action: "LOGIN", details: `User ${email} login` },
  });

  return res.json({
    accessToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

router.post("/refresh", async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: "Refresh token tidak ditemukan." });

  try {
    const payload = verifyRefreshToken(token);
    const accessToken = signAccessToken({
      userId: payload.userId,
      role: payload.role,
      email: payload.email,
    });
    return res.json({ accessToken });
  } catch {
    return res.status(401).json({ error: "Refresh token tidak valid." });
  }
});

router.post("/logout", (req, res) => {
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });
  return res.json({ message: "Logout berhasil." });
});

export default router;
