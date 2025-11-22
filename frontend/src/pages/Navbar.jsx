import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const linkClass = (path) =>
    `hover:text-gray-200 transition ${
      location.pathname === path ? "font-bold underline" : "text-white"
    }`;

  return (
    <nav className="w-full fixed top-0 z-50">
      {/* Gradient bar */}
      <div className="bg-gradient-to-r from-gray-500 via-gray-500 to-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Brand */}
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src="/logo.png"
                alt="CarBuzz Logo"
                className="h-9 w-9 rounded-md bg-white/90 p-1 shadow ring-1 ring-black/5 group-hover:scale-105 transition"
                onError={(e) => { e.currentTarget.src = "/favicon.ico"; }}
              />
              <div className="leading-5">
                <div className="text-xl font-extrabold tracking-tight text-white">
                  <span className="text-white">Car</span>
                  <span className="text-orange-300">Buzz</span>
                </div>
                <div className="text-[11px] text-white/80 -mt-0.5">SELF-DRIVING RENTALS</div>
              </div>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-6">
              <Link to="/" className={linkClass("/")}>Dashboard</Link>
              <Link to="/about" className={linkClass("/about")}>About Us</Link>
              <Link to="/register" className="text-white/90 hover:text-white transition">Register</Link>
              <Link
                to="/login"
                className="inline-flex items-center rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-md ring-1 ring-white/20 hover:bg-white/25 hover:ring-white/30 transition"
              >
                Sign In
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden text-white p-2 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {isOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-lg border-b">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-3 text-gray-800">
            <Link to="/" onClick={() => setIsOpen(false)} className="py-2 rounded hover:bg-gray-100 px-2">Dashboard</Link>
            <Link to="/about" onClick={() => setIsOpen(false)} className="py-2 rounded hover:bg-gray-100 px-2">About Us</Link>
            <Link to="/register" onClick={() => setIsOpen(false)} className="py-2 rounded hover:bg-gray-100 px-2">Register</Link>
            <Link
              to="/login"
              onClick={() => setIsOpen(false)}
              className="mt-1 inline-flex w-fit items-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700"
            >
              Sign In
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
