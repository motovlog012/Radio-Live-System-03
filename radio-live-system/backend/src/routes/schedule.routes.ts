import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

const scheduleSchema = z.object({
  title: z.string().min(1),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  specificDate: z.string().datetime().optional(),
  startTime: z.string(),
  endTime: z.string(),
  playlistId: z.string().optional(),
  broadcasterId: z.string().optional(),
  autoStart: z.boolean().optional(),
  autoStop: z.boolean().optional(),
  isHoliday: z.boolean().optional(),
});

router.get("/", async (req, res) => {
  const schedules = await prisma.schedule.findMany({
    include: { playlist: true, broadcaster: { select: { id: true, name: true } } },
    orderBy: { startTime: "asc" },
  });
  res.json(schedules);
});

router.post(
  "/",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN"),
  async (req, res) => {
    const parsed = scheduleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Data jadwal tidak valid", details: parsed.error.flatten() });

    const { specificDate, ...rest } = parsed.data;
    const schedule = await prisma.schedule.create({
      data: { ...rest, specificDate: specificDate ? new Date(specificDate) : undefined },
    });
    res.status(201).json(schedule);
  }
);

router.put("/:id", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), async (req, res) => {
  const parsed = scheduleSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Data tidak valid" });

  const { specificDate, ...rest } = parsed.data;
  const schedule = await prisma.schedule.update({
    where: { id: req.params.id },
    data: { ...rest, specificDate: specificDate ? new Date(specificDate) : undefined },
  });
  res.json(schedule);
});

router.post("/:id/copy", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), async (req, res) => {
  const original = await prisma.schedule.findUnique({ where: { id: req.params.id } });
  if (!original) return res.status(404).json({ error: "Jadwal tidak ditemukan." });

  const { id, ...data } = original;
  const copy = await prisma.schedule.create({ data });
  res.status(201).json(copy);
});

router.delete("/:id", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), async (req, res) => {
  await prisma.schedule.delete({ where: { id: req.params.id } });
  res.json({ message: "Jadwal dihapus." });
});

export default router;
