// Borra y vuelve a llenar la base de datos con información FICTICIA para un ambiente de
// práctica/capacitación. Pensado para correr SOLO contra la base de datos del ambiente de
// entrenamiento (nunca contra producción) — por eso exige TRAINING_MODE=true antes de tocar
// una sola fila. Cubre los flujos completos de Cortes, Producción, Extras, Pagos, Camión y
// Plancha con datos variados (a tiempo, atrasado, parcial, terminado, pagado, enviado) para
// que cada rol pueda practicar dando clic en todo sin arriesgar datos reales.

const db = require('./database');

const fmtDate = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return fmtDate(d);
};

async function resetTrainingData() {
  if (process.env.TRAINING_MODE !== 'true') {
    throw new Error(
      'Bloqueado: TRAINING_MODE no está en "true". Este script borra y reescribe datos de ' +
      'negocio completos — solo debe correr contra la base de datos del ambiente de práctica. ' +
      'Si esto es intencional, agrega TRAINING_MODE=true a las variables de este servicio.'
    );
  }

  console.log('⚠️  TRAINING_MODE=true confirmado. Host:', process.env.MYSQLHOST || 'localhost', '| DB:', process.env.MYSQLDATABASE || 'erp_db');
  console.log('Borrando datos de negocio existentes...');

  await db.query('SET FOREIGN_KEY_CHECKS = 0');
  const tablesToClear = [
    'produccion_entregas_log', 'plancha_trabajos', 'planchador_pagos', 'planchador_asistencias',
    'plancha_devoluciones', 'plancha_borrador', 'descuentos_personales', 'pagos',
    'camion_detalles', 'camiones', 'camion_borrador', 'produccion', 'inventario_real',
    'inventario', 'maquileros', 'planchadores', 'historial',
    // Módulo de Telas — independiente del resto, pero también debe quedar en blanco al
    // reiniciar los datos de práctica (antes se omitía por completo).
    'telas_requisicion_lineas', 'telas_requisiciones', 'telas_devoluciones', 'telas_salidas',
    'telas_recepciones', 'telas_codigos', 'telas_facturas', 'telas_colores',
    'telas_proveedores', 'telas_tipos'
  ];
  for (const t of tablesToClear) {
    try {
      await db.query(`TRUNCATE TABLE ${t}`);
    } catch (e) {
      console.log(`  (omitido ${t}: ${e.message})`);
    }
  }
  await db.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('Listo. Insertando datos ficticios...');

  // --- Maquileros ---
  const maquileros = [
    ['Juan Pérez López', 'Overlock, Recta', 3, 'Calle Reforma 123', 'Centro', '28000', '312-100-0001'],
    ['María González Ruiz', 'Recta, Ojaladora', 2, 'Av. Juárez 456', 'La Aurora', '28010', '312-100-0002'],
    ['Roberto Sánchez Torres', 'Overlock', 4, 'Calle Hidalgo 789', 'Las Águilas', '28020', '312-100-0003'],
    ['Ana Martínez Flores', 'Recta, Overlock, Botonera', 2, 'Priv. Morelos 12', 'El Naranjal', '28030', '312-100-0004'],
    ['Carlos Ramírez Ortiz', 'Overlock, Recta', 5, 'Calle Allende 34', 'Centro', '28000', '312-100-0005'],
  ];
  const maquileroIds = [];
  for (const [nombre, maquinaria, personal, domicilio, colonia, cp, telefono] of maquileros) {
    const [r] = await db.query(
      'INSERT INTO maquileros (nombre, maquinaria, personal, domicilio, colonia, codigo_postal, telefono) VALUES (?,?,?,?,?,?,?)',
      [nombre, maquinaria, personal, domicilio, colonia, cp, telefono]
    );
    maquileroIds.push(r.insertId);
  }
  const [mJuan, mMaria, mRoberto, mAna, mCarlos] = maquileroIds;

  // --- Planchadores ---
  const planchadores = [
    ['Luis Hernández Cruz', '312-200-0001'],
    ['Patricia Gómez Silva', '312-200-0002'],
  ];
  for (const [nombre, telefono] of planchadores) {
    await db.query('INSERT INTO planchadores (nombre, telefono) VALUES (?,?)', [nombre, telefono]);
  }

  // --- Cortes (inventario) ---
  const cortes = [
    // [numero, modelo, precio, color(JSON), cliente, no_orden, piezas_en_proceso, precio_plancha]
    ['PRACT-101', 'PRACT-101', 75, [{ color: 'AZU', cantidad: '50' }, { color: 'NEG', cantidad: '30' }], 'Cliente Demo A', 'DEMO-001', 80, 8],
    ['PRACT-102', 'PRACT-102', 60, [{ color: 'ROJ', cantidad: '40' }], 'Cliente Demo B', 'DEMO-002', 40, 6],
    ['PRACT-103', 'PRACT-103', 90, [{ color: 'BCO', cantidad: '25' }, { color: 'GRIS', cantidad: '25' }], 'Cliente Demo A', 'DEMO-003', 50, 7],
    ['PRACT-104', 'PRACT-104', 55, [{ color: 'VER', cantidad: '60' }], 'Cliente Demo C', 'DEMO-004', 60, 6],
    ['PRACT-105', 'PRACT-105', 90, [{ color: 'BLA', cantidad: '35' }, { color: 'GRIS', cantidad: '35' }], 'Cliente Demo B', 'DEMO-005', 70, 8],
    ['PRACT-106', 'PRACT-106', 65, [{ color: 'CAF', cantidad: '45' }], 'Cliente Demo D', 'DEMO-006', 45, 6],
    ['PRACT-107', 'PRACT-107', 50, [{ color: 'MOR', cantidad: '100' }], 'Cliente Demo A', 'DEMO-007', 100, 5],
    ['PRACT-108', 'PRACT-108', 0, [{ color: 'NEG', cantidad: '30' }], 'Cliente Demo C', 'DEMO-008', 30, 0],
    ['PRACT-109', 'PRACT-109', 70, [{ color: 'CAF', cantidad: '90' }], 'Cliente Demo B', 'DEMO-009', 90, 7],
    ['PRACT-110', 'PRACT-110', 70, [{ color: 'AZM', cantidad: '55' }], 'Cliente Demo D', 'DEMO-010', 55, 7],
  ];
  const invIds = {};
  for (const [numero, modelo, precio, colorArr, cliente, no_orden, piezas, precio_plancha] of cortes) {
    const [r] = await db.query(
      'INSERT INTO inventario (numero, modelo, precio, color, cliente, no_orden, piezas_en_proceso, precio_plancha) VALUES (?,?,?,?,?,?,?,?)',
      [numero, modelo, precio, JSON.stringify(colorArr), cliente, no_orden, piezas, precio_plancha]
    );
    invIds[modelo] = r.insertId;
  }

  // --- Órdenes de Producción (variadas a propósito) ---
  // O1: En proceso, nada recibido todavía — practicar "Recepcionar" y "Terminar Orden"
  await db.query(
    `INSERT INTO produccion (maquilero_id, inventario_id, cantidad, cantidad_recibida, tallas_recibidas, precio_total, fecha_inicio, fecha_fin, estado)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [mJuan, invIds['PRACT-102'], 40, null, null, 40 * 60, daysFromNow(-5), daysFromNow(5), 'En proceso']
  );

  // O2: En proceso pero YA recibido al 100% — practicar marcar "Terminado"
  await db.query(
    `INSERT INTO produccion (maquilero_id, inventario_id, cantidad, cantidad_recibida, tallas_recibidas, precio_total, fecha_inicio, fecha_fin, estado)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [mMaria, invIds['PRACT-104'], 60, 60, JSON.stringify({ VER: { CANTIDAD: 60 } }), 60 * 55, daysFromNow(-10), daysFromNow(2), 'En proceso']
  );

  // O3: Terminado con bono, pago parcial + multa pendiente — practicar Pagos y descuentos
  const [o3] = await db.query(
    `INSERT INTO produccion (maquilero_id, inventario_id, cantidad, cantidad_recibida, tallas_recibidas, precio_total, fecha_inicio, fecha_fin, estado, ajuste_tipo, ajuste_porcentaje, ajuste_monto)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [mRoberto, invIds['PRACT-105'], 70, 70, JSON.stringify({ BLA: { CANTIDAD: 35 }, GRIS: { CANTIDAD: 35 } }), 70 * 90 * 1.10, daysFromNow(-15), daysFromNow(-3), 'Terminado', 'bono', 10, 70 * 90 * 0.10]
  );
  await db.query("UPDATE produccion SET fecha_terminado = NOW() WHERE id = ?", [o3.insertId]);
  await db.query(
    'INSERT INTO pagos (produccion_id, monto, fecha, tipo_pago, con_iva) VALUES (?,?,?,?,0)',
    [o3.insertId, 4000, daysFromNow(-2), 'abono']
  );
  await db.query(
    'INSERT INTO descuentos_personales (maquilero_id, inventario_id, motivo, monto_total, piezas_afectadas, aplicado) VALUES (?,?,?,?,?,0)',
    [mRoberto, invIds['PRACT-105'], 'Costura descosida en 5 piezas (hallazgo de calidad)', 150, 5]
  );

  // O4: Terminado y 100% pagado, todavía SIN enviar — practicar Camión (cargar, tallas, despachar)
  const precioO4 = 90 * 70;
  const [o4] = await db.query(
    `INSERT INTO produccion (maquilero_id, inventario_id, cantidad, cantidad_recibida, tallas_recibidas, precio_total, fecha_inicio, fecha_fin, estado)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [mCarlos, invIds['PRACT-109'], 90, 90, JSON.stringify({ CAF: { CANTIDAD: 90 } }), precioO4, daysFromNow(-12), daysFromNow(-1), 'Terminado']
  );
  await db.query("UPDATE produccion SET fecha_terminado = NOW() WHERE id = ?", [o4.insertId]);
  await db.query(
    'INSERT INTO pagos (produccion_id, monto, fecha, tipo_pago, con_iva) VALUES (?,?,?,?,0)',
    [o4.insertId, precioO4, daysFromNow(-1), 'completo']
  );

  // O5: En proceso y ATRASADA (semáforo rojo) — practicar prórroga y Registro de Entregas
  await db.query(
    `INSERT INTO produccion (maquilero_id, inventario_id, cantidad, cantidad_recibida, tallas_recibidas, precio_total, fecha_inicio, fecha_fin, estado)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [mAna, invIds['PRACT-106'], 45, null, null, 45 * 65, daysFromNow(-14), daysFromNow(-6), 'En proceso']
  );

  // O6: En proceso, recepción PARCIAL — practicar Entrega Adelantada y Pago Parcial
  await db.query(
    `INSERT INTO produccion (maquilero_id, inventario_id, cantidad, cantidad_recibida, tallas_recibidas, precio_total, fecha_inicio, fecha_fin, estado)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [mCarlos, invIds['PRACT-107'], 100, 40, JSON.stringify({ MOR: { CANTIDAD: 40 } }), 100 * 50, daysFromNow(-8), daysFromNow(4), 'En proceso']
  );

  // O7: Extra — practicar el flujo completo de Extras
  await db.query(
    `INSERT INTO produccion (maquilero_id, inventario_id, cantidad, cantidad_recibida, tallas_recibidas, precio_total, fecha_inicio, fecha_fin, estado, es_extra, precio_extra)
     VALUES (?,?,?,?,?,?,?,?,?,1,?)`,
    [mJuan, invIds['PRACT-108'], 30, null, null, 30 * 8.5, daysFromNow(-3), daysFromNow(7), 'En proceso', 8.5]
  );

  // O8: Terminado, pagado y YA ENVIADO por camión — le da a Plancha algo listo para planchar
  const precioO8 = 55 * 70;
  const [o8] = await db.query(
    `INSERT INTO produccion (maquilero_id, inventario_id, cantidad, cantidad_recibida, tallas_recibidas, precio_total, fecha_inicio, fecha_fin, estado)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [mMaria, invIds['PRACT-110'], 55, 55, JSON.stringify({ AZM: { CANTIDAD: 55 } }), precioO8, daysFromNow(-16), daysFromNow(-4), 'Terminado']
  );
  await db.query("UPDATE produccion SET fecha_terminado = NOW() WHERE id = ?", [o8.insertId]);
  await db.query(
    'INSERT INTO pagos (produccion_id, monto, fecha, tipo_pago, con_iva) VALUES (?,?,?,?,0)',
    [o8.insertId, precioO8, daysFromNow(-3), 'completo']
  );

  // Camión ya despachado con el modelo de O8, para que Historial y Plancha tengan algo real
  const [camion] = await db.query(
    'INSERT INTO camiones (fecha_envio, observaciones) VALUES (?,?)',
    [daysFromNow(-2), 'Chofer: Práctica Demo, Placas: DEMO-001, Camión: Demo Truck']
  );
  await db.query(
    `INSERT INTO camion_detalles (camion_id, numero, temporada, modelo, precio, color, cliente, no_orden, piezas, tallas_cantidades, produccion_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [
      camion.insertId, 'PRACT-110', null, 'PRACT-110', 70, 'AZM', 'Cliente Demo D', 'DEMO-010', 55,
      JSON.stringify({ AZM: { '05': 10, '07': 10, '09': 10, '11': 10, '13': 10, '15': 5 } }),
      o8.insertId
    ]
  );

  // --- Módulo de Telas (independiente, pero también necesita datos de práctica) ---
  const tiposTela = [
    ['Satín Zoe', 'SZ', '100% Poliéster'],
    ['Twill Jamaica', 'TJ', '70% Poliamida 27% Rayón 3% Spandex'],
  ];
  const tipoIds = {};
  for (const [nombre, abrev, composicion] of tiposTela) {
    const [r] = await db.query('INSERT INTO telas_tipos (nombre, abreviatura, composicion_default) VALUES (?,?,?)', [nombre, abrev, composicion]);
    tipoIds[abrev] = r.insertId;
  }

  const proveedoresTela = [
    ['EKB Textiles', 'E'],
    ['Jiaxing Textil', 'J'],
  ];
  const provIds = {};
  for (const [nombre, letra] of proveedoresTela) {
    const [r] = await db.query('INSERT INTO telas_proveedores (nombre, letra) VALUES (?,?)', [nombre, letra]);
    provIds[letra] = r.insertId;
  }

  const coloresTela = [
    ['Negro', 'NEG'], ['Rojo', 'ROJ'], ['Azul', 'AZU'], ['Blanco', 'BLA'],
  ];
  const colorIds = {};
  for (const [nombre, abrev] of coloresTela) {
    const [r] = await db.query('INSERT INTO telas_colores (nombre, abreviatura) VALUES (?,?)', [nombre, abrev]);
    colorIds[abrev] = r.insertId;
  }

  // codigo, tipo, proveedor, referencia, color, precio_usd, tipo_cambio
  const codigosTela = [
    ['FSZE101NEG', 'SZ', 'E', '101', 'NEG', 4.55, 21],
    ['FSZE101ROJ', 'SZ', 'E', '101', 'ROJ', 4.55, 21],
    ['FTJJ862AZU', 'TJ', 'J', '862', 'AZU', 3.25, 21],
  ];
  const codigoIds = {};
  for (const [codigo, tipoAb, provLetra, referencia, colorAb, precioUsd, tc] of codigosTela) {
    const precioMxn = Math.ceil((precioUsd / 0.9144) * tc + 5);
    const [r] = await db.query(
      `INSERT INTO telas_codigos (codigo, tipo_id, proveedor_id, referencia_proveedor, color_id, precio_usd, tipo_cambio, precio_mxn)
       VALUES (?,?,?,?,?,?,?,?)`,
      [codigo, tipoIds[tipoAb], provIds[provLetra], referencia, colorIds[colorAb], precioUsd, tc, precioMxn]
    );
    codigoIds[codigo] = r.insertId;
  }

  // Factura 1 (EKB): una línea ya aprobada con ancho (da existencia real) y otra pendiente de revisar
  const [facturaEkb] = await db.query(
    'INSERT INTO telas_facturas (numero_factura, proveedor_id, fecha, tipo_cambio) VALUES (?,?,?,?)',
    ['155555', provIds['E'], daysFromNow(-10), 21]
  );
  await db.query(
    `INSERT INTO telas_recepciones (factura_id, codigo_id, rollos, yardas, metros, ancho_revisado, estado, ancho)
     VALUES (?,?,?,?,?,1,'aprobado',?)`,
    [facturaEkb.insertId, codigoIds['FSZE101NEG'], 5, 200, Math.floor(200 * 0.9144), 1.44]
  );
  await db.query(
    `INSERT INTO telas_recepciones (factura_id, codigo_id, rollos, yardas, metros, estado)
     VALUES (?,?,?,?,?,'pendiente')`,
    [facturaEkb.insertId, codigoIds['FSZE101ROJ'], 3, 120, Math.floor(120 * 0.9144)]
  );

  // Factura 2 (Jiaxing): línea aprobada, da existencia para practicar "Surtir"
  const [facturaJiaxing] = await db.query(
    'INSERT INTO telas_facturas (numero_factura, proveedor_id, fecha, tipo_cambio) VALUES (?,?,?,?)',
    ['155600', provIds['J'], daysFromNow(-5), 21]
  );
  await db.query(
    `INSERT INTO telas_recepciones (factura_id, codigo_id, rollos, yardas, metros, ancho_revisado, estado, ancho)
     VALUES (?,?,?,?,?,1,'aprobado',?)`,
    [facturaJiaxing.insertId, codigoIds['FTJJ862AZU'], 4, 150, Math.floor(150 * 0.9144), 1.50]
  );

  // Requisición en borrador — practicar "Editar" y "Finalizar". "notas" guarda los colores
  // del modelo (separados por coma), igual que hace el formulario de "Colores" en el frontend.
  const [reqBorrador] = await db.query(
    "INSERT INTO telas_requisiciones (modelo, notas, estado) VALUES (?,?,'borrador')",
    ['531200-DEMO', 'Negro']
  );
  await db.query(
    'INSERT INTO telas_requisicion_lineas (requisicion_id, codigo_id, cantidad_requerida, ancho) VALUES (?,?,?,?)',
    [reqBorrador.insertId, codigoIds['FSZE101NEG'], 60, 1.44]
  );

  // Requisición finalizada — aparece en Salidas → "Requisiciones por Surtir", lista para practicar "Surtir"
  const [reqFinalizada] = await db.query(
    "INSERT INTO telas_requisiciones (modelo, notas, estado, fecha_finalizada) VALUES (?,?,'finalizada',?)",
    ['531300-DEMO', 'Azul', daysFromNow(-1)]
  );
  await db.query(
    'INSERT INTO telas_requisicion_lineas (requisicion_id, codigo_id, cantidad_requerida, ancho) VALUES (?,?,?,?)',
    [reqFinalizada.insertId, codigoIds['FTJJ862AZU'], 50, 1.50]
  );

  console.log('✅ Datos de práctica listos:');
  console.log('   5 maquileros, 2 planchadores, 10 cortes, 8 órdenes de producción (variadas), 1 camión ya enviado.');
  console.log('   Telas: 2 tipos, 2 proveedores, 4 colores, 3 códigos, 2 facturas (una línea pendiente de revisar), 2 requisiciones (una en borrador, otra lista para surtir).');
  console.log('   Roles para practicar: produccion1 / produccion2 / inventario1 / plancha / telas1 / telas2 (contraseñas por defecto del sistema).');
}

module.exports = { resetTrainingData };

// Permite correrlo directo: node seed_training_data.js
if (require.main === module) {
  resetTrainingData()
    .then(() => { console.log('Terminado.'); process.exit(0); })
    .catch((e) => { console.error('Error:', e.message); process.exit(1); });
}
