import { Routes, Route } from "react-router-dom";
import Navbar from "./pages/Navbar";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Register_car_userupForm from "./pages/Register_car_userupForm";
import RegisterCarProviderForm from "./pages/RegisterCarProviderForm";
import Cars from "./pages/UserDashboard";
import ProviderDashboard from "./pages/ProviderDashboard";
import ProviderAddCar from "./pages/ProviderAddCar";
import CarDetails from "./pages/CarDetails"; // ✅ we need this page
import BookCar from "./pages/BookCar"; // ✅ booking form page
import About from "./pages/About";
import UserStats from "./pages/UserStats";
import AdminDashboard from "./pages/AdminDashboard";
import LiveTracking from "./pages/LiveTracking";

export default function App() {
  return (
    <>
      <Navbar />
      <div className="pt-20 p-4">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/register/Register_car_userupForm"
            element={<Register_car_userupForm />}
          />
          <Route
            path="/register/RegisterCarProviderForm"
            element={<RegisterCarProviderForm />}
          />
          <Route path="/about" element={<About />} />
          <Route path="/cars" element={<Cars />} />
          <Route path="/provider" element={<ProviderDashboard />} />
          <Route path="/provider/add-car" element={<ProviderAddCar />} />
          <Route path="/cars/:id" element={<CarDetails />} />
          <Route path="/book/:id" element={<BookCar />} />
          <Route path="/user/stats" element={<UserStats />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/live/:tripId" element={<LiveTracking />} />
          <Route path="/live" element={<LiveTracking />} />

        </Routes>
      </div>
    </>
  );
}
