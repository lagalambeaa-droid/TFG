const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Usuario = require("../models/Usuario");

const validateStrongPassword = (pwd) => {
  if (!pwd) return "La contrasena es obligatoria.";
  if (pwd.length < 8) return "La contrasena debe tener al menos 8 caracteres.";
  if (!/[A-Z]/.test(pwd)) return "Debe incluir al menos una letra mayuscula.";
  if (!/[a-z]/.test(pwd)) return "Debe incluir al menos una letra minuscula.";
  if (!/[0-9]/.test(pwd)) return "Debe incluir al menos un numero.";
  if (!/[^A-Za-z0-9]/.test(pwd)) return "Debe incluir al menos un caracter especial.";
  return null;
};

const registro = async (req, res) => {
  try {
    const {
      nombre,
      email,
      contrasena,
      rol,
      especialidad,
      anos_experiencia,
      telefono,
      direccion,
    } = req.body;

    const errors = {};
    if (!nombre || !nombre.trim()) {
      errors.nombre = "El nombre es obligatorio.";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !email.trim()) {
      errors.email = "El email es obligatorio. Ejemplo: usuario@correo.com";
    } else if (!emailRegex.test(email)) {
      errors.email = "El email no tiene un formato valido. Ejemplo: usuario@correo.com";
    }
    const pwdError = validateStrongPassword(contrasena);
    if (pwdError) {
      errors.contrasena = pwdError;
    }
    const rolesValidos = ["capataz", "empleado", "cliente"];
    if (rol && !rolesValidos.includes(rol)) {
      errors.rol = "El rol seleccionado no es valido.";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: "Errores de validacion", errors });
    }

    const usuarioExistente = await Usuario.findOne({ email });

    if (usuarioExistente) {
      return res.status(409).json({
        message: "El email ya esta registrado",
        errors: { email: "Este email ya esta en uso. Prueba con otro." },
      });
    }

    const contrasenaEncriptada = await bcrypt.hash(contrasena, 10);

    const nuevoUsuario = await Usuario.create({
      nombre,
      email,
      contrasena: contrasenaEncriptada,
      rol,
      especialidad,
      anos_experiencia,
      telefono,
      direccion,
    });

    return res.status(201).json({
      message: "Usuario registrado correctamente",
      usuario: {
        id: nuevoUsuario._id,
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al registrar el usuario",
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, contrasena } = req.body;

    const usuario = await Usuario.findOne({ email });

    if (!usuario) {
      return res.status(401).json({ message: "Credenciales invalidas" });
    }

    const contrasenaValida = await bcrypt.compare(
      contrasena,
      usuario.contrasena
    );

    if (!contrasenaValida) {
      return res.status(401).json({ message: "Credenciales invalidas" });
    }

    const token = jwt.sign(
      { id: usuario._id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Login correcto",
      token,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        telefono: usuario.telefono,
        direccion: usuario.direccion,
        especialidad: usuario.especialidad,
        debe_cambiar_contrasena: !!usuario.debe_cambiar_contrasena,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al iniciar sesion",
      error: error.message,
    });
  }
};

const listarUsuarios = async (req, res) => {
  try {
    const filtro = {};

    if (req.query.rol) {
      filtro.rol = req.query.rol;
    }

    const usuarios = await Usuario.find(filtro)
      .select("nombre email rol especialidad anos_experiencia telefono direccion")
      .sort({ nombre: 1 });

    return res.status(200).json(usuarios);
  } catch (error) {
    return res.status(500).json({
      message: "Error al listar los usuarios",
      error: error.message,
    });
  }
};

const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, rol, especialidad, anos_experiencia, telefono, direccion } = req.body;

    const usuario = await Usuario.findById(id);

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (email && email !== usuario.email) {
      const existente = await Usuario.findOne({ email });
      if (existente) {
        return res.status(409).json({ message: "El email ya esta en uso" });
      }
    }

    Object.assign(usuario, {
      ...(nombre && { nombre }),
      ...(email && { email }),
      ...(rol && { rol }),
      ...(especialidad !== undefined && { especialidad }),
      ...(anos_experiencia !== undefined && { anos_experiencia }),
      ...(telefono !== undefined && { telefono }),
      ...(direccion !== undefined && { direccion }),
    });

    await usuario.save();

    return res.status(200).json({
      message: "Usuario actualizado correctamente",
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        especialidad: usuario.especialidad,
        telefono: usuario.telefono,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al actualizar el usuario",
      error: error.message,
    });
  }
};

