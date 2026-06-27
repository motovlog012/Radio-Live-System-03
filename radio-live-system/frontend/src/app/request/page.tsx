"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";

interface SongRequest {
  id: string;
  studentName: string;
  className?: string;
  songTitle: string;
  artist?: string;
  message?: string;
  emoji?: string;
  status: string;
  createdAt: string;
}

const statusStyle: Record<string, string> = {
  MENUNGGU: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  DIPUTAR: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  DITOLAK: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  DIPINDAHKAN: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  SELESAI: "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300",
};

export default function RequestPage() {
  const [form, setForm] = useState({
    studentName: "",
    className: "",
    songTitle: "",
    artist: "",
    message: "",
    emoji: "🎵",
    isAnonymous: false,
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [board, setBoard] = useState<SongRequest[]>([]);

  useEffect(() => {
    api.get("/api/requests").then((res) => setBoard(res.data));

    const socket = getSocket();
    socket.on("request:new", (r: SongRequest) => setBoard((prev) => [r, ...prev]));
    socket.on("request:update", (r: Partial<SongRequest> & { id: string }) =>
      setBoard((prev) => prev.map((item) => (item.id === r.id ? { ...item, ...r } : item)))
    );

    return () => {
      socket.off("request:new");
      socket.off("request:update");
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const { data } = await api.post("/api/requests", form);
      if (data.merged) {
        setFeedback("Lagu yang sama sudah direquest, kami gabungkan dan naikkan prioritasnya! 🎶");
      } else if (data.movedToNextDay) {
        setFeedback("Antrean hari ini penuh — request kamu otomatis dipindahkan ke hari berikutnya. Tetap masuk antrean, tidak hilang! 📅");
      } else {
        setFeedback("Request berhasil dikirim! Tunggu giliranmu di antrean. 🎉");
      }
      setForm({ ...form, songTitle: "", artist: "", message: "" });
    } catch (err: any) {
      setFeedback(err.response?.data?.error || "Gagal mengirim request, coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-6">
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="glass-card p-6 space-y-3"
        >
          <h1 className="text-xl font-bold mb-2">🎵 Request Lagu</h1>

          <AnimatePresence>
            {feedback && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm p-3 rounded-xl bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-200"
              >
                {feedback}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-3">
            <input
              required
              placeholder="Nama"
              className="input-field"
              value={form.studentName}
              onChange={(e) => setForm({ ...form, studentName: e.target.value })}
              disabled={form.isAnonymous}
            />
            <input
              placeholder="Kelas"
              className="input-field"
              value={form.className}
              onChange={(e) => setForm({ ...form, className: e.target.value })}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isAnonymous}
              onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })}
            />
            Kirim sebagai anonim
          </label>

          <input
            required
            placeholder="Judul Lagu"
            className="input-field"
            value={form.songTitle}
            onChange={(e) => setForm({ ...form, songTitle: e.target.value })}
          />
          <input
            placeholder="Penyanyi"
            className="input-field"
            value={form.artist}
            onChange={(e) => setForm({ ...form, artist: e.target.value })}
          />
          <textarea
            placeholder="Pesan / alasan request (opsional)"
            className="input-field"
            rows={3}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />

          <div className="flex gap-2 flex-wrap">
            {["🎵", "❤️", "🔥", "😢", "🎉", "✨"].map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setForm({ ...form, emoji: e })}
                className={`text-xl p-1 rounded-lg ${form.emoji === e ? "bg-brand-100 dark:bg-brand-900/50" : ""}`}
              >
                {e}
              </button>
            ))}
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Mengirim..." : "Kirim Request"}
          </button>
        </motion.form>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <h2 className="font-semibold mb-3">📡 Live Request Board</h2>
          <div className="space-y-2 max-h-[520px] overflow-y-auto">
            <AnimatePresence>
              {board.map((r) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-white/5"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {r.emoji} {r.songTitle} {r.artist && `— ${r.artist}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      {r.studentName} {r.className && `· ${r.className}`}
                    </p>
                  </div>
                  <span className={`badge ${statusStyle[r.status] || ""}`}>{r.status}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {board.length === 0 && <p className="text-sm text-slate-500">Belum ada request.</p>}
          </div>
        </motion.section>
      </div>
    </main>
  );
}
