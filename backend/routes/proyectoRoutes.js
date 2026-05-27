const express = require("express");
const {
  listarProyectos,
  crearProyecto,
  actualizarProyecto,
  calcularAvanceObra,
  obtenerMiProyecto,
} = require("../controllers/proyectoController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  roleMiddleware(["capataz", "cliente"]),
  listarProyectos
);
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["capataz"]),
  crearProyecto
);
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["capataz"]),
  actualizarProyecto
);
router.get(
  "/mio",
  authMiddleware,
  roleMiddleware(["cliente"]),
  obtenerMiProyecto
);
router.get(
  "/:id/avance",
  authMiddleware,
  roleMiddleware(["capataz", "empleado", "cliente"]),
  calcularAvanceObra
);

module.exports = router;
