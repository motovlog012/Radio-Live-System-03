"use client";

import { useRef, useState } from "react";

export default function AudioPlayer({ streamUrl }: { streamUrl: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(() => {
        // Autoplay mungkin diblokir browser sampai user berinteraksi
      });
    }
    setPlaying(!playing);
  }

  function onVolumeChange(v: number) {
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  }

  return (
    <div className="glass-card p-5 flex items-center gap-4">
      <audio ref={audioRef} src={streamUrl} preload="none" />
      <button
        onClick={toggle}
        className="w-14 h-14 rounded-full bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center text-xl shrink-0 transition-colors"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? "❚❚" : "▶"}
      </button>
      <div className="flex-1">
        <p className="text-sm text-slate-500 dark:text-slate-400">Live Stream</p>
        <p className="font-semibold">{playing ? "Sedang memutar..." : "Tekan play untuk mendengarkan"}</p>
      </div>
      <div className="flex items-center gap-2 w-28">
        <span className="text-xs">🔊</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="w-full accent-brand-500"
        />
      </div>
    </div>
  );
}
