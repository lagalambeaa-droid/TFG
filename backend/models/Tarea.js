const mongoose = require("mongoose");

const tareaSchema = new mongoose.Schema(
  {
    proyecto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Proyecto",
      required: true,
    },
    nombre: {
      type: String,
      required: true,
      trim: true,
    },
    descripcion: {
      type: String,
      trim: true,
    },
    estado: {
      type: String,
      required: true,
      enum: ["Pendiente", "En Progreso", "Bloqueada", "Completada"],
      default: "Pendiente",
    },
    empleado: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    },
    foto_avance: {
      type: String,
      trim: true,
    },
    materialesAsignados: [
      {
        material: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Material",
          required: true,
        },
        cantidadAsignada: {
          type: Number,
          required: true,
          min: 0,
          default: 0,
        },
        cantidadConsumida: {
          type: Number,
          required: true,
          min: 0,
          default: 0,
        },
      },
    ],
    materialesReintegrados: {
      type: Boolean,
      default: false,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model("Tarea", tareaSchema);
