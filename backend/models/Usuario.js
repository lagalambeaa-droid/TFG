const mongoose = require("mongoose");

const usuarioSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    contrasena: {
      type: String,
      required: true,
    },
    rol: {
      type: String,
      required: true,
      enum: ["capataz", "empleado", "cliente"],
    },
    especialidad: {
      type: String,
      trim: true,
    },
    anos_experiencia: {
      type: Number,
      min: 0,
      default: 0,
    },
    telefono: {
      type: String,
      trim: true,
    },
    direccion: {
      type: String,
      trim: true,
    },
    debe_cambiar_contrasena: {
      type: Boolean,
      default: false,
    },
    expoPushToken: {
      type: String,
      default: null,
    },
    fecha_creacion: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model("Usuario", usuarioSchema);
