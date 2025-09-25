import mongoose from "mongoose";
const providerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      fullAddress: { type: String, required: true },
      landmark: { type: String },
      area: { type: String, required: true },
      district: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    upiId: {
      type: String,
      required: true,
    },
    profileImage: {
      type: String,
    },
    role: {
      type: String,
      enum: ["provider"],
      default: "provider",
    },
  },
  { timestamps: true }
);

const Provider = mongoose.model("Provider", providerSchema);
export default Provider;
