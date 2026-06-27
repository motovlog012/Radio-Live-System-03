"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { getApiUrl } from "@/lib/runtime-config";

interface Song {
  id: string;
  title: string;
  artist: string;
  filePath?: string;
  genre?: string;
  duration?: number;
}

export default function SongsPage() {
  const { user } = useAuthStore();
  const [songs, setSongs] = useState<Song[]>([]);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    const { data } = await api.get("/api/songs");
    setSongs(data);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !artist.trim()) {
      setError("Judul dan penyanyi wajib diisi.");
      return;
    }
    setError("");
    setUploading(true);
    setProgress(0);

    try {
      let filePath: string | undefined;

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const { data } = await api.post("/api/upload/song", formData, {
          onUploadProgress: (evt) => {
            if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100));
          },
        });
        filePath = data.filePath;
      }

      await api.post("/api/songs", { title, artist, genre: genre || undefined, filePath });

      setTitle("");
      setArtist("");
      setGenre("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      refresh();
    } catch (err: any) {
      setError(err.response?.data?.error || "Gagal menambahkan lagu / upload file.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  async function removeSong(id: string) {
    await api.delete(`/api/songs/${id}`);
    refresh();
  }

  const canManage = user && ["SUPER_ADMIN", "ADMIN", "OPERATOR"].includes(user.role);

  return (
    <main>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        {!canManage && (
          <div className="glass-card p-6 text-center text-sm text-slate-500">
            Login sebagai Admin/Operator untuk menambahkan atau mengunggah lagu. Daftar lagu di bawah tetap bisa dilihat semua orang.
          </div>
        )}

        {canManage && (
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="glass-card p-6 space-y-3"
          >
            <h1 className="text-xl font-bold mb-2">🎶 Tambah / Upload Lagu</h1>
            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="grid md:grid-cols-2 gap-3">
              <input className="input-field" placeholder="Judul lagu" value={title} onChange={(e) => setTitle(e.target.value)} />
              <input className="input-field" placeholder="Penyanyi" value={artist} onChange={(e) => setArtist(e.target.value)} />
              <input className="input-field" placeholder="Genre (opsional)" value={genre} onChange={(e) => setGenre(e.target.value)} />
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/mpeg,audio/wav,audio/flac,audio/aac,audio/ogg,audio/mp4,audio/x-m4a"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="input-field file:mr-3 file:px-3 file:py-1 file:rounded-lg file:border-0 file:bg-brand-500 file:text-white"
              />
            </div>

            <p className="text-xs text-slate-500">
              Format didukung: MP3, WAV, FLAC, AAC, OGG, M4A. Maks {process.env.NEXT_PUBLIC_MAX_UPLOAD_MB || 20}MB.
              File audio bersifat opsional — Anda juga bisa menambahkan metadata lagu tanpa file.
            </p>

            {uploading && file && (
              <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}

            <button type="submit" disabled={uploading} className="btn-primary w-full">
              {uploading ? "Mengunggah..." : "+ Tambah Lagu"}
            </button>
          </motion.form>
        )}

        <div className="glass-card p-6">
          <h2 className="font-semibold mb-3">📀 Daftar Lagu</h2>
          <div className="space-y-2">
            {songs.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-white/5">
                <div>
                  <p className="text-sm font-medium">{s.title} — {s.artist}</p>
                  <p className="text-xs text-slate-500">
                    {s.genre || "Tanpa genre"} {s.filePath && "· 🎵 file tersedia"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {s.filePath && (
                    <a
                      href={s.filePath.startsWith("http") ? s.filePath : `${getApiUrl()}${s.filePath}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      Dengarkan
                    </a>
                  )}
                  {canManage && (
                    <button onClick={() => removeSong(s.id)} className="text-red-500 hover:underline text-xs">
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            ))}
            {songs.length === 0 && <p className="text-sm text-slate-500">Belum ada lagu.</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
