import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { baseURL } from "../api";
import dayjs from "dayjs";

export default function UserDashboard() {
  const [user, setUser] = useState(null);
  const [cars, setCars] = useState([]);
  const [bookings, setBookings] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
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
      }
    };
    fetchData();
  }, []);

  const handleBook = (carId) => navigate(`/book/${carId}`);
  const handleDetails = (carId) => navigate(`/cars/${carId}`);

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

  if (!user) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Welcome, {user.name}</h1>

      <div className="mb-8 p-4 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-2">Your Profile</h2>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Phone:</strong> {user.phone}</p>
        <p><strong>Address:</strong> {user.address}</p>
      </div>

      <h2 className="text-2xl font-bold mb-4">Available Cars</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cars.map((car) => (
          <div key={car._id} className="bg-white rounded-lg shadow p-4 flex flex-col">
            <img
              src={car.images?.[0] ? `${baseURL}/${car.images[0]}` : "/placeholder.png"}
              alt={car.model}
              className="w-full h-40 object-cover rounded-md mb-4"
            />
            <h3 className="text-xl font-semibold">{car.manufacturer} {car.model}</h3>
            <p className="text-gray-600 mb-2">Type: {car.type}</p>
            <p className="text-gray-600 mb-2">Price: ₹{car.price}</p>
            <div className="mt-auto flex gap-2">
              <button
                onClick={() => handleBook(car._id)}
                className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Book Now
              </button>
              <button
                onClick={() => handleDetails(car._id)}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                See Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* My Bookings */}
      <div className="mt-10">
        <h2 className="text-2xl font-bold mb-4">My Bookings</h2>

        {/* Upcoming / Active */}
        <div className="mb-8 p-4 bg-white rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-3">Upcoming & Active</h3>
          {upcoming.length === 0 ? (
            <p className="text-gray-500">No upcoming bookings.</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((b) => (
                <div key={b._id} className="p-4 border rounded-lg flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold">
                      {b.carId?.manufacturer} {b.carId?.model}
                      <span className={`ml-2 px-2 py-0.5 text-xs rounded-full align-middle ${
                        b.status === "confirmed" ? "bg-green-100 text-green-700" :
                        b.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {b.status}
                      </span>
                    </p>
                    <p className="text-gray-600 text-sm">{b.pickupDate} {b.pickupTime} → {b.dropDate} {b.dropTime}</p>
                    {b.place && <p className="text-gray-600 text-sm">Place: {b.place}</p>}
                    {b.purpose && <p className="text-gray-600 text-sm">Purpose: {b.purpose}</p>}
                  </div>
                  <div className="mt-3 md:mt-0 flex gap-2">
                    <button
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      onClick={() => handleDetails(b.carId?._id)}
                    >
                      View Car
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past / History */}
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-3">Past Bookings</h3>
          {past.length === 0 ? (
            <p className="text-gray-500">No past bookings yet.</p>
          ) : (
            <div className="space-y-3">
              {past.map((b) => (
                <div key={b._id} className="p-4 border rounded-lg">
                  <p className="font-semibold">
                    {b.carId?.manufacturer} {b.carId?.model}
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full align-middle ${
                      b.status === "confirmed" ? "bg-green-100 text-green-700" :
                      b.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {b.status}
                    </span>
                  </p>
                  <p className="text-gray-600 text-sm">{b.pickupDate} {b.pickupTime} → {b.dropDate} {b.dropTime}</p>
                  {b.place && <p className="text-gray-600 text-sm">Place: {b.place}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
