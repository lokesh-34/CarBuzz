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
    Provider.countDocuments({}),
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

// GET /api/admin/analytics
export const adminAnalytics = async (req, res) => {
  try {
    const [userDocs, bookingDocs, totalCars, totalProviders, totalUsers, totalAdmins] = await Promise.all([
      User.find({ role: "user" }).select("name email phone role verified createdAt"),
      Booking.find()
        .populate({ path: "carId", select: "manufacturer model" })
        .select("status createdAt pickupDate dropDate userName carId"),
      Car.countDocuments({}),
      Provider.countDocuments({}),
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "admin" })
    ]);

    const totalBookings = bookingDocs.length;

    // Status distribution
    const statusCounts = bookingDocs.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    }, {});

    // Role distribution based on counts across collections
    const roleDistribution = [
      { role: "user", value: totalUsers },
      { role: "provider", value: totalProviders },
      { role: "admin", value: totalAdmins }
    ];

    // Monthly bookings last 12 months
    const now = new Date();
    const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(monthKey(d));
    }
    const monthlyMap = Object.fromEntries(months.map(m => [m, 0]));
    bookingDocs.forEach(b => {
      const d = new Date(b.createdAt);
      const key = monthKey(d);
      if (key in monthlyMap) monthlyMap[key]++;
    });
    const monthlyBookings = Object.entries(monthlyMap).map(([month, bookings]) => ({ month, bookings }));

    const latestUsers = [...userDocs]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20);
    const latestBookings = [...bookingDocs]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20);

    res.json({
      stats: {
        totalUsers,
        totalProviders,
        totalCars,
        totalBookings
      },
      charts: {
        monthlyBookings,
        statusDistribution: Object.entries(statusCounts).map(([status, value]) => ({ status, value })),
        roleDistribution
      },
      tables: {
        users: latestUsers,
        bookings: latestBookings
      }
    });
  } catch (e) {
    console.error("adminAnalytics error", e);
    res.status(500).json({ message: "Failed to load analytics" });
  }
};

// GET /api/admin/all-users - Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "user" })
      .select("name email phone verified createdAt dob maritalStatus address area district pincode license")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (e) {
    console.error("getAllUsers error", e);
    res.status(500).json({ message: "Failed to load users" });
  }
};

// GET /api/admin/all-providers - Get all providers
export const getAllProviders = async (req, res) => {
  try {
    const providers = await Provider.find({})
      .select("name email phone upiId address createdAt")
      .sort({ createdAt: -1 });
    res.json(providers);
  } catch (e) {
    console.error("getAllProviders error", e);
    res.status(500).json({ message: "Failed to load providers" });
  }
};

// GET /api/admin/all-cars - Get all cars (approved and unapproved)
export const getAllCars = async (req, res) => {
  try {
    // Fetch base cars (include provider ObjectId for later populate & fallback)
    const baseCars = await Car.find({})
      .select("manufacturer model type price approved availability vehicleReg transmission fuelType seatingCapacity images createdAt provider")
      .sort({ createdAt: -1 });

    // Preserve original provider id before populate (for fallback lookup)
    const withIds = baseCars.map(c => {
      c._providerId = c.provider; // temporary property (not persisted)
      return c;
    });

    // Populate provider docs
    await Car.populate(withIds, { path: "provider", select: "name email phone" });

    // Build final list with fallback owner details if provider doc missing
    const cars = [];
    for (const c of withIds) {
      if (!c.provider && c._providerId) {
        // Try to fallback to a User document in case car was created by a normal user before role correction
        const user = await User.findById(c._providerId).select("name email phone");
        if (user) {
          const obj = c.toObject();
          obj.providerFallback = {
            name: user.name,
            email: user.email,
            phone: user.phone,
          };
          cars.push(obj);
          continue;
        }
      }
      cars.push(c); // push populated doc (Mongoose document ok; frontend handles provider or providerFallback)
    }

    res.json(cars);
  } catch (e) {
    console.error("getAllCars error", e);
    res.status(500).json({ message: "Failed to load cars" });
  }
};

// GET /api/admin/all-bookings - Get all bookings
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate({ path: "carId", select: "manufacturer model" })
      .populate({ path: "userId", select: "name email phone" })
      .populate({ path: "carProviderId", select: "name email phone" })
      .select("status pickupDate dropDate userName userPhone place purpose noOfDays createdAt")
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (e) {
    console.error("getAllBookings error", e);
    res.status(500).json({ message: "Failed to load bookings" });
  }
};
