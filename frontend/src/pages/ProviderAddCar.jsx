import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import log from "../logger";

export default function ProviderAddCar() {
  const manufacturers = [
    "Maruti Suzuki", "Hyundai", "Tata", "Mahindra",
    "Kia", "Toyota", "Honda",
    // ... add more brands
  ];

  const modelsByBrand = {
    "Maruti Suzuki": ["Alto", "Wagon R", "Swift", "Baleno"],
    "Hyundai": ["Santro", "i10", "i20"],
    // ... add more models
  };

  const [providerId, setProviderId] = useState("");
  const [form, setForm] = useState({
    manufacturer: "",
    model: "",
    type: "sedan",
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
      alert("No providerId found. Please register as a provider first.");
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
      alert("Car added successfully!");
      navigate("/provider");
    } catch (e) {
      log("Add car failed", e?.response?.data || e.message);
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e.message ||
        "Failed to add car";
      alert(msg);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow">
      <h2 className="text-2xl font-bold mb-4">Add Vehicle</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Manufacturer & Model */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            name="manufacturer"
            value={form.manufacturer}
            onChange={handleChange}
            className="p-2 border rounded"
            required
          >
            <option value="" disabled>Select Manufacturer</option>
            {manufacturers.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <select
            name="model"
            value={form.model}
            onChange={handleChange}
            className="p-2 border rounded"
            required
            disabled={!form.manufacturer}
          >
            <option value="" disabled>
              {form.manufacturer ? "Select Model" : "Select manufacturer first"}
            </option>
            {(modelsByBrand[form.manufacturer] || []).map((mdl) => (
              <option key={mdl} value={mdl}>{mdl}</option>
            ))}
          </select>

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
