import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import YouTubePlayer from "../components/YouTubePlayer";
import Controls from "../components/Controls";
import ParticipantList from "../components/ParticipantList";

export default function Room() {
  const { code } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();

  const playerRef = useRef(null);
  const playerReadyRef = useRef(false);
  const desiredStateRef = useRef({ videoId: null, currentTime: 0, playing: false });

  const [isPlaying, setIsPlaying] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [myRole, setMyRole] = useState("participant");
  const [notification, setNotification] = useState("");

  const notify = useCallback((msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  }, []);

  // useCallback so socket handlers never get a stale reference
  const applyToPlayer = useCallback(({ videoId, currentTime, playing }) => {
    const p = playerRef.current;
    if (!p || !playerReadyRef.current) return;

    const currentVideoId = p.getVideoData?.()?.video_id;
    const isNewVideo = videoId && videoId !== currentVideoId;

    if (isNewVideo) {
      if (playing) {
        p.loadVideoById({ videoId, startSeconds: currentTime });
      } else {
        p.cueVideoById({ videoId, startSeconds: currentTime });
      }
    } else {
      p.seekTo(currentTime, true);
      if (playing) p.playVideo();
      else p.pauseVideo();
    }
  }, []); // refs never change so no deps needed

  const handlePlayerReady = useCallback(() => {
    playerReadyRef.current = true;
    applyToPlayer(desiredStateRef.current);
  }, [applyToPlayer]);

  useEffect(() => {
    function onSyncState({ videoId: vid, isPlaying: playing, currentTime: t, participants: ps, yourRole }) {
      setParticipants(ps);
      setMyRole(yourRole);
      setIsPlaying(playing);
      if (vid) setVideoLoaded(true);
      desiredStateRef.current = { videoId: vid, currentTime: t, playing };
      applyToPlayer(desiredStateRef.current);
    }

    function onPlay({ currentTime }) {
      setIsPlaying(true);
      desiredStateRef.current = { ...desiredStateRef.current, currentTime, playing: true };
      applyToPlayer(desiredStateRef.current);
    }

    function onPause({ currentTime }) {
      setIsPlaying(false);
      desiredStateRef.current = { ...desiredStateRef.current, currentTime, playing: false };
      applyToPlayer(desiredStateRef.current);
    }

    function onSeek({ currentTime }) {
      desiredStateRef.current = { ...desiredStateRef.current, currentTime };
      if (playerRef.current && playerReadyRef.current) {
        playerRef.current.seekTo(currentTime, true);
      }
    }

    function onChangeVideo({ videoId: vid, isPlaying: playing = false, currentTime: t = 0 }) {
      setIsPlaying(playing);
      setVideoLoaded(true);
      desiredStateRef.current = { videoId: vid, currentTime: t, playing };
      applyToPlayer(desiredStateRef.current);
    }

    function onUserJoined({ username, participants: ps }) {
      setParticipants(ps);
      notify(`${username} joined`);
    }

    function onUserLeft({ participants: ps }) {
      setParticipants(ps);
    }

    function onRoleAssigned({ targetSocketId, role, participants: ps }) {
      setParticipants(ps);
      if (targetSocketId === socket.id) {
        setMyRole(role);
        notify(`You are now a ${role}`);
      }
    }

    function onParticipantRemoved() {
      notify("You were removed from the room.");
      setTimeout(() => navigate("/"), 2000);
    }

    function onRoomError({ message }) {
      notify(`⚠ ${message}`);
    }

    socket.on("sync_state", onSyncState);
    socket.on("play", onPlay);
    socket.on("pause", onPause);
    socket.on("seek", onSeek);
    socket.on("change_video", onChangeVideo);
    socket.on("user_joined", onUserJoined);
    socket.on("user_left", onUserLeft);
    socket.on("role_assigned", onRoleAssigned);
    socket.on("participant_removed", onParticipantRemoved);
    socket.on("room_error", onRoomError);

    socket.emit("get_state");

    return () => {
      socket.off("sync_state", onSyncState);
      socket.off("play", onPlay);
      socket.off("pause", onPause);
      socket.off("seek", onSeek);
      socket.off("change_video", onChangeVideo);
      socket.off("user_joined", onUserJoined);
      socket.off("user_left", onUserLeft);
      socket.off("role_assigned", onRoleAssigned);
      socket.off("participant_removed", onParticipantRemoved);
      socket.off("room_error", onRoomError);
    };
  }, [socket, navigate, notify, applyToPlayer]);

  const canControl = ["host", "moderator"].includes(myRole);

  function handlePlay() {
    socket.emit("play", { currentTime: playerRef.current?.getCurrentTime() || 0 });
  }
  function handlePause() {
    socket.emit("pause", { currentTime: playerRef.current?.getCurrentTime() || 0 });
  }
  function handleSeek(t) {
    socket.emit("seek", { currentTime: t });
  }
  function handleChangeVideo(id) {
    socket.emit("change_video", { videoId: id });
  }
  function handleAssignRole(targetSocketId, role) {
    socket.emit("assign_role", { targetSocketId, role });
  }
  function handleRemove(targetSocketId) {
    socket.emit("remove_participant", { targetSocketId });
  }

  return (
    <div className="room">
      {notification && <div className="notification">{notification}</div>}

      <div className="room-header">
        <span className="room-code">Room: <strong>{code}</strong></span>
        <span className="my-role">You: <strong>{myRole}</strong></span>
        <button className="leave-btn" onClick={() => navigate("/")}>Leave</button>
      </div>

      <div className="room-body">
        <div className="player-section">
          <YouTubePlayer playerRef={playerRef} onReady={handlePlayerReady} />
          <Controls
            canControl={canControl}
            isPlaying={isPlaying}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
            onChangeVideo={handleChangeVideo}
          />
          {!videoLoaded && (
            <p className="no-video">
              {canControl
                ? "Load a YouTube video using the controls above."
                : "Waiting for host to load a video..."}
            </p>
          )}
        </div>

        <ParticipantList
          participants={participants}
          mySocketId={socket.id}
          myRole={myRole}
          onAssignRole={handleAssignRole}
          onRemove={handleRemove}
        />
      </div>
    </div>
  );
}
