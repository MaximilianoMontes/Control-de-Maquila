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
        es_reprogramacion TINYINT(1) DEFAULT 0,
        en_inventario TINYINT(1) DEFAULT 0,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS inventario_real (
        id INT AUTO_INCREMENT PRIMARY KEY,
        numero VARCHAR(100),
        temporada VARCHAR(100),
        modelo VARCHAR(255),
        precio DECIMAL(10, 2) DEFAULT 0,
        color TEXT,
        cliente VARCHAR(255),
        no_orden VARCHAR(100),
        piezas INT DEFAULT 0,
        imagen TEXT,
        observaciones TEXT,
        fecha_ingreso TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

    await connection.query(`
      CREATE TABLE IF NOT EXISTS descuentos_personales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        maquilero_id INT NOT NULL,
        inventario_id INT,
        motivo TEXT NOT NULL,
        monto_total DECIMAL(10, 2) NOT NULL,
        piezas_afectadas INT DEFAULT 0,
        aplicado TINYINT(1) DEFAULT 0,
        pago_id INT DEFAULT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(maquilero_id) REFERENCES maquileros(id),
        FOREIGN KEY(inventario_id) REFERENCES inventario(id),
        FOREIGN KEY(pago_id) REFERENCES pagos(id)
      );
    `);

    // Migraciones
    try {
      await connection.query("ALTER TABLE descuentos_personales ADD COLUMN aplicado TINYINT(1) DEFAULT 0");
      await connection.query("ALTER TABLE descuentos_personales ADD COLUMN pago_id INT DEFAULT NULL");
      await connection.query("ALTER TABLE descuentos_personales ADD CONSTRAINT fk_pago FOREIGN KEY(pago_id) REFERENCES pagos(id)");
      console.log("Migration: Columns added to descuentos_personales");
    } catch (e) {
      // Si ya existen, ignoramos el error
    }

    try {
      await connection.query("ALTER TABLE inventario ADD COLUMN en_inventario TINYINT(1) DEFAULT 0");
      console.log("Migration: en_inventario column added to inventario");
    } catch (e) {
      // Si ya existe, ignoramos el error
    }

    try {
      await connection.query("ALTER TABLE inventario ADD COLUMN fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
      console.log("Migration: fecha_creacion column added to inventario");
    } catch (e) {
      // Si ya existe, ignoramos el error
    }

    try {
      await connection.query("ALTER TABLE produccion ADD COLUMN fecha_terminado TIMESTAMP NULL DEFAULT NULL");
      console.log("Migration: fecha_terminado column added to produccion");
    } catch (e) {
      // Si ya existe, ignoramos el error
    }

    try {
      await connection.query("UPDATE produccion SET fecha_terminado = NOW() WHERE estado = 'Terminado' AND fecha_terminado IS NULL");
      console.log("Migration: Backfilled fecha_terminado for existing Terminado orders");
    } catch (e) {
      // Si ya existe, ignoramos el error
    }

    // Migration: Backfill fecha_creacion for existing cuts using historial records
    try {
      const [cuts] = await connection.query("SELECT id, modelo, fecha_creacion FROM inventario");
      for (const cut of cuts) {
        // Query the oldest ALTA/REPROGRAMACION timestamp in historial matching the model name
        const [histRows] = await connection.query(`
          SELECT timestamp FROM historial 
          WHERE target = 'INVENTARIO' AND (action = 'ALTA' OR action = 'REPROGRAMACION') AND description LIKE ? 
          ORDER BY timestamp ASC LIMIT 1
        `, [`%${cut.modelo}%`]);
        
        if (histRows.length > 0) {
          await connection.query("UPDATE inventario SET fecha_creacion = ? WHERE id = ?", [histRows[0].timestamp, cut.id]);
        }
      }
      console.log("Migration: Backfilled fecha_creacion for existing cuts from history");
    } catch (e) {
      console.error("Migration error backfilling cuts:", e);
    }

    // Create default users
    const bcrypt = require('bcrypt');
    const users = [
      ['max', 'max123', 'admin'],
      ['admin', 'admin123', 'admin'],
      ['produccion1', 'prod123', 'produccion1'],
      ['produccion2', 'prod123', 'produccion2'],
      ['inventario1', 'inv123', 'inventario1']
    ];

    for (const [username, password, role] of users) {
      const [rows] = await connection.query("SELECT * FROM users WHERE username = ?", [username]);
      if (rows.length === 0) {
        const hash = bcrypt.hashSync(password, 10);
        await connection.query("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", [username, hash, role]);
        console.log(`User created: ${username} / ${password} [${role}]`);
      }
    }

    // Migración: Forzar roles correctos para todos los usuarios conocidos
    // Esto corrige usuarios que pudieron haberse creado con roles incorrectos o nulos
    try {
      for (const [username, , role] of users) {
        await connection.query("UPDATE users SET role = ? WHERE username = ?", [role, username]);
      }
      console.log('Migration: Roles de usuarios verificados y corregidos.');
    } catch (e) {
      console.error('Error al migrar roles:', e);
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
