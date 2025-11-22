import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api, { baseURL } from "../api";
import { toast } from "react-toastify";

export default function CarDetails() {
  const { id } = useParams();
  const [car, setCar] = useState(null);

  useEffect(() => {
    const fetchCar = async () => {
      try {
  const res = await api.get("/api/cars");
  const selectedCar = (res.data?.cars || []).find(c => c._id === id);
        if (!selectedCar) {
          toast.info("Car not found", { toastId: "car-missing" });
          return;
        }
        setCar(selectedCar);
      } catch (err) {
  console.error(err);
  toast.error("Failed to fetch car details", { toastId: "car-fail" });
      }
    };
    fetchCar();
  }, [id]);

  if (!car) return <div>Loading...</div>;

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
        <img
          src={car.images?.[0] ? `${baseURL}/${car.images[0]}` : "/placeholder.png"}
          alt={car.model}
          className="w-full h-64 object-cover rounded mb-4"
        />
        <h2 className="text-2xl font-bold mb-2">{car.manufacturer} {car.model}</h2>
        <p><strong>Type:</strong> {car.type}</p>
        <p><strong>Price:</strong> ₹{car.price}</p>
        <p><strong>Description:</strong> {car.description}</p>
        <p><strong>Seating Capacity:</strong> {car.seatingCapacity}</p>
        <p><strong>Insurance Status:</strong> {car.insuranceStatus}</p>
        <p><strong>RC Details:</strong> {car.rcDetails}</p>
      </div>
    </div>
  );
}
