import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SocketProvider } from "./context/SocketContext";
import Home from "./pages/Home";
import Room from "./pages/Room";

export default function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:code" element={<Room />} />
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
}
