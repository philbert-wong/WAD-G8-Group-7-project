/**
 * OWNER: Project Lead
 *
 * The ONE axios instance the whole app uses. Every request the frontend makes
 * goes through here, which is why the JWT only has to be attached in one place.
 */
import axios from "axios";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Turn any failure into a plain, readable message for the UI.
    const message = err.response?.data?.error || "Something went wrong. Try again.";
    return Promise.reject(new Error(message));
  }
);

export default api;
