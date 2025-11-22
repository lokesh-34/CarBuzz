import axios from "axios";
import { Capacitor } from "@capacitor/core";

// Use production API URL for mobile builds, configurable for web
const getBaseURL = () => {
  if (Capacitor.isNativePlatform()) {
    return import.meta.env.VITE_API_URL || "https://carbuzz-stpp.onrender.com";
  }
  return import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
};

export const baseURL = getBaseURL();

const api = axios.create({
  baseURL,
});

// Add request interceptor to always check for token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log for debugging
    if (error.response) {
      console.log(`API Error: ${error.response.status} - ${error.config?.url}`);
    }
    return Promise.reject(error);
  }
);

export default api;
