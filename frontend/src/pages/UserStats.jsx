import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

export default function UserStats() {
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login?redirect=/user/stats");
        return;
      }
      try {
        const userRes = await api.get("/api/users/profile");
        const me = userRes.data;
        setUser(me);
        const bookingsRes = await api.get(`/api/bookings/user/${me._id}`);
        setBookings(bookingsRes.data || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load stats", { toastId: "stats-load" });
      }
    };
    fetchData();
  }, [navigate]);

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
    const pending = bookings.filter((b) => b.status === "pending").length;
    const confirmed = bookings.filter((b) => b.status === "confirmed").length;
    const rejected = bookings.filter((b) => b.status === "rejected").length;
    return { pending, confirmed, rejected, upcoming: upcoming.length, past: past.length };
  }, [bookings, upcoming.length, past.length]);

  const monthlyData = useMemo(() => {
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
    return buckets.map(({ label, count }) => ({ month: label, trips: count }));
  }, [bookings]);

  if (!user) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Your Stats</h1>
          <button
            className="rounded-lg bg-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-300"
            onClick={() => navigate(-1)}
          >
            Back
          </button>
        </div>

        {/* Quick Counters */}
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
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

        {/* Charts */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl bg-white p-4 shadow lg:col-span-2">
            <h3 className="mb-2 font-semibold">Trips over time</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="trips" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
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
        </div>

        {/* My Bookings */}
        <div className="mt-10">
          <h2 className="text-xl font-semibold">My Bookings</h2>
          <div className="mt-3 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Upcoming / Active */}
            <div className="rounded-xl bg-white p-4 shadow">
              <h3 className="mb-3 text-lg font-semibold">Upcoming & Active</h3>
              {upcoming.length === 0 ? (
                <p className="text-gray-500">No upcoming bookings.</p>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((b) => (
                    <div key={b._id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                      <p className="font-semibold">
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
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Past / History */}
            <div className="rounded-xl bg-white p-4 shadow">
              <h3 className="mb-3 text-lg font-semibold">Past Bookings</h3>
              {past.length === 0 ? (
                <p className="text-gray-500">No past bookings yet.</p>
              ) : (
                <div className="space-y-3">
                  {past.map((b) => (
                    <div key={b._id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                      <p className="font-semibold">
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
