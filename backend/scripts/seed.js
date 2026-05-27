const path = require("path");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const Usuario = require("../models/Usuario");
const Proyecto = require("../models/Proyecto");
const Tarea = require("../models/Tarea");
const Material = require("../models/Material");
const Presupuesto = require("../models/Presupuesto");
const Factura = require("../models/Factura");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/tfg";

const DEMO_PASSWORD = "Demo1234";
const DEMO_HASH_ROUNDS = 10;

const demoUsers = [
  {
    nombre: "Cliente Demo",
    email: "cliente@constructplus.local",
    rol: "cliente",
    telefono: "600000001",
    direccion: "Madrid",
  },
  {
    nombre: "Capataz Demo",
    email: "capataz@constructplus.local",
    rol: "capataz",
    especialidad: "Estructuras",
    anos_experiencia: 8,
    telefono: "600000002",
    direccion: "Madrid",
  },
  {
    nombre: "Empleado Demo",
    email: "empleado@constructplus.local",
    rol: "empleado",
    especialidad: "Albanileria",
    anos_experiencia: 4,
    telefono: "600000003",
    direccion: "Madrid",
  },
];

const demoMaterials = [
  {
    concepto: "Cemento Portland",
    cantidad: 120,
    precio_unitario: 7.5,
  },
  {
    concepto: "Ladrillo hueco",
    cantidad: 12,
    precio_unitario: 0.85,
  },
  {
    concepto: "Viga metalica HEB",
    cantidad: 18,
    precio_unitario: 146.2,
  },
];

const buildBudgetItems = (items) =>
  items.map((item) => ({
    ...item,
    subtotal: Number((item.cantidad * item.precio_unitario).toFixed(2)),
  }));

async function upsertDemoUsers(passwordHash) {
  const result = {};

  for (const user of demoUsers) {
    const savedUser = await Usuario.findOneAndUpdate(
      { email: user.email },
      {
        ...user,
        contrasena: passwordHash,
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      }
    );

    result[user.rol] = savedUser;
  }

  return result;
}

async function seedProjectsAndTasks(users) {
  const projectName = "Reforma Integral Demo";
  let project = await Proyecto.findOne({ nombre: projectName });

  if (!project) {
    project = await Proyecto.create({
      nombre: projectName,
      descripcion:
        "Reforma integral de vivienda con estructura, instalaciones y acabados para demo operativa.",
      fecha_inicio: new Date("2026-03-01"),
      fecha_fin_estimada: new Date("2026-06-30"),
      estado: "En ejecucion",
      cliente: users.cliente._id,
      capataz: users.capataz._id,
    });
  } else {
    Object.assign(project, {
      descripcion:
        "Reforma integral de vivienda con estructura, instalaciones y acabados para demo operativa.",
      fecha_inicio: new Date("2026-03-01"),
      fecha_fin_estimada: new Date("2026-06-30"),
      estado: "En ejecucion",
      cliente: users.cliente._id,
      capataz: users.capataz._id,
    });
    await project.save();
  }

  await Tarea.deleteMany({ proyecto: project._id });

  await Tarea.insertMany([
    {
      proyecto: project._id,
      nombre: "Revision inicial de cimentacion",
      descripcion:
        "Comprobar cotas, armaduras y nivelacion antes del vertido final.",
      estado: "Completada",
      empleado: users.empleado._id,
    },
    {
      proyecto: project._id,
      nombre: "Montaje de encofrado lateral",
      descripcion: "Preparar paneles, anclajes y puntos de seguridad.",
      estado: "En Progreso",
      empleado: users.empleado._id,
    },
    {
      proyecto: project._id,
      nombre: "Paso de instalaciones electricas",
      descripcion:
        "Coordinar canalizaciones y pasos previstos con el capataz.",
      estado: "Pendiente",
      empleado: users.empleado._id,
    },
  ]);

  return project;
}

async function seedMaterials() {
  for (const material of demoMaterials) {
    await Material.findOneAndUpdate(
      { concepto: material.concepto },
      material,
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      }
    );
  }
}

async function seedBudgetsAndInvoices(project) {
  await Presupuesto.deleteMany({ proyecto: project._id });
  await Factura.deleteMany({ proyecto: project._id });

  const pendingItems = buildBudgetItems([
    { concepto: "Demoliciones iniciales", cantidad: 1, precio_unitario: 3200 },
    { concepto: "Refuerzo estructural", cantidad: 1, precio_unitario: 7800 },
    { concepto: "Acabados interiores", cantidad: 1, precio_unitario: 7450 },
  ]);

  const approvedItems = buildBudgetItems([
    { concepto: "Acopio inicial", cantidad: 1, precio_unitario: 4000 },
    {
      concepto: "Seguridad y medios auxiliares",
      cantidad: 1,
      precio_unitario: 5250,
    },
  ]);

  const pendingBudget = await Presupuesto.create({
    proyecto: project._id,
    estado: "Pendiente",
    descripcion:
      "Presupuesto principal de obra para fases activas y acabados.",
    partidas: pendingItems,
    total: pendingItems.reduce((acc, item) => acc + item.subtotal, 0),
  });

  const approvedBudget = await Presupuesto.create({
    proyecto: project._id,
    estado: "Aprobado",
    descripcion:
      "Presupuesto ya aprobado para arranque y seguridad de obra.",
    partidas: approvedItems,
    total: approvedItems.reduce((acc, item) => acc + item.subtotal, 0),
  });

  await Factura.create({
    proyecto: project._id,
    presupuesto_origen: approvedBudget._id,
    total: approvedBudget.total,
    concepto: "Factura Reforma Integral Demo",
    fecha_emision: new Date("2026-03-24"),
  });

  return {
    pendingBudget,
    approvedBudget,
  };
}

async function main() {
  await mongoose.connect(MONGODB_URI);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, DEMO_HASH_ROUNDS);
  const users = await upsertDemoUsers(passwordHash);
  const project = await seedProjectsAndTasks(users);
  await seedMaterials();
  const budgets = await seedBudgetsAndInvoices(project);

  console.log(
    JSON.stringify(
      {
        message: "Demo data seeded successfully",
        users: {
          cliente: users.cliente.email,
          capataz: users.capataz.email,
          empleado: users.empleado.email,
        },
        project: project.nombre,
        budgets: {
          pending: budgets.pendingBudget.total,
          approved: budgets.approvedBudget.total,
        },
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
