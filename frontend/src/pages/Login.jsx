import { useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import log from "../logger";
import api from "../api";
import { toast } from "react-toastify";

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
  const backendRole = user?.role || role;
  localStorage.setItem("role", backendRole);
      localStorage.setItem("user", JSON.stringify(user));
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      toast.success("Login successful 🎉"); // ✅ success toast

  if (redirect) navigate(redirect);
  else if (backendRole === "provider") navigate("/provider");
  else if (backendRole === "admin") navigate("/admin");
  else navigate("/cars");
    } catch (err) {
      log("Login failed", err?.response?.data || err.message);
      toast.error("Login failed. Please check your credentials ❌"); // ✅ fixed
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-indigo-200/50 blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-12 md:grid-cols-2 md:py-20">
        {/* Left: Brand & Value prop */}
        <section className="order-2 hidden md:order-1 md:block">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
            Welcome to <span className="text-blue-700">CarBuzz</span>
          </h1>
          <p className="mt-3 max-w-md text-base text-gray-600">
            Find the right car for every trip. Fast booking, real providers,
            and clear pricing — all in one place.
          </p>
          <ul className="mt-6 space-y-3 text-gray-700">
            <li className="flex items-start gap-2"><span className="mt-1">🚗</span>Wide selection of verified vehicles</li>
            <li className="flex items-start gap-2"><span className="mt-1">🕒</span>Quick booking with instant status updates</li>
            <li className="flex items-start gap-2"><span className="mt-1">🛡️</span>Secure authentication and protected data</li>
          </ul>
          <div className="mt-8 flex items-center gap-4 text-sm text-gray-500">
            <div className="flex -space-x-2">
              <div className="h-8 w-8 rounded-full bg-blue-200" />
              <div className="h-8 w-8 rounded-full bg-indigo-200" />
              <div className="h-8 w-8 rounded-full bg-emerald-200" />
            </div>
            Trusted by travelers and providers across TN
          </div>
        </section>

        {/* Right: Login Card */}
        <section className="order-1 md:order-2">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-100 bg-white/90 p-6 shadow-lg backdrop-blur-md md:p-8">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-gray-900">Sign in to CarBuzz</h2>
              <p className="mt-1 text-sm text-gray-600">Welcome back! Please enter your details.</p>
            </div>

            {/* Role selection: segmented */}
            <div className="mb-4 grid grid-cols-2 rounded-lg border p-1 text-sm">
              <button
                type="button"
                onClick={() => setRole("user")}
                className={`rounded-md px-3 py-2 font-medium transition ${
                  role === "user" ? "bg-blue-600 text-white shadow" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                User
              </button>
              <button
                type="button"
                onClick={() => setRole("provider")}
                className={`rounded-md px-3 py-2 font-medium transition ${
                  role === "provider" ? "bg-blue-600 text-white shadow" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Provider
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  required
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <button type="button" className="text-xs text-blue-600 hover:underline">Forgot?</button>
                </div>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 pr-12 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                  >
                    {showPwd ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white shadow transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md"
              >
                Sign In
              </button>
            </form>

            {redirect ? (
              <p className="mt-2 text-center text-xs text-gray-500">
                You'll be redirected to <span className="font-medium">{redirect}</span> after login.
              </p>
            ) : null}

            <p className="mt-6 text-center text-sm text-gray-600">
              New to CarBuzz?{" "}
              <Link to="/register" className="font-semibold text-blue-700 hover:underline">Create an account</Link>
            </p>
            <p className="mt-2 text-center text-xs text-gray-400">
              By signing in, you agree to our Terms & Privacy Policy.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
