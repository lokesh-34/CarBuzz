import React, { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { toast } from "react-toastify";

const tamilNaduDistricts = [
  "Ariyalur","Chengalpattu","Chennai","Coimbatore","Cuddalore","Dharmapuri",
  "Dindigul","Erode","Kallakurichi","Kancheepuram","Karur","Krishnagiri",
  "Madurai","Nagapattinam","Namakkal","Nilgiris","Perambalur","Pudukkottai",
  "Ramanathapuram","Ranipet","Salem","Sivaganga","Tenkasi","Thanjavur",
  "Theni","Thoothukudi","Tiruchirappalli","Tirunelveli","Tirupathur",
  "Tiruppur","Tiruvallur","Tiruvannamalai","Tiruvarur","Vellore","Viluppuram",
  "Virudhunagar"
];

export default function Register_car_userupForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    dob: "",
    email: "",
    phone: "",
    maritalStatus: "",
    address: "",
    area: "",
    district: "",
    pincode: "",
    license: "",
    photo: null,
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "photo") {
      setFormData({ ...formData, photo: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.warn("Passwords do not match!", { toastId: "pwd-mismatch" });
      return;
    }

    try {
      const fd = new FormData();
      Object.keys(formData).forEach((key) => {
        if (formData[key]) fd.append(key, formData[key]);
      });

      fd.append("role", "user");

      const { data } = await api.post("/api/users/register", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Auto-login right after successful signup
      const loginRes = await api.post("/api/users/login", {
        email: formData.email,
        password: formData.password,
      });
      const token = loginRes.data?.token;
      if (token) {
        localStorage.setItem("token", token);
        // Route user to their dashboard
        navigate("/cars");
        toast.success("Signup complete. Logged in!", { toastId: "signup-login" });
        return;
      }
      toast.info("Signed up, but auto-login failed. Please log in manually.", { toastId: "signup-no-autologin" });
    } catch (err) {
      console.error("Signup failed:", err?.response?.data || err.message);
      toast.error("Signup failed. Please try again.");
    }
  };

  return (
    <>
      <style>{`
        .container {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #f4f6f8;
        }
        .form-box {
          width: 400px;
          background: #fff;
          padding: 25px;
          border-radius: 10px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .form-box h2 { text-align: center; margin-bottom: 20px; color: #333; }
        form { display: flex; flex-direction: column; }
        label { font-weight: 600; margin: 10px 0 5px; color: #444; }
        input, select, textarea {
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 6px;
          margin-bottom: 10px;
          font-size: 14px;
          outline: none;
        }
        input:focus, select:focus, textarea:focus { border-color: #007bff; }
        .password-field { position: relative; }
        .password-field input { width: 100%; padding-right: 35px; }
        .password-field .icon {
          position: absolute; right: 10px; top: 50%;
          transform: translateY(-50%); cursor: pointer; color: #666;
        }
        .btn {
          background: #007bff; color: #fff; padding: 12px;
          border: none; border-radius: 6px; cursor: pointer;
          font-size: 16px; font-weight: bold;
        }
        .btn:hover { background: #0056b3; }
      `}</style>

      <div className="container">
        <div className="form-box">
          <h2>Car User Signup</h2>
          <form onSubmit={handleSubmit}>
            <label>Upload Photo</label>
            <input type="file" name="photo" accept="image/*" onChange={handleChange} required />

            <label>Full Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required />

            <label>Date of Birth</label>
            <input type="date" name="dob" value={formData.dob} onChange={handleChange} required />

            <label>Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required />

            <label>Phone Number</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} pattern="[0-9]{10}" placeholder="10-digit number" required />

            <label>Password</label>
            <div className="password-field">
              <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} required />
              <span className="icon" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>

            <label>Confirm Password</label>
            <div className="password-field">
              <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
              <span className="icon" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>

            <label>Marital Status</label>
            <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} required>
              <option value="">Select</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Other">Other</option>
            </select>

            <label>Address</label>
            <textarea name="address" value={formData.address} onChange={handleChange} required rows="2" />

            <label>Area</label>
            <input type="text" name="area" value={formData.area} onChange={handleChange} required />

            <label>District</label>
            <select name="district" value={formData.district} onChange={handleChange} required>
              <option value="">Select District</option>
              {tamilNaduDistricts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <label>Pincode</label>
            <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} pattern="[0-9]{6}" placeholder="6-digit pincode" required />

            <label>Driving License No.</label>
            <input type="text" name="license" value={formData.license} onChange={handleChange} required />

            <button type="submit" className="btn">Sign Up</button>
          </form>
        </div>
      </div>
    </>
  );
}
