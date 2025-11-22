import User from "../models/User.js";
import Provider from "../models/Provider.js";
import { hashPassword, comparePassword, generateToken } from "../utils/auth.js";

// ==========================
// Register User
// ==========================
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, dob, maritalStatus,
      address, area, district, pincode, license } = req.body;

    if (await User.findOne({ email }))
      return res.status(409).json({ message: "User already exists" });

    const user = await User.create({
      name,
      email,
      password: await hashPassword(password),
      phone,
      dob,
      maritalStatus,
      address,
      area,
      district,
      pincode,
      license,
      role: "user",
      licensePath: req.file?.path || null,
    });

    res.status(201).json({ message: "User registered successfully", user });
  } catch (err) {
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
};

// ==========================
// Register Provider
// ==========================
export const registerProvider = async (req, res) => {
  try {
    const { name, email, password, phone, address, upiId, profileImage } = req.body;

    if (await Provider.findOne({ email }))
      return res.status(409).json({ message: "Provider already exists" });

    const provider = await Provider.create({
      name,
      email,
      password: await hashPassword(password),
      phone,
      address,
      upiId,
      profileImage,
      role: "provider",
    });

    res.status(201).json({ message: "Provider registered successfully", provider });
  } catch (err) {
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
};

// ==========================
// Login (shared logic)
// ==========================
const login = async (req, res, Model, notFoundMsg) => {
  const { email, password } = req.body;
  const entity = await Model.findOne({ email });
  if (!entity) return res.status(404).json({ message: notFoundMsg });

  const ok = await comparePassword(password, entity.password);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const token = generateToken(entity);
  res.json({ message: "Login successful", token, [Model.modelName.toLowerCase()]: entity });
};

import jwt from "jsonwebtoken";
import Provider from "../models/Provider.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const provider = await Provider.findById(decoded.id);
    if (!provider) return res.status(401).json({ message: "Invalid token" });

    req.user = { id: provider._id }; // attach provider ID
    next();
  } catch (err) {
    res.status(401).json({ message: "Unauthorized", error: err.message });
  }
};
export const loginUser = (req, res) => login(req, res, User, "User not found");
export const loginProvider = (req, res) => login(req, res, Provider, "Provider not found");
