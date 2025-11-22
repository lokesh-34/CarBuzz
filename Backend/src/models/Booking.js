import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  carId: { type: mongoose.Schema.Types.ObjectId, ref: "Car", required: true },
  carProviderId: { type: mongoose.Schema.Types.ObjectId, ref: "Provider", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userName: String,
  userPhone: String,
  pickupDate: String,
  pickupTime: String,
  dropDate: String,
  dropTime: String,
  place: String,
  purpose: String,
  noOfDays: Number,
  status: { type: String, enum: ["pending", "confirmed", "rejected", "cancelled"], default: "pending" }
}, { timestamps: true });

export default mongoose.model("Booking", bookingSchema);
