"use client";

export default function LiveBadge({ state }: { state: "LIVE" | "PAUSED" | "STOPPED" }) {
  const map = {
    LIVE: { label: "ON AIR", color: "bg-red-500/90 text-white animate-pulse" },
    PAUSED: { label: "PAUSE", color: "bg-amber-500/90 text-white" },
    STOPPED: { label: "OFF AIR", color: "bg-slate-400/80 text-white" },
  } as const;

  const { label, color } = map[state] || map.STOPPED;

  return <span className={`badge ${color}`}>{label}</span>;
}
