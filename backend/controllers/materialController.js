const Material = require("../models/Material");
const ConsumoMaterial = require("../models/ConsumoMaterial");
const { notifyUsersByRole } = require("../services/notificationService");

const CRITICAL_STOCK_THRESHOLD = 20;

const enrichMaterial = (material) => {
  const plain = material.toObject ? material.toObject() : material;
  const { processedRequestIds, ...safeMaterial } = plain;

  return {
    ...safeMaterial,
    stock_critico: safeMaterial.cantidad <= CRITICAL_STOCK_THRESHOLD,
    umbral_critico: CRITICAL_STOCK_THRESHOLD,
  };
};

const listarMateriales = async (req, res) => {
  try {
    const materiales = await Material.find().sort({ concepto: 1 });

    return res.status(200).json(materiales.map(enrichMaterial));
  } catch (error) {
    return res.status(500).json({
      message: "Error al listar los materiales",
      error: error.message,
    });
  }
};

const crearMaterial = async (req, res) => {
  try {
    const { concepto, cantidad, precio_unitario } = req.body;

    if (!concepto || Number(cantidad) < 0 || Number(precio_unitario) < 0) {
      return res.status(400).json({
        message: "Concepto, cantidad y precio unitario son obligatorios",
      });
    }

    const existingMaterial = await Material.findOne({
      concepto: concepto.trim(),
    });

    if (existingMaterial) {
      return res.status(409).json({
        message: "Ya existe un material con ese concepto",
      });
    }

    const material = await Material.create({
      concepto: concepto.trim(),
      cantidad: Number(cantidad),
      precio_unitario: Number(precio_unitario),
    });

    return res.status(201).json({
      message: "Material creado correctamente",
      material: enrichMaterial(material),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al crear el material",
      error: error.message,
    });
  }
};

const reponerStockMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad } = req.body;
    const amount = Number(cantidad);

    const material = await Material.findById(id);

    if (!material) {
      return res.status(404).json({ message: "Material no encontrado" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        message: "La cantidad a reponer debe ser mayor que cero",
      });
    }

    material.cantidad += amount;
    await material.save();

    return res.status(200).json({
      message: "Stock repuesto correctamente",
      material: enrichMaterial(material),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al reponer el stock del material",
      error: error.message,
    });
  }
};

const registrarConsumoMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad, tarea, clientRequestId } = req.body;
    const amount = Number(cantidad);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res
        .status(400)
        .json({ message: "La cantidad a consumir debe ser mayor que cero" });
    }

    if (!clientRequestId || !String(clientRequestId).trim()) {
      return res.status(400).json({
        message: "El identificador de la solicitud es obligatorio",
      });
    }

    const normalizedRequestId = String(clientRequestId).trim();
    const existingConsumption = await ConsumoMaterial.findOne({
      clientRequestId: normalizedRequestId,
    });

    if (existingConsumption) {
      const material = await Material.findById(id);

      if (!material) {
        return res.status(404).json({ message: "Material no encontrado" });
      }

      return res.status(200).json({
        message: "Consumo ya procesado anteriormente",
        material: enrichMaterial(material),
      });
    }

    const material = await Material.findOneAndUpdate(
      {
        _id: id,
        cantidad: { $gte: amount },
        processedRequestIds: { $ne: normalizedRequestId },
      },
      {
        $inc: { cantidad: -amount },
        $push: { processedRequestIds: normalizedRequestId },
      },
      { new: true }
    );

    if (!material) {
      const duplicateMaterial = await Material.findOne({
        _id: id,
        processedRequestIds: normalizedRequestId,
      });

      if (duplicateMaterial) {
        const duplicateConsumption = await ConsumoMaterial.findOne({
          clientRequestId: normalizedRequestId,
        });

        if (!duplicateConsumption) {
          await ConsumoMaterial.create({
            material: id,
            tarea: tarea || undefined,
            cantidad: amount,
            clientRequestId: normalizedRequestId,
            usuario: req.usuario.id,
          });
        }

        return res.status(200).json({
          message: "Consumo ya procesado anteriormente",
          material: enrichMaterial(duplicateMaterial),
        });
      }

      const materialExists = await Material.exists({ _id: id });

      if (!materialExists) {
        return res.status(404).json({ message: "Material no encontrado" });
      }

      return res.status(400).json({
        message: "No se puede consumir mas del stock",
      });
    }

    await ConsumoMaterial.create({
      material: id,
      tarea: tarea || undefined,
      cantidad: amount,
      clientRequestId: normalizedRequestId,
      usuario: req.usuario.id,
    });

    if (material.cantidad <= CRITICAL_STOCK_THRESHOLD) {
      notifyUsersByRole(
        "capataz",
        "Stock critico",
        `El material "${material.concepto}" tiene solo ${material.cantidad} unidades`,
        { type: "stock_critico", materialId: material._id.toString() }
      ).catch(() => {});
    }

    return res.status(200).json({
      message: "Consumo registrado correctamente",
      material: enrichMaterial(material),
    });
  } catch (error) {
    if (error?.code === 11000) {
      const material = await Material.findById(req.params.id);

      if (material) {
        return res.status(200).json({
          message: "Consumo ya procesado anteriormente",
          material: enrichMaterial(material),
        });
      }
    }

    return res.status(500).json({
      message: "Error al registrar el consumo del material",
      error: error.message,
    });
  }
};

const listarConsumos = async (req, res) => {
  try {
    const filtro = {};
    if (req.query.material) filtro.material = req.query.material;
    if (req.query.tarea) filtro.tarea = req.query.tarea;

    const consumos = await ConsumoMaterial.find(filtro)
      .populate("material", "concepto")
      .populate("tarea", "nombre")
      .populate("usuario", "nombre")
      .sort({ fecha: -1 });

    return res.status(200).json(consumos);
  } catch (error) {
    return res.status(500).json({
      message: "Error al listar los consumos",
      error: error.message,
    });
  }
};

module.exports = {
  listarMateriales,
  crearMaterial,
  reponerStockMaterial,
  registrarConsumoMaterial,
  listarConsumos,
};
