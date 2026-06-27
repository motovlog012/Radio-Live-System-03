import { io, Socket } from "socket.io-client";
import { getApiUrl } from "./runtime-config";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getApiUrl(), {
      withCredentials: true,
      autoConnect: true,
    });
  }
  return socket;
}
