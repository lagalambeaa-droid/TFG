const roleMiddleware = (rolesPermitidos = []) => {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ message: "Acceso denegado" });
    }

    return next();
  };
};

module.exports = roleMiddleware;
