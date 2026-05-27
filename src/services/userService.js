import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./api";

const getUsersCacheKey = (rol) => `users_cache:${rol || "all"}`;

export const getUsers = async (rol) => {
  const response = await api.get("/auth/usuarios", {
    params: rol ? { rol } : undefined,
  });

  const users = Array.isArray(response.data) ? response.data : [];
  await AsyncStorage.setItem(getUsersCacheKey(rol), JSON.stringify(users));
  return users;
};

export const updateUser = async (userId, payload) => {
  const response = await api.put(`/auth/usuarios/${userId}`, payload);
  return response.data;
};

export const deleteUser = async (userId) => {
  const response = await api.delete(`/auth/usuarios/${userId}`);
  return response.data;
};

export const registerEmployee = async ({ nombre, email, contrasena, telefono, direccion, especialidad, anos_experiencia }) => {
  const response = await api.post("/auth/registro-empleado", {
    nombre,
    email,
    contrasena,
    telefono,
    direccion,
    especialidad,
    anos_experiencia,
  });
  return response.data;
};

export const updateProfile = async (payload) => {
  const response = await api.put("/auth/profile", payload);
  return response.data;
};

export const changePassword = async ({ contrasena_actual, contrasena_nueva }) => {
  const response = await api.put("/auth/change-password", {
    contrasena_actual,
    contrasena_nueva,
  });
  return response.data;
};

export const resetUserPassword = async (userId, contrasena_nueva) => {
  const response = await api.put(`/auth/reset-password/${userId}`, { contrasena_nueva });
  return response.data;
};

export const getCachedUsers = async (rol) => {
  try {
    const raw = await AsyncStorage.getItem(getUsersCacheKey(rol));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};
