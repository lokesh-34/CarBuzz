import dayjs from "dayjs";
import Booking from "../models/Booking.js";
import Car from "../models/Car.js";
import { makeQR } from "../utils/qr.js";

const hoursBetween = (start, end) => {
  const ms = new Date(end) - new Date(start);
  return Math.ceil(ms / (1000*60*60)); // round up to next hour
};

export const createBooking = async (req, res) => {
  const { carId, startTime, endTime } = req.body;
  const car = await Car.findById(carId);
  if (!car || !car.approved || !car.isAvailable) return res.status(400).json({ message: "Car not available" });

  const hours = hoursBetween(startTime, endTime);
  const amount = hours * car.pricePerHour;

  const booking = await Booking.create({
    user: req.user.id,
    car: carId,
    startTime, endTime,
    amount,
    status: "confirmed"
  });

  // lock availability (simplified)
  car.isAvailable = false;
  await car.save();

  res.status(201).json({ message: "Booking confirmed", booking });
};

export const myBookings = async (req, res) => {
  const bookings = await Booking.find({ user: req.user.id }).populate("car");
  res.json({ bookings });
};

export const providerBookings = async (req, res) => {
  const bookings = await Booking.find().populate({
    path: "car",
    match: { provider: req.user.id }
  });
  res.json({ bookings: bookings.filter(b => b.car) });
};

export const generateUnlock = async (req, res) => {
  const { id } = req.params; // booking id
  const booking = await Booking.findById(id).populate("car");
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  if (String(booking.user) !== req.user.id) return res.status(403).json({ message: "Not your booking" });

  const now = new Date();
  const validFrom = dayjs(booking.startTime).subtract(10, "minute").toDate();
  const validTo = dayjs(booking.startTime).add(30, "minute").toDate();
  if (now < validFrom || now > validTo) {
    return res.status(400).json({ message: "Unlock available only near start time" });
  }

  const otp = Math.floor(100000 + Math.random()*900000).toString();
  const payload = JSON.stringify({ bookingId: booking._id, carId: booking.car._id, otp });
  const qrData = await makeQR(payload);

  booking.unlock = { otp, qrData, validFrom, validTo };
  await booking.save();

  res.json({ otp, qrData, validFrom, validTo });
};

export const validateUnlock = async (req, res) => {
  const { id } = req.params; // booking id
  const { otp } = req.body;
  const booking = await Booking.findById(id);
  if (!booking?.unlock) return res.status(400).json({ message: "No unlock generated" });
  const now = new Date();
  if (now < booking.unlock.validFrom || now > booking.unlock.validTo) {
    return res.status(400).json({ message: "Unlock expired/not active" });
  }
  if (booking.unlock.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });
  booking.status = "ongoing";
  await booking.save();
  res.json({ message: "Unlock validated, car unlocked" });
};
