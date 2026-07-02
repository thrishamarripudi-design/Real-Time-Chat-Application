import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.MODE === "development" ? "http://localhost:5001/api" : "/api",
  withCredentials: true,
});

// CRITICAL: attach the per-tab token as a Bearer header on every request.
// We deliberately do NOT rely solely on the httpOnly cookie, because that
// cookie is shared across every tab on this origin -- opening 3 tabs and
// logging into 3 different accounts would otherwise leave all 3 tabs
// pointing at whichever account logged in *last*. Reading the token from
// sessionStorage (which is isolated per-tab) fixes that.
axiosInstance.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("chat-token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});