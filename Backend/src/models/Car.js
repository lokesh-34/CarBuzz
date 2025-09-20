import mongoose from "mongoose";

const carSchema = new mongoose.Schema({
  provider: { type: mongoose.Schema.Types.ObjectId, ref: "Provider", required: true },
  manufacturer: { type: String, required: true },
  model: { type: String, required: true },
  type: { type: String, required: true },
  price: { type: Number, required: true },
  seatingCapacity: { type: Number, required: true },
  description: { type: String },
  insuranceStatus: { type: String },
  rcDetails: { type: String },
  images: [String],                          // <-- store uploaded image paths
  availability: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("Car", carSchema);
