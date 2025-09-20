import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import dotenv from "dotenv";

dotenv.config();

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  // simple car location channel placeholder
  socket.on("car:location:update", (data) => {
    // broadcast to clients subscribed to that car
    socket.broadcast.emit(`car:${data.carId}:location`, data);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
