const path = require("path");
const Tarea = require("../models/Tarea");
const Proyecto = require("../models/Proyecto");
const Usuario = require("../models/Usuario");
const {
  hasCloudinaryConfig,
  uploadTaskImage,
} = require("../services/cloudinaryService");
const { notifyUser } = require("../services/notificationService");

const listarTareas = async (req, res) => {
  try {
    const filtro = {};

    if (req.usuario.rol === "empleado") {
      filtro.empleado = req.usuario.id;
    }

    if (req.usuario.rol === "capataz") {
      const proyectos = await Proyecto.find({ capataz: req.usuario.id }).select("_id");
      filtro.proyecto = { $in: proyectos.map((proyecto) => proyecto._id) };
    }

    const tareas = await Tarea.find(filtro)
      .populate("proyecto", "nombre estado")
      .populate("empleado", "nombre email")
      .sort({ _id: -1 });

    return res.status(200).json(tareas);
  } catch (error) {
    return res.status(500).json({
      message: "Error al listar las tareas",
      error: error.message,
    });
  }
};

const crearTarea = async (req, res) => {
  try {
    const { proyecto: proyectoId, empleado: empleadoId } = req.body;

    const proyecto = await Proyecto.findById(proyectoId);

    if (!proyecto) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }

    if (String(proyecto.capataz) !== req.usuario.id) {
      return res.status(403).json({ message: "No puedes crear tareas en este proyecto" });
    }

    const empleado = await Usuario.findOne({ _id: empleadoId, rol: "empleado" });

    if (!empleado) {
      return res.status(400).json({ message: "Empleado no valido" });
    }

    const tarea = await Tarea.create({
      proyecto: proyectoId,
      empleado: empleadoId,
      nombre: req.body.nombre,
      descripcion: req.body.descripcion,
      estado: req.body.estado || "Pendiente",
    });

    const populated = await Tarea.findById(tarea._id)
      .populate("proyecto", "nombre estado")
      .populate("empleado", "nombre email");

    notifyUser(
      empleadoId,
      "Nueva tarea asignada",
      `Se te ha asignado la tarea "${req.body.nombre}"`,
      { type: "nueva_tarea", tareaId: tarea._id.toString() }
    ).catch(() => {});

    return res.status(201).json({
      message: "Tarea creada correctamente",
      tarea: populated,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al crear la tarea",
      error: error.message,
    });
  }
};

const actualizarEstadoTarea = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const tarea = await Tarea.findById(id).populate("proyecto");

    if (!tarea) {
      return res.status(404).json({ message: "Tarea no encontrada" });
    }

    const isEmpleadoOwner = String(tarea.empleado) === req.usuario.id;
    const isCapatazOwner =
      req.usuario.rol === "capataz" &&
      tarea.proyecto &&
      String(tarea.proyecto.capataz) === req.usuario.id;

    if (!isEmpleadoOwner && !isCapatazOwner) {
      return res.status(403).json({ message: "No puedes actualizar esta tarea" });
    }

    if (estado === "Completada" && !req.file && !tarea.foto_avance) {
      return res.status(400).json({
        message:
          "Es obligatorio adjuntar una foto de avance para completar la tarea",
      });
    }

    const estadoAnterior = tarea.estado;
    tarea.estado = estado || tarea.estado;

    if (req.file) {
      if (hasCloudinaryConfig()) {
        tarea.foto_avance = await uploadTaskImage(req.file.path);
      } else {
        tarea.foto_avance = `/uploads/${path.basename(req.file.path)}`;
      }
    }

    await tarea.save();

    const updated = await Tarea.findById(tarea._id)
      .populate("proyecto", "nombre estado")
      .populate("empleado", "nombre email");

    const fullProject = await Proyecto.findById(tarea.proyecto._id || tarea.proyecto);
    if (fullProject) {
      if (estado === "En Progreso" && isEmpleadoOwner) {
        notifyUser(
          fullProject.capataz,
          "Tarea aceptada",
          `${updated.empleado?.nombre || "Un empleado"} ha comenzado "${tarea.nombre}"`,
          { type: "tarea_aceptada", tareaId: tarea._id.toString() }
        ).catch(() => {});
      }

      if (estado === "Completada") {
        if (isEmpleadoOwner) {
          notifyUser(
            fullProject.capataz,
            "Tarea completada",
            `${updated.empleado?.nombre || "Un empleado"} ha completado "${tarea.nombre}"`,
            { type: "tarea_completada", tareaId: tarea._id.toString() }
          ).catch(() => {});
        }

        if (fullProject.cliente) {
          notifyUser(
            fullProject.cliente,
            "Avance en tu obra",
            `Se ha completado la tarea "${tarea.nombre}"`,
            { type: "avance_obra", proyectoId: fullProject._id.toString() }
          ).catch(() => {});
        }
      }
    }

    if (estado && estado !== estadoAnterior && isCapatazOwner && !isEmpleadoOwner) {
      notifyUser(
        tarea.empleado._id || tarea.empleado,
        "Tarea modificada",
        `El capataz ha cambiado el estado de "${tarea.nombre}" a "${estado}"`,
        { type: "tarea_modificada", tareaId: tarea._id.toString() }
      ).catch(() => {});
    }

    return res.status(200).json({
      message: "Estado de la tarea actualizado correctamente",
      tarea: updated,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al actualizar la tarea",
      error: error.message,
    });
  }
};

module.exports = {
  listarTareas,
  crearTarea,
  actualizarEstadoTarea,
};
