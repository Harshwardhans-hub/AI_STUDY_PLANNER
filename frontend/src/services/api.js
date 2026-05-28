import axios from "axios";
import { getIdToken } from "../firebase/auth";

// Short timeout for auth verify (5s), normal for everything else (25s)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000/api",
  timeout: 25000,
});

// Attach Firebase ID token on every request
api.interceptors.request.use(async (config) => {
  const token = await getIdToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global error handling
api.interceptors.response.use(
  (response) => response,
  (err) => {
    const message =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      "Something went wrong";
    return Promise.reject(new Error(message));
  }
);

export default api;

// Short-timeout instance for auth verify only
export const authApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000/api",
  timeout: 6000,
});

authApi.interceptors.request.use(async (config) => {
  const token = await getIdToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

authApi.interceptors.response.use(
  (response) => response,
  (err) => {
    const message =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      "Auth check failed";
    return Promise.reject(new Error(message));
  }
);
