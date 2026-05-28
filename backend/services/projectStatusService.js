const Proyecto = require("../models/Proyecto");
const Tarea = require("../models/Tarea");

const FINAL_STATE = "Finalizada";
const ACTIVE_STATE = "En ejecucion";

const getProjectTaskProgress = async (projectId) => {
  const [totalTasks, completedTasks] = await Promise.all([
    Tarea.countDocuments({ proyecto: projectId }),
    Tarea.countDocuments({ proyecto: projectId, estado: "Completada" }),
  ]);

  return {
    totalTasks,
    completedTasks,
    progress:
      totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
  };
};

const syncProjectStatusByTasks = async (projectId) => {
  const proyecto = await Proyecto.findById(projectId);

  if (!proyecto) {
    return null;
  }

  const progress = await getProjectTaskProgress(projectId);
  const shouldBeFinished =
    progress.totalTasks > 0 && progress.completedTasks === progress.totalTasks;

  if (shouldBeFinished && proyecto.estado !== FINAL_STATE) {
    proyecto.estado = FINAL_STATE;
    await proyecto.save();
  }

  if (!shouldBeFinished && proyecto.estado === FINAL_STATE) {
    proyecto.estado = ACTIVE_STATE;
    await proyecto.save();
  }

  return {
    proyecto,
    ...progress,
  };
};

module.exports = {
  FINAL_STATE,
  getProjectTaskProgress,
  syncProjectStatusByTasks,
};
