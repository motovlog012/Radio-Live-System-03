"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";

interface Song {
  id: string;
  title: string;
  artist: string;
}

interface PlaylistItem {
  id: string;
  song: Song;
  order: number;
}

interface Playlist {
  id: string;
  name: string;
  items: PlaylistItem[];
}

export default function PlaylistPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>("");

  async function refresh() {
    const [pl, sg] = await Promise.all([api.get("/api/playlists"), api.get("/api/songs")]);
    setPlaylists(pl.data);
    setSongs(sg.data);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createPlaylist(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    await api.post("/api/playlists", { name: newPlaylistName });
    setNewPlaylistName("");
    refresh();
  }

  async function addSongToPlaylist(playlistId: string, songId: string) {
    await api.post(`/api/playlists/${playlistId}/items`, { songId });
    refresh();
  }

  async function removeItem(itemId: string) {
    await api.delete(`/api/playlists/items/${itemId}`);
    refresh();
  }

  return (
    <main>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={createPlaylist}
          className="glass-card p-6 flex gap-3"
        >
          <input
            className="input-field"
            placeholder="Nama playlist baru..."
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
          />
          <button className="btn-primary whitespace-nowrap">+ Buat Playlist</button>
        </motion.form>

        <div className="grid md:grid-cols-2 gap-6">
          {playlists.map((pl) => (
            <div key={pl.id} className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">🎼 {pl.name}</h3>
                <select
                  className="input-field text-sm py-1 w-auto"
                  onChange={(e) => e.target.value && addSongToPlaylist(pl.id, e.target.value)}
                  value=""
                >
                  <option value="">+ Tambah lagu</option>
                  {songs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} — {s.artist}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                {pl.items.length === 0 && <p className="text-sm text-slate-500">Belum ada lagu.</p>}
                {pl.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-white/60 dark:bg-white/5">
                    <span>{item.song.title} — {item.song.artist}</span>
                    <button onClick={() => removeItem(item.id)} className="text-red-500 hover:underline text-xs">
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {playlists.length === 0 && <p className="text-sm text-slate-500">Belum ada playlist.</p>}
        </div>
      </div>
    </main>
  );
}
