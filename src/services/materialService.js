import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./api";

const OFFLINE_CONSUMOS_KEY = "offline_consumos";
const createClientRequestId = () =>
  `consumo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const getMaterials = async () => {
  const response = await api.get("/materiales");
  return response.data;
};

export const createMaterial = async (payload) => {
  const response = await api.post("/materiales", payload);
  return response.data;
};

export const replenishMaterialStock = async ({ materialId, cantidad }) => {
  const response = await api.post(`/materiales/${materialId}/reposicion`, {
    cantidad,
  });

  return response.data;
};

export const assignMaterialToTask = async ({ materialId, cantidad, tarea }) => {
  const response = await api.post(`/materiales/${materialId}/asignacion`, {
    cantidad,
    tarea,
  });

  return response.data;
};

export const postMaterialConsumption = async ({
  materialId,
  cantidad,
  tarea,
  clientRequestId,
}) => {
  const body = {
    cantidad,
    clientRequestId: clientRequestId || createClientRequestId(),
  };
  if (tarea) body.tarea = tarea;
  const response = await api.post(`/materiales/${materialId}/consumo`, body);
  return response.data;
};

export const getOfflineConsumptions = async () => {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_CONSUMOS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
};

export const saveOfflineConsumption = async (consumo) => {
  const current = await getOfflineConsumptions();
  const updated = [
    ...current,
    {
      ...consumo,
      clientRequestId: consumo.clientRequestId || createClientRequestId(),
    },
  ];
  await AsyncStorage.setItem(OFFLINE_CONSUMOS_KEY, JSON.stringify(updated));
};

export const syncOfflineConsumptions = async () => {
  const pending = await getOfflineConsumptions();

  if (!pending.length) {
    return { synced: 0, failed: 0 };
  }

  const remaining = [];
  let synced = 0;

  for (const item of pending) {
    try {
      await postMaterialConsumption(item);
      synced += 1;
    } catch (error) {
      remaining.push(item);
    }
  }

  await AsyncStorage.setItem(OFFLINE_CONSUMOS_KEY, JSON.stringify(remaining));

  return {
    synced,
    failed: remaining.length,
  };
};
