import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./api";

const PROJECTS_CACHE_KEY = "projects_cache";
const MY_PROJECT_CACHE_KEY = "my_project_cache";
const PROJECT_PROGRESS_CACHE_PREFIX = "project_progress_cache:";
const OFFLINE_PROJECTS_KEY = "offline_projects";

export const getProjects = async () => {
  const response = await api.get("/proyectos");
  const projects = Array.isArray(response.data) ? response.data : [];
  await AsyncStorage.setItem(PROJECTS_CACHE_KEY, JSON.stringify(projects));
  return projects;
};

export const createProject = async (payload) => {
  const response = await api.post("/proyectos", payload);
  return response.data;
};

export const updateProject = async (projectId, payload) => {
  const response = await api.put(`/proyectos/${projectId}`, payload);
  return response.data;
};

export const getMyProject = async () => {
  const response = await api.get("/proyectos/mio");
  await AsyncStorage.setItem(MY_PROJECT_CACHE_KEY, JSON.stringify(response.data));
  return response.data;
};

export const getProjectProgress = async (projectId) => {
  const response = await api.get(`/proyectos/${projectId}/avance`);
  await AsyncStorage.setItem(
    `${PROJECT_PROGRESS_CACHE_PREFIX}${projectId}`,
    JSON.stringify(response.data)
  );
  return response.data;
};

export const getCachedProjects = async () => {
  try {
    const raw = await AsyncStorage.getItem(PROJECTS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const getCachedMyProject = async () => {
  try {
    const raw = await AsyncStorage.getItem(MY_PROJECT_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getCachedProjectProgress = async (projectId) => {
  try {
    const raw = await AsyncStorage.getItem(
      `${PROJECT_PROGRESS_CACHE_PREFIX}${projectId}`
    );
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getOfflineProjects = async () => {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_PROJECTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveOfflineProject = async (payload) => {
  const current = await getOfflineProjects();
  const offlineProject = {
    ...payload,
    offlineId: `project-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
  };
  const next = [offlineProject, ...current];
  await AsyncStorage.setItem(OFFLINE_PROJECTS_KEY, JSON.stringify(next));
  return offlineProject;
};

export const syncOfflineProjects = async () => {
  const pending = await getOfflineProjects();

  if (!pending.length) {
    return { synced: 0, failed: 0, mappings: [] };
  }

  const remaining = [];
  const mappings = [];
  let synced = 0;

  for (const item of pending) {
    try {
      const response = await createProject({
        nombre: item.nombre,
        descripcion: item.descripcion,
        fecha_inicio: item.fecha_inicio,
        fecha_fin_estimada: item.fecha_fin_estimada,
        estado: item.estado,
        cliente: item.cliente,
      });
      synced += 1;
      if (response?.proyecto?._id) {
        mappings.push({
          offlineId: item.offlineId,
          realId: response.proyecto._id,
        });
      }
    } catch {
      remaining.push(item);
    }
  }

  await AsyncStorage.setItem(OFFLINE_PROJECTS_KEY, JSON.stringify(remaining));

  return {
    synced,
    failed: remaining.length,
    mappings,
  };
};
