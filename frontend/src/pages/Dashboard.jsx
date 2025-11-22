import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { baseURL } from "../api";

// Placeholder image as data URL for mobile compatibility
const PLACEHOLDER_IMAGE = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MDAgMzAwIiBmaWxsPSIjZjNmNGY2Ij4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2U1ZTdlYiIvPgogIDxnIGZpbGw9IiM5Y2EzYWYiPgogICAgPGNpcmNsZSBjeD0iMTQwIiBjeT0iMTAwIiByPSIyMCIvPgogICAgPHBhdGggZD0iTTYwIDIwMGw4MC02MCA0MCAzMCA4MC01MCA4MCA0MHY4MEg2MHoiLz4KICAgIDxyZWN0IHg9IjMyMCIgeT0iNDAiIHdpZHRoPSI2MCIgaGVpZ2h0PSI0MCIgcng9IjgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzljYTNhZiIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgPC9nPgogIDx0ZXh0IHg9IjIwMCIgeT0iMTgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNmI3MjgwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiPk5vIEltYWdlIEF2YWlsYWJsZTwvdGV4dD4KPC9zdmc+";

export default function Dashboard() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCar, setSelectedCar] = useState(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("recent");
  const navigate = useNavigate();

  const BASE_URL = `${baseURL}/`;
  const join = (p) => {
    if (!p) return PLACEHOLDER_IMAGE;
    const cleanPath = String(p).replace(/^[\\/]+/, '');
    return `${baseURL}/${cleanPath}`;
  };

  useEffect(() => {
    const fetchCars = async () => {
      try {
        const { data } = await api.get("/api/cars");
        const list = data.cars || [];
        setCars(list);
        const slideImgs = list
          .map((c) => c.images?.[0])
          .filter(Boolean)
          .map((img) => join(img));
        setImages(slideImgs);
      } catch (err) {
        console.error("Failed to fetch cars:", err);
        const message = err.response?.data?.message || err.message || "Failed to load cars";
        setError(`${message}. Please check your connection and try again.`);
      } finally {
        setLoading(false);
      }
    };
    fetchCars();
  }, []);

  useEffect(() => {
    if (!images.length) return;
    const id = setInterval(() => setCurrentIndex((p) => (p + 1) % images.length), 3500);
    return () => clearInterval(id);
  }, [images.length]);

  const types = useMemo(
    () => Array.from(new Set((cars || []).map((c) => c.type).filter(Boolean))),
    [cars]
  );

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    let list = cars.filter((c) => {
      const inText = !text
        ? true
        : `${c.manufacturer || ''} ${c.model || ''}`.toLowerCase().includes(text);
      const inType = type === "all" ? true : (c.type || "").toLowerCase() === type.toLowerCase();
      return inText && inType;
    });
    if (sort === "priceAsc") list = [...list].sort((a, b) => (a.price || 0) - (b.price || 0));
    else if (sort === "priceDesc") list = [...list].sort((a, b) => (b.price || 0) - (a.price || 0));
    return list;
  }, [cars, q, type, sort]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero with slideshow */}
      <div className="relative h-[320px] w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-indigo-700" />
        {images.length > 0 && (
          <div className="absolute inset-0">
            {images.map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt="slide"
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                  idx === currentIndex ? 'opacity-70' : 'opacity-0'
                }`}
              />)
            )}
          </div>
        )}
        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-6">
          <div className="max-w-2xl text-white">
            <h1 className="text-3xl font-bold md:text-4xl">Find your next ride</h1>
            <p className="mt-2 text-white/90">Reliable self-drive cars with transparent pricing.</p>
            {/* Filters */}
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search make or model"
                className="rounded-lg border border-white/30 bg-white/90 px-3 py-2 text-gray-800 placeholder-gray-500 shadow focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="rounded-lg border border-white/30 bg-white/90 px-3 py-2 text-gray-800 shadow focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="all">All Types</option>
                {types.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-lg border border-white/30 bg-white/90 px-3 py-2 text-gray-800 shadow focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="recent">Sort: Recent</option>
                <option value="priceAsc">Price: Low to High</option>
                <option value="priceDesc">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-xl bg-white shadow">
                <div className="h-40 animate-pulse bg-gray-200" />
                <div className="space-y-3 p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200" />
                  <div className="h-8 w-full animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-gray-700">
            No cars match your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((car) => (
              <div key={car._id} className="group overflow-hidden rounded-xl bg-white shadow transition hover:shadow-lg">
                <div className="relative h-44 w-full overflow-hidden bg-gray-100">
                  <img
                    src={car.images?.[0] ? join(car.images[0]) : PLACEHOLDER_IMAGE}
                    alt={`${car.manufacturer} ${car.model}`}
                    onError={(e) => (e.currentTarget.src = PLACEHOLDER_IMAGE)}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                  {car.type ? (
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-gray-800 shadow">
                      {car.type}
                    </span>
                  ) : null}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {car.manufacturer} {car.model}
                    </h3>
                    <div className="text-blue-700 font-semibold">₹{car.price}</div>
                  </div>
                  {car.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">{car.description}</p>
                  ) : null}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      onClick={() => navigate(`/login?redirect=/book/${car._id}`)}
                    >
                      Book Now
                    </button>
                    <button
                      className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-200"
                      onClick={() => setSelectedCar(car)}
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedCar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-lg">
            <div className="relative h-48 w-full bg-gray-100">
              <img
                src={selectedCar.images?.[0] ? join(selectedCar.images[0]) : PLACEHOLDER_IMAGE}
                alt={`${selectedCar.manufacturer} ${selectedCar.model}`}
                onError={(e) => (e.currentTarget.src = PLACEHOLDER_IMAGE)}
                className="h-full w-full object-cover"
              />
              <button
                className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-1 text-sm text-gray-700 shadow"
                onClick={() => setSelectedCar(null)}
              >
                ✕
              </button>
            </div>
            <div className="p-5">
              <h2 className="text-xl font-bold">
                {selectedCar.manufacturer} {selectedCar.model}
              </h2>
              <div className="mt-2 text-gray-700">
                <p><span className="font-medium">Price:</span> ₹{selectedCar.price}</p>
                {selectedCar.seatingCapacity ? (
                  <p><span className="font-medium">Seats:</span> {selectedCar.seatingCapacity}</p>
                ) : null}
                {selectedCar.description ? (
                  <p className="mt-1 text-sm text-gray-600">{selectedCar.description}</p>
                ) : null}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                  onClick={() => {
                    const id = selectedCar._id; setSelectedCar(null); navigate(`/cars/${id}`);
                  }}
                >
                  View Details
                </button>
                <button
                  className="flex-1 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
                  onClick={() => {
                    const id = selectedCar._id; setSelectedCar(null); navigate(`/login?redirect=/book/${id}`);
                  }}
                >
                  Book Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
