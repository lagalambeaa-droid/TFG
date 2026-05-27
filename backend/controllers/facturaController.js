const Factura = require("../models/Factura");
const Proyecto = require("../models/Proyecto");

const listarFacturas = async (req, res) => {
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

    const facturas = await Factura.find({
      proyecto: { $in: proyectoIds },
    })
      .populate({
        path: "proyecto",
        populate: [
          { path: "cliente", select: "nombre email" },
          { path: "capataz", select: "nombre email" },
        ],
      })
      .populate("presupuesto_origen")
      .sort({ fecha_emision: -1, _id: -1 });

    return res.status(200).json(facturas);
  } catch (error) {
    return res.status(500).json({
      message: "Error al listar las facturas",
      error: error.message,
    });
  }
};

const bloquearEdicionOBorrado = (req, res) => {
  return res.status(403).json({
    message:
      "Por normativa legal, las facturas generadas no pueden editarse ni borrarse",
  });
};

module.exports = {
  listarFacturas,
  bloquearEdicionOBorrado,
};
