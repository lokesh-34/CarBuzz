import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import log from "../logger";
import { toast } from "react-toastify";

export default function ProviderAddCar() {
  const manufacturers = [
    "Maruti Suzuki", "Hyundai", "Tata", "Mahindra", "Kia", "Toyota", "Honda",
    "Ford", "Renault", "Nissan", "Volkswagen", "Skoda", "MG", "Jeep",
    "Mercedes-Benz", "BMW", "Audi", "Jaguar", "Land Rover", "Volvo"
  ];

  const modelsByBrand = {
    "Maruti Suzuki": ["Alto", "Wagon R", "Swift", "Baleno", "Dzire", "Ertiga"],
    "Hyundai": ["Santro", "i10", "i20", "Creta", "Venue"],
    "Tata": ["Nano", "Tiago", "Altroz", "Nexon", "Harrier"],
    "Mahindra": ["Scorpio", "XUV300", "XUV700", "Bolero", "Thar"],
    "Kia": ["Seltos", "Sonet", "Carens"],
    "Toyota": ["Innova", "Fortuner", "Glanza", "Urban Cruiser"],
    "Honda": ["City", "Amaze", "Jazz", "WR-V"],
    "Ford": ["EcoSport", "Figo", "Endeavour"],
    "Renault": ["Kwid", "Triber", "Duster"],
    "Nissan": ["Magnite", "Kicks"],
    "Volkswagen": ["Polo", "Vento", "Taigun"],
    "Skoda": ["Rapid", "Superb", "Kushaq"],
    "MG": ["Hector", "Astor", "ZS EV"],
    "Jeep": ["Compass", "Meridian"],
    "Mercedes-Benz": ["C-Class", "E-Class", "GLA", "GLC"],
    "BMW": ["3 Series", "5 Series", "X1", "X5"],
    "Audi": ["A3", "A4", "Q3", "Q5"],
    "Jaguar": ["XF", "F-Pace"],
    "Land Rover": ["Range Rover Evoque", "Discovery Sport"],
    "Volvo": ["XC40", "XC60", "XC90"],
  };

  const [providerId, setProviderId] = useState("");
  const [form, setForm] = useState({
    vehicleReg: "",
    manufacturer: "",
    model: "",
    type: "sedan",
    transmission: "manual",
    fuelType: "petrol",
    price: "",
    seatingCapacity: "",
    description: "",
    insuranceStatus: "paid",
    rcDetails: "",
    district: "",
    area: "",
    pincode: "",
  });
  const [images, setImages] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const navigate = useNavigate();

  // ✅ Load providerId from localStorage
  useEffect(() => {
    const id = localStorage.getItem("providerId");
    if (!id) {
      toast.warn("No provider profile found. Register/login first.", { toastId: "no-prov" });
      navigate("/provider");
      return;
    }
    setProviderId(id);
  }, [navigate]);

  // ✅ Handle form inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "manufacturer") {
      setForm({ ...form, manufacturer: value, model: "" });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  // ✅ Handle image selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setImages((prev) => [...prev, ...files]);
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls((prev) => [...prev, ...urls]);
  };

  const handleRemoveImage = (idx) => {
    URL.revokeObjectURL(previewUrls[idx]);
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  // ✅ Submit to backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!form.vehicleReg?.trim()) {
        toast.error("Please enter the vehicle registration number");
        return;
      }
      const fd = new FormData();
      const formToSend = {
        ...form,
        price: Number(form.price) || 0,
        seatingCapacity: Number(form.seatingCapacity) || 0,
      };

      // 🔑 Include provider in FormData
      fd.append("provider", providerId);

      Object.entries(formToSend).forEach(([k, v]) => fd.append(k, v));
      images.forEach((file) => fd.append("images", file));

      log("Add car submit", {
        providerId,
        form: formToSend,
        files: images.length,
      });

      const token = localStorage.getItem("token");
      const { data } = await api.post("/api/cars/add", fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          // ⚠️ No Content-Type; browser will set the correct multipart boundary
        },
      });

      log("Car created", data.car);
      toast.success("Car submitted. Awaiting admin approval.", { toastId: "car-added" });
      navigate("/provider");
    } catch (e) {
      log("Add car failed", e?.response?.data || e.message);
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e.message ||
        "Failed to add car";
      toast.error(msg);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow">
      <h2 className="text-2xl font-bold mb-4">Add Vehicle</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Vehicle Registration Number */}
        <div>
          <label className="block mb-1 font-semibold">Vehicle Registration Number</label>
          <input
            name="vehicleReg"
            placeholder="e.g., KA01AB1234"
            value={form.vehicleReg}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        {/* Manufacturer & Model with datalist */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-semibold">Manufacturer</label>
            <input
              list="manufacturer-list"
              name="manufacturer"
              value={form.manufacturer}
              onChange={handleChange}
              placeholder="Type or select manufacturer"
              className="w-full p-2 border rounded"
              required
            />
            <datalist id="manufacturer-list">
              {manufacturers.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block mb-1 font-semibold">Model</label>
            <input
              list="model-list"
              name="model"
              value={form.model}
              onChange={handleChange}
              placeholder={form.manufacturer ? "Type or select model" : "Select manufacturer first"}
              className="w-full p-2 border rounded"
              required
              disabled={!form.manufacturer}
            />
            <datalist id="model-list">
              {(modelsByBrand[form.manufacturer] || []).map((mdl) => (
                <option key={mdl} value={mdl} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Car Type, Transmission, FuelType, Seating, Price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            className="p-2 border rounded"
          >
            <option value="sedan">Sedan</option>
            <option value="suv">SUV</option>
            <option value="hatchback">Hatchback</option>
            <option value="ev">EV</option>
            <option value="luxury">Luxury</option>
            <option value="other">Other</option>
          </select>

          <select
            name="transmission"
            value={form.transmission}
            onChange={handleChange}
            className="p-2 border rounded"
          >
            <option value="manual">Manual</option>
            <option value="automatic">Automatic</option>
            <option value="amt">AMT</option>
            <option value="cvt">CVT</option>
          </select>

          <select
            name="fuelType"
            value={form.fuelType}
            onChange={handleChange}
            className="p-2 border rounded"
          >
            <option value="petrol">Petrol</option>
            <option value="diesel">Diesel</option>
            <option value="cng">CNG</option>
            <option value="electric">Electric</option>
            <option value="hybrid">Hybrid</option>
            <option value="lpg">LPG</option>
          </select>

          <input
            name="seatingCapacity"
            type="number"
            min="1"
            placeholder="Seating Capacity"
            value={form.seatingCapacity}
            onChange={handleChange}
            className="p-2 border rounded"
            required
          />

          <input
            name="price"
            type="number"
            min="0"
            placeholder="Price (₹)"
            value={form.price}
            onChange={handleChange}
            className="p-2 border rounded"
            required
          />
        </div>

        {/* Description & Insurance */}
        <textarea
          name="description"
          placeholder="Description"
          rows="3"
          value={form.description}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            name="insuranceStatus"
            value={form.insuranceStatus}
            onChange={handleChange}
            className="p-2 border rounded"
          >
            <option value="paid">Insurance Paid</option>
            <option value="not_paid">Insurance Not Paid</option>
          </select>

          <input
            name="rcDetails"
            placeholder="RC details"
            value={form.rcDetails}
            onChange={handleChange}
            className="p-2 border rounded"
            required
          />
        </div>

        {/* Location */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            name="district"
            placeholder="District"
            value={form.district}
            onChange={handleChange}
            className="p-2 border rounded"
            required
          />
          <input
            name="area"
            placeholder="Area"
            value={form.area}
            onChange={handleChange}
            className="p-2 border rounded"
            required
          />
          <input
            name="pincode"
            placeholder="Pincode"
            value={form.pincode}
            onChange={handleChange}
            className="p-2 border rounded"
            required
          />
        </div>

        {/* Images */}
        <div>
          <label className="block mb-1 font-semibold">
            Car Images (multiple)
          </label>
          <input
            type="file"
            name="images"
            multiple
            accept="image/*"
            onChange={handleFileChange}
          />

          {previewUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mt-3">
              {previewUrls.map((url, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={url}
                    alt={`preview-${idx}`}
                    className="w-full h-24 object-cover rounded"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full px-2 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Save
        </button>
      </form>
    </div>
  );
}
