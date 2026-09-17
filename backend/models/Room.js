const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema(
  {
    socketId: { type: String, required: true },
    username: { type: String, required: true },
    role: {
      type: String,
      enum: ["host", "moderator", "participant"],
      default: "participant",
    },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true, uppercase: true },
  videoId: { type: String, default: "" },
  isPlaying: { type: Boolean, default: false },
  currentTime: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
  participants: [participantSchema],
});

module.exports = mongoose.model("Room", roomSchema);
