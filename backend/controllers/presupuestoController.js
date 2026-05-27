const Presupuesto = require("../models/Presupuesto");
const Factura = require("../models/Factura");
const Proyecto = require("../models/Proyecto");
const { notifyUser } = require("../services/notificationService");

const buildBudgetPayload = (body) => {
  const partidas = Array.isArray(body.partidas) ? body.partidas : [];
  const normalizedPartidas = partidas
    .filter((partida) => partida?.concepto)
    .map((partida) => {
      const cantidad = Number(partida.cantidad || 0);
      const precioUnitario = Number(partida.precio_unitario || 0);

      return {
        concepto: partida.concepto.trim(),
        cantidad,
        precio_unitario: precioUnitario,
        subtotal: Number((cantidad * precioUnitario).toFixed(2)),
      };
    });

  const total =
    normalizedPartidas.length > 0
      ? Number(
          normalizedPartidas
            .reduce((acc, partida) => acc + partida.subtotal, 0)
            .toFixed(2)
        )
      : Number(body.total || 0);

  return {
    proyecto: body.proyecto,
    descripcion: body.descripcion || "",
    partidas: normalizedPartidas,
    total,
    estado: body.estado || "Pendiente",
  };
};

const listarPresupuestos = async (req, res) => {
  try {
    const filtroProyecto = {};

    if (req.usuario.rol === "cliente") {
      filtroProyecto.cliente = req.usuario.id;
    }

    if (req.usuario.rol === "capataz") {
      filtroProyecto.capataz = req.usuario.id;
    }

    const proyectos = await Proyecto.find(filtroProyecto).select("_id");
    const proyectoIds = proyectos.map((proyecto) => proyecto._id);

    const presupuestos = await Presupuesto.find({
      proyecto: { $in: proyectoIds },
    })
      .populate({
        path: "proyecto",
        populate: [
          { path: "cliente", select: "nombre email" },
          { path: "capataz", select: "nombre email" },
        ],
      })
      .sort({ fecha_creacion: -1, _id: -1 });

    return res.status(200).json(presupuestos);
  } catch (error) {
    return res.status(500).json({
      message: "Error al listar los presupuestos",
      error: error.message,
    });
  }
};

const crearPresupuesto = async (req, res) => {
  try {
    const proyecto = await Proyecto.findById(req.body.proyecto);

    if (!proyecto) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }

    if (String(proyecto.capataz) !== req.usuario.id) {
      return res.status(403).json({ message: "No puedes crear presupuestos para este proyecto" });
    }

    const payload = buildBudgetPayload(req.body);

    if (payload.total <= 0) {
      return res.status(400).json({ message: "El total del presupuesto debe ser mayor que cero" });
    }

    const presupuesto = await Presupuesto.create(payload);

    const populated = await Presupuesto.findById(presupuesto._id).populate({
      path: "proyecto",
      populate: [
        { path: "cliente", select: "nombre email" },
        { path: "capataz", select: "nombre email" },
      ],
    });

    if (proyecto.cliente) {
      notifyUser(
        proyecto.cliente,
        "Nuevo presupuesto",
        `Se ha creado un presupuesto para "${proyecto.nombre}" por ${payload.total.toFixed(2)} EUR`,
        { type: "nuevo_presupuesto", presupuestoId: presupuesto._id.toString() }
      ).catch(() => {});
    }

    return res.status(201).json({
      message: "Presupuesto creado correctamente",
      presupuesto: populated,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al crear el presupuesto",
      error: error.message,
    });
  }
};

const aprobarPresupuesto = async (req, res) => {
  try {
    const { id } = req.params;

    const presupuesto = await Presupuesto.findById(id).populate("proyecto");

    if (!presupuesto) {
      return res.status(404).json({ message: "Presupuesto no encontrado" });
    }

    if (String(presupuesto.proyecto.cliente) !== req.usuario.id) {
      return res.status(403).json({ message: "No puedes aprobar este presupuesto" });
    }

    const estadoAnterior = presupuesto.estado;
    presupuesto.estado = "Aprobado";
    await presupuesto.save();

    let facturaCreada = await Factura.findOne({
      presupuesto_origen: presupuesto._id,
    });

    if (estadoAnterior !== "Aprobado" && !facturaCreada) {
      facturaCreada = await Factura.create({
        proyecto: presupuesto.proyecto._id,
        presupuesto_origen: presupuesto._id,
        total: presupuesto.total,
        concepto: `Factura ${presupuesto.proyecto.nombre}`,
      });
    }

    if (presupuesto.proyecto.capataz) {
      notifyUser(
        presupuesto.proyecto.capataz,
        "Presupuesto aprobado",
        `El cliente ha aprobado el presupuesto de "${presupuesto.proyecto.nombre}"`,
        { type: "presupuesto_aprobado", presupuestoId: presupuesto._id.toString() }
      ).catch(() => {});
    }

    if (facturaCreada && presupuesto.proyecto.cliente) {
      notifyUser(
        presupuesto.proyecto.cliente,
        "Nueva factura",
        `Se ha generado una factura por ${presupuesto.total.toFixed(2)} EUR`,
        { type: "nueva_factura", facturaId: facturaCreada._id.toString() }
      ).catch(() => {});
    }

    return res.status(200).json({
      message: "Estado del presupuesto actualizado correctamente",
      presupuesto,
      factura: facturaCreada,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al actualizar el presupuesto",
      error: error.message,
    });
  }
};

const rechazarPresupuesto = async (req, res) => {
  try {
    const { id } = req.params;

    const presupuesto = await Presupuesto.findById(id).populate("proyecto");

    if (!presupuesto) {
      return res.status(404).json({ message: "Presupuesto no encontrado" });
    }

    if (String(presupuesto.proyecto.cliente) !== req.usuario.id) {
      return res.status(403).json({ message: "No puedes rechazar este presupuesto" });
    }

    presupuesto.estado = "Rechazado";
    await presupuesto.save();

    if (presupuesto.proyecto.capataz) {
      notifyUser(
        presupuesto.proyecto.capataz,
        "Presupuesto rechazado",
        `El cliente ha rechazado el presupuesto de "${presupuesto.proyecto.nombre}"`,
        { type: "presupuesto_rechazado", presupuestoId: presupuesto._id.toString() }
      ).catch(() => {});
    }

    return res.status(200).json({
      message: "Presupuesto rechazado correctamente",
      presupuesto,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al rechazar el presupuesto",
      error: error.message,
    });
  }
};

module.exports = {
  listarPresupuestos,
  crearPresupuesto,
  aprobarPresupuesto,
  rechazarPresupuesto,
};
