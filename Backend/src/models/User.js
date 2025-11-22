import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dob: { type: Date, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true },
  maritalStatus: { type: String },
  address: { type: String },
  area: { type: String },
  district: { type: String },
  pincode: { type: String },
  license: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "provider", "admin"], default: "user" },
  licensePath: { type: String }, // uploaded file path
  verified: { type: Boolean, default: false }, // admin verification for users
}, { timestamps: true });

export default mongoose.model("User", userSchema);
