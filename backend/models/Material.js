const mongoose = require("mongoose");

const materialSchema = new mongoose.Schema(
  {
    concepto: {
      type: String,
      required: true,
      trim: true,
    },
    cantidad: {
      type: Number,
      required: true,
      min: 0,
    },
    precio_unitario: {
      type: Number,
      required: true,
      min: 0,
    },
    processedRequestIds: {
      type: [String],
      default: [],
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model("Material", materialSchema);
