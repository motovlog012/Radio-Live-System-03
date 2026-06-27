import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Radio Live Broadcasting Management System",
  description: "Sistem manajemen siaran radio sekolah/kampus/komunitas — live streaming, request lagu, jadwal otomatis.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen">
        {/* Berisi window.__ENV__ yang di-generate saat container start (lihat scripts/inject-env.sh).
            Wajib dimuat sebelum script lain agar api.ts & socket.ts membaca URL yang benar. */}
        <Script src="/runtime-env.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
