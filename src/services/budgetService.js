import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./api";

const BUDGETS_CACHE_KEY = "budgets_cache";
const OFFLINE_BUDGETS_KEY = "offline_budgets";

export const getBudgets = async () => {
  const response = await api.get("/presupuestos");
  const budgets = Array.isArray(response.data) ? response.data : [];
  await AsyncStorage.setItem(BUDGETS_CACHE_KEY, JSON.stringify(budgets));
  return budgets;
};

export const createBudget = async (payload) => {
  const response = await api.post("/presupuestos", payload);
  return response.data;
};

export const approveBudget = async (budgetId) => {
  const response = await api.put(`/presupuestos/${budgetId}/aprobacion`);
  return response.data;
};

export const rejectBudget = async (budgetId) => {
  const response = await api.put(`/presupuestos/${budgetId}/rechazo`);
  return response.data;
};

export const getCachedBudgets = async () => {
  try {
    const raw = await AsyncStorage.getItem(BUDGETS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const getOfflineBudgets = async () => {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_BUDGETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveOfflineBudget = async (payload) => {
  const current = await getOfflineBudgets();
  const offlineBudget = {
    ...payload,
    offlineId: `budget-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
  };
  const next = [offlineBudget, ...current];
  await AsyncStorage.setItem(OFFLINE_BUDGETS_KEY, JSON.stringify(next));
  return offlineBudget;
};

export const syncOfflineBudgets = async () => {
  const pending = await getOfflineBudgets();

  if (!pending.length) {
    return { synced: 0, failed: 0 };
  }

  const remaining = [];
  let synced = 0;

  for (const item of pending) {
    try {
      await createBudget({
        proyecto: item.proyecto,
        descripcion: item.descripcion,
        partidas: item.partidas,
      });
      synced += 1;
    } catch {
      remaining.push(item);
    }
  }

  await AsyncStorage.setItem(OFFLINE_BUDGETS_KEY, JSON.stringify(remaining));

  return {
    synced,
    failed: remaining.length,
  };
};