const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findById(id);

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    await Usuario.findByIdAndDelete(id);

    return res.status(200).json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    return res.status(500).json({
      message: "Error al eliminar el usuario",
      error: error.message,
    });
  }
};

const registroEmpleado = async (req, res) => {
  try {
    const { nombre, email, contrasena, telefono, direccion, especialidad, anos_experiencia } = req.body;

    const errors = {};
    if (!nombre || !nombre.trim()) {
      errors.nombre = "El nombre es obligatorio.";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !email.trim()) {
      errors.email = "El email es obligatorio.";
    } else if (!emailRegex.test(email)) {
      errors.email = "El email no tiene un formato valido.";
    }
    const empPwdError = validateStrongPassword(contrasena);
    if (empPwdError) {
      errors.contrasena = empPwdError;
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: "Errores de validacion", errors });
    }

    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
      return res.status(409).json({
        message: "El email ya esta registrado",
        errors: { email: "Este email ya esta en uso." },
      });
    }

    const contrasenaEncriptada = await bcrypt.hash(contrasena, 10);

    const nuevoEmpleado = await Usuario.create({
      nombre,
      email,
      contrasena: contrasenaEncriptada,
      rol: "empleado",
      telefono,
      direccion,
      especialidad,
      anos_experiencia: anos_experiencia != null ? Number(anos_experiencia) : undefined,
      debe_cambiar_contrasena: true,
    });

    return res.status(201).json({
      message: "Empleado registrado correctamente",
      usuario: {
        id: nuevoEmpleado._id,
        nombre: nuevoEmpleado.nombre,
        email: nuevoEmpleado.email,
        rol: nuevoEmpleado.rol,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al registrar el empleado",
      error: error.message,
    });
  }
};

const actualizarPerfil = async (req, res) => {
  try {
    const userId = req.usuario.id;
    const { nombre, telefono, direccion, especialidad } = req.body;

    const usuario = await Usuario.findById(userId);
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    Object.assign(usuario, {
      ...(nombre && { nombre }),
      ...(telefono !== undefined && { telefono }),
      ...(direccion !== undefined && { direccion }),
      ...(especialidad !== undefined && { especialidad }),
    });

    await usuario.save();

    return res.status(200).json({
      message: "Perfil actualizado correctamente",
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        telefono: usuario.telefono,
        direccion: usuario.direccion,
        especialidad: usuario.especialidad,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al actualizar el perfil",
      error: error.message,
    });
  }
};

const cambiarContrasena = async (req, res) => {
  try {
    const userId = req.usuario.id;
    const { contrasena_actual, contrasena_nueva } = req.body;

    if (!contrasena_nueva) {
      return res.status(400).json({
        message: "Debes proporcionar la nueva contrasena.",
      });
    }

    const changePwdError = validateStrongPassword(contrasena_nueva);
    if (changePwdError) {
      return res.status(400).json({ message: changePwdError });
    }

    const usuario = await Usuario.findById(userId);
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (!usuario.debe_cambiar_contrasena) {
      if (!contrasena_actual) {
        return res.status(400).json({
          message: "Debes proporcionar la contrasena actual.",
        });
      }
      const contrasenaValida = await bcrypt.compare(
        contrasena_actual,
        usuario.contrasena
      );
      if (!contrasenaValida) {
        return res.status(401).json({
          message: "La contrasena actual no es correcta.",
        });
      }
    }

    usuario.contrasena = await bcrypt.hash(contrasena_nueva, 10);
    usuario.debe_cambiar_contrasena = false;
    await usuario.save();

    return res.status(200).json({
      message: "Contrasena actualizada correctamente.",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al cambiar la contrasena",
      error: error.message,
    });
  }
};

const resetPasswordByCapataz = async (req, res) => {
  try {
    const { id } = req.params;
    const { contrasena_nueva } = req.body;

    const pwdError = validateStrongPassword(contrasena_nueva);
    if (pwdError) {
      return res.status(400).json({ message: pwdError });
    }

    const usuario = await Usuario.findById(id);
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    usuario.contrasena = await bcrypt.hash(contrasena_nueva, 10);
    usuario.debe_cambiar_contrasena = true;
    await usuario.save();

    return res.status(200).json({
      message: "Contrasena restablecida correctamente.",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al restablecer la contrasena",
      error: error.message,
    });
  }
};

module.exports = {
  registro,
  login,
  listarUsuarios,
  actualizarUsuario,
  eliminarUsuario,
  registroEmpleado,
  actualizarPerfil,
  cambiarContrasena,
  resetPasswordByCapataz,
};
