import api from "./api";

export const loginRequest = async ({ email, contrasena }) => {
  const response = await api.post("/auth/login", {
    email: email.trim().toLowerCase(),
    contrasena,
  });

  return response.data;
};

export const registerRequest = async ({
  nombre,
  email,
  contrasena,
  rol,
  especialidad,
  anos_experiencia,
  telefono,
  direccion,
}) => {
  const response = await api.post("/auth/registro", {
    nombre: nombre.trim(),
    email: email.trim().toLowerCase(),
    contrasena,
    rol,
    especialidad: especialidad?.trim() || undefined,
    anos_experiencia:
      anos_experiencia === "" || anos_experiencia == null
        ? undefined
        : Number(anos_experiencia),
    telefono: telefono?.trim() || undefined,
    direccion: direccion?.trim() || undefined,
  });

  return response.data;
};
