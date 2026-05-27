const express = require("express");
const {
  registro,
  login,
  listarUsuarios,
  actualizarUsuario,
  eliminarUsuario,
  registroEmpleado,
  actualizarPerfil,
  cambiarContrasena,
  resetPasswordByCapataz,
} = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const router = express.Router();

router.post("/registro", registro);
router.post("/login", login);
router.get(
  "/usuarios",
  authMiddleware,
  roleMiddleware(["capataz"]),
  listarUsuarios
);
router.get(
  "/perfil",
  authMiddleware,
  roleMiddleware(["capataz", "empleado", "cliente"]),
  (req, res) => {
    res.status(200).json({
      message: "Token valido",
      usuario: req.usuario,
    });
  }
);

router.put(
  "/usuarios/:id",
  authMiddleware,
  roleMiddleware(["capataz"]),
  actualizarUsuario
);
router.delete(
  "/usuarios/:id",
  authMiddleware,
  roleMiddleware(["capataz"]),
  eliminarUsuario
);

router.post(
  "/registro-empleado",
  authMiddleware,
  roleMiddleware(["capataz"]),
  registroEmpleado
);

router.put(
  "/profile",
  authMiddleware,
  roleMiddleware(["capataz", "empleado", "cliente"]),
  actualizarPerfil
);

router.put(
  "/change-password",
  authMiddleware,
  roleMiddleware(["capataz", "empleado", "cliente"]),
  cambiarContrasena
);

router.put(
  "/reset-password/:id",
  authMiddleware,
  roleMiddleware(["capataz"]),
  resetPasswordByCapataz
);

module.exports = router;
