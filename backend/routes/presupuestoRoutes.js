const express = require("express");
const {
  listarPresupuestos,
  crearPresupuesto,
  aprobarPresupuesto,
  rechazarPresupuesto,
} = require("../controllers/presupuestoController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  roleMiddleware(["cliente", "capataz"]),
  listarPresupuestos
);
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["capataz"]),
  crearPresupuesto
);
router.put(
  "/:id/aprobacion",
  authMiddleware,
  roleMiddleware(["cliente"]),
  aprobarPresupuesto
);
router.put(
  "/:id/rechazo",
  authMiddleware,
  roleMiddleware(["cliente"]),
  rechazarPresupuesto
);

module.exports = router;
