import express from "express";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import User from "../models/User.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// File storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// ==========================
// User Registration
// ==========================
router.post("/register", upload.single("photo"), async (req, res) => {
  try {
    const {
      name, email, password, phone, dob, maritalStatus,
      address, area, district, pincode, license
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

  const hashedPassword = await bcryptjs.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      dob,
      maritalStatus,
      address,
      area,
      district,
      pincode,
      license,
      role: "user",
      licensePath: req.file ? req.file.path : null,
    });

    await user.save();
    res.status(201).json({ message: "User registered successfully", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ==========================
// User Login
// ==========================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

  const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ message: "Login successful", token, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ==========================
// Get User Profile
// ==========================
router.get("/profile", authMiddleware(["user"]), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ==========================
// Update User Profile
// ==========================
router.put("/profile", authMiddleware(["user"]), upload.single("photo"), async (req, res) => {
  try {
    const updates = { ...req.body };

    // If updating password
    if (updates.password) {
  updates.password = await bcryptjs.hash(updates.password, 10);
    }

    // If new photo uploaded
    if (req.file) {
      updates.licensePath = req.file.path;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Profile updated", user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
