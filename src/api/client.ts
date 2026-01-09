import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";

const api = axios.create({
  baseURL: "http://10.0.2.2:3000",
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
