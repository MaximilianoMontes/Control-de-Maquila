const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkInventory() {
  const db = await mysql.createConnection({
    host: process.env.MYSQLHOST || 'localhost',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQLDATABASE || 'erp_db',
    port: process.env.MYSQLPORT || 3306
  });

  try {
    const [rows] = await db.query("SELECT * FROM inventario WHERE modelo = '501476' OR numero = '501476'");
    console.log("Inventory Item:", JSON.stringify(rows, null, 2));
    
    if (rows.length === 0) {
      console.log("Item not found!");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.end();
  }
}

checkInventory();
