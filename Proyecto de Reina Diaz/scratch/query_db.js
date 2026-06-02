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
    
    // Let's get the specific order #42
    const [rows] = await connection.query(`
      SELECT p.*, m.nombre as maquilero_nombre, i.modelo
      FROM produccion p
      JOIN maquileros m ON p.maquilero_id = m.id
      JOIN inventario i ON p.inventario_id = i.id
      WHERE p.id = 42
    `);
    
    console.log("Found production order #42:", rows);

    // Let's get payments for order #42
    const [pagos] = await connection.query("SELECT * FROM pagos WHERE produccion_id = 42");
    console.log("Payments for #42:", pagos);

    // Let's get truck details for order #42
    const [trucks] = await connection.query("SELECT * FROM camion_detalles WHERE produccion_id = 42");
    console.log("Truck shipments for #42:", trucks);

    connection.release();
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

main();
