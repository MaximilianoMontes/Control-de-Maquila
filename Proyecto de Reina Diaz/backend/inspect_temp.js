const Database = require('better-sqlite3');
const path = require('path');

async function inspect() {
  try {
    const dbPath = path.join(__dirname, 'erp.db');
    console.log(`Connecting to local SQLite database at: ${dbPath}`);
    const db = new Database(dbPath);

    console.log("\n=== INVENTARIO REAL ENTRIES ===");
    const items = db.prepare("SELECT * FROM inventario_real ORDER BY id DESC").all();
    console.log(`Total in inventario_real: ${items.length}`);
    for (const item of items) {
      console.log(`ID: ${item.id} | Modelo: ${item.modelo} | No. Orden: ${item.no_orden} | Color: ${item.color} | Piezas: ${item.piezas} | Ingreso: ${item.fecha_ingreso}`);
    }

    console.log("\n=== PRODUCTION ORDERS (ARCHIVED) ===");
    const archivedProds = db.prepare("SELECT p.id, p.precio_total, p.estado, p.archivado, i.modelo, i.no_orden FROM produccion p LEFT JOIN inventario i ON p.inventario_id = i.id WHERE p.archivado = 1").all();
    console.log(`Total archived: ${archivedProds.length}`);
    for (const p of archivedProds) {
      console.log(`ID: ${p.id} | Modelo: ${p.modelo} | No. Orden: ${p.no_orden} | Estado: ${p.estado} | Precio: ${p.precio_total} | Archivado: ${p.archivado}`);
    }

    console.log("\n=== HISTORIAL LOGS ===");
    const logs = db.prepare("SELECT * FROM historial ORDER BY id DESC LIMIT 50").all();
    for (const log of logs) {
      console.log(`[${log.timestamp}] [${log.action}] [${log.target}] - ${log.description}`);
    }

  } catch (error) {
    console.error("Error inspecting SQLite database:", error);
  }
}

inspect();
