const mongoose = require("mongoose");

const proyectoSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
    },
    descripcion: {
      type: String,
      trim: true,
    },
    fecha_inicio: {
      type: Date,
      required: true,
    },
    fecha_fin_estimada: {
      type: Date,
    },
    estado: {
      type: String,
      required: true,
      trim: true,
    },
    cliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    },
    capataz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model("Proyecto", proyectoSchema);
