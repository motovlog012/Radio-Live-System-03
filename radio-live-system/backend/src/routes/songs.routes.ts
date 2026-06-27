import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

const songSchema = z.object({
  title: z.string().min(1),
  artist: z.string().min(1),
  filePath: z.string().optional(),
  duration: z.number().int().optional(),
  genre: z.string().optional(),
  tags: z.string().optional(),
});

router.get("/", async (req, res) => {
  const { search, genre } = req.query;
  const where: any = {};
  if (search) {
    where.OR = [
      { title: { contains: String(search) } },
      { artist: { contains: String(search) } },
    ];
  }
  if (genre) where.genre = String(genre);

  const songs = await prisma.song.findMany({ where, orderBy: { createdAt: "desc" } });
  res.json(songs);
});

router.post("/", requireAuth, requireRole("SUPER_ADMIN", "ADMIN", "OPERATOR"), async (req, res) => {
  const parsed = songSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Data tidak valid", details: parsed.error.flatten() });

  const song = await prisma.song.create({ data: parsed.data });
  res.status(201).json(song);
});

router.put("/:id", requireAuth, requireRole("SUPER_ADMIN", "ADMIN", "OPERATOR"), async (req, res) => {
  const parsed = songSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Data tidak valid" });

  const song = await prisma.song.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(song);
});

router.delete("/:id", requireAuth, requireRole("SUPER_ADMIN", "ADMIN", "OPERATOR"), async (req, res) => {
  await prisma.song.delete({ where: { id: req.params.id } });
  res.json({ message: "Lagu dihapus." });
});

export default router;
