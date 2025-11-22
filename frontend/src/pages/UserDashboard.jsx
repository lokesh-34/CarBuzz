import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api, { baseURL } from "../api";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
// charts moved to UserStats page

export default function UserDashboard() {
  const [user, setUser] = useState(null);
  const [cars, setCars] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [gpsActive, setGpsActive] = useState(false);
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const gpsWatchRef = useRef(null);

  const join = (p) => `${baseURL.replace(/\/$/, "")}/${String(p || "").replace(/^[\\/]/, "")}`;
  // charts moved to UserStats page

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      
      // Check if token exists before making requests
      if (!token) {
        console.log("No token found, redirecting to login");
        navigate("/login");
        return;
      }

      setLoading(true);

      try {
        // Load profile first to get user id
        const userRes = await api.get("/api/users/profile");
        const me = userRes.data;
        setUser(me);

        // Load cars and user bookings in parallel
        const [carsRes, bookingsRes] = await Promise.all([
          api.get("/api/cars"),
          api.get(`/api/bookings/user/${me._id}`),
        ]);
  setCars(carsRes.data?.cars || []);
  setBookings(bookingsRes.data || []);
  // Positive feedback on initial load only
  toast.success("Welcome back! Data loaded.", { toastId: "ud-load" });
      } catch (err) {
        console.error("Fetch error:", err);
        const status = err.response?.status;
        
        // Only redirect to login on genuine auth failures
        if (status === 401 || status === 403) {
          console.log(`${status} error - auth failed`);
          toast.error("Session expired. Please login again.", { toastId: "ud-auth" });
          localStorage.removeItem("token");
          navigate("/login");
        } else if (!localStorage.getItem("token")) {
          // No token at all
          console.log("No token found");
          navigate("/login");
        } else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
          // Timeout - don't redirect
          console.log("Request timeout - staying on page");
          toast.warning("Request timed out. Please check your connection.", { toastId: "ud-timeout" });
        } else if (!err.response) {
          // Network error - don't redirect
          console.log("Network error - staying on page");
          toast.error("Network error. Please check your connection.", { toastId: "ud-network" });
        } else {
          // Other errors - don't redirect
          console.log("Other error:", status);
          toast.error("Failed to load data. Please try again.", { toastId: "ud-fetch" });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  const handleBook = (carId) => navigate(`/book/${carId}`);
  const handleDetails = (carId) => navigate(`/cars/${carId}`);

  const filteredCars = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = cars;
    if (typeFilter !== "all") {
      list = list.filter((c) => String(c.type || "").toLowerCase() === typeFilter);
    }
    if (term) {
      list = list.filter((c) => {
      const parts = [
        c.manufacturer,
        c.model,
        c.type,
        c.fuelType,
        c.transmission,
        String(c.price),
        c.location,
      ]
        .filter(Boolean)
        .map((x) => String(x).toLowerCase());
        return parts.some((p) => p.includes(term));
      });
    }
    const sorted = [...list];
    if (sortBy === "price-asc") sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
    else if (sortBy === "price-desc") sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
    else if (sortBy === "name")
      sorted.sort((a, b) => String(a.manufacturer + a.model).localeCompare(String(b.manufacturer + b.model)));
    // featured: leave order as-is
    return sorted;
  }, [q, cars, typeFilter, sortBy]);

  const uniqueTypes = useMemo(() => {
    const set = new Set((cars || []).map((c) => String(c.type || "").toLowerCase()).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [cars]);

  // Split bookings into upcoming/active vs past
  const { upcoming, past } = useMemo(() => {
    const now = dayjs();
    const normalized = (bookings || []).map((b) => {
      const start = b.pickupDate && b.pickupTime ? dayjs(`${b.pickupDate}T${b.pickupTime}`) : null;
      const end = b.dropDate && b.dropTime ? dayjs(`${b.dropDate}T${b.dropTime}`) : null;
      return { ...b, _start: start, _end: end };
    });
    const upcoming = normalized
      .filter((b) => !b._end || b._end.isAfter(now))
      .sort((a, b) => (a._start && b._start ? a._start.valueOf() - b._start.valueOf() : 0));
    const past = normalized
      .filter((b) => b._end && b._end.isBefore(now))
      .sort((a, b) => (b._end && a._end ? b._end.valueOf() - a._end.valueOf() : 0));
    return { upcoming, past };
  }, [bookings]);

  const stats = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter((b) => b.status === "pending").length;
    const confirmed = bookings.filter((b) => b.status === "confirmed").length;
    const rejected = bookings.filter((b) => b.status === "rejected").length;
    return { total, pending, confirmed, rejected, upcoming: upcoming.length, past: past.length };
  }, [bookings, upcoming.length, past.length]);

  // Find active booking (confirmed and currently in trip time)
  const activeBooking = useMemo(() => {
    const now = dayjs();
    return upcoming.find((b) => {
      if (b.status !== "confirmed") return false;
      const start = b._start;
      const end = b._end;
      if (!start || !end) return false;
      // Active if current time is between pickup and drop time
      return now.isAfter(start) && now.isBefore(end);
    });
  }, [upcoming]);

  // Automatic GPS tracking for active booking
  useEffect(() => {
    if (!activeBooking || !user) {
      // Stop GPS if no active booking
      stopGPSTracking();
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Start socket connection
    const socket = io(baseURL, { transports: ['websocket'], autoConnect: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinTrip', { tripId: activeBooking._id });
      startGPSTracking(activeBooking._id);
    });

    socket.on('tripEnded', () => {
      stopGPSTracking();
      toast.info("Trip ended", { toastId: "trip-end" });
    });

    socket.on('connect_error', () => {
      console.warn('GPS tracking: Backend not connected');
    });

    return () => {
      stopGPSTracking();
      if (socket) socket.disconnect();
    };
  }, [activeBooking, user]);

  function startGPSTracking(tripId) {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      return;
    }
    if (gpsWatchRef.current) return;

    // Request permission and start tracking
    navigator.geolocation.getCurrentPosition(
      () => {
        setGpsActive(true);
        toast.success("📍 Sharing your location during trip", { toastId: "gps-active" });
        
        let lastPosition = null;
        let lastTime = Date.now();
        
        gpsWatchRef.current = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude, speed: gpsSpeed } = position.coords;
            const currentTime = Date.now();
            
            let calculatedSpeed = 0;
            if (gpsSpeed !== null && gpsSpeed !== undefined) {
              calculatedSpeed = gpsSpeed * 3.6;
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
            
            console.log(`[USER GPS] Current position: lat=${latitude.toFixed(6)}, lng=${longitude.toFixed(6)}, speed=${Math.round(calculatedSpeed)} km/h`);
            
            lastPosition = { latitude, longitude };
            lastTime = currentTime;
            
            if (socketRef.current?.connected) {
              console.log(`[USER GPS] Sending location: lat=${latitude}, lng=${longitude}, speed=${Math.round(calculatedSpeed)} km/h`);
              socketRef.current.emit('driverLocation', {
                tripId,
                lat: latitude,
                lng: longitude,
                speed: Math.round(calculatedSpeed),
              });
            }
          },
          (error) => {
            console.error('GPS error:', error);
            if (error.code === 1) {
              toast.error("Please allow location access to track your trip", { toastId: "gps-denied" });
            }
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      },
      (error) => {
        if (error.code === 1) {
          toast.warning("Location permission needed for trip tracking", { toastId: "gps-perm" });
        }
      }
    );
  }

  function stopGPSTracking() {
    if (gpsWatchRef.current) {
      navigator.geolocation.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = null;
      setGpsActive(false);
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

  // monthlyData removed; handled in UserStats

  if (!user) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name}</h1>
          {gpsActive && (
            <div className="flex items-center gap-2 rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-800">
              <span className="animate-pulse text-lg">📍</span>
              <span>Tracking Active Trip</span>
            </div>
          )}
        </div>

        {/* Active Trip Alert */}
        {activeBooking && (
          <div className="mt-4 rounded-xl border-2 border-blue-500 bg-blue-50 p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">🚗 Active Trip</h3>
                <p className="mt-1 text-sm text-blue-800">
                  {activeBooking.carId?.manufacturer} {activeBooking.carId?.model}
                </p>
                <p className="text-xs text-blue-700">
                  Drop-off: {activeBooking.dropDate} at {activeBooking.dropTime}
                </p>
                {gpsActive ? (
                  <p className="mt-2 text-xs text-green-700">✓ Your location is being shared automatically</p>
                ) : (
                  <p className="mt-2 text-xs text-orange-700">⚠ Please allow location access to enable tracking</p>
                )}
              </div>
              <button
                onClick={() => navigate(`/live/${activeBooking._id}`)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                View Map
              </button>
            </div>
          </div>
        )}

        {/* Profile + Stats */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-white p-4 shadow md:col-span-1">
            <h2 className="text-lg font-semibold">Your Profile</h2>
            <div className="mt-2 text-sm text-gray-700">
              <p><span className="font-medium">Email:</span> {user.email}</p>
              <p><span className="font-medium">Phone:</span> {user.phone || '-'}</p>
              <p><span className="font-medium">Address:</span> {user.address || '-'}</p>
            </div>
            <button
              onClick={() => navigate('/user/stats')}
              className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              View Stats
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 md:col-span-2">
            <div className="rounded-xl bg-white p-4 shadow">
              <p className="text-sm text-gray-500">Upcoming Trips</p>
              <p className="mt-1 text-2xl font-bold text-blue-700">{stats.upcoming}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow">
              <p className="text-sm text-gray-500">Past Trips</p>
              <p className="mt-1 text-2xl font-bold">{stats.past}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow">
              <p className="text-sm text-gray-500">Confirmed</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{stats.confirmed}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow">
              <p className="text-sm text-gray-500">Pending</p>
              <p className="mt-1 text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
          </div>
        </div>
        

        {/* Available Cars */}
        <div className="mt-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold">Available Cars</h2>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                type="text"
                placeholder="Search by make, model, type..."
                className="w-full max-w-sm rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {uniqueTypes.map((t) => (
                  <option key={t} value={t}>{t === "all" ? "All Types" : t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name">Name (A-Z)</option>
              </select>
              {(q || typeFilter !== "all" || sortBy !== "featured") && (
                <button
                  onClick={() => { setQ(""); setTypeFilter("all"); setSortBy("featured"); }}
                  className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-200"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500">Showing {filteredCars.length} of {cars.length} cars</div>
          {loading ? (
            <div className="mt-3 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-xl bg-white shadow">
                  <div className="h-40 w-full animate-pulse bg-gray-200" />
                  <div className="p-4">
                    <div className="h-5 w-2/3 animate-pulse rounded bg-gray-200" />
                    <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-gray-200" />
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="h-9 animate-pulse rounded bg-gray-200" />
                      <div className="h-9 animate-pulse rounded bg-gray-200" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCars.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
              No cars match your filters.
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredCars.map((car) => (
              <div key={car._id} className="flex flex-col overflow-hidden rounded-xl bg-white shadow">
                <div className="h-40 w-full bg-gray-100">
                  <img
                    src={car.images?.[0] ? join(car.images[0]) : "/placeholder.png"}
                    alt={car.model}
                    onError={(e) => (e.currentTarget.src = "/placeholder.png")}
                    className="h-full w-full object-cover"
                    role="button"
                    onClick={() => handleDetails(car._id)}
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold">{car.manufacturer} {car.model}</h3>
                  <p className="text-sm text-gray-600">{car.type}{car.fuelType ? ` • ${car.fuelType}` : ""}{car.transmission ? ` • ${car.transmission}` : ""}</p>
                  <p className="mt-1 font-semibold text-blue-700">₹{car.price}</p>
                  {car.location && <p className="text-xs text-gray-500">{car.location}</p>}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleBook(car._id)}
                      className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
                    >
                      Book Now
                    </button>
                    <button
                      onClick={() => handleDetails(car._id)}
                      className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-200"
                    >
                      See Details
                    </button>
                  </div>
                </div>
              </div>
              ))}
            </div>
          )}
        </div>

        {/* Provider contact info for confirmed bookings */}
        {upcoming.filter(b => b.status === "confirmed" && b.carProviderId && b._id !== activeBooking?._id).length > 0 && (
          <div className="mt-10 rounded-xl bg-white p-4 shadow">
            <h2 className="mb-3 text-xl font-semibold">Upcoming Confirmed Bookings</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {upcoming.filter(b => b.status === "confirmed" && b.carProviderId && b._id !== activeBooking?._id).map((b) => (
                <div key={b._id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                  <p className="font-semibold">{b.carId?.manufacturer} {b.carId?.model}</p>
                  <p className="text-sm text-gray-700 mt-1">{b.carProviderId?.name}</p>
                  <p className="text-sm text-gray-600">{b.carProviderId?.phone} • {b.carProviderId?.email}</p>
                  {b.carProviderId?.address?.fullAddress && (
                    <p className="text-xs text-gray-500 mt-1">{b.carProviderId.address.fullAddress}, {b.carProviderId.address.area}, {b.carProviderId.address.district} - {b.carProviderId.address.pincode}</p>
                  )}
                  <p className="text-xs text-blue-600 mt-2">
                    Pickup: {b.pickupDate} {b.pickupTime}
                  </p>
                  <p className="text-xs text-gray-500">
                    Drop: {b.dropDate} {b.dropTime}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
