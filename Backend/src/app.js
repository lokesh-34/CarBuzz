import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import providerRoutes from "./routes/providerRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import carRoutes from "./routes/carRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { authMiddleware } from "./middlewares/authMiddleware.js";

dotenv.config();
connectDB();

const app = express();

// CORS: allow from env ORIGIN_LIST plus localhost defaults
const normalize = (u) => (u || "").replace(/\/$/, "").toLowerCase();
const defaultOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];
const envOrigins = (process.env.ORIGIN_LIST || "")
  .split(",")
  .map((s) => normalize(s.trim()))
  .filter(Boolean);
const allowedOrigins = new Set([...defaultOrigins.map(normalize), ...envOrigins]);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow non-browser requests or same-origin (no Origin header)
      if (!origin) return cb(null, true);
      const o = normalize(origin);
      if (allowedOrigins.has(o)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(morgan("dev"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsPath = path.join(__dirname, "../uploads");
const legacyUploadsPath = path.join(__dirname, "./uploads"); // legacy location (src/uploads)
app.use("/uploads", express.static(uploadsPath));
app.use("/uploads", express.static(legacyUploadsPath));

// Mount routes
app.use("/api/cars", carRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/admin", adminRoutes);

// Debug test routes
app.get("/api/test/user", authMiddleware(["user"]), (req, res) => res.json({ message: "Welcome User", user: req.user }));
app.get("/api/test/provider", authMiddleware(["provider"]), (req, res) => res.json({ message: "Welcome Provider", user: req.user }));
app.get("/api/test/admin", authMiddleware(["admin"]), (req, res) => res.json({ message: "Welcome Admin", user: req.user }));

// Health check
app.get("/health", (req, res) => res.json({ ok: true }));

// Root route
app.get("/", (req, res) => {
  res.json({
    name: "CarBuzz API",
    status: "running",
    health: "/health",
    time: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Server error", error: err.message });
});

export default app;
