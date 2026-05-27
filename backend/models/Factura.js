const mongoose = require("mongoose");

const facturaSchema = new mongoose.Schema(
  {
    proyecto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Proyecto",
      required: true,
    },
    presupuesto_origen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Presupuesto",
      required: true,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    fecha_emision: {
      type: Date,
      default: Date.now,
    },
    concepto: {
      type: String,
      trim: true,
      default: "Factura emitida",
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model("Factura", facturaSchema);
