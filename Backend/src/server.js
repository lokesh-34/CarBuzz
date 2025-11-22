import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { verifyMailTransport } from "./utils/mail.js";
import dotenv from "dotenv";
import Booking from "./models/Booking.js";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";

dayjs.extend(customParseFormat);
dotenv.config();

// In-memory tracking store (consider Redis persistence in production)
const tripPositions = new Map(); // tripId => [ { lat,lng,speed,ts } ]
const activeSockets = new Map(); // socket.id => { trips: Set<tripId> }
const tripStartTimes = new Map(); // tripId => pickup timestamp (cached)

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.locals.io = io; // allow routes to emit events
app.locals.tripPositions = tripPositions;

io.on("connection", (socket) => {
  activeSockets.set(socket.id, { trips: new Set() });

  socket.on("joinTrip", ({ tripId }) => {
    if (!tripId) return;
    socket.join(`trip:${tripId}`);
    activeSockets.get(socket.id)?.trips.add(tripId);
    console.log(`[BACKEND] Client ${socket.id.substring(0, 8)} joined trip:${tripId}`);
    // Optionally send existing history
    const history = tripPositions.get(tripId) || [];
    console.log(`[BACKEND] Sending ${history.length} historical points to client`);
    history.forEach(pos => {
      socket.emit("locationUpdate", { tripId, ...pos });
    });
  });

  socket.on("leaveTrip", ({ tripId }) => {
    if (!tripId) return;
    socket.leave(`trip:${tripId}`);
    activeSockets.get(socket.id)?.trips.delete(tripId);
  });

  socket.on("driverLocation", async (payload) => {
    // payload: { tripId, lat, lng, speed }
    const { tripId, lat, lng, speed } = payload || {};
    if (!tripId || typeof lat !== "number" || typeof lng !== "number") return;
    
    try {
      // Validate trip has started (current time >= pickup time)
      let pickupTs = tripStartTimes.get(tripId);
      if (!pickupTs) {
        const booking = await Booking.findById(tripId);
        if (!booking || booking.status !== "confirmed") {
          socket.emit("trackingError", { tripId, message: "Trip not found or not confirmed" });
          return;
        }
        // Parse pickup date and time to timestamp - support multiple formats
        const pickupDateTime = `${booking.pickupDate} ${booking.pickupTime}`;
        let parsed = dayjs(pickupDateTime, "DD/MM/YYYY HH:mm");
        
        // Try alternative formats if first parse fails
        if (!parsed.isValid()) {
          parsed = dayjs(pickupDateTime, "YYYY-MM-DD HH:mm");
        }
        if (!parsed.isValid()) {
          parsed = dayjs(pickupDateTime, "MM/DD/YYYY HH:mm");
        }
        if (!parsed.isValid()) {
          // Try parsing as ISO string
          parsed = dayjs(pickupDateTime);
        }
        if (!parsed.isValid()) {
          socket.emit("trackingError", { tripId, message: "Invalid pickup date/time format" });
          return;
        }
        pickupTs = parsed.valueOf();
        tripStartTimes.set(tripId, pickupTs);
      }
      
      const now = Date.now();
      if (now < pickupTs) {
        socket.emit("trackingError", { tripId, message: "Trip has not started yet", secondsToStart: Math.ceil((pickupTs - now) / 1000) });
        return;
      }
      
      // Accept and broadcast location
      const entry = { lat, lng, speed: Number(speed) || 0, ts: now };
      const arr = tripPositions.get(tripId) || [];
      arr.push(entry);
      tripPositions.set(tripId, arr.slice(-500)); // cap history
      console.log(`[BACKEND] Broadcasting location to trip:${tripId} - lat=${lat}, lng=${lng}, speed=${speed} km/h (${arr.length} points)`);
      io.to(`trip:${tripId}`).emit("locationUpdate", { tripId, ...entry });
    } catch (err) {
      console.error("driverLocation error:", err);
      socket.emit("trackingError", { tripId, message: "Internal error validating trip" });
    }
  });

  socket.on("endTrip", ({ tripId }) => {
    if (!tripId) return;
    io.to(`trip:${tripId}`).emit("tripEnded", { tripId, ts: Date.now() });
  });

  socket.on("disconnect", () => {
    activeSockets.delete(socket.id);
  });
});

// Lightweight REST endpoints for driver device to push location if websockets not feasible
app.post("/api/tracking/:tripId/location", async (req, res) => {
  try {
    const tripId = req.params.tripId;
    const { lat, lng, speed } = req.body || {};
    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ message: "lat & lng required (number)" });
    }
    
    // Validate trip has started
    let pickupTs = tripStartTimes.get(tripId);
    if (!pickupTs) {
      const booking = await Booking.findById(tripId);
      if (!booking || booking.status !== "confirmed") {
        return res.status(404).json({ message: "Trip not found or not confirmed" });
      }
      const pickupDateTime = `${booking.pickupDate} ${booking.pickupTime}`;
      let parsed = dayjs(pickupDateTime, "DD/MM/YYYY HH:mm");
      
      // Try alternative formats
      if (!parsed.isValid()) parsed = dayjs(pickupDateTime, "YYYY-MM-DD HH:mm");
      if (!parsed.isValid()) parsed = dayjs(pickupDateTime, "MM/DD/YYYY HH:mm");
      if (!parsed.isValid()) parsed = dayjs(pickupDateTime);
      
      if (!parsed.isValid()) {
        return res.status(400).json({ 
          message: "Invalid pickup date/time format",
          pickupDateTime,
          hint: "Expected DD/MM/YYYY HH:mm or YYYY-MM-DD HH:mm"
        });
      }
      pickupTs = parsed.valueOf();
      tripStartTimes.set(tripId, pickupTs);
    }
    
    const now = Date.now();
    if (now < pickupTs) {
      return res.status(403).json({ 
        message: "Trip has not started yet", 
        secondsToStart: Math.ceil((pickupTs - now) / 1000) 
      });
    }
    
    const entry = { lat, lng, speed: Number(speed) || 0, ts: now };
    const arr = tripPositions.get(tripId) || [];
    arr.push(entry);
    tripPositions.set(tripId, arr.slice(-500));
    io.to(`trip:${tripId}`).emit("locationUpdate", { tripId, ...entry });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.post("/api/tracking/:tripId/end", (req, res) => {
  const tripId = req.params.tripId;
  io.to(`trip:${tripId}`).emit("tripEnded", { tripId, ts: Date.now() });
  res.json({ ok: true });
});

app.get("/api/tracking/:tripId/history", (req, res) => {
  const tripId = req.params.tripId;
  res.json({ tripId, positions: tripPositions.get(tripId) || [] });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  if (process.env.NODE_ENV !== "production") {
    verifyMailTransport()
      .then(() => console.log("Mail transport verified"))
      .catch(err => console.error("Mail transport verify failed:", err.message));
  }
});
