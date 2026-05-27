const BASE = "https://tfg-wi2b.onrender.com";

let tokens = {};
let ids = {};
let results = [];
let passed = 0;
let failed = 0;

async function request(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

function test(id, desc, expected, actual, extraCheck) {
  const ok = actual === expected && (extraCheck === undefined || extraCheck);
  if (ok) passed++; else failed++;
  results.push({ id, desc, expected, actual, ok: ok ? "PASS" : "FAIL" });
  const icon = ok ? "OK" : "FAIL";
  console.log(`  ${icon}  ${id} - ${desc} (esperado: ${expected}, obtenido: ${actual})`);
}

async function run() {
  console.log("=== Pruebas automatizadas contra Render ===");
  console.log(`URL: ${BASE}`);
  console.log(`Fecha: ${new Date().toISOString().split("T")[0]}\n`);

  console.log("Despertando servidor Render (puede tardar ~30s)...");
  const wakeup = await fetch(BASE);
  console.log(`Servidor activo (${wakeup.status})\n`);

  // --- AUTENTICACION ---
  console.log("--- AUTENTICACION ---");

  let r = await request("POST", "/api/auth/login", {
    email: "capataz@constructplus.local", contrasena: "Demo1234"
  });
  tokens.capataz = r.data?.token;
  test("T01", "Login capataz valido", 200, r.status, !!tokens.capataz);

  r = await request("POST", "/api/auth/login", {
    email: "capataz@constructplus.local", contrasena: "WrongPass1!"
  });
  test("T02", "Login contrasena incorrecta", 401, r.status);

  r = await request("POST", "/api/auth/login", {
    email: "empleado@constructplus.local", contrasena: "Demo1234"
  });
  tokens.empleado = r.data?.token;
  ids.empleado = r.data?.usuario?.id;
  test("T03", "Login empleado valido", 200, r.status, !!tokens.empleado);

  r = await request("POST", "/api/auth/login", {
    email: "cliente@constructplus.local", contrasena: "Demo1234"
  });
  tokens.cliente = r.data?.token;
  test("T04", "Login cliente valido", 200, r.status, !!tokens.cliente);

  const uniqueEmail = `test_auto_${Date.now()}@test.com`;
  r = await request("POST", "/api/auth/registro", {
    nombre: "Test Auto", email: uniqueEmail, contrasena: "Test1234!", rol: "cliente"
  });
  test("T05", "Registro usuario nuevo", 201, r.status);

  r = await request("POST", "/api/auth/registro", {
    nombre: "Test Dup", email: uniqueEmail, contrasena: "Test1234!", rol: "cliente"
  });
  test("T06", "Registro email duplicado", 409, r.status);

  r = await request("GET", "/api/auth/perfil");
  test("T07", "Acceso sin token", 401, r.status);

  r = await request("GET", "/api/auth/perfil", null, "token_invalido_xyz");
  test("T08", "Acceso con token invalido", 401, r.status);

  r = await request("GET", "/api/auth/perfil", null, tokens.capataz);
  test("T09", "Verificar perfil con token", 200, r.status);

  r = await request("POST", "/api/auth/login", { email: "", contrasena: "" });
  test("T10", "Login con campos vacios", 401, r.status);

  // --- AUTORIZACION POR ROLES ---
  console.log("\n--- AUTORIZACION POR ROLES ---");

  r = await request("GET", "/api/auth/usuarios", null, tokens.capataz);
  test("T11", "Capataz lista empleados", 200, r.status);

  r = await request("GET", "/api/auth/usuarios", null, tokens.empleado);
  test("T12", "Empleado intenta listar usuarios", 403, r.status);

  r = await request("POST", "/api/proyectos", { nombre: "No autorizado" }, tokens.empleado);
  test("T13", "Empleado intenta crear proyecto", 403, r.status);

  r = await request("PUT", "/api/presupuestos/000000000000000000000000/aprobacion", {}, tokens.capataz);
  test("T14", "Capataz intenta aprobar presupuesto", 403, r.status);

  // --- PROYECTOS Y TAREAS ---
  console.log("\n--- PROYECTOS Y TAREAS ---");

  r = await request("GET", "/api/proyectos", null, tokens.capataz);
  test("T15", "Listar proyectos capataz", 200, r.status);
  const proyectos = r.data;
  const proyectoId = proyectos?.[0]?._id;

  const clienteList = await request("GET", "/api/auth/usuarios?rol=cliente", null, tokens.capataz);
  const clienteId = clienteList.data?.[0]?._id;

  r = await request("POST", "/api/proyectos", {
    nombre: `Proyecto Auto ${Date.now()}`,
    descripcion: "Prueba automatizada",
    fecha_inicio: "2026-07-01",
    fecha_fin_estimada: "2026-12-31",
    cliente: clienteId
  }, tokens.capataz);
  const nuevoProyectoId = r.data?.proyecto?._id;
  test("T16", "Crear proyecto", 201, r.status);

  r = await request("POST", "/api/proyectos", {
    nombre: "Fechas mal",
    descripcion: "Test",
    fecha_inicio: "2026-12-01",
    fecha_fin_estimada: "2026-01-01",
    cliente: clienteId
  }, tokens.capataz);
  test("T17", "Proyecto con fechas invertidas", 400, r.status);

  r = await request("POST", "/api/tareas", {
    proyecto: nuevoProyectoId || proyectoId,
    nombre: `Tarea Auto ${Date.now()}`,
    descripcion: "Tarea de prueba automatizada",
    empleado: ids.empleado
  }, tokens.capataz);
  const tareaId = r.data?.tarea?._id;
  test("T18", "Crear tarea asignada", 201, r.status);

  r = await request("GET", "/api/tareas", null, tokens.empleado);
  test("T19", "Listar tareas empleado", 200, r.status);

  if (tareaId) {
    r = await request("PUT", `/api/tareas/${tareaId}/estado`, { estado: "En Progreso" }, tokens.empleado);
    test("T20", "Cambiar estado tarea", 200, r.status);
  } else {
    test("T20", "Cambiar estado tarea", 200, 0, false);
  }

  if (tareaId) {
    r = await request("PUT", `/api/tareas/${tareaId}/estado`, { estado: "Completada" }, tokens.empleado);
    test("T21", "Completar tarea sin foto", 400, r.status);
  } else {
    test("T21", "Completar tarea sin foto", 400, 0, false);
  }

  if (proyectoId) {
    r = await request("GET", `/api/proyectos/${proyectoId}/avance`, null, tokens.capataz);
    test("T22", "Calcular avance de obra", 200, r.status, r.data?.porcentaje_avance !== undefined);
  } else {
    test("T22", "Calcular avance de obra", 200, 0, false);
  }

  // --- MATERIALES ---
  console.log("\n--- MATERIALES ---");

  r = await request("GET", "/api/materiales", null, tokens.capataz);
  test("T23", "Listar materiales", 200, r.status);
  const materiales = r.data;

  const conceptoUnico = `Material Auto ${Date.now()}`;
  r = await request("POST", "/api/materiales", {
    concepto: conceptoUnico, cantidad: 50, precio_unitario: 10
  }, tokens.capataz);
  const materialId = r.data?.material?._id;
  test("T24", "Crear material", 201, r.status);

  r = await request("POST", "/api/materiales", {
    concepto: conceptoUnico, cantidad: 10, precio_unitario: 5
  }, tokens.capataz);
  test("T25", "Material duplicado", 409, r.status);

  if (materialId) {
    r = await request("POST", `/api/materiales/${materialId}/consumo`, {
      cantidad: 5, clientRequestId: `test-consumo-${Date.now()}`
    }, tokens.capataz);
    test("T26", "Registrar consumo", 200, r.status);

    r = await request("POST", `/api/materiales/${materialId}/consumo`, {
      cantidad: 9999, clientRequestId: `test-exceso-${Date.now()}`
    }, tokens.capataz);
    test("T27", "Consumo mayor que stock", 400, r.status);

    r = await request("POST", `/api/materiales/${materialId}/reposicion`, {
      cantidad: 10
    }, tokens.capataz);
    test("T28", "Reponer stock", 200, r.status);

    r = await request("POST", `/api/materiales/${materialId}/consumo`, {
      cantidad: 0, clientRequestId: `test-cero-${Date.now()}`
    }, tokens.capataz);
    test("T29", "Consumo con cantidad cero", 400, r.status);

    r = await request("GET", "/api/materiales", null, tokens.capataz);
    const matActualizado = r.data?.find(m => m._id === materialId);
    const esCritico = matActualizado?.stock_critico !== undefined;
    test("T30", "Flag stock critico presente", 200, r.status, esCritico);
  } else {
    for (let i = 26; i <= 30; i++) test(`T${i}`, "Material test (sin ID)", 200, 0, false);
  }

  // --- PRESUPUESTOS Y FACTURAS ---
  console.log("\n--- PRESUPUESTOS Y FACTURAS ---");

  r = await request("POST", "/api/presupuestos", {
    proyecto: nuevoProyectoId || proyectoId,
    descripcion: "Presupuesto automatizado",
    partidas: [
      { concepto: "Partida A", cantidad: 2, precio_unitario: 100 },
      { concepto: "Partida B", cantidad: 1, precio_unitario: 500 }
    ]
  }, tokens.capataz);
  const presupuestoId = r.data?.presupuesto?._id;
  test("T31", "Crear presupuesto con partidas", 201, r.status);

  r = await request("POST", "/api/presupuestos", {
    proyecto: nuevoProyectoId || proyectoId,
    descripcion: "Sin partidas",
    partidas: []
  }, tokens.capataz);
  test("T32", "Presupuesto sin partidas", 400, r.status);

  r = await request("GET", "/api/presupuestos", null, tokens.capataz);
  test("T33", "Listar presupuestos capataz", 200, r.status);

  r = await request("GET", "/api/presupuestos", null, tokens.cliente);
  test("T34", "Listar presupuestos cliente", 200, r.status);

  if (presupuestoId) {
    r = await request("PUT", `/api/presupuestos/${presupuestoId}/aprobacion`, {}, tokens.cliente);
    test("T35", "Cliente aprueba presupuesto", 200, r.status, !!r.data?.factura);
  } else {
    test("T35", "Cliente aprueba presupuesto", 200, 0, false);
  }

  const presupuestoRechazo = await request("POST", "/api/presupuestos", {
    proyecto: nuevoProyectoId || proyectoId,
    descripcion: "Para rechazar",
    partidas: [{ concepto: "X", cantidad: 1, precio_unitario: 100 }]
  }, tokens.capataz);
  const presRechazoId = presupuestoRechazo.data?.presupuesto?._id;

  if (presRechazoId) {
    r = await request("PUT", `/api/presupuestos/${presRechazoId}/rechazo`, {}, tokens.cliente);
    test("T36", "Cliente rechaza presupuesto", 200, r.status);
  } else {
    test("T36", "Cliente rechaza presupuesto", 200, 0, false);
  }

  r = await request("GET", "/api/facturas", null, tokens.capataz);
  test("T37", "Listar facturas", 200, r.status);
  const facturas = r.data;
  const facturaId = facturas?.[0]?._id;

  if (facturaId) {
    r = await request("PUT", `/api/facturas/${facturaId}`, { total: 999 }, tokens.capataz);
    test("T38", "Editar factura (bloqueado)", 403, r.status);

    r = await request("DELETE", `/api/facturas/${facturaId}`, null, tokens.capataz);
    test("T39", "Borrar factura (bloqueado)", 403, r.status);
  } else {
    test("T38", "Editar factura (bloqueado)", 403, 0, false);
    test("T39", "Borrar factura (bloqueado)", 403, 0, false);
  }

  r = await request("GET", "/api/proyectos/mio", null, tokens.cliente);
  test("T40", "Mi proyecto (cliente)", 200, r.status);

  // --- RESUMEN ---
  console.log("\n========================================");
  console.log(`TOTAL: ${results.length} tests`);
  console.log(`PASARON: ${passed}`);
  console.log(`FALLARON: ${failed}`);
  console.log("========================================\n");

  // Salida JSON para parsear
  const summary = { date: new Date().toISOString(), total: results.length, passed, failed, results };
  console.log("JSON_RESULTS_START");
  console.log(JSON.stringify(summary, null, 2));
  console.log("JSON_RESULTS_END");
}

run().catch(err => {
  console.error("Error fatal:", err.message);
  process.exit(1);
});
