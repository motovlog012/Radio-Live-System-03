import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { getIO } from "../socket";

const router = Router();

// Status broadcast terkini (singleton sederhana - ambil/buat sesi terakhir)
async function getOrCreateActiveSession() {
  let session = await prisma.broadcastSession.findFirst({ orderBy: { createdAt: "desc" } });
  if (!session) {
    session = await prisma.broadcastSession.create({ data: {} });
  }
  return session;
}

router.get("/status", async (req, res) => {
  const session = await getOrCreateActiveSession();
  res.json(session);
});

router.post(
  "/start",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "PENYIAR"),
  async (req: AuthRequest, res) => {
    const session = await prisma.broadcastSession.create({
      data: { state: "LIVE", startedAt: new Date() },
    });
    await prisma.activityLog.create({
      data: { userId: req.user?.userId, action: "BROADCAST_START" },
    });
    getIO()?.emit("broadcast:state", session);
    res.json(session);
  }
);

router.post(
  "/stop",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "PENYIAR"),
  async (req: AuthRequest, res) => {
    const session = await getOrCreateActiveSession();
    const updated = await prisma.broadcastSession.update({
      where: { id: session.id },
      data: { state: "STOPPED", endedAt: new Date() },
    });
    await prisma.activityLog.create({
      data: { userId: req.user?.userId, action: "BROADCAST_STOP" },
    });
    getIO()?.emit("broadcast:state", updated);
    res.json(updated);
  }
);

router.post(
  "/pause",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "PENYIAR"),
  async (req: AuthRequest, res) => {
    const session = await getOrCreateActiveSession();
    const updated = await prisma.broadcastSession.update({
      where: { id: session.id },
      data: { state: "PAUSED" },
    });
    getIO()?.emit("broadcast:state", updated);
    res.json(updated);
  }
);

router.post(
  "/resume",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "PENYIAR"),
  async (req: AuthRequest, res) => {
    const session = await getOrCreateActiveSession();
    const updated = await prisma.broadcastSession.update({
      where: { id: session.id },
      data: { state: "LIVE" },
    });
    getIO()?.emit("broadcast:state", updated);
    res.json(updated);
  }
);

router.post(
  "/now-playing",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "PENYIAR", "OPERATOR"),
  async (req: AuthRequest, res) => {
    const { songId } = req.body as { songId: string };
    const session = await getOrCreateActiveSession();
    const updated = await prisma.broadcastSession.update({
      where: { id: session.id },
      data: { currentSongId: songId },
    });
    getIO()?.emit("broadcast:nowplaying", updated);
    res.json(updated);
  }
);

export default router;
