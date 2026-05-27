import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./api";

const INVOICES_CACHE_KEY = "invoices_cache";

export const getInvoices = async () => {
  const response = await api.get("/facturas");
  const invoices = Array.isArray(response.data) ? response.data : [];
  await AsyncStorage.setItem(INVOICES_CACHE_KEY, JSON.stringify(invoices));
  return invoices;
};

export const getCachedInvoices = async () => {
  try {
    const raw = await AsyncStorage.getItem(INVOICES_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};
