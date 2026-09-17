import { createContext, useContext, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const socketRef = useRef(null);

  if (!socketRef.current) {
    socketRef.current = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:5000", {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 60000, // Render free tier can take up to 50s to wake up
    });
  }

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
