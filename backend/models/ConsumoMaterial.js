const mongoose = require("mongoose");

const consumoMaterialSchema = new mongoose.Schema(
  {
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      required: true,
    },
    tarea: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tarea",
    },
    cantidad: {
      type: Number,
      required: true,
      min: 1,
    },
    clientRequestId: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model("ConsumoMaterial", consumoMaterialSchema);
