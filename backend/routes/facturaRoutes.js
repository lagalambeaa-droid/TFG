const express = require("express");
const {
  listarFacturas,
  bloquearEdicionOBorrado,
} = require("../controllers/facturaController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  roleMiddleware(["capataz", "cliente"]),
  listarFacturas
);
router.put("/:id", authMiddleware, bloquearEdicionOBorrado);
router.delete("/:id", authMiddleware, bloquearEdicionOBorrado);

module.exports = router;
