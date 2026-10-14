import { createServer } from "node:http";
import { Server } from "socket.io";
import { verifyToken } from "../lib/jwt";
import { UserModel } from "../model/User";
import dbConnect from "../lib/dbConnect";
import { TicketModel } from "../model/Ticket";


const PORT = Number(process.env.SOCKET_PORT || 4001);
const INTERNAL_SECRET =
  process.env.SOCKET_INTERNAL_SECRET || "replace_this_with_a_long_random_secret";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

type SocketUser = {
  userId: string;
  email: string;
  role: "author" | "admin";
  name: string;
};

function getCookieToken(cookieHeader = "") {
  const token = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("token="))
    ?.slice("token=".length);

  if (!token) return undefined;

  try {
    return decodeURIComponent(token);
  } catch {
    return token;
  }
}

async function findSocketUser(token: string): Promise<SocketUser | null> {
  const decoded = await verifyToken(token);

  if (
    !decoded ||
    typeof decoded !== "object" ||
    typeof decoded.userId !== "string" ||
    typeof decoded.email !== "string" ||
    (decoded.role !== "author" && decoded.role !== "admin")
  ) {
    return null;
  }

  await dbConnect();

  const user = await UserModel.findOne({
    email: decoded.email.toLowerCase().trim(),
  }).select("_id name email role");

  if (
    !user ||
    user._id.toString() !== decoded.userId ||
    user.role !== decoded.role
  ) {
    return null;
  }

  return {
    userId: user._id.toString(),
    email: user.email,
    role: user.role as "author" | "admin",
    name: user.name,
  };
}

io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      getCookieToken(socket.handshake.headers.cookie);

    if (token) {
      const user = await findSocketUser(token);
      if (user) {
        socket.data.user = user;
      }
    }

    next();
  } catch (error) {
    console.error("Socket authentication error:", error);
    next();
  }
});

io.on("connection", (socket) => {
  const user = socket.data.user as SocketUser | undefined;

  console.log(`Socket connected: ${socket.id} (${user?.role || "client"})`);

  socket.on("ticket:join", async (ticketId: string, callback) => {
    try {
      if (typeof ticketId !== "string" || !ticketId.trim()) {
        return callback?.({ success: false, message: "Invalid ticket ID." });
      }

      await dbConnect();

      const ticket = await TicketModel.findOne({
        $or: [
          { _id: ticketId.match(/^[a-f\d]{24}$/i) ? ticketId : null },
          { ticket_id: ticketId },
        ],
      }).select("_id author_email");

      if (!ticket) {
        return callback?.({ success: false, message: "Ticket not found." });
      }

      if (
        user &&
        user.role !== "admin" &&
        ticket.author_email.toLowerCase() !== user.email.toLowerCase()
      ) {
        return callback?.({ success: false, message: "Access denied." });
      }

      const room = `ticket:${ticket._id.toString()}`;
      await socket.join(room);

      callback?.({ success: true, room });
    } catch (error) {
      console.error("Ticket room join error:", error);
      callback?.({ success: false, message: "Unable to join ticket room." });
    }
  });

  socket.on("ticket:leave", async (ticketId: string) => {
    if (typeof ticketId !== "string") return;

    try {
      await dbConnect();

      const ticket = await TicketModel.findOne({
        $or: [
          { _id: ticketId.match(/^[a-f\d]{24}$/i) ? ticketId : null },
          { ticket_id: ticketId },
        ],
      }).select("_id");

      if (ticket) {
        await socket.leave(`ticket:${ticket._id.toString()}`);
      }
    } catch (error) {
      console.error("Ticket room leave error:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Private HTTP endpoint used by Next.js API routes to emit persisted events.
httpServer.on("request", async (req, res) => {
  if (req.url !== "/internal/emit" || req.method !== "POST") return;

  if (
    !INTERNAL_SECRET ||
    req.headers["x-internal-secret"] !== INTERNAL_SECRET
  ) {
    res.writeHead(401);
    res.end("Unauthorized");
    return;
  }

  try {
    let body = "";

    for await (const chunk of req) {
      body += chunk.toString();
      if (body.length > 100_000) {
        res.writeHead(413);
        res.end("Payload too large");
        return;
      }
    }

    const payload = JSON.parse(body) as {
      ticketMongoId?: string;
      event?: string;
      data?: unknown;
    };

    if (
      !payload.ticketMongoId ||
      !["message:new", "ticket:updated", "ticket:new"].includes(payload.event || "")
    ) {
      res.writeHead(400);
      res.end("Invalid event");
      return;
    }

    io.to(`ticket:${payload.ticketMongoId}`).emit(
      payload.event!,
      payload.data,
    );
    // Broadcast globally to trigger sidebar lights & title notifications for all active sessions
    io.emit(payload.event!, payload.data);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true }));
  } catch (error) {
    console.error("Socket internal emit error:", error);
    res.writeHead(400);
    res.end("Invalid request");
  }
});

httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running at http://localhost:${PORT}`);
});