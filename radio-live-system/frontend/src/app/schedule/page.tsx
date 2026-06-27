"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";

interface Playlist {
  id: string;
  name: string;
}

interface Schedule {
  id: string;
  title: string;
  dayOfWeek?: number;
  startTime: string;
  endTime: string;
  playlist?: Playlist;
  autoStart: boolean;
  autoStop: boolean;
}

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [form, setForm] = useState({
    title: "",
    dayOfWeek: 1,
    startTime: "07:00",
    endTime: "08:00",
    playlistId: "",
  });

  async function refresh() {
    const [s, p] = await Promise.all([api.get("/api/schedules"), api.get("/api/playlists")]);
    setSchedules(s.data);
    setPlaylists(p.data);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createSchedule(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/api/schedules", {
      ...form,
      dayOfWeek: Number(form.dayOfWeek),
      playlistId: form.playlistId || undefined,
    });
    setForm({ ...form, title: "" });
    refresh();
  }

  async function copySchedule(id: string) {
    await api.post(`/api/schedules/${id}/copy`);
    refresh();
  }

  async function removeSchedule(id: string) {
    await api.delete(`/api/schedules/${id}`);
    refresh();
  }

  return (
    <main>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={createSchedule}
          className="glass-card p-6 grid md:grid-cols-2 gap-3"
        >
          <input
            required
            placeholder="Judul siaran"
            className="input-field md:col-span-2"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <select
            className="input-field"
            value={form.dayOfWeek}
            onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) })}
          >
            {DAYS.map((d, i) => (
              <option key={i} value={i}>{d}</option>
            ))}
          </select>
          <select
            className="input-field"
            value={form.playlistId}
            onChange={(e) => setForm({ ...form, playlistId: e.target.value })}
          >
            <option value="">Tanpa playlist</option>
            {playlists.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input
            type="time"
            className="input-field"
            value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
          />
          <input
            type="time"
            className="input-field"
            value={form.endTime}
            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
          />
          <button className="btn-primary md:col-span-2">+ Tambah Jadwal</button>
        </motion.form>

        <div className="glass-card p-6">
          <h2 className="font-semibold mb-3">🗓️ Jadwal Siaran</h2>
          <div className="space-y-2">
            {schedules.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-white/5">
                <div>
                  <p className="font-medium text-sm">{s.title}</p>
                  <p className="text-xs text-slate-500">
                    {s.dayOfWeek !== undefined && s.dayOfWeek !== null ? DAYS[s.dayOfWeek] : "-"} · {s.startTime}–{s.endTime}
                    {s.playlist && ` · ${s.playlist.name}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => copySchedule(s.id)} className="btn-secondary text-xs px-3 py-1.5">Copy</button>
                  <button onClick={() => removeSchedule(s.id)} className="text-red-500 hover:underline text-xs">Hapus</button>
                </div>
              </div>
            ))}
            {schedules.length === 0 && <p className="text-sm text-slate-500">Belum ada jadwal.</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
