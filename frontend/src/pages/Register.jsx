import React from 'react';
import { useNavigate } from 'react-router-dom';
export default function RegisterPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex">
      
      {/* Left: Car Provider */}
      <div className="w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex flex-col justify-center items-center p-10">
        <h1 className="text-3xl font-bold mb-4">Car Provider</h1>
        <p className="mb-6 text-lg text-gray-100 text-center">
          Register as a provider to list your cars and earn by renting them out.
        </p>
        <button className="px-6 py-3 bg-white text-blue-700 font-semibold rounded-lg shadow-md hover:bg-gray-200 transition"
        onClick={() => navigate('/register/RegisterCarProviderForm')}>
          Register as Provider
        </button>
      </div>

      {/* Right: Car Consumer */}
      <div className="w-1/2 bg-gray-100 flex flex-col justify-center items-center p-10">
        <h1 className="text-3xl font-bold mb-4 text-gray-800">Car Consumer</h1>
        <p className="mb-6 text-lg text-gray-600 text-center">
          Register as a consumer to book cars easily and enjoy your rides.
        </p>
        <button className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition" 
        onClick={() => navigate('/register/Register_car_userupForm')}>
          Register as Consumer
        </button>
      </div>
    </div>
  );
}
