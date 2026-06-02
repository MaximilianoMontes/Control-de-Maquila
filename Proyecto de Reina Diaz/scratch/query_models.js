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

    // Describe camion_detalles
    const [cols] = await connection.query("DESCRIBE camion_detalles");
    console.log("camion_detalles columns:", cols.map(c => `${c.Field} (${c.Type})`));

    // Get some rows with verificado = 1
    const [rows] = await connection.query("SELECT id, modelo, tallas_cantidades, verificado FROM camion_detalles WHERE verificado = 1 LIMIT 5");
    console.log("Sample verified models:");
    rows.forEach(r => {
      console.log(`ID: ${r.id}, Mod: ${r.modelo}`);
      console.log(`Tallas: ${r.tallas_cantidades}`);
    });

    connection.release();
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

main();
