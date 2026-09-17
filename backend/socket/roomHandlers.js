const Room = require("../models/Room");

// Generate a random 6-character room code
function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Fetch the role of a socket from DB — used for backend permission checks
async function getRole(roomCode, socketId) {
  const room = await Room.findOne({ code: roomCode });
  if (!room) return null;
  const participant = room.participants.find((p) => p.socketId === socketId);
  return participant ? participant.role : null;
}

module.exports = function registerHandlers(io, socket) {
  // ─────────────────────────────────────────────
  // JOIN ROOM
  // Called when a user creates or joins a room
  // ─────────────────────────────────────────────
  socket.on("join_room", async ({ roomCode, username, create }) => {
    try {
      let room;

      if (create) {
        // Creating a new room — this user becomes the host
        const code = roomCode ? roomCode.toUpperCase() : generateCode();
        const existing = await Room.findOne({ code });
        if (existing) {
          return socket.emit("join_error", { message: "Room code already exists. Try a different one." });
        }
        room = new Room({ code });
        room.participants.push({ socketId: socket.id, username, role: "host" });
        await room.save();
      } else {
        // Joining an existing room — this user becomes a participant
        room = await Room.findOne({ code: roomCode.toUpperCase() });
        if (!room) return socket.emit("join_error", { message: "Room not found. Check the room code." });
        room.participants.push({ socketId: socket.id, username, role: "participant" });
        await room.save();
      }

      // Store room code and username on the socket for later use
      socket.join(room.code);
      socket.data.roomCode = room.code;
      socket.data.username = username;

      const myParticipant = room.participants.find((p) => p.socketId === socket.id);

      // Send current room state ONLY to the joining user (catch-up for feature #8)
      socket.emit("sync_state", {
        roomCode: room.code,
        videoId: room.videoId,
        isPlaying: room.isPlaying,
        currentTime: room.currentTime,
        participants: room.participants,
        yourRole: myParticipant.role,
      });

      // Notify everyone else in the room that a new user joined
      socket.to(room.code).emit("user_joined", {
        socketId: socket.id,
        username,
        participants: room.participants,
      });
    } catch (err) {
      socket.emit("join_error", { message: err.message });
    }
  });

  // ─────────────────────────────────────────────
  // GET STATE
  // Room.jsx calls this on mount to re-fetch state
  // ─────────────────────────────────────────────
  socket.on("get_state", async () => {
    const { roomCode } = socket.data;
    if (!roomCode) return;
    const room = await Room.findOne({ code: roomCode });
    if (!room) return;
    const me = room.participants.find((p) => p.socketId === socket.id);
    socket.emit("sync_state", {
      roomCode: room.code,
      videoId: room.videoId,
      isPlaying: room.isPlaying,
      currentTime: room.currentTime,
      participants: room.participants,
      yourRole: me ? me.role : "participant",
    });
  });

  // ─────────────────────────────────────────────
  // PLAY
  // Only host or moderator can trigger this
  // ─────────────────────────────────────────────
  socket.on("play", async ({ currentTime }) => {
    const { roomCode } = socket.data;
    const role = await getRole(roomCode, socket.id);
    if (!["host", "moderator"].includes(role)) {
      return socket.emit("room_error", { message: "Not authorized to play" });
    }
    await Room.updateOne(
      { code: roomCode },
      { isPlaying: true, currentTime, lastUpdated: Date.now() }
    );
    // Broadcast to ALL in room including sender so everyone syncs
    io.to(roomCode).emit("play", { currentTime });
  });

  // ─────────────────────────────────────────────
  // PAUSE
  // Only host or moderator can trigger this
  // ─────────────────────────────────────────────
  socket.on("pause", async ({ currentTime }) => {
    const { roomCode } = socket.data;
    const role = await getRole(roomCode, socket.id);
    if (!["host", "moderator"].includes(role)) {
      return socket.emit("room_error", { message: "Not authorized to pause" });
    }
    await Room.updateOne(
      { code: roomCode },
      { isPlaying: false, currentTime, lastUpdated: Date.now() }
    );
    io.to(roomCode).emit("pause", { currentTime });
  });

  // ─────────────────────────────────────────────
  // SEEK
  // Only host or moderator can trigger this
  // ─────────────────────────────────────────────
  socket.on("seek", async ({ currentTime }) => {
    const { roomCode } = socket.data;
    const role = await getRole(roomCode, socket.id);
    if (!["host", "moderator"].includes(role)) {
      return socket.emit("room_error", { message: "Not authorized to seek" });
    }
    await Room.updateOne(
      { code: roomCode },
      { currentTime, lastUpdated: Date.now() }
    );
    io.to(roomCode).emit("seek", { currentTime });
  });

  // ─────────────────────────────────────────────
  // CHANGE VIDEO
  // Only host or moderator can trigger this
  // ─────────────────────────────────────────────
  socket.on("change_video", async ({ videoId }) => {
    const { roomCode } = socket.data;
    const role = await getRole(roomCode, socket.id);
    if (!["host", "moderator"].includes(role)) {
      return socket.emit("room_error", { message: "Not authorized to change video" });
    }
    await Room.updateOne(
      { code: roomCode },
      { videoId, isPlaying: false, currentTime: 0, lastUpdated: Date.now() }
    );
    io.to(roomCode).emit("change_video", { videoId, isPlaying: false, currentTime: 0 });
  });

  // ─────────────────────────────────────────────
  // ASSIGN ROLE
  // Only host can promote/demote participants
  // ─────────────────────────────────────────────
  socket.on("assign_role", async ({ targetSocketId, role }) => {
    const { roomCode } = socket.data;
    const myRole = await getRole(roomCode, socket.id);
    if (myRole !== "host") {
      return socket.emit("room_error", { message: "Only host can assign roles" });
    }
    if (!["moderator", "participant"].includes(role)) {
      return socket.emit("room_error", { message: "Invalid role" });
    }
    await Room.updateOne(
      { code: roomCode, "participants.socketId": targetSocketId },
      { $set: { "participants.$.role": role } }
    );
    const room = await Room.findOne({ code: roomCode });
    // Notify everyone so participant lists update
    io.to(roomCode).emit("role_assigned", {
      targetSocketId,
      role,
      participants: room.participants,
    });
  });

  // ─────────────────────────────────────────────
  // REMOVE PARTICIPANT
  // Only host can remove someone from the room
  // ─────────────────────────────────────────────
  socket.on("remove_participant", async ({ targetSocketId }) => {
    const { roomCode } = socket.data;
    const myRole = await getRole(roomCode, socket.id);
    if (myRole !== "host") {
      return socket.emit("room_error", { message: "Only host can remove participants" });
    }

    // Remove from DB first
    await Room.updateOne(
      { code: roomCode },
      { $pull: { participants: { socketId: targetSocketId } } }
    );

    // Tell the removed user they were kicked
    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (targetSocket) {
      targetSocket.emit("participant_removed", {
        message: "You were removed from the room by the host.",
      });
      targetSocket.leave(roomCode);
    }

    const room = await Room.findOne({ code: roomCode });
    // Tell everyone else the updated participant list
    io.to(roomCode).emit("user_left", {
      socketId: targetSocketId,
      participants: room.participants,
    });
  });

  // ─────────────────────────────────────────────
  // DISCONNECT
  // Fires automatically when a user closes the tab/browser
  // ─────────────────────────────────────────────
  socket.on("disconnect", async () => {
    const { roomCode } = socket.data;
    if (!roomCode) return;

    await Room.updateOne(
      { code: roomCode },
      { $pull: { participants: { socketId: socket.id } } }
    );

    const room = await Room.findOne({ code: roomCode });
    if (room) {
      io.to(roomCode).emit("user_left", {
        socketId: socket.id,
        participants: room.participants,
      });
    }
  });
};
