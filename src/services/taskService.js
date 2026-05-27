import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./api";

const TASK_CACHE_KEY = "employee_tasks_cache";
const OFFLINE_TASK_UPDATES_KEY = "offline_task_updates";
const OFFLINE_TASK_CREATIONS_KEY = "offline_task_creations";

export const getTasks = async () => {
  const response = await api.get("/tareas");
  return response.data;
};

export const getEmployeeTasks = async () => {
  const response = await api.get("/tareas");
  const tasks = Array.isArray(response.data) ? response.data : [];
  await AsyncStorage.setItem(TASK_CACHE_KEY, JSON.stringify(tasks));
  return tasks;
};

export const createTask = async (payload) => {
  const response = await api.post("/tareas", payload);
  return response.data;
};

export const updateTaskStatus = async ({ taskId, estado, photo }) => {
  const formData = new FormData();
  formData.append("estado", estado);

  if (photo) {
    formData.append("foto_avance", {
      uri: photo.uri,
      name: photo.fileName || `avance-${Date.now()}.jpg`,
      type: photo.mimeType || photo.type || "image/jpeg",
    });
  }

  const response = await api.put(`/tareas/${taskId}/estado`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

export const getCachedEmployeeTasks = async () => {
  try {
    const raw = await AsyncStorage.getItem(TASK_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const getOfflineTaskUpdates = async () => {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_TASK_UPDATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveOfflineTaskUpdate = async (update) => {
  const current = await getOfflineTaskUpdates();
  const remaining = current.filter((item) => item.taskId !== update.taskId);
  const next = [...remaining, update];
  await AsyncStorage.setItem(OFFLINE_TASK_UPDATES_KEY, JSON.stringify(next));
};

export const syncOfflineTaskUpdates = async () => {
  const pending = await getOfflineTaskUpdates();

  if (!pending.length) {
    return { synced: 0, failed: 0 };
  }

  const remaining = [];
  let synced = 0;

  for (const item of pending) {
    try {
      await updateTaskStatus(item);
      synced += 1;
    } catch {
      remaining.push(item);
    }
  }

  await AsyncStorage.setItem(
    OFFLINE_TASK_UPDATES_KEY,
    JSON.stringify(remaining)
  );

  return {
    synced,
    failed: remaining.length,
  };
};

export const getOfflineTaskCreations = async () => {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_TASK_CREATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveOfflineTaskCreation = async (payload) => {
  const current = await getOfflineTaskCreations();
  const offlineTask = {
    ...payload,
    offlineId: `task-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
  };
  const next = [offlineTask, ...current];
  await AsyncStorage.setItem(OFFLINE_TASK_CREATIONS_KEY, JSON.stringify(next));
  return offlineTask;
};

export const remapOfflineTaskProjectIds = async (mappings) => {
  if (!Array.isArray(mappings) || !mappings.length) {
    return;
  }

  const current = await getOfflineTaskCreations();
  const mappingByOfflineId = mappings.reduce((acc, item) => {
    acc[item.offlineId] = item.realId;
    return acc;
  }, {});

  const next = current.map((item) => ({
    ...item,
    proyecto: mappingByOfflineId[item.proyecto] || item.proyecto,
  }));

  await AsyncStorage.setItem(OFFLINE_TASK_CREATIONS_KEY, JSON.stringify(next));
};

export const syncOfflineTaskCreations = async () => {
  const pending = await getOfflineTaskCreations();

  if (!pending.length) {
    return { synced: 0, failed: 0 };
  }

  const remaining = [];
  let synced = 0;

  for (const item of pending) {
    try {
      await createTask({
        proyecto: item.proyecto,
        empleado: item.empleado,
        nombre: item.nombre,
        descripcion: item.descripcion,
      });
      synced += 1;
    } catch {
      remaining.push(item);
    }
  }

  await AsyncStorage.setItem(
    OFFLINE_TASK_CREATIONS_KEY,
    JSON.stringify(remaining)
  );

  return {
    synced,
    failed: remaining.length,
  };
};
