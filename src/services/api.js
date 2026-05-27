import axios from "axios";
import { getStoredSession } from "./authStorage";

const FALLBACK_API_HOST = "https://tfg-wi2b.onrender.com";

export const API_HOST =
  process.env.EXPO_PUBLIC_API_URL?.trim() || FALLBACK_API_HOST;

const api = axios.create({
  baseURL: `${API_HOST}/api`,
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const session = await getStoredSession();

  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }

  return config;
});

export const resolveAssetUrl = (path) => {
  if (!path) {
    return null;
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${API_HOST}${path}`;
};

export default api;
