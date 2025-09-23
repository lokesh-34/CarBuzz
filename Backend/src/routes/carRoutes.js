import express from "express";
import Car from "../models/Car.js";
import path from "path";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { upload, uploadMiddleware } from "../middlewares/upload.js";
import { searchCars, myCars } from "../controllers/carController.js";

const router = express.Router();

// ✅ Add Car
router.post("/add", authMiddleware(), upload.array("images", 10), async (req, res) => {
  try {
    const imagePaths = (req.files || []).map(f => path.posix.join("uploads", f.filename));

    const car = await Car.create({
      ...req.body,
      provider: req.user.id,
      images: imagePaths,
    });

    res.status(201).json({ message: "Car added successfully", car });
  } catch (err) {
    console.error("Add car error:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ✅ All Available Cars (public)
router.get("/", async (req, res) => {
  try {
    // Auto-clear expired holds
    const now = new Date();
    await Car.updateMany(
      { unavailableUntil: { $ne: null, $lte: now } },
      { $set: { availability: true, unavailableUntil: null } }
    );

  const cars = await Car.find({ availability: true, approved: true }).sort({ createdAt: -1 });
    const mapped = cars.map((c) => ({
      ...c.toObject(),
      images: (c.images || []).map((img) => (img?.includes("uploads/") ? img : path.posix.join("uploads", path.basename(img || ""))))
    }));
    return res.status(200).json({ cars: mapped });
  } catch (err) {
    console.error("Error fetching cars:", err);
    return res.status(500).json({ message: "Server error while fetching cars" });
  }
});

// ✅ Search Cars (public)
router.get("/search", searchCars);

// ✅ Provider’s Cars
router.get("/mine", authMiddleware(), myCars);

export default router;
