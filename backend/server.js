require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const registerHandlers = require("./socket/roomHandlers");

const app = express();
app.use(cors());
app.use(express.json());

// ── REST Routes ──────────────────────────────────────────────

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "YT Watch Party backend is running" });
});

// Check if a room exists (used by frontend before joining)
app.get("/room/:code", async (req, res) => {
  const Room = require("./models/Room");
  const room = await Room.findOne({ code: req.params.code.toUpperCase() });
  if (!room) return res.status(404).json({ exists: false });
  res.json({
    exists: true,
    participantCount: room.participants.length,
    videoId: room.videoId,
  });
});

// ── HTTP + Socket.IO Server ──────────────────────────────────

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ["websocket", "polling"],
});

io.on("connection", (socket) => {
  console.log(`[+] Socket connected: ${socket.id}`);
  registerHandlers(io, socket);

  socket.on("disconnect", () => {
    console.log(`[-] Socket disconnected: ${socket.id}`);
  });
});

// ── MongoDB + Start ──────────────────────────────────────────

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    server.listen(process.env.PORT, () => {
      console.log(`Server running on http://localhost:${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
