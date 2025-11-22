import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api, { baseURL } from "../api";
import log from "../logger";
import dayjs from "dayjs";
import { toast } from "react-toastify";
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
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function ProviderDashboard() {
  const [profile, setProfile] = useState({});
  const [providerId, setProviderId] = useState(null);
  const [cars, setCars] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Live tracking UI state
  const [showLiveTrack, setShowLiveTrack] = useState(false);
  const [trackingBookingId, setTrackingBookingId] = useState(null);
  const [trackingPickupTs, setTrackingPickupTs] = useState(null);

  const join = (p) => `${baseURL.replace(/\/$/, "")}/${String(p || "").replace(/^[\\/]/, "")}`;

  // ✅ Fetch profile
  const loadProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please login to continue", { toastId: "prov-no-token" });
        navigate("/login");
        return;
      }
      const { data } = await api.get("/api/providers/profile", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(data);
      setProviderId(data?._id || null);
      toast.success("Profile loaded", { toastId: "prov-prof-load" });
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        log("Auth failed - wrong role or expired token", e?.response?.data);
        toast.error("Session expired. Please login again.", { toastId: "prov-auth-fail" });
        localStorage.removeItem("token");
        navigate("/login");
      } else if (e.code === 'ECONNABORTED' || e.message?.includes('timeout')) {
        log("Request timeout", e.message);
        toast.warning("Request timed out. Please check your connection.", { toastId: "prov-timeout" });
      } else if (!e.response) {
        log("Network error", e.message);
        toast.error("Network error. Please check your connection.", { toastId: "prov-network" });
      } else {
        log("Load profile failed", e?.response?.data || e.message);
        toast.error("Failed to load profile. Please try again.", { toastId: "prov-prof-err" });
      }
    } finally {
      setLoading(false);
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
    const pending = (data || []).some((c) => !c.approved);
    toast.success("Cars loaded", { toastId: "prov-cars-load" });
    if (pending) {
      toast.info("Some cars are pending admin approval", { toastId: "prov-cars-pending" });
    } else if ((data || []).length > 0) {
      toast.success("All cars approved ✔", { toastId: "prov-cars-allok" });
    }
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
      toast.success("Bookings loaded", { toastId: "prov-bookings-load" });
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
      toast.success(`Booking ${status}`, { toastId: `prov-book-${id}-${status}` });
    } catch (e) {
      log("Update booking failed", e?.response?.data || e.message);
      toast.error("Failed to update booking", { toastId: "prov-upd" });
    }
  };

  // ✅ Delete car
  const handleDeleteCar = async (id) => {
    try {
      await api.delete(`/api/cars/${id}`);
      setCars(cars.filter((c) => c._id !== id));
      toast.success("Car deleted", { toastId: `car-del-${id}` });
    } catch (e) {
      log("Delete car failed", e?.response?.data || e.message);
      toast.error("Failed to delete car", { toastId: "prov-del" });
    }
  };

  useEffect(() => {
    // Load profile first, then dependent data
    (async () => {
      await loadProfile();
    })();
  }, []);

  // Fix leaflet icon paths for environments where assets aren't copied
  useEffect(() => {
    try {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadProfile();
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
    <>
    {loading ? (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    ) : (
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
                          {b.status === 'confirmed' && (
                            <div className="mt-2">
                              <button
                                onClick={() => {
                                  setTrackingBookingId(b._id);
                                  const iso = `${b.pickupDate || ''}T${b.pickupTime || '00:00'}:00`;
                                  const ts = new Date(iso).getTime();
                                  setTrackingPickupTs(Number.isNaN(ts) ? null : ts);
                                  setShowLiveTrack(true);
                                }}
                                className="mt-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
                              >
                                Live Track
                              </button>
                            </div>
                          )}
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
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs ${car.approved ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                              {car.approved ? "Approved" : "Pending"}
                            </span>
                            <p className="font-semibold text-blue-700">₹{car.price}</p>
                          </div>
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
                      <div className="flex gap-2 md:justify-end">
                        {b.status === "pending" && (
                          <>
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
                          </>
                        )}
                        {b.status === "confirmed" && (
                          <button
                            onClick={() => {
                              setTrackingBookingId(b._id);
                              const iso = `${b.pickupDate || ''}T${b.pickupTime || '00:00'}:00`;
                              const ts = new Date(iso).getTime();
                              setTrackingPickupTs(Number.isNaN(ts) ? null : ts);
                              setShowLiveTrack(true);
                            }}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
                          >
                            Live Track
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    )}
    {showLiveTrack && trackingBookingId && (
      <LiveTrackingModal
        bookingId={trackingBookingId}
        pickupTs={trackingPickupTs}
        onClose={() => { setShowLiveTrack(false); setTrackingBookingId(null); setTrackingPickupTs(null); }}
      />
    )}
    </>
  );
}


function LiveTrackingModal({ bookingId, pickupTs, onClose }) {
  const [positions, setPositions] = useState([]);
  const [connected, setConnected] = useState(false);
  const [tripEnded, setTripEnded] = useState(false);
  const [isDriver, setIsDriver] = useState(false);
  const socketRef = useRef(null);
  const simRef = useRef(null);
  const gpsWatchRef = useRef(null);
  const [now, setNow] = useState(Date.now());

  const secondsToPickup = useMemo(() => {
    if (!pickupTs) return 0;
    return Math.max(0, Math.floor((pickupTs - now) / 1000));
  }, [pickupTs, now]);

  useEffect(() => {
    if (!pickupTs) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [pickupTs]);

  useEffect(() => {
    if (pickupTs && secondsToPickup > 0) return; // wait until pickup time

    const socket = io(baseURL, { transports: ['websocket'], autoConnect: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('joinTrip', { tripId: bookingId });
    });

    socket.on('locationUpdate', (payload) => {
      console.log('[PROVIDER] locationUpdate event received:', payload);
      try {
        if (!payload) {
          console.log('[PROVIDER] No payload received');
          return;
        }
        if (payload.tripId && payload.tripId !== bookingId) {
          console.log(`[PROVIDER] TripId mismatch: received ${payload.tripId}, expected ${bookingId}`);
          return;
        }
        console.log(`[PROVIDER] Received location update: lat=${payload.lat}, lng=${payload.lng}, speed=${payload.speed} km/h`);
        const item = {
          lat: Number(payload.lat),
          lng: Number(payload.lng),
          speed: Number(payload.speed || 0),
          ts: payload.ts ? new Date(payload.ts).getTime() : Date.now(),
        };
        console.log('[PROVIDER] Adding position to state:', item);
        setPositions((p) => [...p, item]);
      } catch (e) {
        console.error('[PROVIDER] Error processing payload:', payload, e);
      }
    });

    socket.on('tripEnded', (payload) => {
      if (payload?.tripId && payload.tripId !== bookingId) return;
      setTripEnded(true);
      stopGPSTracking();
    });

    socket.on('trackingError', (payload) => {
      const msg = payload?.message || 'Unknown tracking error';
      console.warn('Tracking error:', msg);
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection failed. Starting simulation mode.');
      // start simulation fallback
      startSimulation();
    });

    const timeout = setTimeout(() => {
      if (!socket.connected) startSimulation();
    }, 1500);

    return () => {
      clearTimeout(timeout);
      stopGPSTracking();
      try { socket.disconnect(); } catch (e) {}
      if (simRef.current) { clearInterval(simRef.current); simRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, pickupTs, secondsToPickup]);

  // GPS Tracking
  useEffect(() => {
    if (!isDriver || !bookingId || !socketRef.current?.connected || tripEnded) return;
    if (pickupTs && secondsToPickup > 0) return;
    
    startGPSTracking();
    
    return () => stopGPSTracking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDriver, bookingId, tripEnded, secondsToPickup]);

  function startGPSTracking() {
    if (!navigator.geolocation) return;
    if (gpsWatchRef.current) return;
    
    let lastPosition = null;
    let lastTime = Date.now();
    
    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed: gpsSpeed } = position.coords;
            const currentTime = Date.now();
            
            let calculatedSpeed = 0;
            if (gpsSpeed !== null && gpsSpeed !== undefined) {
              calculatedSpeed = gpsSpeed * 3.6; // m/s to km/h
            } else if (lastPosition) {
              const timeDiff = (currentTime - lastTime) / 1000;
              const distance = calculateDistance(
                lastPosition.latitude,
                lastPosition.longitude,
                latitude,
                longitude
              );
              calculatedSpeed = (distance / timeDiff) * 3.6;
            }
            
            console.log(`[PROVIDER GPS] Current position: lat=${latitude.toFixed(6)}, lng=${longitude.toFixed(6)}, speed=${Math.round(calculatedSpeed)} km/h`);
            
            lastPosition = { latitude, longitude };
            lastTime = currentTime;        if (socketRef.current?.connected) {
          console.log(`[PROVIDER GPS] Sending location: lat=${latitude}, lng=${longitude}, speed=${Math.round(calculatedSpeed)} km/h`);
          socketRef.current.emit('driverLocation', {
            tripId: bookingId,
            lat: latitude,
            lng: longitude,
            speed: Math.round(calculatedSpeed),
          });
        }
      },
      (error) => console.error('GPS error:', error),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  }

  function stopGPSTracking() {
    if (gpsWatchRef.current) {
      navigator.geolocation.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = null;
    }
  }

  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function startSimulation() {
    if (simRef.current) return;
    const path = [
      { lat: 12.9716, lng: 77.5946, speed: 0 },
      { lat: 12.9720, lng: 77.5950, speed: 18 },
      { lat: 12.9730, lng: 77.5960, speed: 28 },
      { lat: 12.9740, lng: 77.5970, speed: 35 },
      { lat: 12.9750, lng: 77.5980, speed: 22 },
      { lat: 12.9760, lng: 77.5990, speed: 0 },
    ];
    let i = 0;
    simRef.current = setInterval(() => {
      if (i >= path.length) { clearInterval(simRef.current); simRef.current = null; setTripEnded(true); return; }
      const p = { ...path[i], ts: Date.now() };
      setPositions((s) => [...s, p]);
      i += 1;
    }, 2000);
  }

  const latest = positions.length ? positions[positions.length - 1] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-lg font-semibold">Live Tracking — Booking {bookingId}</div>
          <div className="flex items-center gap-2">
            <button 
              className={`rounded px-2 py-1 text-xs font-medium ${isDriver ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
              onClick={() => setIsDriver(!isDriver)}
              title="Toggle GPS sharing (for testing)"
            >
              {isDriver ? '📍 GPS' : 'GPS Off'}
            </button>
            <div className="text-sm text-gray-600">{connected ? 'Connected' : 'Disconnected'}</div>
            <button className="rounded bg-gray-100 px-3 py-1 text-sm" onClick={onClose}>Close</button>
          </div>
        </div>
        {pickupTs && secondsToPickup > 0 && (
          <div className="border-b bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
            Starts in {new Date(secondsToPickup * 1000).toISOString().substring(11, 19)}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="col-span-2 h-[480px]">
            <MapContainer center={latest ? [latest.lat, latest.lng] : [12.9716, 77.5946]} zoom={14} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {positions.length > 0 && (
                <>
                  <Marker position={[latest.lat, latest.lng]}>
                    <Popup>
                      Speed: {latest.speed} km/h<br />
                      Time: {new Date(latest.ts).toLocaleTimeString()}
                    </Popup>
                  </Marker>
                  <Polyline positions={positions.map((p) => [p.lat, p.lng])} color="#2563eb" />
                </>
              )}
            </MapContainer>
          </div>
          <div className="col-span-1 p-4">
            <div className="mb-4 rounded-lg border bg-gray-50 p-3">
              <div className="text-sm text-gray-500">Current Speed</div>
              <div className="mt-2 text-3xl font-bold text-blue-600">{latest ? `${latest.speed} km/h` : '--'}</div>
              <div className="mt-1 text-xs text-gray-500">{latest ? new Date(latest.ts).toLocaleTimeString() : ''}</div>
            </div>

            <div className="mb-4 rounded-lg border bg-white p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Trip Stats</div>
                <button 
                  className="text-xs text-red-600" 
                  onClick={() => {
                    if (socketRef.current?.connected) {
                      socketRef.current.emit('endTrip', { tripId: bookingId });
                    }
                    setTripEnded(true);
                    stopGPSTracking();
                  }}
                >
                  End Trip
                </button>
              </div>
              <div className="mt-3 text-sm text-gray-600">Points: {positions.length}</div>
            </div>

            <div className="h-64">
              <div className="text-sm font-medium">Speed vs Time</div>
              {positions.length === 0 ? (
                <div className="mt-6 text-center text-sm text-gray-500">Waiting for data…</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={positions.map(p => ({ time: new Date(p.ts).toLocaleTimeString(), speed: p.speed }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis unit="km/h" />
                    <Tooltip />
                    <Line type="monotone" dataKey="speed" stroke="#8884d8" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {tripEnded && (
          <div className="border-t p-4">
            <div className="text-sm font-medium">Trip finished — Speed vs Time summary</div>
            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={positions.map(p => ({ time: new Date(p.ts).toLocaleTimeString(), speed: p.speed }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis unit="km/h" />
                  <Tooltip />
                  <Line type="monotone" dataKey="speed" stroke="#ff5722" dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex justify-end">
              <button className="rounded bg-blue-600 px-4 py-2 text-white" onClick={onClose}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
