import { Server } from "socket.io";
import { Server as HttpServer } from "http";

let io: Server | null = null;

export function initIO(httpServer: HttpServer) {
  const allowedOrigins = (process.env.CORS_ORIGIN || "*")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins.includes("*") ? "*" : allowedOrigins,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    // Listener bergabung ke "room" radio untuk update realtime
    socket.on("listener:join", () => {
      socket.join("listeners");
      io?.to("admin").emit("listener:count", io.sockets.adapter.rooms.get("listeners")?.size || 0);
    });

    socket.on("admin:join", () => {
      socket.join("admin");
    });

    socket.on("disconnect", () => {
      io?.to("admin").emit("listener:count", io.sockets.adapter.rooms.get("listeners")?.size || 0);
    });
  });

  return io;
}

export function getIO() {
  return io;
}
