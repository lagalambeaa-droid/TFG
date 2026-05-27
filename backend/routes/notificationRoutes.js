const express = require("express");
const Usuario = require("../models/Usuario");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/register-token", authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token es obligatorio" });
    }

    await Usuario.findByIdAndUpdate(req.usuario.id, {
      expoPushToken: token,
    });

    return res.status(200).json({ message: "Token registrado correctamente" });
  } catch (error) {
    return res.status(500).json({
      message: "Error al registrar el token",
      error: error.message,
    });
  }
});

module.exports = router;
