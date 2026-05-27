const express = require("express");
const {
  listarTareas,
  crearTarea,
  actualizarEstadoTarea,
} = require("../controllers/tareaController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");
const upload = require("../middlewares/uploadMiddleware");

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  roleMiddleware(["capataz", "empleado"]),
  listarTareas
);
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["capataz"]),
  crearTarea
);
router.put(
  "/:id/estado",
  authMiddleware,
  roleMiddleware(["capataz", "empleado"]),
  upload.single("foto_avance"),
  actualizarEstadoTarea
);

module.exports = router;
