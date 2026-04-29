const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.MYSQLHOST || 'localhost',
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'erp_db',
  port: process.env.MYSQLPORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to MySQL database.');

    // Initialize tables
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin'
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS maquileros (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        maquinaria TEXT,
        personal INT,
        domicilio TEXT,
        colonia VARCHAR(255),
        codigo_postal VARCHAR(20),
        telefono VARCHAR(50),
        imagen TEXT
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS inventario (
        id INT AUTO_INCREMENT PRIMARY KEY,
        numero VARCHAR(100),
        temporada VARCHAR(100),
        modelo VARCHAR(255),
        precio DECIMAL(10, 2) DEFAULT 0,
        color TEXT,
        cliente VARCHAR(255),
        no_orden VARCHAR(100),
        piezas_en_proceso INT DEFAULT 0,
        imagen TEXT,
        observaciones TEXT,
        es_reprogramacion TINYINT(1) DEFAULT 0
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS produccion (
        id INT AUTO_INCREMENT PRIMARY KEY,
        maquilero_id INT NOT NULL,
        inventario_id INT,
        cantidad INT DEFAULT 1,
        cantidad_recibida INT DEFAULT NULL,
        precio_total DECIMAL(10, 2) DEFAULT 0,
        fecha_inicio DATE NOT NULL,
        fecha_fin DATE,
        estado VARCHAR(50) DEFAULT 'En proceso',
        retrasos INT DEFAULT 0,
        archivado TINYINT(1) DEFAULT 0,
        ajuste_tipo VARCHAR(50) DEFAULT 'ninguno',
        ajuste_porcentaje INT DEFAULT 0,
        ajuste_monto DECIMAL(10, 2) DEFAULT 0,
        FOREIGN KEY(maquilero_id) REFERENCES maquileros(id),
        FOREIGN KEY(inventario_id) REFERENCES inventario(id)
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS pagos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        produccion_id INT NOT NULL,
        monto DECIMAL(10, 2) NOT NULL,
        fecha DATE NOT NULL,
        tipo_pago VARCHAR(50) NOT NULL,
        FOREIGN KEY(produccion_id) REFERENCES produccion(id)
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS historial (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        action VARCHAR(100) NOT NULL,
        target VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
    `);

    // Create default users
    const bcrypt = require('bcrypt');
    const users = [
      ['max', 'max123', 'admin'],
      ['admin', 'admin123', 'admin'],
      ['produccion1', 'prod123', 'produccion_pagos'],
      ['produccion2', 'prod123', 'produccion_pagos'],
      ['inventario1', 'inv123', 'inventario']
    ];

    for (const [username, password, role] of users) {
      const [rows] = await connection.query("SELECT * FROM users WHERE username = ?", [username]);
      if (rows.length === 0) {
        const hash = bcrypt.hashSync(password, 10);
        await connection.query("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", [username, hash, role]);
        console.log(`User created: ${username} / ${password} [${role}]`);
      }
    }

    connection.release();
    console.log('Database initialization complete.');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Start initialization
initializeDatabase();

module.exports = pool;
