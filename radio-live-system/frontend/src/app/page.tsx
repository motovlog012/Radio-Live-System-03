"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import Navbar from "@/components/Navbar";
import AudioPlayer from "@/components/AudioPlayer";
import LiveBadge from "@/components/LiveBadge";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { getStreamUrl } from "@/lib/runtime-config";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  isPinned: boolean;
}

export default function HomePage() {
  const [broadcastState, setBroadcastState] = useState<"LIVE" | "PAUSED" | "STOPPED">("STOPPED");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [requestUrl, setRequestUrl] = useState("");

  useEffect(() => {
    // QR code mengikuti URL aplikasi saat ini secara otomatis (tidak hardcode)
    if (typeof window !== "undefined") {
      setRequestUrl(`${window.location.origin}/request`);
    }

    api.get("/api/broadcast/status").then((res) => setBroadcastState(res.data.state));
    api.get("/api/announcements").then((res) => setAnnouncements(res.data));

    const socket = getSocket();
    socket.emit("listener:join");
    socket.on("broadcast:state", (data) => setBroadcastState(data.state));
    socket.on("announcement:new", (a: Announcement) => setAnnouncements((prev) => [a, ...prev]));

    return () => {
      socket.off("broadcast:state");
      socket.off("announcement:new");
    };
  }, []);

  const streamUrl = getStreamUrl();

  return (
    <main>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-10 grid md:grid-cols-3 gap-6">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-2 space-y-6"
        >
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">Live Radio</h1>
              <LiveBadge state={broadcastState} />
            </div>
            <AudioPlayer streamUrl={streamUrl} />
            <p className="text-xs text-slate-500 mt-3">
              Catatan: arahkan <code>NEXT_PUBLIC_STREAM_URL</code> ke mount point Icecast/SHOUTcast Anda.
            </p>
          </div>

          <div className="glass-card p-6">
            <h2 className="font-semibold mb-3">📢 Pengumuman</h2>
            {announcements.length === 0 && (
              <p className="text-sm text-slate-500">Belum ada pengumuman.</p>
            )}
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="border-l-4 border-brand-400 pl-3">
                  <p className="font-medium text-sm">
                    {a.isPinned && "📌 "}
                    {a.title}
                  </p>
                  <p className="text-sm text-slate-500">{a.content}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 text-center space-y-3"
        >
          <h2 className="font-semibold">🎵 Request Lagu</h2>
          <p className="text-sm text-slate-500">Scan QR untuk request lagu favoritmu!</p>
          {requestUrl && (
            <div className="bg-white p-3 rounded-xl inline-block">
              <QRCodeSVG value={requestUrl} size={160} />
            </div>
          )}
          <p className="text-xs break-all text-slate-400">{requestUrl}</p>
          <a href="/request" className="btn-primary inline-block w-full">
            Atau klik di sini
          </a>
        </motion.section>
      </div>
    </main>
  );
}
