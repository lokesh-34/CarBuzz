import express from "express";
import Booking from "../models/Booking.js";
import Car from "../models/Car.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import Provider from "../models/Provider.js";
import User from "../models/User.js";
import { sendMail } from "../utils/mail.js";

const router = express.Router();

// ✅ User creates booking
router.post("/", authMiddleware(), async (req, res) => {
  try {
    const { carId, pickupDate, pickupTime, dropDate, dropTime, place, purpose, noOfDays } = req.body;

    // Get car + provider info
  const car = await Car.findById(carId);
    if (!car) return res.status(404).json({ message: "Car not found" });
  const provider = await Provider.findById(car.provider);
  const userDoc = await User.findById(req.user.id);

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

    // Notify provider via email about new booking request
    if (provider?.email) {
      const subject = `New booking request for ${car.manufacturer} ${car.model}`;
      const lines = [
        `A new booking request has been received:`,
        `Pickup: ${pickupDate} ${pickupTime}`,
        `Drop: ${dropDate} ${dropTime}`,
        place ? `Place: ${place}` : null,
        purpose ? `Purpose: ${purpose}` : null,
        `Days: ${noOfDays || "-"}`,
        userDoc ? `User: ${userDoc.name} (${userDoc.email}, ${userDoc.phone})` : null,
      ].filter(Boolean).join("\n");
      const mailRes = await sendMail(
        provider.email,
        subject,
        lines,
        `<p>${lines.replace(/\n/g, "<br/>")}</p>`
      );
      if (mailRes?.error) console.error("Provider mail failed:", mailRes.error);
    }

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

    // Email user about status update
  const userDoc = await User.findById(booking.userId);
  const car = await Car.findById(booking.carId);
  const provider = await Provider.findById(booking.carProviderId);
    if (userDoc?.email) {
      const subject = `Your booking was ${booking.status}`;
      const lines = [
        `Your booking status has changed to: ${booking.status.toUpperCase()}`,
        car ? `Car: ${car.manufacturer} ${car.model}` : null,
        `Pickup: ${booking.pickupDate} ${booking.pickupTime}`,
        `Drop: ${booking.dropDate} ${booking.dropTime}`,
        booking.status === "confirmed" && provider ?
          `Provider Contact: ${provider.name} | ${provider.phone} | ${provider.email}` : null,
        booking.status === "confirmed" && provider?.address?.fullAddress ?
          `Provider Address: ${provider.address.fullAddress}, ${provider.address.area}, ${provider.address.district} - ${provider.address.pincode}`
          : null,
      ].filter(Boolean).join("\n");
      const mailRes2 = await sendMail(
        userDoc.email,
        subject,
        lines,
        `<p>${lines.replace(/\n/g, "<br/>")}</p>`
      );
      if (mailRes2?.error) console.error("User mail failed:", mailRes2.error);
    }
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Get bookings for a user
router.get("/user/:userId", async (req, res) => {
  const bookings = await Booking.find({ userId: req.params.userId })
    .populate("carId")
    .populate({ path: "carProviderId", select: "name email phone address" });
  res.json(bookings);
});

// ✅ Get bookings for a provider
router.get("/provider/:providerId", async (req, res) => {
  const bookings = await Booking.find({ carProviderId: req.params.providerId })
    .populate("carId")
    .populate({ path: "userId", select: "name email phone address" });
  res.json(bookings);
});

export default router;
