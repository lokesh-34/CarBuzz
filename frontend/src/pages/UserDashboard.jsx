import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { baseURL } from "../api";
import dayjs from "dayjs";
// charts moved to UserStats page

export default function UserDashboard() {
  const [user, setUser] = useState(null);
  const [cars, setCars] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const navigate = useNavigate();

  const join = (p) => `${baseURL.replace(/\/$/, "")}/${String(p || "").replace(/^[\\/]/, "")}`;
  // charts moved to UserStats page

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

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
      } catch (err) {
        console.error(err);
        alert("Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

  // monthlyData removed; handled in UserStats

  if (!user) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name}</h1>

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

        {/* Moved My Bookings and Stats to User Stats page */}
      </div>
    </div>
  );
}
