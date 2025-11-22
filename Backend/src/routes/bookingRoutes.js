import express from "express";
import Booking from "../models/Booking.js";
import Car from "../models/Car.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import Provider from "../models/Provider.js";
import User from "../models/User.js";
import { sendMail } from "../utils/mail.js";

const router = express.Router();

// ✅ User creates booking
router.post("/", authMiddleware(["user"]), async (req, res) => {
  try {
    const { carId, pickupDate, pickupTime, dropDate, dropTime, place, purpose, noOfDays } = req.body;

    // Get car + provider info
  const car = await Car.findById(carId);
    if (!car) return res.status(404).json({ message: "Car not found" });
  if (!car.approved) return res.status(400).json({ message: "Car is pending admin approval" });
  const provider = await Provider.findById(car.provider);
  const userDoc = await User.findById(req.user.id);
  if (!userDoc?.verified) {
    return res.status(403).json({ message: "User is not verified by admin" });
  }

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
    const newStatus = req.body.status;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: newStatus },
      { new: true }
    );
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // Car availability management
    try {
      const car = await Car.findById(booking.carId);
      if (car) {
        const dropDateStr = booking.dropDate || "";
        const dropTimeStr = booking.dropTime || "00:00";
        // parse as local time; avoid forcing UTC
        const dropIso = `${dropDateStr}T${dropTimeStr}:00`;
        const dropAt = new Date(dropIso);

        if (newStatus === "confirmed") {
          car.availability = false;
          const fallback = new Date(Date.now() + 24 * 60 * 60 * 1000);
          const candidate = isNaN(dropAt.getTime()) ? fallback : dropAt;
          // Do not shorten an existing hold if present
          if (car.unavailableUntil && car.unavailableUntil > candidate) {
            // keep existing longer hold
          } else {
            car.unavailableUntil = candidate;
          }
          await car.save();
        }
        if (newStatus === "cancelled" || newStatus === "rejected") {
          // If this booking was holding the lock, clear it
          const now = new Date();
          if (!car.unavailableUntil || car.unavailableUntil <= now) {
            car.availability = true;
            car.unavailableUntil = null;
            await car.save();
          }
        }
      }
    } catch (e) {
      console.error("Car availability update failed:", e.message);
    }

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

// ✅ Get single booking by ID (for tracking and details)
router.get("/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("carId")
      .populate({ path: "carProviderId", select: "name email phone address" })
      .populate({ path: "userId", select: "name email phone address" });
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
