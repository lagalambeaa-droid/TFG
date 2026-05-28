const Proyecto = require("../models/Proyecto");
const Tarea = require("../models/Tarea");
const Usuario = require("../models/Usuario");
const {
  getProjectTaskProgress,
  syncProjectStatusByTasks,
} = require("../services/projectStatusService");

const validarRangoFechas = (data = {}) => {
  const { fecha_inicio, fecha_fin_estimada } = data;

  if (!fecha_inicio || !fecha_fin_estimada) {
    return null;
  }

  const inicio = new Date(fecha_inicio);
  const fin = new Date(fecha_fin_estimada);

  if (inicio > fin) {
    return "La fecha de inicio no puede ser posterior a la de fin";
  }

  return null;
};

const listarProyectos = async (req, res) => {
  try {
    const filtro = {};

    if (req.usuario.rol === "capataz") {
      filtro.capataz = req.usuario.id;
    }

    if (req.usuario.rol === "cliente") {
      filtro.cliente = req.usuario.id;
    }

    const proyectos = await Proyecto.find(filtro)
      .populate("cliente capataz", "nombre email rol telefono")
      .sort({ fecha_inicio: -1 });

    const enrichedProjects = await Promise.all(
      proyectos.map(async (proyecto) => {
        await syncProjectStatusByTasks(proyecto._id);
        const syncedProject = await Proyecto.findById(proyecto._id)
          .populate("cliente capataz", "nombre email rol telefono");
        const tareas = await Tarea.find({ proyecto: proyecto._id })
          .populate("empleado", "nombre email")
          .sort({ _id: -1 });

        const { totalTasks, completedTasks, progress } =
          await getProjectTaskProgress(proyecto._id);

        return {
          ...syncedProject.toObject(),
          tareas,
          total_tareas: totalTasks,
          tareas_completadas: completedTasks,
          porcentaje_avance: progress,
        };
      })
    );

    return res.status(200).json(enrichedProjects);
  } catch (error) {
    return res.status(500).json({
      message: "Error al listar los proyectos",
      error: error.message,
    });
  }
};

const crearProyecto = async (req, res) => {
  try {
    const errorFechas = validarRangoFechas(req.body);

    if (errorFechas) {
      return res.status(400).json({ message: errorFechas });
    }

    const cliente = await Usuario.findOne({
      _id: req.body.cliente,
      rol: "cliente",
    });

    if (!cliente) {
      return res.status(400).json({ message: "Cliente no valido" });
    }

    const proyecto = new Proyecto({
      ...req.body,
      capataz: req.usuario.id,
    });
    await proyecto.save();

    const populated = await Proyecto.findById(proyecto._id).populate(
      "cliente capataz",
      "nombre email rol telefono"
    );

    return res.status(201).json({
      message: "Proyecto creado correctamente",
      proyecto: populated,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al crear el proyecto",
      error: error.message,
    });
  }
};

const actualizarProyecto = async (req, res) => {
  try {
    const { id } = req.params;
    const proyecto = await Proyecto.findById(id);

    if (!proyecto) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }

    if (String(proyecto.capataz) !== req.usuario.id) {
      return res.status(403).json({ message: "No puedes editar este proyecto" });
    }

    const mergedData = {
      fecha_inicio: req.body.fecha_inicio || proyecto.fecha_inicio,
      fecha_fin_estimada:
        req.body.fecha_fin_estimada || proyecto.fecha_fin_estimada,
    };
    const errorFechas = validarRangoFechas(mergedData);

    if (errorFechas) {
      return res.status(400).json({ message: errorFechas });
    }

    if (req.body.cliente) {
      const cliente = await Usuario.findOne({
        _id: req.body.cliente,
        rol: "cliente",
      });

      if (!cliente) {
        return res.status(400).json({ message: "Cliente no valido" });
      }
    }

    Object.assign(proyecto, req.body);
    proyecto.capataz = req.usuario.id;
    await proyecto.save();

    const populated = await Proyecto.findById(proyecto._id).populate(
      "cliente capataz",
      "nombre email rol telefono"
    );

    return res.status(200).json({
      message: "Proyecto actualizado correctamente",
      proyecto: populated,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al actualizar el proyecto",
      error: error.message,
    });
  }
};

const calcularAvanceObra = async (req, res) => {
  try {
    const { id } = req.params;
    const proyecto = await Proyecto.findById(id);

    if (!proyecto) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }

    const { proyecto: syncedProject, totalTasks, completedTasks, progress } =
      await syncProjectStatusByTasks(id);

    return res.status(200).json({
      proyecto: syncedProject._id,
      estado: syncedProject.estado,
      total_tareas: totalTasks,
      tareas_completadas: completedTasks,
      porcentaje_avance: progress,
      avance: `${progress}%`,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al calcular el avance de la obra",
      error: error.message,
    });
  }
};

const obtenerMiProyecto = async (req, res) => {
  try {
    const proyecto = await Proyecto.findOne({ cliente: req.usuario.id })
      .populate("cliente capataz", "nombre email rol telefono");

    if (!proyecto) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }

    await syncProjectStatusByTasks(proyecto._id);
    const syncedProject = await Proyecto.findById(proyecto._id)
      .populate("cliente capataz", "nombre email rol telefono");

    const ultimasTareasCompletadas = await Tarea.find({
      proyecto: proyecto._id,
      estado: "Completada",
    })
      .populate("empleado", "nombre")
      .sort({ _id: -1 })
      .limit(5)
      .select("nombre estado foto_avance empleado");

    return res.status(200).json({
      proyecto: syncedProject,
      ultimas_tareas_completadas: ultimasTareasCompletadas,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al obtener el proyecto del cliente",
      error: error.message,
    });
  }
};

module.exports = {
  listarProyectos,
  crearProyecto,
  actualizarProyecto,
  calcularAvanceObra,
  obtenerMiProyecto,
  validarRangoFechas,
};
