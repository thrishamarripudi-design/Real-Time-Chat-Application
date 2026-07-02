import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
    credentials: true,
  },
});

// userId -> socketId. Using a plain object is fine since one process holds
// all connections here (no horizontal scaling in this setup).
const userSocketMap = {};

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  console.log(`Socket connected: ${socket.id} (userId: ${userId})`);

  if (userId) {
    userSocketMap[userId] = socket.id;
    socket.userId = userId;
  }

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // ---------- WebRTC signaling (video/audio calls) ----------
  // Caller starts a call: relay an offer to the callee if they're online.
  socket.on("call:offer", ({ to, offer, callType, callerInfo }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:incoming", {
        from: userId,
        offer,
        callType, // "video" | "audio"
        callerInfo,
      });
    } else {
      socket.emit("call:unavailable", { to });
    }
  });

  // Callee accepts: relay answer back to caller.
  socket.on("call:answer", ({ to, answer }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:answer", { from: userId, answer });
    }
  });

  // ICE candidates exchanged both directions.
  socket.on("call:ice-candidate", ({ to, candidate }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:ice-candidate", { from: userId, candidate });
    }
  });

  // Callee declines, or caller/callee hangs up / cancels.
  socket.on("call:reject", ({ to }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:rejected", { from: userId });
    }
  });

  socket.on("call:end", ({ to }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:ended", { from: userId });
    }
  });

  // ---------- Typing indicator (bonus, wired up in ChatContainer) ----------
  socket.on("typing:start", ({ to }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) io.to(receiverSocketId).emit("typing:start", { from: userId });
  });

  socket.on("typing:stop", ({ to }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) io.to(receiverSocketId).emit("typing:stop", { from: userId });
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id} (userId: ${userId})`);
    if (userId) delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };