import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { toast } from "react-toastify";

const tamilNaduDistricts = [
  "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri",
  "Dindigul", "Erode", "Kallakurichi", "Kancheepuram", "Karur", "Krishnagiri",
  "Madurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai",
  "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur",
  "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur",
  "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram",
  "Virudhunagar"
];

function RegisterCarProviderForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    dob: "",
    email: "",
    phone: "",
    address: "",
    area: "",
    district: "",
    pincode: "",
    password: "",
    confirmPassword: "",
    upi: "",
    suitableFor: "",
    ageGroup: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "pincode" || name === "phone") {
      if (/^\d*$/.test(value)) setFormData({ ...formData, [name]: value });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.warn("Passwords do not match!", { toastId: "prov-pwd" });
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post("/api/providers/register", {
        name: formData.name,
        dob: formData.dob,
        email: formData.email,
        phone: formData.phone,
        address: {
          fullAddress: formData.address,
          area: formData.area,
          district: formData.district,
          pincode: formData.pincode
        },
        password: formData.password,
        upiId: formData.upi,
        suitableFor: formData.suitableFor,
        ageGroup: formData.ageGroup,
        profileImage: ""
      });

      // Persist providerId from registration response
      if (data?.provider?._id) {
        localStorage.setItem("providerId", data.provider._id);
      }

      // Auto-login provider
      const loginRes = await api.post("/api/providers/login", {
        email: formData.email,
        password: formData.password,
      });
      const token = loginRes.data?.token;
      if (token) {
        localStorage.setItem("token", token);
        // Ensure providerId is also stored from login response
        const loginProviderId = loginRes.data?.provider?._id;
        if (loginProviderId) {
          localStorage.setItem("providerId", loginProviderId);
        }
        navigate("/provider");
        toast.success("Provider signup complete. Logged in!", { toastId: "prov-ok" });
        return;
      }
      toast.info("Provider signed up, but auto-login failed. Please log in.", { toastId: "prov-noauto" });

      setFormData({
        name: "",
        dob: "",
        email: "",
        phone: "",
        address: "",
        area: "",
        district: "",
        pincode: "",
        password: "",
        confirmPassword: "",
        upi: "",
        suitableFor: "",
        ageGroup: ""
      });
    } catch (err) {
      console.error("Registration error:", err);
      const msg = err.response?.data?.message || "Failed to register provider. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Car Provider Signup</h2>
      <form style={styles.form} onSubmit={handleSubmit}>
        <h3 style={styles.section}>Personal Information</h3>

        <label style={styles.label}>Name:</label>
        <input style={styles.input} type="text" name="name" value={formData.name} onChange={handleChange} required />

        <label style={styles.label}>Date of Birth:</label>
        <input style={styles.input} type="date" name="dob" value={formData.dob} onChange={handleChange} required />

        <label style={styles.label}>Email:</label>
        <input style={styles.input} type="email" name="email" value={formData.email} onChange={handleChange} required />

        <label style={styles.label}>Phone Number:</label>
        <input style={styles.input} type="text" name="phone" value={formData.phone} onChange={handleChange} minLength="10" maxLength="10" required />

        <label style={styles.label}>Password:</label>
        <div style={styles.passwordWrapper}>
          <input style={styles.input} type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} required />
          <span style={styles.eyeIcon} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <FaEyeSlash /> : <FaEye />}</span>
        </div>

        <label style={styles.label}>Confirm Password:</label>
        <div style={styles.passwordWrapper}>
          <input style={styles.input} type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
          <span style={styles.eyeIcon} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? <FaEyeSlash /> : <FaEye />}</span>
        </div>

        <h3 style={styles.section}>Address Details</h3>

        <label style={styles.label}>Address:</label>
        <input style={styles.input} type="text" name="address" value={formData.address} onChange={handleChange} required />

        <label style={styles.label}>Area:</label>
        <input style={styles.input} type="text" name="area" value={formData.area} onChange={handleChange} required />

        <label style={styles.label}>District:</label>
        <select style={styles.input} name="district" value={formData.district} onChange={handleChange} required>
          <option value="">Select District</option>
          {tamilNaduDistricts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <label style={styles.label}>Pincode:</label>
        <input style={styles.input} type="text" name="pincode" value={formData.pincode} onChange={handleChange} pattern="\d{6}" minLength="6" maxLength="6" title="Enter a valid 6-digit pincode" required />

        <label style={styles.label}>UPI ID:</label>
        <input style={styles.input} type="text" name="upi" value={formData.upi} onChange={handleChange} required />

        <label style={styles.label}>Preferable For:</label>
        <select style={styles.input} name="suitableFor" value={formData.suitableFor} onChange={handleChange} required>
          <option value="">Select</option>
          <option value="Singles">Singles</option>
          <option value="Married">Married</option>
          <option value="Any">Any</option>
        </select>

        <label style={styles.label}>Age Group:</label>
        <select style={styles.input} name="ageGroup" value={formData.ageGroup} onChange={handleChange} required>
          <option value="">Select</option>
          <option value="20-25">20-25</option>
          <option value="25-30">25-30</option>
          <option value="30-35">30-35</option>
          <option value="Any">Any</option>
        </select>

        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? "Registering..." : "Signup"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: { maxWidth: "650px", margin: "40px auto", padding: "30px", border: "1px solid #ddd", borderRadius: "10px", boxShadow: "0px 4px 12px rgba(0,0,0,0.1)", backgroundColor: "#f9f9f9", fontFamily: "Arial, sans-serif" },
  heading: { textAlign: "center", marginBottom: "20px", color: "#333" },
  section: { marginTop: "20px", marginBottom: "10px", color: "#007bff" },
  form: { display: "flex", flexDirection: "column", gap: "12px" },
  input: { padding: "10px", fontSize: "14px", borderRadius: "5px", border: "1px solid #ccc", width: "100%" },
  label: { fontSize: "14px", fontWeight: "bold", color: "#444" },
  button: { marginTop: "20px", padding: "12px", backgroundColor: "#007bff", color: "white", fontSize: "16px", border: "none", borderRadius: "5px", cursor: "pointer", transition: "0.3s" },
  passwordWrapper: { position: "relative", display: "flex", alignItems: "center" },
  eyeIcon: { position: "absolute", right: "10px", cursor: "pointer", color: "#555" }
};

export default RegisterCarProviderForm;
