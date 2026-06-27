import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { getIO } from "../socket";

const router = Router();

const announcementSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  type: z.enum(["text", "image", "video", "pdf", "audio"]).optional(),
  mediaUrl: z.string().optional(),
  isPinned: z.boolean().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

router.get("/", async (req, res) => {
  const announcements = await prisma.announcement.findMany({
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });
  res.json(announcements);
});

router.post(
  "/",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "GURU", "PENYIAR"),
  async (req: AuthRequest, res) => {
    const parsed = announcementSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Data tidak valid", details: parsed.error.flatten() });

    const { startsAt, endsAt, ...rest } = parsed.data;
    const announcement = await prisma.announcement.create({
      data: {
        ...rest,
        authorId: req.user?.userId,
        startsAt: startsAt ? new Date(startsAt) : undefined,
        endsAt: endsAt ? new Date(endsAt) : undefined,
      },
    });

    getIO()?.emit("announcement:new", announcement);
    res.status(201).json(announcement);
  }
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "GURU", "PENYIAR"),
  async (req, res) => {
    await prisma.announcement.delete({ where: { id: req.params.id } });
    getIO()?.emit("announcement:deleted", { id: req.params.id });
    res.json({ message: "Pengumuman dihapus." });
  }
);

export default router;
