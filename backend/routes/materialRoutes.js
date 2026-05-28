const express = require("express");
const {
  listarMateriales,
  crearMaterial,
  reponerStockMaterial,
  asignarMaterialATarea,
  registrarConsumoMaterial,
  listarConsumos,
} = require("../controllers/materialController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  roleMiddleware(["capataz", "empleado"]),
  listarMateriales
);
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["capataz"]),
  crearMaterial
);
router.get(
  "/consumos",
  authMiddleware,
  roleMiddleware(["capataz", "empleado"]),
  listarConsumos
);
router.post(
  "/:id/reposicion",
  authMiddleware,
  roleMiddleware(["capataz"]),
  reponerStockMaterial
);
router.post(
  "/:id/asignacion",
  authMiddleware,
  roleMiddleware(["capataz"]),
  asignarMaterialATarea
);
router.post(
  "/:id/consumo",
  authMiddleware,
  roleMiddleware(["capataz", "empleado"]),
  registrarConsumoMaterial
);

module.exports = router;
