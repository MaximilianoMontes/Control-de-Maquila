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

    await connection.query(`
      CREATE TABLE IF NOT EXISTS camiones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fecha_envio DATE NOT NULL,
        observaciones TEXT,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS camion_detalles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        camion_id INT NOT NULL,
        numero VARCHAR(100),
        temporada VARCHAR(100),
        modelo VARCHAR(255),
        precio DECIMAL(10, 2),
        color TEXT,
        cliente VARCHAR(255),
        no_orden VARCHAR(100),
        piezas INT DEFAULT 0,
        tallas_cantidades TEXT,
        FOREIGN KEY(camion_id) REFERENCES camiones(id) ON DELETE CASCADE
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

    try {
      await connection.query("ALTER TABLE produccion ADD COLUMN es_extra TINYINT(1) DEFAULT 0");
      console.log("Migration: es_extra column added to produccion");
    } catch (e) {
      // Si ya existe, ignoramos el error
    }

    try {
      await connection.query("ALTER TABLE produccion ADD COLUMN precio_extra DECIMAL(10, 2) DEFAULT NULL");
      console.log("Migration: precio_extra column added to produccion");
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

    try {
      console.log('--- MIGRACIÓN MANUAL: Eliminación de órdenes duplicadas/erróneas ---');
      
      const [rows] = await connection.query(`
        SELECT p.id, p.cantidad, p.cantidad_recibida, m.nombre, i.modelo
        FROM produccion p
        JOIN maquileros m ON p.maquilero_id = m.id
        JOIN inventario i ON p.inventario_id = i.id
        WHERE (m.nombre LIKE '%Jaqueline Perez%' AND i.modelo = '723138' AND p.cantidad = 1 AND (p.cantidad_recibida IS NULL OR p.cantidad_recibida = 0))
           OR (m.nombre LIKE '%Roberto Mendez%' AND i.modelo = '554303' AND p.cantidad = 161 AND (p.cantidad_recibida IS NULL OR p.cantidad_recibida = 0))
      `);
      
      console.log('Órdenes candidatas para eliminar:', rows);
      
      for (const row of rows) {
        console.log(`Eliminando orden ID: ${row.id} (${row.modelo} - Maquilero: ${row.nombre})`);
        
        const [pagos] = await connection.query("SELECT id FROM pagos WHERE produccion_id = ?", [row.id]);
        for (const p of pagos) {
          await connection.query("DELETE FROM descuentos_personales WHERE pago_id = ?", [p.id]);
        }
        
        await connection.query("DELETE FROM pagos WHERE produccion_id = ?", [row.id]);
        await connection.query("DELETE FROM produccion WHERE id = ?", [row.id]);
        
        console.log(`Orden ID: ${row.id} eliminada con éxito.`);
      }
      
      console.log('--- FIN DE MIGRACIÓN MANUAL ---');
    } catch (e) {
      console.error('Error en migración manual de eliminación:', e);
    }

    try {
      console.log('--- MIGRACIÓN MANUAL: Eliminación de orden 39 ---');
      
      // Eliminar registros de historial general que hagan referencia a la orden 39 o sus pagos
      await connection.query(`
        DELETE FROM historial 
        WHERE description LIKE '%orden 39%' 
           OR description LIKE '%ID #39%' 
           OR description LIKE '%ID 39%' 
           OR (target = 'PRODUCCION' AND description LIKE '%39%')
      `);
      console.log("Historial general de orden 39 depurado.");

      const [p39] = await connection.query("SELECT id FROM produccion WHERE id = 39");
      if (p39.length > 0) {
        const [pagos] = await connection.query("SELECT id FROM pagos WHERE produccion_id = 39");
        for (const p of pagos) {
          await connection.query("DELETE FROM descuentos_personales WHERE pago_id = ?", [p.id]);
        }
        await connection.query("DELETE FROM pagos WHERE produccion_id = 39");
        await connection.query("DELETE FROM produccion WHERE id = 39");
        console.log("Orden 39 eliminada con éxito.");
      } else {
        console.log("Orden 39 ya no existe.");
      }
    } catch (e) {
      console.error('Error al eliminar orden 39:', e);
    }

    try {
      console.log('--- MIGRACIÓN MANUAL: Reversión de orden 740990 para Jose Luis Hernandez Cantu ---');
      
      // 1. Encontrar el ID real de la orden de producción
      const [orderRows] = await connection.query(`
        SELECT p.id 
        FROM produccion p
        JOIN maquileros m ON p.maquilero_id = m.id
        JOIN inventario i ON p.inventario_id = i.id
        WHERE i.modelo = '740990' AND m.nombre LIKE '%Jose Luis%'
      `);
      
      if (orderRows.length > 0) {
        const orderId = orderRows[0].id;
        console.log(`Orden encontrada en la base de datos con ID Real: ${orderId}`);
        
        // 2. Restaurar descuentos personales vinculados a pagos de esta orden
        await connection.query(`
          UPDATE descuentos_personales 
          SET aplicado = 0, pago_id = NULL 
          WHERE pago_id IN (SELECT id FROM pagos WHERE produccion_id = ?)
        `, [orderId]);
        console.log(`Descuentos personales de pagos de orden ID ${orderId} restaurados.`);

        // 3. Eliminar los pagos correspondientes a esta orden
        await connection.query("DELETE FROM pagos WHERE produccion_id = ?", [orderId]);
        console.log(`Pagos de orden ID ${orderId} eliminados.`);

        // 4. Revertir y corregir la orden de producción a 'En proceso', archivado = 0, cantidad = 80, cantidad_recibida = 40, precio_total = 3520.00, ajuste_monto = 320.00, ajuste_tipo = 'bono', ajuste_porcentaje = 10
        await connection.query(`
          UPDATE produccion 
          SET estado = 'En proceso', 
              archivado = 0, 
              cantidad = 80, 
              cantidad_recibida = 40, 
              ajuste_tipo = 'bono',
              ajuste_porcentaje = 10,
              precio_total = 3520.00, 
              ajuste_monto = 320.00,
              fecha_terminado = NULL
          WHERE id = ?
        `, [orderId]);
        console.log(`Orden ID ${orderId} corregida a 80 piezas enviadas / 40 piezas recibidas (con bono 10%) y restaurada a 'En proceso'.`);

        // 5. Limpiar historial de actividades general relativo a la finalización o pagos de esta orden
        await connection.query(`
          DELETE FROM historial 
          WHERE target = 'PRODUCCION' 
            AND (description LIKE ? OR description LIKE ? OR description LIKE ? OR description LIKE ?)
        `, [`%orden ${orderId} %`, `%ID ${orderId} %`, `%orden #${orderId}%`, `%ID #${orderId}%`]);
        console.log(`Historial general de orden ID ${orderId} depurado.`);
      } else {
        console.log("No se encontró ninguna orden para el modelo 740990 y Jose Luis.");
      }
      
      console.log('--- FIN DE MIGRACIÓN MANUAL ORDEN 740990 ---');
    } catch (e) {
      console.error('Error al revertir orden de Jose Luis:', e);
    }

    try {
      console.log('--- MIGRACIÓN MANUAL: Asignar 145 en recibidos para Eliazar Anacleto Romero ---');
      const [updateResult] = await connection.query(`
        UPDATE produccion p
        JOIN maquileros m ON p.maquilero_id = m.id
        JOIN inventario i ON p.inventario_id = i.id
        SET p.cantidad_recibida = 145
        WHERE i.modelo = '526134' 
          AND m.nombre LIKE '%Eliazar%'
          AND p.cantidad = 145
      `);
      console.log(`Orden de Eliazar corregida. Filas afectadas: ${updateResult.affectedRows}`);
      console.log('--- FIN DE MIGRACIÓN MANUAL ELIAZAR ---');
    } catch (e) {
      console.error('Error al actualizar la orden de Eliazar:', e);
    }

    try {
      console.log('--- MIGRACIÓN MANUAL: Restaurar órdenes terminadas de las imágenes a En proceso ---');
      
      // 1. Restaurar las órdenes de producción
      const [updateResult] = await connection.query(`
        UPDATE produccion p
        JOIN maquileros m ON p.maquilero_id = m.id
        JOIN inventario i ON p.inventario_id = i.id
        SET p.estado = 'En proceso', p.fecha_terminado = NULL, p.archivado = 0
        WHERE p.estado = 'Terminado' AND (
          (i.modelo = '554232' AND m.nombre LIKE '%Salvador Salazar%') OR
          (i.modelo = '740987' AND m.nombre LIKE '%Antonio Javier%') OR
          (i.modelo = '723119' AND m.nombre LIKE '%Maria Maricela%') OR
          (i.modelo = '532046' AND m.nombre LIKE '%Victoria Mora%') OR
          (i.modelo = '501476' AND m.nombre LIKE '%Marco Antonio%') OR
          (i.modelo = '731147' AND m.nombre LIKE '%Mas Procesos%') OR
          (i.modelo = '532148' AND m.nombre LIKE '%Jose Enedino%') OR
          (i.modelo = '752935' AND m.nombre LIKE '%Sergio Angel%' AND p.cantidad = 85)
        )
      `);
      console.log(`Órdenes de producción restauradas a 'En proceso'. Filas afectadas: ${updateResult.affectedRows}`);

      // 2. Restaurar los cortes correspondientes
      const [cutUpdateResult] = await connection.query(`
        UPDATE inventario i
        JOIN produccion p ON p.inventario_id = i.id
        JOIN maquileros m ON p.maquilero_id = m.id
        SET i.en_inventario = 0
        WHERE i.modelo IN ('554232', '740987', '723119', '532046', '501476', '731147', '532148', '752935')
          AND (
            (i.modelo = '554232' AND m.nombre LIKE '%Salvador Salazar%') OR
            (i.modelo = '740987' AND m.nombre LIKE '%Antonio Javier%') OR
            (i.modelo = '723119' AND m.nombre LIKE '%Maria Maricela%') OR
            (i.modelo = '532046' AND m.nombre LIKE '%Victoria Mora%') OR
            (i.modelo = '501476' AND m.nombre LIKE '%Marco Antonio%') OR
            (i.modelo = '731147' AND m.nombre LIKE '%Mas Procesos%') OR
            (i.modelo = '532148' AND m.nombre LIKE '%Jose Enedino%') OR
            (i.modelo = '752935' AND m.nombre LIKE '%Sergio Angel%' AND p.cantidad = 85)
          )
      `);
      console.log(`Cortes vinculados reestablecidos a 'en_inventario = 0'. Filas afectadas: ${cutUpdateResult.affectedRows}`);
      console.log('--- FIN DE MIGRACIÓN MANUAL RESTAURACIÓN ---');
    } catch (e) {
      console.error('Error al restaurar las órdenes a En proceso:', e);
    }

    // Retroactive migration to sync all cuts to physical inventory (inventario_real)
    try {
      console.log('--- MIGRACIÓN MANUAL: Sincronización retroactiva de todos los cortes a inventario_real ---');
      const [cuts] = await connection.query("SELECT * FROM inventario");
      let syncedCount = 0;
      for (const cut of cuts) {
        if (!cut.modelo) continue;

        // Check if it already exists in inventario_real
        const [existing] = await connection.query(
          "SELECT id FROM inventario_real WHERE no_orden = ? AND modelo = ?",
          [cut.no_orden || '', cut.modelo]
        );

        if (existing.length === 0) {
          await connection.query(`
            INSERT INTO inventario_real (numero, temporada, modelo, precio, color, cliente, no_orden, piezas, imagen, observaciones, fecha_ingreso)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            cut.numero,
            cut.temporada,
            cut.modelo,
            cut.precio,
            cut.color,
            cut.cliente,
            cut.no_orden,
            cut.piezas_en_proceso,
            cut.imagen,
            cut.observaciones,
            cut.fecha_creacion
          ]);
          syncedCount++;
        }

      }
      
      // Correctly set en_inventario for all cuts:
      // 1. Set en_inventario = 1 only for cuts that have an archived production order
      await connection.query(`
        UPDATE inventario i
        JOIN produccion p ON p.inventario_id = i.id
        SET i.en_inventario = 1
        WHERE p.archivado = 1
      `);

      // 2. Set en_inventario = 0 for cuts that do NOT have any archived production orders
      await connection.query(`
        UPDATE inventario i
        LEFT JOIN (
          SELECT inventario_id FROM produccion WHERE archivado = 1
        ) p_arch ON p_arch.inventario_id = i.id
        SET i.en_inventario = 0
        WHERE p_arch.inventario_id IS NULL
      `);

      console.log(`Sincronización retroactiva completada. ${syncedCount} cortes nuevos añadidos a inventario_real y estados en_inventario corregidos.`);
    } catch (e) {
      console.error('Error en migración de sincronización retroactiva de inventario:', e);
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
