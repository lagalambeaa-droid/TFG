const mongoose = require("mongoose");

const presupuestoSchema = new mongoose.Schema(
  {
    proyecto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Proyecto",
      required: true,
    },
    estado: {
      type: String,
      required: true,
      enum: ["Pendiente", "Aprobado", "Rechazado"],
      default: "Pendiente",
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    descripcion: {
      type: String,
      trim: true,
      default: "",
    },
    partidas: [
      {
        concepto: {
          type: String,
          required: true,
          trim: true,
        },
        cantidad: {
          type: Number,
          required: true,
          min: 1,
        },
        precio_unitario: {
          type: Number,
          required: true,
          min: 0,
        },
        subtotal: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    fecha_creacion: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model("Presupuesto", presupuestoSchema);
