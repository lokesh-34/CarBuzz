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
    <nav className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg fixed top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        
        {/* Logo */}
        <div className="text-2xl font-bold text-white tracking-wide">
          CarBuzz
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className={linkClass("/")}>
            Dashboard
          </Link>
          <Link to="/register" className={linkClass("/register")}>
            Register
          </Link>
          <Link to="/login" className={linkClass("/login")}>
            Sign In
          </Link>
          <Link to="/about" className={linkClass("/about")}>
            About Us
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-white focus:outline-none"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {isOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-sm absolute top-16 left-0 w-full shadow-lg">
          <div className="flex flex-col gap-4 p-6 text-gray-800">
            <Link to="/" onClick={() => setIsOpen(false)} className="hover:text-blue-600">
              Dashboard
            </Link>
            <Link to="/register" onClick={() => setIsOpen(false)} className="hover:text-blue-600">
              Register
            </Link>
            <Link to="/login" onClick={() => setIsOpen(false)} className="hover:text-blue-600">
              Sign In
            </Link>
            <Link to="/about" onClick={() => setIsOpen(false)} className="hover:text-blue-600">
              About Us
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
