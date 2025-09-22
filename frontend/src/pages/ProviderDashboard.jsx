import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { baseURL } from "../api";
import log from "../logger";
import dayjs from "dayjs";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

export default function ProviderDashboard() {
  const [profile, setProfile] = useState({});
  const [providerId, setProviderId] = useState(null);
  const [cars, setCars] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();

  const join = (p) => `${baseURL.replace(/\/$/, "")}/${String(p || "").replace(/^[\\/]/, "")}`;

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

  // Derived stats
  const stats = useMemo(() => {
    const counts = { pending: 0, confirmed: 0, rejected: 0 };
    let estRevenue = 0;
    (bookings || []).forEach((b) => {
      if (counts[b.status] !== undefined) counts[b.status] += 1;
      if (b.status === "confirmed") {
        const price = Number(b.carId?.price || 0);
        const days = Number(b.noOfDays || 0);
        estRevenue += price * days;
      }
    });
    return {
      cars: cars.length,
      ...counts,
      estRevenue,
    };
  }, [cars, bookings]);

  const monthlyData = useMemo(() => {
    // Last 6 months including current
    const now = dayjs();
    const buckets = Array.from({ length: 6 }).map((_, i) => {
      const m = now.subtract(5 - i, "month");
      return { key: m.format("YYYY-MM"), label: m.format("MMM"), count: 0 };
    });
    (bookings || []).forEach((b) => {
      const d = b.pickupDate ? dayjs(b.pickupDate) : null;
      if (!d || !d.isValid()) return;
      const key = d.format("YYYY-MM");
      const idx = buckets.findIndex((x) => x.key === key);
      if (idx >= 0) buckets[idx].count += 1;
    });
    return buckets.map(({ label, count }) => ({ month: label, bookings: count }));
  }, [bookings]);

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Provider Dashboard</h1>
            <p className="text-gray-600">Welcome back, {profile?.name || "Provider"}.</p>
          </div>
          <button
            onClick={() => navigate("/provider/add-car")}
            className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
          >
            + Add Car
          </button>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-sm text-gray-500">My Cars</p>
            <p className="mt-1 text-2xl font-bold">{stats.cars}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="mt-1 text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-sm text-gray-500">Confirmed</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{stats.confirmed}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-sm text-gray-500">Est. Revenue</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">₹{stats.estRevenue}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6">
          <div className="flex gap-2 border-b">
            {[
              { id: "overview", label: "Overview" },
              { id: "cars", label: "My Cars" },
              { id: "bookings", label: "Bookings" },
            ].map((t) => (
              <button
                key={t.id}
                className={`px-4 py-2 text-sm font-medium transition ${
                  activeTab === t.id
                    ? "border-b-2 border-blue-600 text-blue-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Overview */}
          {activeTab === "overview" && (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-xl bg-white p-4 shadow lg:col-span-2">
                <h3 className="mb-2 font-semibold">Bookings over time</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="bookings" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-xl bg-white p-4 shadow">
                <h3 className="mb-2 font-semibold">Status distribution</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: "Pending", value: stats.pending },
                      { name: "Confirmed", value: stats.confirmed },
                      { name: "Rejected", value: stats.rejected },
                    ]}>
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#60a5fa" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent bookings */}
              <div className="rounded-xl bg-white p-4 shadow lg:col-span-3">
                <h3 className="mb-3 font-semibold">Recent bookings</h3>
                {bookings.length === 0 ? (
                  <p className="text-gray-500">No bookings yet.</p>
                ) : (
                  <div className="divide-y">
                    {bookings.slice(0, 5).map((b) => (
                      <div key={b._id} className="flex items-center justify-between gap-3 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={b.carId?.images?.[0] ? join(b.carId.images[0]) : "/placeholder.jpg"}
                            alt="car"
                            onError={(e) => (e.currentTarget.src = "/placeholder.jpg")}
                            className="h-12 w-16 rounded object-cover"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {b.carId?.manufacturer} {b.carId?.model}
                              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                                b.status === "confirmed"
                                  ? "bg-green-100 text-green-700"
                                  : b.status === "pending"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}>
                                {b.status}
                              </span>
                            </p>
                            <p className="text-xs text-gray-600">
                              {b.pickupDate} {b.pickupTime} → {b.dropDate} {b.dropTime}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-700">Days: {b.noOfDays || "-"}</p>
                          <p className="text-xs text-gray-500">User: {b.userName}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cars */}
          {activeTab === "cars" && (
            <div className="mt-6 rounded-xl bg-white p-4 shadow">
              {cars.length === 0 ? (
                <p className="text-gray-500">No cars added yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {cars.map((car) => (
                    <div key={car._id} className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                      <div className="h-36 w-full bg-gray-100">
                        <img
                          src={car.images?.[0] ? join(car.images[0]) : "/placeholder.jpg"}
                          alt={car.model}
                          onError={(e) => (e.currentTarget.src = "/placeholder.jpg")}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-900">{car.manufacturer} {car.model}</p>
                          <p className="font-semibold text-blue-700">₹{car.price}</p>
                        </div>
                        {car.type ? <p className="text-xs text-gray-600">Type: {car.type}</p> : null}
                        <div className="mt-3 flex justify-end">
                          <button
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
                            onClick={() => handleDeleteCar(car._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bookings */}
          {activeTab === "bookings" && (
            <div className="mt-6 rounded-xl bg-white p-4 shadow">
              {bookings.length === 0 ? (
                <p className="text-gray-500">No booking requests yet.</p>
              ) : (
                <div className="space-y-3">
                  {bookings.map((b) => (
                    <div key={b._id} className="flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={b.carId?.images?.[0] ? join(b.carId.images[0]) : "/placeholder.jpg"}
                          alt="car"
                          onError={(e) => (e.currentTarget.src = "/placeholder.jpg")}
                          className="h-14 w-20 rounded object-cover"
                        />
                        <div>
                          <p className="font-medium text-gray-900">
                            {b.carId?.manufacturer} {b.carId?.model}
                            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                              b.status === "confirmed"
                                ? "bg-green-100 text-green-700"
                                : b.status === "pending"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}>
                              {b.status}
                            </span>
                          </p>
                          <p className="text-sm text-gray-600">{b.pickupDate} {b.pickupTime} → {b.dropDate} {b.dropTime}</p>
                          <p className="text-xs text-gray-500">User: {b.userName} ({b.userPhone})</p>
                        </div>
                      </div>
                      {b.status === "pending" && (
                        <div className="flex gap-2 md:justify-end">
                          <button
                            onClick={() => updateBookingStatus(b._id, "confirmed")}
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => updateBookingStatus(b._id, "rejected")}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
