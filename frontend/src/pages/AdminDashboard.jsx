import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { baseURL } from "../api";
import { toast } from "react-toastify";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";

// Placeholder image as data URL for mobile compatibility
const PLACEHOLDER_IMAGE = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MDAgMzAwIiBmaWxsPSIjZjNmNGY2Ij4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2U1ZTdlYiIvPgogIDxnIGZpbGw9IiM5Y2EzYWYiPgogICAgPGNpcmNsZSBjeD0iMTQwIiBjeT0iMTAwIiByPSIyMCIvPgogICAgPHBhdGggZD0iTTYwIDIwMGw4MC02MCA0MCAzMCA4MC01MCA4MCA0MHY4MEg2MHoiLz4KICAgIDxyZWN0IHg9IjMyMCIgeT0iNDAiIHdpZHRoPSI2MCIgaGVpZ2h0PSI0MCIgcng9IjgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzljYTNhZiIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgPC9nPgogIDx0ZXh0IHg9IjIwMCIgeT0iMTgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNmI3MjgwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiPk5vIEltYWdlIEF2YWlsYWJsZTwvdGV4dD4KPC9zdmc+";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [cars, setCars] = useState([]);
  const [selectedCar, setSelectedCar] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [showListModal, setShowListModal] = useState(null); // 'users', 'providers', 'cars', 'bookings'
  const [listData, setListData] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const navigate = useNavigate();

  const loadPending = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/admin/pending");
      setUsers(data?.users || []);
      setCars(data?.cars || []);
      toast.success("Pending items loaded", { toastId: "adm-load" });
    } catch (e) {
      toast.error("Unauthorized or failed to load", { toastId: "adm-fail" });
      navigate("/login?redirect=/admin");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login?redirect=/admin");
      return;
    }
    loadPending();
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const { data } = await api.get("/api/admin/analytics");
      setAnalytics(data);
    } catch (e) {
      toast.error("Failed to load analytics", { toastId: "adm-analytics" });
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const loadListData = async (type) => {
    try {
      setLoadingList(true);
      let endpoint = "";
      
      switch (type) {
        case 'users':
          endpoint = "/api/admin/all-users"; // Need to create this endpoint
          break;
        case 'providers':
          endpoint = "/api/admin/all-providers"; // Need to create this endpoint
          break;
        case 'cars':
          endpoint = "/api/admin/all-cars"; // Need to create this endpoint
          break;
        case 'bookings':
          endpoint = "/api/admin/all-bookings"; // Need to create this endpoint
          break;
        default:
          return;
      }
      
      const { data } = await api.get(endpoint);
      setListData(Array.isArray(data) ? data : data.cars || data.users || data.bookings || data.providers || []);
      setShowListModal(type);
    } catch (e) {
      toast.error(`Failed to load ${type}`, { toastId: `load-${type}` });
      console.error(`Load ${type} error:`, e);
    } finally {
      setLoadingList(false);
    }
  };

  const approveCar = async (id) => {
    try {
      await api.put(`/api/admin/approve-car/${id}`);
      setCars((prev) => prev.filter((c) => c._id !== id));
      toast.success("Car approved", { toastId: `car-approve-${id}` });
      if (selectedCar && selectedCar._id === id) setSelectedCar(null);
    } catch (e) {
      toast.error("Failed to approve car");
    }
  };

  const verifyUser = async (id) => {
    try {
      await api.put(`/api/admin/verify-user/${id}`);
      setUsers((prev) => prev.filter((u) => u._id !== id));
      toast.success("User verified", { toastId: `user-verify-${id}` });
    } catch (e) {
      toast.error("Failed to verify user");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <button onClick={loadPending} className="rounded bg-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-300">Refresh</button>
        </div>

        {loading ? (
          <div>Loading…</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Pending Users */}
            <div className="rounded-xl bg-white p-4 shadow">
              <h2 className="mb-3 text-lg font-semibold">Pending Users</h2>
              {users.length === 0 ? (
                <p className="text-sm text-gray-500">No users awaiting verification.</p>
              ) : (
                <div className="space-y-3">
                  {users.map((u) => (
                    <div key={u._id} className="flex items-center justify-between rounded border border-gray-100 bg-gray-50 p-3">
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-xs text-gray-600">{u.email} • {u.phone}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedUser(u)} className="rounded border border-green-700 px-3 py-1.5 text-sm font-semibold text-green-700 hover:bg-green-50">Details</button>
                        <button onClick={() => verifyUser(u._id)} className="rounded bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700">Verify</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Cars */}
            <div className="rounded-xl bg-white p-4 shadow">
              <h2 className="mb-3 text-lg font-semibold">Pending Cars</h2>
              {cars.length === 0 ? (
                <p className="text-sm text-gray-500">No cars awaiting approval.</p>
              ) : (
                <div className="space-y-3">
                  {cars.map((c) => (
                    <div key={c._id} className="flex items-center justify-between rounded border border-gray-100 bg-gray-50 p-3">
                      <div>
                        <p className="font-medium">{c.manufacturer} {c.model}</p>
                        <p className="text-xs text-gray-600">₹{c.price} • {c.type}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedCar(c)} className="rounded border border-blue-600 px-3 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-50">Details</button>
                        <button onClick={() => approveCar(c._id)} className="rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">Approve</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Section */}
        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Platform Analytics</h2>
            <button onClick={loadAnalytics} className="rounded bg-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-300 disabled:opacity-50" disabled={loadingAnalytics}>{loadingAnalytics ? "Loading..." : "Refresh"}</button>
          </div>
          {!analytics ? (
            <p className="text-sm text-gray-500">No analytics loaded yet.</p>
          ) : (
            <div className="space-y-8">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard 
                  label="Users" 
                  value={analytics.stats.totalUsers} 
                  onClick={() => loadListData('users')}
                  clickable={true}
                />
                <StatCard 
                  label="Providers" 
                  value={analytics.stats.totalProviders} 
                  onClick={() => loadListData('providers')}
                  clickable={true}
                />
                <StatCard 
                  label="Cars" 
                  value={analytics.stats.totalCars} 
                  onClick={() => loadListData('cars')}
                  clickable={true}
                />
                <StatCard 
                  label="Bookings" 
                  value={analytics.stats.totalBookings} 
                  onClick={() => loadListData('bookings')}
                  clickable={true}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Monthly Bookings Line Chart */}
                <div className="rounded-xl bg-white p-4 shadow">
                  <h3 className="mb-3 font-semibold">Bookings (Last 12 Months)</h3>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.charts.monthlyBookings}>
                        <XAxis dataKey="month" hide />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="bookings" stroke="#2563eb" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Status Distribution Bar */}
                <div className="rounded-xl bg-white p-4 shadow">
                  <h3 className="mb-3 font-semibold">Booking Status Distribution</h3>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.charts.statusDistribution}>
                        <XAxis dataKey="status" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#10b981" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Role Distribution Pie */}
                <div className="rounded-xl bg-white p-4 shadow">
                  <h3 className="mb-3 font-semibold">Role Distribution</h3>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={analytics.charts.roleDistribution} dataKey="value" nameKey="role" outerRadius={90} label>
                          {analytics.charts.roleDistribution.map((entry, idx) => (
                            <Cell key={idx} fill={["#6366f1", "#f59e0b", "#ef4444", "#10b981"][idx % 4]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Data Tables */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl bg-white p-4 shadow">
                  <h3 className="mb-3 font-semibold">Recent Users</h3>
                  <div className="max-h-80 overflow-auto text-sm">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100 text-left text-xs uppercase tracking-wide text-gray-600">
                          <th className="p-2">Name</th>
                          <th className="p-2">Email</th>
                          <th className="p-2">Role</th>
                          <th className="p-2">Verified</th>
                          <th className="p-2">Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.tables.users.map(u => (
                          <tr key={u._id} className="border-b last:border-none">
                            <td className="p-2">{u.name}</td>
                            <td className="p-2 text-xs">{u.email}</td>
                            <td className="p-2 capitalize">{u.role}</td>
                            <td className="p-2">{u.verified ? <span className="text-green-600">Yes</span> : <span className="text-red-600">No</span>}</td>
                            <td className="p-2 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-xl bg-white p-4 shadow">
                  <h3 className="mb-3 font-semibold">Recent Bookings</h3>
                  <div className="max-h-80 overflow-auto text-sm">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100 text-left text-xs uppercase tracking-wide text-gray-600">
                          <th className="p-2">Car</th>
                          <th className="p-2">User</th>
                          <th className="p-2">Status</th>
                          <th className="p-2">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.tables.bookings.map(b => (
                          <tr key={b._id} className="border-b last:border-none">
                            <td className="p-2">{b.carId ? `${b.carId.manufacturer} ${b.carId.model}` : "-"}</td>
                            <td className="p-2">{b.userName || "-"}</td>
                            <td className="p-2 capitalize">{b.status}</td>
                            <td className="p-2 text-xs">{new Date(b.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* List Modal */}
      {showListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`max-h-[90vh] w-full overflow-auto rounded-xl bg-white p-5 shadow-xl ${
            showListModal === 'cars' ? 'max-w-7xl' : 'max-w-6xl'
          }`}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold capitalize">All {showListModal}</h3>
              <button 
                onClick={() => setShowListModal(null)} 
                className="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
              >
                Close
              </button>
            </div>

            {loadingList ? (
              <div className="flex justify-center py-8">
                <div className="text-gray-500">Loading...</div>
              </div>
            ) : (
              <div className="max-h-96 overflow-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 bg-gray-100">
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-600">
                      {showListModal === 'users' && (
                        <>
                          <th className="p-3 border">Name</th>
                          <th className="p-3 border">Email</th>
                          <th className="p-3 border">Phone</th>
                          <th className="p-3 border">Verified</th>
                          <th className="p-3 border">Joined</th>
                        </>
                      )}
                      {showListModal === 'providers' && (
                        <>
                          <th className="p-3 border">Name</th>
                          <th className="p-3 border">Email</th>
                          <th className="p-3 border">Phone</th>
                          <th className="p-3 border">UPI ID</th>
                          <th className="p-3 border">Joined</th>
                        </>
                      )}
                      {showListModal === 'cars' && (
                        <>
                          <th className="p-3 border">Image</th>
                          <th className="p-3 border">Car Details</th>
                          <th className="p-3 border">Price</th>
                          <th className="p-3 border">Owner Details</th>
                          <th className="p-3 border">Status</th>
                        </>
                      )}
                      {showListModal === 'bookings' && (
                        <>
                          <th className="p-3 border">Car</th>
                          <th className="p-3 border">User</th>
                          <th className="p-3 border">Status</th>
                          <th className="p-3 border">Pickup Date</th>
                          <th className="p-3 border">Created</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {listData.map((item, index) => (
                      <tr key={item._id || index} className="border-b hover:bg-gray-50">
                        {showListModal === 'users' && (
                          <>
                            <td className="p-3 border">{item.name}</td>
                            <td className="p-3 border text-xs">{item.email}</td>
                            <td className="p-3 border">{item.phone}</td>
                            <td className="p-3 border">
                              {item.verified ? (
                                <span className="text-green-600 font-semibold">Yes</span>
                              ) : (
                                <span className="text-red-600 font-semibold">No</span>
                              )}
                            </td>
                            <td className="p-3 border text-xs">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </td>
                          </>
                        )}
                        {showListModal === 'providers' && (
                          <>
                            <td className="p-3 border">{item.name}</td>
                            <td className="p-3 border text-xs">{item.email}</td>
                            <td className="p-3 border">{item.phone}</td>
                            <td className="p-3 border">{item.upiId || '-'}</td>
                            <td className="p-3 border text-xs">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </td>
                          </>
                        )}
                        {showListModal === 'cars' && (
                          <>
                            <td className="p-3 border">
                              <div className="w-20 h-16 rounded overflow-hidden bg-gray-100">
                                <img
                                  src={item.images?.[0] ? `${baseURL}/${item.images[0]}` : PLACEHOLDER_IMAGE}
                                  alt={`${item.manufacturer} ${item.model}`}
                                  onError={(e) => (e.currentTarget.src = PLACEHOLDER_IMAGE)}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </td>
                            <td className="p-3 border">
                              <div className="space-y-1">
                                <p className="font-semibold">{item.manufacturer} {item.model}</p>
                                <p className="text-xs text-gray-600">Type: {item.type}</p>
                                <p className="text-xs text-gray-600">Reg: {item.vehicleReg}</p>
                                <p className="text-xs text-gray-600">Fuel: {item.fuelType}</p>
                                <p className="text-xs text-gray-600">Transmission: {item.transmission}</p>
                                <p className="text-xs text-gray-600">Seats: {item.seatingCapacity}</p>
                              </div>
                            </td>
                            <td className="p-3 border">
                              <p className="font-semibold text-blue-600">₹{item.price}</p>
                            </td>
                            <td className="p-3 border">
                              {item.provider ? (
                                <div className="space-y-1">
                                  <p className="font-semibold">{item.provider.name}</p>
                                  <p className="text-xs text-gray-600">{item.provider.email}</p>
                                  <p className="text-xs text-gray-600">{item.provider.phone}</p>
                                </div>
                              ) : item.providerFallback ? (
                                <div className="space-y-1">
                                  <p className="font-semibold">{item.providerFallback.name}</p>
                                  <p className="text-xs text-gray-600">{item.providerFallback.email}</p>
                                  <p className="text-xs text-gray-600">{item.providerFallback.phone}</p>
                                  <p className="text-[10px] text-gray-400">(fallback from user record)</p>
                                </div>
                              ) : (
                                <span className="text-gray-400">No owner data</span>
                              )}
                            </td>
                            <td className="p-3 border">
                              <div className="space-y-1">
                                <div>
                                  {item.approved ? (
                                    <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Approved</span>
                                  ) : (
                                    <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">Pending</span>
                                  )}
                                </div>
                                <div>
                                  {item.availability ? (
                                    <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Available</span>
                                  ) : (
                                    <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Booked</span>
                                  )}
                                </div>
                              </div>
                            </td>
                          </>
                        )}
                        {showListModal === 'bookings' && (
                          <>
                            <td className="p-3 border">
                              {item.carId ? `${item.carId.manufacturer} ${item.carId.model}` : '-'}
                            </td>
                            <td className="p-3 border">{item.userName || '-'}</td>
                            <td className="p-3 border">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                item.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="p-3 border">{item.pickupDate || '-'}</td>
                            <td className="p-3 border text-xs">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {listData.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No {showListModal} found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedCar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Car & Owner Details</h3>
              <button onClick={() => setSelectedCar(null)} className="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100">Close</button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded border p-3">
                <h4 className="mb-2 font-semibold">Car</h4>
                <div className="space-y-1 text-sm text-gray-700">
                  <p><span className="font-medium">Registration No:</span> {selectedCar.vehicleReg}</p>
                  <p><span className="font-medium">Name:</span> {selectedCar.manufacturer} {selectedCar.model}</p>
                  <p><span className="font-medium">Type:</span> {selectedCar.type}</p>
                  <p><span className="font-medium">Transmission:</span> {selectedCar.transmission}</p>
                  <p><span className="font-medium">Fuel Type:</span> {selectedCar.fuelType}</p>
                  <p><span className="font-medium">Price:</span> ₹{selectedCar.price}</p>
                  <p><span className="font-medium">Seats:</span> {selectedCar.seatingCapacity}</p>
                  {selectedCar.insuranceStatus && <p><span className="font-medium">Insurance:</span> {selectedCar.insuranceStatus}</p>}
                  {selectedCar.rcDetails && <p><span className="font-medium">RC:</span> {selectedCar.rcDetails}</p>}
                  {selectedCar.description && <p className="whitespace-pre-wrap"><span className="font-medium">Description:</span> {selectedCar.description}</p>}
                </div>
              </div>

              <div className="rounded border p-3">
                <h4 className="mb-2 font-semibold">Owner</h4>
                {selectedCar.provider ? (
                  <div className="space-y-1 text-sm text-gray-700">
                    <p><span className="font-medium">Name:</span> {selectedCar.provider.name}</p>
                    <p><span className="font-medium">Email:</span> {selectedCar.provider.email}</p>
                    <p><span className="font-medium">Phone:</span> {selectedCar.provider.phone}</p>
                    {selectedCar.provider.upiId && <p><span className="font-medium">UPI:</span> {selectedCar.provider.upiId}</p>}
                    {selectedCar.provider.address && (
                      <div>
                        <p className="font-medium">Address</p>
                        <p className="text-gray-600">
                          {selectedCar.provider.address.fullAddress}
                          {selectedCar.provider.address.landmark ? `, ${selectedCar.provider.address.landmark}` : ""}
                          {selectedCar.provider.address.area ? `, ${selectedCar.provider.address.area}` : ""}
                          {selectedCar.provider.address.district ? `, ${selectedCar.provider.address.district}` : ""}
                          {selectedCar.provider.address.pincode ? `, ${selectedCar.provider.address.pincode}` : ""}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Owner details not available.</p>
                )}
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setSelectedCar(null)} className="rounded border px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={() => approveCar(selectedCar._id)} className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Approve Car</button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">User Details</h3>
              <button onClick={() => setSelectedUser(null)} className="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100">Close</button>
            </div>

            <div className="space-y-2 text-sm text-gray-800">
              <p><span className="font-medium">Name:</span> {selectedUser.name}</p>
              <p><span className="font-medium">Email:</span> {selectedUser.email}</p>
              <p><span className="font-medium">Phone:</span> {selectedUser.phone}</p>
              {selectedUser.dob && <p><span className="font-medium">DOB:</span> {new Date(selectedUser.dob).toLocaleDateString()}</p>}
              {selectedUser.maritalStatus && <p><span className="font-medium">Marital Status:</span> {selectedUser.maritalStatus}</p>}
              {selectedUser.address && <p><span className="font-medium">Address:</span> {selectedUser.address}</p>}
              {selectedUser.area && <p><span className="font-medium">Area:</span> {selectedUser.area}</p>}
              {selectedUser.district && <p><span className="font-medium">District:</span> {selectedUser.district}</p>}
              {selectedUser.pincode && <p><span className="font-medium">Pincode:</span> {selectedUser.pincode}</p>}
              <p><span className="font-medium">License No:</span> {selectedUser.license}</p>
              {selectedUser.licensePath && (
                <p>
                  <span className="font-medium">License File:</span> {" "}
                  <a className="text-blue-600 underline" href={`${baseURL.replace(/\/$/, "")}/${String(selectedUser.licensePath).replace(/^\/?/, "")}`} target="_blank" rel="noreferrer">View</a>
                </p>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setSelectedUser(null)} className="rounded border px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Close</button>
              <button onClick={() => verifyUser(selectedUser._id)} className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">Verify User</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, onClick, clickable = false }) {
  return (
    <div 
      className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${
        clickable ? 'cursor-pointer hover:shadow-md hover:border-blue-300 transition-all' : ''
      }`}
      onClick={clickable ? onClick : undefined}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {clickable && (
        <p className="mt-1 text-xs text-blue-600">Click to view details</p>
      )}
    </div>
  );
}
