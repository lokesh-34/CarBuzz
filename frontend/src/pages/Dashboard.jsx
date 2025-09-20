import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { baseURL } from "../api"; // ✅ your axios instance

export default function Dashboard() {
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cars, setCars] = useState([]);
  const [selectedCar, setSelectedCar] = useState(null);
  const navigate = useNavigate();

  // backend base URL
  const BASE_URL = `${baseURL}/`;

  // fetch cars from backend
  useEffect(() => {
    const fetchCars = async () => {
      try {
        const { data } = await api.get("/api/cars");
        setCars(data.cars || []);

        // slideshow: pick first image of each car (with full URL)
        const slideImgs = (data.cars || [])
          .map((car) => car.images?.[0])
          .filter(Boolean)
          .map((img) => `${BASE_URL.replace(/\/$/, "")}/${String(img).replace(/^\//, "")}`);
        setImages(slideImgs);
      } catch (err) {
        console.error("Failed to fetch cars:", err);
      }
    };
    fetchCars();
  }, []);

  // slideshow effect
  useEffect(() => {
    if (!images.length) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <>
      {/* ✅ CSS in same file */}
      <style>{`
        body {
          margin: 0;
          font-family: Arial, sans-serif;
          background: #f4f6f8;
        }
        .header {
          background: #111;
          color: #fff;
          text-align: center;
          padding: 20px 0;
        }
        .slideshow {
          position: relative;
          width: 100%;
          height: 400px;
          overflow: hidden;
        }
        .slideshow img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          position: absolute;
          top: 0;
          left: 0;
          opacity: 0;
          transition: opacity 1s ease-in-out;
        }
        .slideshow img.active {
          opacity: 1;
        }
        .car-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          padding: 30px;
        }
        .car-card {
          background: #fff;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
          transition: transform 0.3s ease;
        }
        .car-card:hover {
          transform: translateY(-5px);
        }
        .car-img {
          width: 100%;
          height: 180px;
          object-fit: cover;
        }
        .car-info {
          padding: 15px;
        }
        .buttons {
          display: flex;
          justify-content: space-between;
          margin-top: 10px;
        }
        .btn {
          flex: 1;
          margin: 5px;
          padding: 10px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
          font-size: 14px;
        }
        .btn-book {
          background: #007bff;
          color: #fff;
        }
        .btn-book:hover {
          background: #0056b3;
        }
        .btn-details {
          background: #eee;
          color: #333;
        }
        .btn-details:hover {
          background: #ddd;
        }
      `}</style>

      {/* Header */}
      <div className="header">
        <h1>CarBuzz</h1>
        <p>Self Driving Cars</p>
      </div>

      {/* Slideshow */}
      {images.length > 0 && (
        <div className="slideshow">
          {images.map((img, index) => (
            <img
              key={index}
              src={img}
              alt="Slide"
              className={index === currentIndex ? "active" : ""}
            />
          ))}
        </div>
      )}

      {/* Cars Grid */}
      <div className="car-grid">
        {cars.length === 0 && (
          <div className="text-center text-gray-600 w-full">
            No cars available.
          </div>
        )}
        {cars.map((car) => (
          <div key={car._id} className="car-card">
            <img
              src={car.images?.[0] ? `${BASE_URL.replace(/\/$/, "")}/${String(car.images[0]).replace(/^\//, "")}` : "/placeholder.jpg"}
  alt={`${car.manufacturer} ${car.model}`}
  className="car-img"
/>

            <div className="car-info">
              <h3>
                {car.manufacturer} {car.model}
              </h3>
              <p>₹{car.price}</p>
              <div className="buttons">
                <button
                  className="btn btn-book"
                  onClick={() => navigate(`/login`)}
                >
                  Book Now
                </button>
                <button
                  className="btn btn-details"
                  onClick={() => setSelectedCar(car)}
                >
                  Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedCar && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-lg relative">
            <h2 className="text-xl font-bold mb-4">
              {selectedCar.manufacturer} {selectedCar.model}
            </h2>
            <p>
              <strong>Price:</strong> ₹{selectedCar.price}
            </p>
            <p>
              <strong>Description:</strong> {selectedCar.description}
            </p>
            <p>
              <strong>Seats:</strong> {selectedCar.seatingCapacity}
            </p>
            <button
              className="absolute top-2 right-2 text-gray-600"
              onClick={() => setSelectedCar(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
