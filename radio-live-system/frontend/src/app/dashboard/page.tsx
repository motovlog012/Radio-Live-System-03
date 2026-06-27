"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import LiveBadge from "@/components/LiveBadge";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/lib/store";

interface SongRequest {
  id: string;
  studentName: string;
  songTitle: string;
  artist?: string;
  status: string;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [broadcastState, setBroadcastState] = useState<"LIVE" | "PAUSED" | "STOPPED">("STOPPED");
  const [listeners, setListeners] = useState(0);
  const [pendingRequests, setPendingRequests] = useState<SongRequest[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    api.get("/api/broadcast/status").then((res) => setBroadcastState(res.data.state));
    api.get("/api/requests?status=MENUNGGU").then((res) => setPendingRequests(res.data));

    const socket = getSocket();
    socket.emit("admin:join");
    socket.on("broadcast:state", (d) => setBroadcastState(d.state));
    socket.on("listener:count", (count: number) => setListeners(count));
    socket.on("request:new", (r: SongRequest) => setPendingRequests((p) => [r, ...p]));
    socket.on("request:update", (r: any) =>
      setPendingRequests((p) => (r.status === "MENUNGGU" ? p : p.filter((x) => x.id !== r.id)))
    );

    return () => {
      socket.off("broadcast:state");
      socket.off("listener:count");
      socket.off("request:new");
      socket.off("request:update");
    };
  }, []);

  async function control(action: "start" | "stop" | "pause" | "resume") {
    setActionLoading(true);
    try {
      const { data } = await api.post(`/api/broadcast/${action}`);
      setBroadcastState(data.state);
    } catch {
      alert("Gagal mengubah status broadcast. Pastikan Anda login sebagai Admin/Penyiar.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRequest(id: string, status: "DIPUTAR" | "DITOLAK" | "SELESAI") {
    await api.patch(`/api/requests/${id}`, { status });
    setPendingRequests((p) => p.filter((r) => r.id !== id));
  }

  if (!user) {
    return (
      <main>
        <Navbar />
        <div className="max-w-md mx-auto mt-20 glass-card p-8 text-center">
          <p>Silakan login untuk mengakses dashboard.</p>
          <a href="/login" className="btn-primary inline-block mt-4">Login</a>
        </div>
      </main>
    );
  }

  const stats = [
    { label: "Status", value: <LiveBadge state={broadcastState} /> },
    { label: "Pendengar", value: listeners },
    { label: "Request Menunggu", value: pendingRequests.length },
    { label: "Role Anda", value: user.role },
  ];

  return (
    <main>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {stats.map((s) => (
            <div key={s.label} className="glass-card p-4 text-center">
              <p className="text-xs text-slate-500">{s.label}</p>
              <div className="text-xl font-bold mt-1">{s.value}</div>
            </div>
          ))}
        </motion.div>

        <div className="glass-card p-6">
          <h2 className="font-semibold mb-3">🎚️ Kontrol Siaran</h2>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => control("start")} disabled={actionLoading} className="btn-primary">▶ Start</button>
            <button onClick={() => control("pause")} disabled={actionLoading} className="btn-secondary">⏸ Pause</button>
            <button onClick={() => control("resume")} disabled={actionLoading} className="btn-secondary">⏵ Resume</button>
            <button onClick={() => control("stop")} disabled={actionLoading} className="btn-secondary">⏹ Stop</button>
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="font-semibold mb-3">🗂️ Moderasi Request Lagu</h2>
          <div className="space-y-2">
            {pendingRequests.length === 0 && <p className="text-sm text-slate-500">Tidak ada request menunggu.</p>}
            {pendingRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-white/5">
                <div>
                  <p className="text-sm font-medium">{r.songTitle} {r.artist && `— ${r.artist}`}</p>
                  <p className="text-xs text-slate-500">dari {r.studentName}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleRequest(r.id, "DIPUTAR")} className="btn-primary text-xs px-3 py-1.5">Putar</button>
                  <button onClick={() => handleRequest(r.id, "DITOLAK")} className="btn-secondary text-xs px-3 py-1.5">Tolak</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
