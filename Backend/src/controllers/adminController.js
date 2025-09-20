import User from "../models/User.js";
import Car from "../models/Car.js";
import Booking from "../models/Booking.js";

export const verifyUser = async (req, res) => {
  const { id } = req.params;
  const user = await User.findByIdAndUpdate(id, { verified: true }, { new: true });
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ user });
};

export const approveCar = async (req, res) => {
  const { id } = req.params;
  const car = await Car.findByIdAndUpdate(id, { approved: true }, { new: true });
  if (!car) return res.status(404).json({ message: "Car not found" });
  res.json({ car });
};

export const dashboardStats = async (req, res) => {
  const [users, providers, cars, bookings] = await Promise.all([
    User.countDocuments({ role: "user" }),
    User.countDocuments({ role: "provider" }),
    Car.countDocuments({ approved: true }),
    Booking.countDocuments()
  ]);
  res.json({ users, providers, cars, bookings });
};

export const pendingApprovals = async (req, res) => {
  const users = await User.find({ role: "user", verified: false });
  const cars = await Car.find({ approved: false });
  res.json({ users, cars });
};
