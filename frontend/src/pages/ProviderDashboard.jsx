import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import log from "../logger";

export default function ProviderDashboard() {
  const [profile, setProfile] = useState({});
  const [providerId, setProviderId] = useState(null);
  const [cars, setCars] = useState([]);
  const [bookings, setBookings] = useState([]);
  const navigate = useNavigate();

  // ✅ Fetch profile
  const loadProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const { data } = await api.get("/api/providers/profile", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(data);
      setProviderId(data?._id || null);
    } catch (e) {
      log("Load profile failed", e?.response?.data || e.message);
    }
  };

  // ✅ Fetch cars
  const loadCars = async () => {
  try {
    const token = localStorage.getItem("token");
    const { data } = await api.get("/api/cars/mine", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setCars(data || []);
  } catch (e) {
    log("Load cars failed", e?.response?.data || e.message);
  }
};


  // ✅ Fetch bookings
  const loadBookings = async (pid) => {
    try {
      const id = pid || providerId;
      if (!id) return;
      const { data } = await api.get(`/api/bookings/provider/${id}`);
      setBookings(data || []);
    } catch (e) {
      log("Load bookings failed", e?.response?.data || e.message);
    }
  };

  // ✅ Update booking status
  const updateBookingStatus = async (id, status) => {
    try {
      await api.patch(`/api/bookings/${id}`, { status });
      setBookings(bookings.map(b => 
        b._id === id ? { ...b, status } : b
      ));
    } catch (e) {
      log("Update booking failed", e?.response?.data || e.message);
      alert("Failed to update booking");
    }
  };

  // ✅ Delete car
  const handleDeleteCar = async (id) => {
    try {
      await api.delete(`/api/cars/${id}`);
      setCars(cars.filter((c) => c._id !== id));
    } catch (e) {
      log("Delete car failed", e?.response?.data || e.message);
      alert("Failed to delete car");
    }
  };

  useEffect(() => {
    // Load profile first, then dependent data
    (async () => {
      await loadProfile();
    })();
  }, []);

  useEffect(() => {
    if (!providerId) return;
    loadCars();
    loadBookings(providerId);
  }, [providerId]);

  return (
    <div className="p-8 bg-gray-100 min-h-screen space-y-6">

      {/* Profile Section */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-2xl font-bold mb-4">👤 Provider Profile</h2>
        <p><strong>Name:</strong> {profile.name}</p>
        <p><strong>Email:</strong> {profile.email}</p>
        <p><strong>Phone:</strong> {profile.phone}</p>
      </div>

      {/* Add Car Button */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-2xl font-bold mb-4">➕ Add Vehicle</h2>
        <button
          onClick={() => navigate("/provider/add-car")}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Add Car
        </button>
      </div>

      {/* Cars List */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-2xl font-bold mb-4">🚗 My Vehicles</h2>
        {cars.length === 0 ? (
          <p className="text-gray-500">No cars added yet.</p>
        ) : (
          <div className="space-y-3">
            {cars.map((car) => (
              <div key={car._id} className="flex justify-between items-center p-3 border rounded-lg bg-gray-50">
                <span className="font-medium">{car.manufacturer} {car.model} - ₹{car.price}/day</span>
                <button
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  onClick={() => handleDeleteCar(car._id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bookings List */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-2xl font-bold mb-4">📅 Booking Requests</h2>
        {bookings.length === 0 ? (
          <p className="text-gray-500">No booking requests yet.</p>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div key={b._id} className="p-4 border rounded-lg bg-gray-50">
                <p><strong>User:</strong> {b.userName} ({b.userPhone})</p>
                <p><strong>Car:</strong> {b.carId?.manufacturer} {b.carId?.model}</p>
                <p><strong>Pickup:</strong> {b.pickupDate} {b.pickupTime}</p>
                <p><strong>Drop:</strong> {b.dropDate} {b.dropTime}</p>
                <p><strong>Place:</strong> {b.place}</p>
                <p><strong>Purpose:</strong> {b.purpose}</p>
                <p><strong>Status:</strong> 
                  <span className={`ml-2 font-semibold ${
                    b.status === "pending" ? "text-yellow-600" : 
                    b.status === "confirmed" ? "text-green-600" : "text-red-600"
                  }`}>
                    {b.status}
                  </span>
                </p>

                {b.status === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => updateBookingStatus(b._id, "confirmed")}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      ✅ Accept
                    </button>
                    <button
                      onClick={() => updateBookingStatus(b._id, "rejected")}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      ❌ Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
