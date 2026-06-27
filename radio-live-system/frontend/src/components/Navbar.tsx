"use client";

import Link from "next/link";
import { useAuthStore } from "@/lib/store";

const links = [
  { href: "/", label: "Live Radio" },
  { href: "/request", label: "Request Lagu" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/songs", label: "Lagu" },
  { href: "/playlist", label: "Playlist" },
  { href: "/schedule", label: "Jadwal" },
];

export default function Navbar() {
  const { user, logout } = useAuthStore();

  return (
    <nav className="glass-card mx-4 mt-4 px-5 py-3 flex items-center justify-between sticky top-4 z-50">
      <Link href="/" className="font-bold text-lg tracking-tight">
        📻 Radio<span className="text-brand-500">Live</span>
      </Link>
      <div className="hidden md:flex gap-4 text-sm">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-brand-500 transition-colors">
            {l.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-2">
        {user ? (
          <>
            <span className="text-sm hidden sm:inline">{user.name} · {user.role}</span>
            <button onClick={logout} className="btn-secondary text-sm">Logout</button>
          </>
        ) : (
          <Link href="/login" className="btn-primary text-sm">Login</Link>
        )}
      </div>
    </nav>
  );
}
