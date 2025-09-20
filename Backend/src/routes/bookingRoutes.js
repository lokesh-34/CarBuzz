import express from "express";
import Booking from "../models/Booking.js";
import Car from "../models/Car.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// ✅ User creates booking
router.post("/", authMiddleware(), async (req, res) => {
  try {
    const { carId, pickupDate, pickupTime, dropDate, dropTime, place, purpose, noOfDays } = req.body;

    // Get car + provider info
    const car = await Car.findById(carId);
    if (!car) return res.status(404).json({ message: "Car not found" });

    const booking = await Booking.create({
      carId,
      carProviderId: car.provider, // link provider from Car model
      userId: req.user.id,         // from token
      userName: req.user.name || "",
      userPhone: req.user.phone || "",
      pickupDate,
      pickupTime,
      dropDate,
      dropTime,
      place,
      purpose,
      noOfDays,
      status: "pending",
    });

    res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ✅ Provider updates booking status
router.patch("/:id", authMiddleware(), async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Get bookings for a user
router.get("/user/:userId", async (req, res) => {
  const bookings = await Booking.find({ userId: req.params.userId }).populate("carId");
  res.json(bookings);
});

// ✅ Get bookings for a provider
router.get("/provider/:providerId", async (req, res) => {
  const bookings = await Booking.find({ carProviderId: req.params.providerId }).populate("carId");
  res.json(bookings);
});

export default router;
