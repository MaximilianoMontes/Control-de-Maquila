const mysql = require('mysql2/promise');
require('dotenv').config();

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
    const [rows] = await connection.query("SELECT id, camion_id, modelo, no_orden, precio, precio_plancha, verificado FROM camion_detalles ORDER BY id DESC LIMIT 10");
    console.log("Recent camion_detalles rows:");
    console.log(JSON.stringify(rows, null, 2));
    
    const [counts] = await connection.query("SELECT COUNT(*) as total, SUM(CASE WHEN precio = 0 THEN 1 ELSE 0 END) as zero_precio FROM camion_detalles");
    console.log("Counts:", counts[0]);
    
    connection.release();
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

main();
