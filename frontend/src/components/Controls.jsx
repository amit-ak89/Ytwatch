import { useState } from "react";

export default function Controls({ canControl, onPlay, onPause, onSeek, onChangeVideo, isPlaying }) {
  const [seekVal, setSeekVal] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  function extractVideoId(url) {
    try {
      const u = new URL(url);
      return u.searchParams.get("v") || u.pathname.split("/").pop();
    } catch {
      return url.trim(); // assume raw ID
    }
  }

  function handleChangeVideo(e) {
    e.preventDefault();
    const id = extractVideoId(videoUrl);
    if (id) { onChangeVideo(id); setVideoUrl(""); }
  }

  function handleSeek(e) {
    e.preventDefault();
    const t = parseFloat(seekVal);
    if (!isNaN(t)) { onSeek(t); setSeekVal(""); }
  }

  if (!canControl) return null;

  return (
    <div className="controls">
      <div className="playback-btns">
        {isPlaying
          ? <button onClick={onPause}>⏸ Pause</button>
          : <button onClick={onPlay}>▶ Play</button>
        }
      </div>

      <form className="seek-form" onSubmit={handleSeek}>
        <input
          type="number"
          placeholder="Seek to (sec)"
          value={seekVal}
          onChange={(e) => setSeekVal(e.target.value)}
          min="0"
        />
        <button type="submit">Seek</button>
      </form>

      <form className="video-form" onSubmit={handleChangeVideo}>
        <input
          placeholder="YouTube URL or video ID"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
        />
        <button type="submit">Load</button>
      </form>
    </div>
  );
}
