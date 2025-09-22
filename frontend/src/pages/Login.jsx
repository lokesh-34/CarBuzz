import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import log from "../logger";
import api from "../api";
import { ToastContainer, toast } from "react-toastify"; // ✅ import toast + container
import "react-toastify/dist/ReactToastify.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [showPwd, setShowPwd] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const redirect = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const r = params.get("redirect");
    return r && r.startsWith("/") ? r : null;
  }, [location.search]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      log("Login attempt", { email, role });

      const url =
        role === "provider" ? "/api/providers/login" : "/api/users/login";
      const { data } = await api.post(url, { email, password });

      const token = data?.token;
      const user = data?.user || data?.provider;

      if (!token || !user) throw new Error("Invalid response");

      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("user", JSON.stringify(user));
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      toast.success("Login successful 🎉"); // ✅ success toast

      if (redirect) navigate(redirect);
      else if (role === "provider") navigate("/provider");
      else navigate("/cars");
    } catch (err) {
      log("Login failed", err?.response?.data || err.message);
      toast.error("Login failed. Please check your credentials ❌"); // ✅ fixed
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow"
      >
        <h2 className="mb-6 text-center text-2xl font-bold text-gray-900">
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

        <div className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 pr-12 outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
            >
              {showPwd ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
        >
          Login
        </button>
        {redirect ? (
          <p className="mt-2 text-center text-xs text-gray-500">
            You'll be redirected to{" "}
            <span className="font-medium">{redirect}</span> after login.
          </p>
        ) : null}
      </form>

      {/* ✅ Toast container */}
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}
