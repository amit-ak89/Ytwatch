import { useEffect, useRef } from "react";

function loadYTApi() {
  if (document.getElementById("yt-api-script")) return;
  const tag = document.createElement("script");
  tag.id = "yt-api-script";
  tag.src = "https://www.youtube.com/iframe_api";
  document.body.appendChild(tag);
}

export default function YouTubePlayer({ playerRef, onReady }) {
  const containerRef = useRef(null);

  useEffect(() => {
    loadYTApi();

    function createPlayer() {
      if (!containerRef.current) return;
      new window.YT.Player(containerRef.current, {
        width: "100%",
        height: "100%",
        playerVars: { controls: 0, disablekb: 1, rel: 0, modestbranding: 1, autoplay: 0 },
        events: {
          onReady: (e) => {
            playerRef.current = e.target;
            onReady?.();
          },
        },
      });
    }

    if (window.YT?.Player) {
      createPlayer();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        createPlayer();
      };
    }

    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="yt-player" />;
}
