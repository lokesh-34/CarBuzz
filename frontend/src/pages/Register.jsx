import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function RegisterPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl grid-cols-1 overflow-hidden rounded-2xl bg-white shadow md:grid-cols-2">
        {/* Provider */}
        <div className="relative flex items-center justify-center bg-gradient-to-br from-blue-700 to-indigo-700 p-10 text-white">
          <div className="relative z-10 max-w-md text-center">
            <h1 className="text-3xl font-bold">Become a Car Provider</h1>
            <p className="mt-3 text-white/90">
              List your cars, manage bookings, and grow your earnings with our trusted platform.
            </p>
            <ul className="mt-4 space-y-2 text-left text-sm text-white/90">
              <li>• Easy listing with images and details</li>
              <li>• Manage booking requests in one place</li>
              <li>• Transparent pricing and payouts</li>
            </ul>
            <button
              className="mt-6 w-full rounded-lg bg-white px-6 py-3 font-semibold text-blue-700 shadow hover:bg-gray-100"
              onClick={() => navigate('/register/RegisterCarProviderForm')}
            >
              Register as Provider
            </button>
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.15),transparent_40%)]" />
        </div>

        {/* Consumer */}
        <div className="flex items-center justify-center bg-gray-50 p-10">
          <div className="max-w-md text-center">
            <h2 className="text-3xl font-bold text-gray-900">Join as a Rider</h2>
            <p className="mt-3 text-gray-600">
              Book reliable self-drive cars at the best prices. Quick signup and seamless experience.
            </p>
            <ul className="mt-4 space-y-2 text-left text-sm text-gray-700">
              <li>• Browse cars by type and price</li>
              <li>• Simple booking with instant confirmation</li>
              <li>• Manage trips and history easily</li>
            </ul>
            <button
              className="mt-6 w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
              onClick={() => navigate('/register/Register_car_userupForm')}
            >
              Register as Consumer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
