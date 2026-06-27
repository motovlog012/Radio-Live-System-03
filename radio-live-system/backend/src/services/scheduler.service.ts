import { prisma } from "../lib/prisma";
import { getIO } from "../socket";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function nowParts() {
  const d = new Date();
  return { day: d.getDay(), hhmm: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

/**
 * Scheduler sederhana: dicek setiap 60 detik, membandingkan waktu server
 * saat ini dengan startTime/endTime pada tabel Schedule (berbasis hari
 * dalam minggu). Jika cocok, broadcast otomatis di-start/stop dan event
 * dikirim lewat Socket.io supaya dashboard ter-update realtime.
 *
 * Catatan: untuk akurasi tinggi di produksi skala besar, pertimbangkan
 * mengganti pendekatan ini dengan job scheduler terdedikasi (mis. BullMQ
 * + Redis) agar tahan terhadap restart container & multiple instance.
 */
export function startScheduler() {
  setInterval(async () => {
    try {
      const { day, hhmm } = nowParts();

      const startingSchedules = await prisma.schedule.findMany({
        where: { dayOfWeek: day, startTime: hhmm, autoStart: true, isHoliday: false },
      });

      for (const s of startingSchedules) {
        const session = await prisma.broadcastSession.create({
          data: { state: "LIVE", startedAt: new Date() },
        });
        getIO()?.emit("broadcast:state", session);
        getIO()?.emit("scheduler:event", { type: "AUTO_START", schedule: s });
        await prisma.activityLog.create({
          data: { action: "SCHEDULER_AUTO_START", details: `Jadwal "${s.title}" memulai siaran otomatis` },
        });
        console.log(`[Scheduler] Auto-start: ${s.title}`);
      }

      const stoppingSchedules = await prisma.schedule.findMany({
        where: { dayOfWeek: day, endTime: hhmm, autoStop: true, isHoliday: false },
      });

      for (const s of stoppingSchedules) {
        const latest = await prisma.broadcastSession.findFirst({ orderBy: { createdAt: "desc" } });
        if (latest && latest.state !== "STOPPED") {
          const updated = await prisma.broadcastSession.update({
            where: { id: latest.id },
            data: { state: "STOPPED", endedAt: new Date() },
          });
          getIO()?.emit("broadcast:state", updated);
          getIO()?.emit("scheduler:event", { type: "AUTO_STOP", schedule: s });
          await prisma.activityLog.create({
            data: { action: "SCHEDULER_AUTO_STOP", details: `Jadwal "${s.title}" menghentikan siaran otomatis` },
          });
          console.log(`[Scheduler] Auto-stop: ${s.title}`);
        }
      }
    } catch (err) {
      console.error("[Scheduler] Error:", err);
    }
  }, 60 * 1000);

  console.log("📅 Scheduler radio aktif (cek setiap 60 detik).");
}
