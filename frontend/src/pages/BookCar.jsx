import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { baseURL } from "../api";
import dayjs from "dayjs";
import { toast } from "react-toastify";

export default function BookCar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [dropDate, setDropDate] = useState("");
  const [dropTime, setDropTime] = useState("");
  const [place, setPlace] = useState("");
  const [purpose, setPurpose] = useState("business");
  const [noOfDays, setNoOfDays] = useState(0);
  const [amount, setAmount] = useState(0);

  // ✅ Fetch car details
// Fetch car details (from /api/cars) and handle auth redirect
useEffect(() => {
  const fetchCar = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/cars");
      const selectedCar = (res.data?.cars || []).find((c) => c._id === id);
      if (!selectedCar) {
        setError("Car not found");
        setLoading(false);
        return;
      }
      setCar(selectedCar);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to fetch car details");
    } finally {
      setLoading(false);
    }
  };
  fetchCar();
}, [id]);


  // ✅ Calculate number of days
  useEffect(() => {
    if (pickupDate && dropDate) {
      const start = dayjs(pickupDate);
      const end = dayjs(dropDate);
      const diff = end.diff(start, "day") + 1;
      setNoOfDays(diff > 0 ? diff : 0);
    }
  }, [pickupDate, dropDate]);

  // Compute amount based on car price and number of days
  useEffect(() => {
    if (car && noOfDays > 0) setAmount(car.price * noOfDays);
    else setAmount(0);
  }, [car, noOfDays]);

  // Validation helpers
  const minDate = useMemo(() => dayjs().format("YYYY-MM-DD"), []);
  const formError = useMemo(() => {
    if (!pickupDate || !pickupTime || !dropDate || !dropTime) return "Please fill all date and time fields.";
    const start = dayjs(`${pickupDate}T${pickupTime}`);
    const end = dayjs(`${dropDate}T${dropTime}`);
    if (!start.isValid() || !end.isValid()) return "Invalid date/time values.";
    if (end.isBefore(start)) return "Drop date/time must be after pickup.";
    if (noOfDays <= 0) return "Dates must span at least one day.";
    return "";
  }, [pickupDate, pickupTime, dropDate, dropTime, noOfDays]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess("");
    if (formError) {
      setError(formError);
      return;
    }
    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");
      if (!token) {
        navigate(`/login?redirect=/book/${id}`);
        return;
      }
      const bookingData = {
        carId: id,
        pickupDate,
        pickupTime,
        dropDate,
        dropTime,
        place,
        purpose,
        noOfDays,
      };

      await api.post("/api/bookings", bookingData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setError("");
      setSuccess("Booking request sent to provider!");
      toast.success("Booking request sent to provider!", { toastId: "booking-created" });
      setTimeout(() => navigate("/cars"), 900);
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || "Failed to submit booking. Please try again.";
      setError(msg);
      toast.error(msg, { toastId: "booking-failed" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error && !car) return <div className="p-6 text-red-600">{error}</div>;
  if (!car) return null;

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
        {/* Left: Car summary */}
        <div className="md:col-span-1 bg-white rounded-xl shadow p-4">
          <img
            src={car.images?.[0] ? `${baseURL}/${car.images[0]}` : "/placeholder.png"}
            alt={`${car.manufacturer} ${car.model}`}
            className="w-full h-44 object-cover rounded-lg"
            onError={(e) => (e.currentTarget.src = "/placeholder.png")}
          />
          <div className="mt-4">
            <h2 className="text-xl font-bold">{car.manufacturer} {car.model}</h2>
            <p className="text-gray-600">Type: {car.type}</p>
            <p className="text-gray-800 font-semibold mt-1">₹{car.price}/day</p>
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
            <p className="text-sm text-gray-600">No. of days: <span className="font-semibold text-gray-800">{noOfDays}</span></p>
            <p className="text-sm text-gray-600">Estimated total: <span className="font-semibold text-gray-800">₹{amount}</span></p>
          </div>
        </div>

        {/* Right: Booking form */}
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow space-y-4">
            <h2 className="text-2xl font-bold mb-2">Trip Details</h2>

            {error && (
              <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
            )}
            {success && (
              <div className="p-3 rounded border border-green-200 bg-green-50 text-green-700 text-sm">{success}</div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium">Pick-up Date</label>
                <input
                  type="date"
                  min={minDate}
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium">Pick-up Time</label>
                <input
                  type="time"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium">Drop Date</label>
                <input
                  type="date"
                  min={pickupDate || minDate}
                  value={dropDate}
                  onChange={(e) => setDropDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium">Drop Time</label>
                <input
                  type="time"
                  value={dropTime}
                  onChange={(e) => setDropTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium">Place of Visit</label>
                <input
                  type="text"
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  required
                  placeholder="City / Area"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium">Purpose of Visit</label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="business">Business</option>
                  <option value="work">Work</option>
                  <option value="family trip">Family Trip</option>
                  <option value="friends">Trip with Friends</option>
                  <option value="solo">Solo Travel</option>
                  <option value="personal">Personal</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-600">No. of days: <span className="font-semibold text-gray-800">{noOfDays}</span></p>
              <p className="text-sm text-gray-800 font-semibold">Total: ₹{amount}</p>
            </div>

            <button
              type="submit"
              disabled={!!formError || submitting}
              className={`w-full px-4 py-2 rounded text-white transition ${
                formError || submitting ? "bg-green-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {submitting ? "Booking..." : "Confirm Booking"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
