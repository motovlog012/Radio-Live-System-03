import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const password = await bcrypt.hash("password123", 10);

  const users = [
    { name: "Super Admin", email: "superadmin@radio.local", role: "SUPER_ADMIN" as const },
    { name: "Admin Radio", email: "admin@radio.local", role: "ADMIN" as const },
    { name: "Penyiar Utama", email: "penyiar@radio.local", role: "PENYIAR" as const },
    { name: "Operator Playlist", email: "operator@radio.local", role: "OPERATOR" as const },
    { name: "Guru Pengumuman", email: "guru@radio.local", role: "GURU" as const },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash: password },
    });
  }

  const songs = [
    { title: "Sunrise Groove", artist: "DJ Nadia", genre: "Pop", duration: 210 },
    { title: "Morning Vibes", artist: "Studio Kelas", genre: "Lo-fi", duration: 180 },
    { title: "Semangat Pagi", artist: "Band Sekolah", genre: "Pop Indonesia", duration: 200 },
  ];

  const createdSongs = [];
  for (const s of songs) {
    let song = await prisma.song.findFirst({ where: { title: s.title } });
    if (!song) song = await prisma.song.create({ data: s });
    createdSongs.push(song);
  }

  let playlist = await prisma.playlist.findFirst({ where: { name: "Playlist Pagi" } });
  if (!playlist) playlist = await prisma.playlist.create({ data: { name: "Playlist Pagi" } });

  for (let i = 0; i < createdSongs.length; i++) {
    const exists = await prisma.playlistItem.findFirst({
      where: { playlistId: playlist.id, songId: createdSongs[i].id },
    });
    if (!exists) {
      await prisma.playlistItem.create({
        data: { playlistId: playlist.id, songId: createdSongs[i].id, order: i },
      });
    }
  }

  console.log("Seed selesai. Akun default (password: password123):");
  users.forEach((u) => console.log(`- ${u.role}: ${u.email}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
