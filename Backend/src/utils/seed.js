import dotenv from "dotenv";
import bcryptjs from "bcryptjs";
import connectDB from "../config/db.js";
import User from "../models/User.js";

dotenv.config();

const run = async () => {
  await connectDB();
  const { SEED_ADMIN, SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } = process.env;
  if (!SEED_ADMIN || SEED_ADMIN.toLowerCase() !== "true") {
    console.log("SEED_ADMIN not enabled.");
    process.exit(0);
  }
  const exists = await User.findOne({ email: SEED_ADMIN_EMAIL });
  if (exists) {
    console.log("Admin already exists:", exists.email);
    process.exit(0);
  }
  const hashed = await bcryptjs.hash(SEED_ADMIN_PASSWORD, 10);
  // Provide required fields for schema validation; allow env overrides
  const phone = process.env.SEED_ADMIN_PHONE || "9999999999";
  const dobStr = process.env.SEED_ADMIN_DOB || "1990-01-01";
  const license = process.env.SEED_ADMIN_LICENSE || "ADMIN-SEED-0001";
  const dob = new Date(dobStr);
  const admin = await User.create({
    name: SEED_ADMIN_NAME,
    email: SEED_ADMIN_EMAIL,
    password: hashed,
    phone,
    dob,
    license,
    role: "admin",
    verified: true
  });
  console.log("Admin created:", admin.email);
  process.exit(0);
};

run().catch(e => { console.error(e); process.exit(1); });
