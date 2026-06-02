const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const pool = mysql.createPool({
  host: process.env.MYSQLHOST || 'localhost',
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'erp_db',
  port: process.env.MYSQLPORT || 3306
});

async function getReport() {
  try {
    const start = '2026-05-18';
    const end = '2026-05-22';
    
    const query = `
      SELECT p.*, 
        m.nombre as maquilero_nombre,
        i.modelo as producto_modelo, i.numero as producto_codigo,
        i.color as producto_color, i.cliente as producto_cliente,
        i.no_orden as inventario_orden
      FROM produccion p 
      JOIN maquileros m ON p.maquilero_id = m.id 
      LEFT JOIN inventario i ON p.inventario_id = i.id
      WHERE p.estado = 'Terminado'
        AND (p.fecha_fin BETWEEN ? AND ? OR DATE(p.fecha_terminado) BETWEEN ? AND ?)
      ORDER BY p.fecha_fin DESC, p.fecha_terminado DESC
    `;
    
    const params = [start, end, start, end];
    console.log("Querying finished orders between " + start + " and " + end + "...");
    
    const [rows] = await pool.query(query, params);
    console.log("RESULT_START");
    console.log(JSON.stringify(rows, null, 2));
    console.log("RESULT_END");
    
    await pool.end();
  } catch (error) {
    console.error("Database query failed:", error);
    process.exit(1);
  }
}

getReport();
