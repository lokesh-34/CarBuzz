import { useState } from "react";
import { useNavigate } from "react-router-dom";
import log from "../logger";
import api from "../api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      log("Login attempt", { email, role });

      const url = role === "provider" ? "/api/providers/login" : "/api/users/login";
      const { data } = await api.post(url, { email, password });

      const token = data?.token;
      const user = data?.user || data?.provider;

      if (!token || !user) throw new Error("Invalid response");

      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("user", JSON.stringify(user));
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      if (role === "provider") navigate("/provider");
      else navigate("/cars");
    } catch (err) {
      log("Login failed", err?.response?.data || err.message);
      alert("Login failed. Please check your credentials.");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-xl shadow-md w-96"
      >
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          CarBuzz Login
        </h2>

        {/* Role selection */}
        <div className="flex justify-center mb-4 space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="role"
              value="user"
              checked={role === "user"}
              onChange={() => setRole("user")}
              className="accent-blue-600"
            />
            <span>User</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="role"
              value="provider"
              checked={role === "provider"}
              onChange={() => setRole("provider")}
              className="accent-blue-600"
            />
            <span>Provider</span>
          </label>
        </div>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 mb-4 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 mb-4 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          required
        />
        <button
          type="submit"
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Login
        </button>
      </form>
    </div>
  );
}
