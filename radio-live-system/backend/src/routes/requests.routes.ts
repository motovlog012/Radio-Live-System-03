import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { getIO } from "../socket";

const router = Router();

const MAX_REQUESTS_PER_DAY = Number(process.env.MAX_REQUESTS_PER_DAY || 50);

const requestSchema = z.object({
  studentName: z.string().min(1),
  className: z.string().optional(),
  songTitle: z.string().min(1),
  artist: z.string().optional(),
  message: z.string().optional(),
  emoji: z.string().optional(),
  externalUrl: z.string().url().optional().or(z.literal("")),
  isAnonymous: z.boolean().optional(),
});

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Cari tanggal antrean berikutnya yang masih punya slot kosong.
async function findAvailableQueueDate(): Promise<Date> {
  let candidate = startOfDay(new Date());
  for (let i = 0; i < 365; i++) {
    const dayStart = candidate;
    const dayEnd = new Date(candidate);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const count = await prisma.songRequest.count({
      where: {
        queueDate: { gte: dayStart, lt: dayEnd },
        status: { in: ["MENUNGGU", "DIPUTAR"] },
      },
    });

    if (count < MAX_REQUESTS_PER_DAY) return dayStart;

    candidate = new Date(candidate);
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate; // fallback, seharusnya tidak pernah sampai sini
}

// Deteksi duplikat sederhana: judul + penyanyi sama, status masih menunggu, di hari yang sama
async function findDuplicate(songTitle: string, artist: string | undefined, queueDate: Date) {
  const dayStart = startOfDay(queueDate);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return prisma.songRequest.findFirst({
    where: {
      songTitle: { equals: songTitle },
      artist: artist ? { equals: artist } : undefined,
      status: "MENUNGGU",
      queueDate: { gte: dayStart, lt: dayEnd },
    },
  });
}

// POST /api/requests - siswa membuat request (public, tidak wajib login agar guest bisa request via QR)
router.post("/", async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Data request tidak valid", details: parsed.error.flatten() });
  }
  const data = parsed.data;

  const queueDate = await findAvailableQueueDate();
  const wasMovedToNextDay = startOfDay(queueDate).getTime() !== startOfDay(new Date()).getTime();

  const duplicate = await findDuplicate(data.songTitle, data.artist, queueDate);

  let songRequest;
  if (duplicate) {
    // Gabungkan: naikkan prioritas request yang sudah ada, jangan buat baru
    songRequest = await prisma.songRequest.update({
      where: { id: duplicate.id },
      data: { priority: { increment: 1 } },
    });
  } else {
    songRequest = await prisma.songRequest.create({
      data: {
        studentName: data.isAnonymous ? "Anonim" : data.studentName,
        className: data.className,
        songTitle: data.songTitle,
        artist: data.artist,
        message: data.message,
        emoji: data.emoji,
        externalUrl: data.externalUrl || undefined,
        isAnonymous: !!data.isAnonymous,
        queueDate,
        status: wasMovedToNextDay ? "DIPINDAHKAN" : "MENUNGGU",
      },
    });
  }

  getIO()?.emit("request:new", songRequest);

  return res.status(201).json({
    request: songRequest,
    movedToNextDay: wasMovedToNextDay,
    merged: !!duplicate,
  });
});

// GET /api/requests - live request board (publik, untuk ditampilkan realtime)
router.get("/", async (req, res) => {
  const { status, date } = req.query;
  const where: any = {};
  if (status) where.status = status;
  if (date) {
    const d = startOfDay(new Date(String(date)));
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    where.queueDate = { gte: d, lt: next };
  }

  const requests = await prisma.songRequest.findMany({
    where,
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });
  return res.json(requests);
});

// PATCH /api/requests/:id - admin/operator/penyiar mengubah status
router.patch(
  "/:id",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "OPERATOR", "PENYIAR"),
  async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { status, priority } = req.body as { status?: string; priority?: number };

    const updated = await prisma.songRequest.update({
      where: { id },
      data: {
        ...(status ? { status: status as any } : {}),
        ...(priority !== undefined ? { priority } : {}),
      },
    });

    getIO()?.emit("request:update", updated);
    return res.json(updated);
  }
);

// DELETE /api/requests/:id - tolak/hapus
router.delete(
  "/:id",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "OPERATOR", "PENYIAR"),
  async (req: AuthRequest, res) => {
    const { id } = req.params;
    await prisma.songRequest.update({ where: { id }, data: { status: "DITOLAK" } });
    getIO()?.emit("request:update", { id, status: "DITOLAK" });
    return res.json({ message: "Request ditolak." });
  }
);

export default router;
