import express from "express";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import Provider from "../models/Provider.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// ==========================
// Register Provider
// ==========================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, address, upiId, profileImage } = req.body;

    // check if provider exists
    const existingProvider = await Provider.findOne({ email });
    if (existingProvider) {
      return res.status(400).json({ message: "Provider already exists" });
    }

    // hash password
  const hashedPassword = await bcryptjs.hash(password, 10);

    const provider = new Provider({
      name,
      email,
      password: hashedPassword,
      phone,
      address,
      upiId,
      profileImage,
    });

    await provider.save();

    res.status(201).json({ message: "Provider registered successfully", provider });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ==========================
// Provider Login
// ==========================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const provider = await Provider.findOne({ email });
    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }

  const isMatch = await bcryptjs.compare(password, provider.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: provider._id, role: provider.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ message: "Login successful", token, provider });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ==========================
// Get Provider Profile
// ==========================
router.get("/profile", authMiddleware(["provider"]), async (req, res) => {
  try {
    const provider = await Provider.findById(req.user.id).select("-password");
    res.json(provider);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ==========================
// Update Provider Profile
// ==========================
router.put("/profile", authMiddleware(["provider"]), async (req, res) => {
  try {
    const allowed = ["name", "phone", "upiId", "profileImage", "address", "password"]; // email immutable
    const body = req.body || {};
    const updates = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (updates.password) {
  updates.password = await bcryptjs.hash(updates.password, 10);
    }

    // Merge nested address (partial updates)
    if (updates.address) {
      const existing = await Provider.findById(req.user.id).select("address");
      if (!existing) return res.status(404).json({ message: "Provider not found" });
      updates.address = { ...existing.address?.toObject?.(), ...updates.address };
    }

    const updatedProvider = await Provider.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.json({ message: "Profile updated", provider: updatedProvider });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
