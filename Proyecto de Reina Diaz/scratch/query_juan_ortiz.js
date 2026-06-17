const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../backend/.env' });

const pool = mysql.createPool({
  host: process.env.MYSQLHOST || 'localhost',
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'erp_db',
  port: process.env.MYSQLPORT || 3306,
});

async function main() {
  try {
    const connection = await pool.getConnection();
    console.log("Connected to database.");
    
    // Find all orders for Juan Ortiz
    const [rows] = await connection.query(`
      SELECT p.*, m.nombre as maquilero_nombre, i.modelo
      FROM produccion p
      JOIN maquileros m ON p.maquilero_id = m.id
      JOIN inventario i ON p.inventario_id = i.id
      WHERE m.nombre LIKE '%Juan Ortiz%'
    `);
    
    console.log("Found production orders for Juan Ortiz:", JSON.stringify(rows, null, 2));

    for (const r of rows) {
      const [pagos] = await connection.query("SELECT * FROM pagos WHERE produccion_id = ?", [r.id]);
      console.log(`Payments for order ID ${r.id} (Model ${r.modelo}):`, pagos);
      const [trucks] = await connection.query("SELECT * FROM camion_detalles WHERE produccion_id = ?", [r.id]);
      console.log(`Truck details for order ID ${r.id}:`, trucks);
    }

    connection.release();
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

main();
