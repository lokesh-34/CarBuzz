import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import dayjs from "dayjs";

export default function BookCar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [car, setCar] = useState(null);

  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [dropDate, setDropDate] = useState("");
  const [dropTime, setDropTime] = useState("");
  const [place, setPlace] = useState("");
  const [purpose, setPurpose] = useState("business");
  const [noOfDays, setNoOfDays] = useState(0);

  // ✅ Fetch car details
 // Fetch car details
useEffect(() => {
  const fetchCar = async () => {
    try {
      // ✅ Get all cars (no filters → returns everything)
      const res = await api.get("/api/cars/search");
      const selectedCar = res.data.find((c) => c._id === id);
      if (!selectedCar) {
        alert("Car not found!");
        navigate("/cars");
        return;
      }
      setCar(selectedCar);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch car details");
    }
  };
  fetchCar();
}, [id, navigate]);


  // ✅ Calculate number of days
  useEffect(() => {
    if (pickupDate && dropDate) {
      const start = dayjs(pickupDate);
      const end = dayjs(dropDate);
      const diff = end.diff(start, "day") + 1;
      setNoOfDays(diff > 0 ? diff : 0);
    }
  }, [pickupDate, dropDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
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

      alert("Booking request sent to provider!");
      navigate("/cars");
    } catch (err) {
      console.error(err);
      alert("Failed to submit booking");
    }
  };

  if (!car) return <div>Loading...</div>;

  return (
    <div className="p-6 bg-gray-100 min-h-screen flex justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow-md w-full max-w-lg"
      >
        <h2 className="text-2xl font-bold mb-4">
          Book {car.manufacturer} {car.model}
        </h2>

        <div className="mb-4">
          <label className="block mb-1">Pick-up Date</label>
          <input
            type="date"
            value={pickupDate}
            onChange={(e) => setPickupDate(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Pick-up Time</label>
          <input
            type="time"
            value={pickupTime}
            onChange={(e) => setPickupTime(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Drop Date</label>
          <input
            type="date"
            value={dropDate}
            onChange={(e) => setDropDate(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Drop Time</label>
          <input
            type="time"
            value={dropTime}
            onChange={(e) => setDropTime(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Place of Visit</label>
          <input
            type="text"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Purpose of Visit</label>
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

        <div className="mb-4">
          <p>
            <strong>No of Days:</strong> {noOfDays}
          </p>
        </div>

        <button
          type="submit"
          className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Confirm Booking
        </button>
      </form>
    </div>
  );
}
