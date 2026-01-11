import axios from "axios";
import { Platform } from "react-native";
import { useAuthStore } from "../store/useAuthStore";

const baseURL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000");
// "https://smashref.solvvtech.com";

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      useAuthStore.getState().clearToken();
    }
    return Promise.reject(error);
  }
);

export default api;
