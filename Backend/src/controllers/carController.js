import Car from "../models/Car.js";

const toPublicImage = (p) => {
  if (!p) return p;
  const normalized = String(p).replace(/\\/g, "/");
  if (normalized.startsWith("http")) return normalized;
  const m = normalized.match(/uploads\/[A-Za-z0-9_.-]+$/);
  if (m) return m[0];
  const file = normalized.split("/").pop();
  return `uploads/${file}`;
};

export const searchCars = async (req, res) => {
  try {
    const { manufacturer, model, type, minPrice, maxPrice } = req.query;

    // Auto-clear expired holds
    const now = new Date();
    await Car.updateMany(
      { unavailableUntil: { $ne: null, $lte: now } },
      { $set: { availability: true, unavailableUntil: null } }
    );

  const query = {};
  query.availability = true;
  query.approved = true;
    if (manufacturer) query.manufacturer = manufacturer;
    if (model) query.model = model;
    if (type) query.type = type;
    if (minPrice || maxPrice) query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);

    const cars = await Car.find(query).populate("provider", "name email phone");
    const mapped = cars.map((c) => ({
      ...c.toObject(),
      images: (c.images || []).map(toPublicImage),
    }));
    res.status(200).json(mapped);
  } catch (err) {
    console.error("Error searching cars:", err);
    res.status(500).json({ message: "Server error while searching cars" });
  }
};

export const myCars = async (req, res) => {
  try {
    const cars = await Car.find({ provider: req.user.id });
    const mapped = cars.map((c) => ({
      ...c.toObject(),
      images: (c.images || []).map(toPublicImage),
    }));
    res.status(200).json(mapped);
  } catch (err) {
    console.error("Error fetching provider cars:", err);
    res.status(500).json({ message: "Server error while fetching cars" });
  }
};
