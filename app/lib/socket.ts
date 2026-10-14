import { io } from "socket.io-client";

export const socket = io(
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4001",
  {
    autoConnect: false,
    withCredentials: true,
    transports: ["websocket", "polling"],
  }
);