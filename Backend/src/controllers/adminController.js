import User from "../models/User.js";
import Car from "../models/Car.js";
import Booking from "../models/Booking.js";
import Provider from "../models/Provider.js";
import { sendMail } from "../utils/mail.js";

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
  try {
    const provider = await Provider.findById(car.provider);
    if (provider?.email) {
      const subject = `Your car ${car.manufacturer} ${car.model} was approved`;
      const body = `Good news! Your car has been approved and is now visible to users.`;
      await sendMail(provider.email, subject, body, `<p>${body}</p>`);
    }
  } catch (e) {
    console.error("Approval email failed:", e.message);
  }
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
  const users = await User.find({ role: "user", verified: false })
    .select("name email phone dob maritalStatus address area district pincode license licensePath createdAt role verified");
  const cars = await Car.find({ approved: false })
    .populate({
      path: "provider",
      select: "name email phone address upiId",
    });
  res.json({ users, cars });
};
