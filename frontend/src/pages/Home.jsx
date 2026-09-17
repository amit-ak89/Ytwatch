import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";

export default function Home() {
  const socket = useSocket();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function onSyncState({ roomCode: code }) {
      navigate(`/room/${code}`);
    }

    function onJoinError({ message }) {
      setError(message);
      setLoading(false);
    }

    socket.on("sync_state", onSyncState);
    socket.on("join_error", onJoinError);

    return () => {
      socket.off("sync_state", onSyncState);
      socket.off("join_error", onJoinError);
    };
  }, [socket, navigate]);

  function emitJoin(username, roomCode, create) {
    socket.emit("join_room", {
      roomCode: roomCode.trim().toUpperCase() || null,
      username: username.trim(),
      create,
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim()) return setError("Enter a username.");
    if (mode === "join" && !roomCode.trim()) return setError("Enter a room code.");

    setError("");
    setLoading(true);

    // If socket already connected, emit immediately
    // Otherwise wait for connection then emit
    if (socket.connected) {
      emitJoin(username, roomCode, mode === "create");
    } else {
      socket.connect();
      socket.once("connect", () => {
        emitJoin(username, roomCode, mode === "create");
      });
    }
  }

  return (
    <div className="home">
      <h1>🎬 YT Watch Party</h1>
      <p className="subtitle">Watch YouTube videos in sync with friends</p>

      {!mode ? (
        <div className="btn-group">
          <button onClick={() => setMode("create")}>Create Room</button>
          <button onClick={() => setMode("join")} className="secondary">Join Room</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="form">
          <h2>{mode === "create" ? "Create a Room" : "Join a Room"}</h2>

          <input
            placeholder="Your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />

          {mode === "create" && (
            <input
              placeholder="Custom room code (optional)"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              maxLength={10}
            />
          )}

          {mode === "join" && (
            <input
              placeholder="Room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={10}
            />
          )}

          {error && <p className="error">{error}</p>}

          <div className="btn-group">
            <button type="submit" disabled={loading}>
              {loading ? "Connecting..." : mode === "create" ? "Create" : "Join"}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => { setMode(null); setError(""); setLoading(false); }}
            >
              Back
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
