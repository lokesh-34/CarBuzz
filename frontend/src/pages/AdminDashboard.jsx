import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { baseURL } from "../api";
import { toast } from "react-toastify";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [cars, setCars] = useState([]);
  const [selectedCar, setSelectedCar] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
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
  }, []);

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
      </div>

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
