import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", async (req, res) => {
  const playlists = await prisma.playlist.findMany({
    include: { items: { include: { song: true }, orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(playlists);
});

router.post(
  "/",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "OPERATOR", "PENYIAR"),
  async (req, res) => {
    const parsed = z.object({ name: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Nama playlist wajib diisi." });

    const playlist = await prisma.playlist.create({ data: { name: parsed.data.name } });
    res.status(201).json(playlist);
  }
);

router.post(
  "/:id/items",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "OPERATOR", "PENYIAR"),
  async (req, res) => {
    const parsed = z.object({ songId: z.string(), order: z.number().optional() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "songId wajib diisi." });

    const item = await prisma.playlistItem.create({
      data: { playlistId: req.params.id, songId: parsed.data.songId, order: parsed.data.order ?? 0 },
      include: { song: true },
    });
    res.status(201).json(item);
  }
);

router.delete(
  "/items/:itemId",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "OPERATOR", "PENYIAR"),
  async (req, res) => {
    await prisma.playlistItem.delete({ where: { id: req.params.itemId } });
    res.json({ message: "Item dihapus dari playlist." });
  }
);

router.put(
  "/:id/reorder",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "OPERATOR", "PENYIAR"),
  async (req, res) => {
    const parsed = z
      .object({ items: z.array(z.object({ id: z.string(), order: z.number() })) })
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Format reorder tidak valid." });

    await Promise.all(
      parsed.data.items.map((it) =>
        prisma.playlistItem.update({ where: { id: it.id }, data: { order: it.order } })
      )
    );
    res.json({ message: "Urutan playlist diperbarui." });
  }
);

router.delete("/:id", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), async (req, res) => {
  await prisma.playlist.delete({ where: { id: req.params.id } });
  res.json({ message: "Playlist dihapus." });
});

export default router;
