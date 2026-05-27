const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./routes/authRoutes");
const tareaRoutes = require("./routes/tareaRoutes");
const materialRoutes = require("./routes/materialRoutes");
const presupuestoRoutes = require("./routes/presupuestoRoutes");
const facturaRoutes = require("./routes/facturaRoutes");
const proyectoRoutes = require("./routes/proyectoRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/tfg";
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, "uploads");

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadDir));

app.use("/api/auth", authRoutes);
app.use("/api/tareas", tareaRoutes);
app.use("/api/materiales", materialRoutes);
app.use("/api/presupuestos", presupuestoRoutes);
app.use("/api/facturas", facturaRoutes);
app.use("/api/proyectos", proyectoRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => {
  res.json({ message: "API backend operativa" });
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Conexion a MongoDB establecida");
    app.listen(PORT, HOST, () => {
      console.log(`Servidor escuchando en http://${HOST}:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Error al conectar con MongoDB:", error.message);
    process.exit(1);
  });
