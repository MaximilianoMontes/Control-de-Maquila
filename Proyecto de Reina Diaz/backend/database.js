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

    // Debug: Dump database tables for inspection
    try {
      const fs = require('fs');
      const path = require('path');
      const [historyRows] = await connection.query("SELECT * FROM historial ORDER BY id DESC LIMIT 150");
      const [invRealRows] = await connection.query("SELECT * FROM inventario_real");
      const [prodRows] = await connection.query("SELECT * FROM produccion");
      
      const debugFolder = path.join(__dirname, '..', 'scratch');
      if (!fs.existsSync(debugFolder)) {
        fs.mkdirSync(debugFolder, { recursive: true });
      }
      
      fs.writeFileSync(path.join(debugFolder, 'history.json'), JSON.stringify(historyRows, null, 2));
      fs.writeFileSync(path.join(debugFolder, 'inv_real.json'), JSON.stringify(invRealRows, null, 2));
      fs.writeFileSync(path.join(debugFolder, 'produccion.json'), JSON.stringify(prodRows, null, 2));
      console.log("Debug files written successfully to scratch directory.");
    } catch (e) {
      console.error("Failed to write debug files:", e);
    }

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
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        precio_plancha DECIMAL(10, 2) DEFAULT 0.00
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
        fecha_ingreso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        precio_plancha DECIMAL(10, 2) DEFAULT 0.00
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
        produccion_id INT DEFAULT NULL,
        FOREIGN KEY(camion_id) REFERENCES camiones(id) ON DELETE CASCADE
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS plancha_devoluciones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        camion_detalles_id INT NULL,
        produccion_id INT NULL,
        modelo VARCHAR(255) NOT NULL,
        numero VARCHAR(100),
        temporada VARCHAR(100),
        color TEXT,
        cliente VARCHAR(255),
        no_orden VARCHAR(100),
        precio DECIMAL(10, 2) DEFAULT 0,
        piezas INT DEFAULT 0,
        tallas_cantidades TEXT,
        estado VARCHAR(50) DEFAULT 'pendiente',
        fecha_devolucion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_arreglado TIMESTAMP NULL DEFAULT NULL,
        FOREIGN KEY(camion_detalles_id) REFERENCES camion_detalles(id) ON DELETE SET NULL,
        FOREIGN KEY(produccion_id) REFERENCES produccion(id) ON DELETE SET NULL
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS camion_borrador (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        cargo LONGTEXT NOT NULL,
        observaciones TEXT NULL,
        fecha_envio VARCHAR(50) NULL,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // Migraciones
    try {
      await connection.query("ALTER TABLE camion_detalles ADD COLUMN produccion_id INT DEFAULT NULL");
      console.log("Migration: produccion_id column added to camion_detalles");
    } catch (e) {
      // Si ya existe, ignoramos el error
    }

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
      ['inventario1', 'inv123', 'inventario1'],
      ['plancha', 'plan123', 'plancha']
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
      }
    } catch (e) {
      console.error('Error al eliminar orden 39:', e);
    }

    try {
      console.log('--- MIGRACIÓN MANUAL COMPLETA: Eliminación de datos de pruebas (modelo: pruebsas, maquilero: pruebas) ---');

      // 1. Obtener los IDs de producción asociados al maquilero 'pruebas' o al modelo 'pruebsas'
      const [testOrders] = await connection.query(`
        SELECT p.id, p.inventario_id, p.maquilero_id 
        FROM produccion p
        LEFT JOIN maquileros m ON p.maquilero_id = m.id
        LEFT JOIN inventario i ON p.inventario_id = i.id
        WHERE m.nombre = 'pruebas' OR i.modelo = 'pruebsas'
      `);

      console.log(`Se encontraron ${testOrders.length} ordenes de producción de prueba.`);

      for (const order of testOrders) {
        console.log(`Procesando eliminación de orden de producción ID: ${order.id}`);

        // Find payments associated with this order
        const [pagos] = await connection.query("SELECT id FROM pagos WHERE produccion_id = ?", [order.id]);
        const pagoIds = pagos.map(p => p.id);
        
        if (pagoIds.length > 0) {
          // Delete personal discounts linked to payments
          await connection.query("DELETE FROM descuentos_personales WHERE pago_id IN (?)", [pagoIds]);
          // Delete payments
          await connection.query("DELETE FROM pagos WHERE id IN (?)", [pagoIds]);
        }

        // Delete personal discounts linked to inventario_id
        if (order.inventario_id) {
          await connection.query("DELETE FROM descuentos_personales WHERE inventario_id = ?", [order.inventario_id]);
        }

        // Delete plancha devoluciones associated with this order
        await connection.query("DELETE FROM plancha_devoluciones WHERE produccion_id = ?", [order.id]);

        // Find camion_detalles associated with this order
        const [camionDetalles] = await connection.query("SELECT id FROM camion_detalles WHERE produccion_id = ?", [order.id]);
        const cdIds = camionDetalles.map(cd => cd.id);
        if (cdIds.length > 0) {
          // Delete plancha devoluciones referencing camion_detalles
          await connection.query("DELETE FROM plancha_devoluciones WHERE camion_detalles_id IN (?)", [cdIds]);
          // Delete plancha_trabajos referencing camion_detalles
          await connection.query("DELETE FROM plancha_trabajos WHERE camion_detalles_id IN (?)", [cdIds]);
          // Delete camion_detalles
          await connection.query("DELETE FROM camion_detalles WHERE id IN (?)", [cdIds]);
        }

        // Delete production order
        await connection.query("DELETE FROM produccion WHERE id = ?", [order.id]);

        // Delete inventory record
        if (order.inventario_id) {
          const [cuts] = await connection.query("SELECT modelo, no_orden FROM inventario WHERE id = ?", [order.inventario_id]);
          if (cuts.length > 0) {
            const cut = cuts[0];
            await connection.query("DELETE FROM inventario WHERE id = ?", [order.inventario_id]);
            await connection.query("DELETE FROM inventario_real WHERE no_orden = ? AND modelo = ?", [cut.no_orden || '', cut.modelo]);
            console.log(`Corte de inventario ${cut.modelo} y su inventario real eliminado.`);
          }
        }
      }

      // 2. Eliminar cualquier modelo 'pruebsas' huérfano de inventario e inventario_real
      await connection.query("DELETE FROM inventario WHERE modelo = 'pruebsas'");
      await connection.query("DELETE FROM inventario_real WHERE modelo = 'pruebsas'");

      // 3. Eliminar el maquilero 'pruebas'
      await connection.query("DELETE FROM maquileros WHERE nombre = 'pruebas'");

      // 4. Limpiar historial
      await connection.query(`
        DELETE FROM historial 
        WHERE description LIKE '%pruebsas%' 
           OR description LIKE '%pruebas%' 
           OR description LIKE '%orden 73%' 
           OR description LIKE '%ID 73%' 
           OR description LIKE '%ID #73%'
      `);

      console.log('--- FIN MIGRACIÓN MANUAL COMPLETA DE PRUEBAS ---');
    } catch (e) {
      console.error('Error al depurar datos de pruebas:', e);
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
      
      // 1. Restaurar las órdenes de producción (sólo para modelos que no se envían en camión)
      const [updateResult] = await connection.query(`
        UPDATE produccion p
        JOIN maquileros m ON p.maquilero_id = m.id
        JOIN inventario i ON p.inventario_id = i.id
        SET p.estado = 'En proceso', p.fecha_terminado = NULL, p.archivado = 0
        WHERE p.estado = 'Terminado' AND (
          (i.modelo = '740987' AND m.nombre LIKE '%Antonio Javier%') OR
          (i.modelo = '731147' AND m.nombre LIKE '%Mas Procesos%')
        )
      `);
      console.log(`Órdenes de producción restauradas a 'En proceso'. Filas afectadas: ${updateResult.affectedRows}`);

      // 2. Restaurar los cortes correspondientes
      const [cutUpdateResult] = await connection.query(`
        UPDATE inventario i
        JOIN produccion p ON p.inventario_id = i.id
        JOIN maquileros m ON p.maquilero_id = m.id
        SET i.en_inventario = 0
        WHERE i.modelo IN ('740987', '731147')
          AND (
            (i.modelo = '740987' AND m.nombre LIKE '%Antonio Javier%') OR
            (i.modelo = '731147' AND m.nombre LIKE '%Mas Procesos%')
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

    try {
      console.log('--- MIGRACIÓN MANUAL: Restaurar orden de Juan Ortiz (752943) a En proceso ---');
      const [orderRows] = await connection.query(`
        SELECT p.id, p.estado, p.archivado, i.modelo, m.nombre
        FROM produccion p
        JOIN maquileros m ON p.maquilero_id = m.id
        JOIN inventario i ON p.inventario_id = i.id
        WHERE m.nombre LIKE '%Juan Ortiz%' AND i.modelo = '752943' AND p.cantidad = 180
      `);
      console.log('Ordenes encontradas:', orderRows);
      
      for (const row of orderRows) {
        // Restaurar orden de producción a 'En proceso'
        const [updateResult] = await connection.query(`
          UPDATE produccion 
          SET estado = 'En proceso', 
              archivado = 0, 
              fecha_terminado = NULL
          WHERE id = ?
        `, [row.id]);
        console.log(`Orden ID ${row.id} actualizada a 'En proceso'. Filas afectadas: ${updateResult.affectedRows}`);
        
        // Restaurar corte a en_inventario = 0
        const [cutUpdateResult] = await connection.query(`
          UPDATE inventario i
          JOIN produccion p ON p.inventario_id = i.id
          SET i.en_inventario = 0
          WHERE p.id = ?
        `, [row.id]);
        console.log(`Corte de orden ID ${row.id} actualizado a en_inventario = 0. Filas afectadas: ${cutUpdateResult.affectedRows}`);
      }
      console.log('--- FIN DE MIGRACIÓN MANUAL ---');
    } catch (e) {
      console.error('Error al restaurar orden:', e);
    }

    try {
      console.log('--- MIGRACIÓN MANUAL: Resetear orden de Jaqueline Perez Cortes (modelo 723138) a En proceso ---');
      
      // 1. Buscar la orden
      const [orderRows] = await connection.query(`
        SELECT p.id, p.estado
        FROM produccion p
        JOIN maquileros m ON p.maquilero_id = m.id
        JOIN inventario i ON p.inventario_id = i.id
        WHERE i.modelo = '723138' AND m.nombre LIKE '%Jaqueline Perez%' AND p.cantidad = 172
      `);

      if (orderRows.length > 0) {
        const row = orderRows[0];
        if (row.estado !== 'En proceso') {
          const orderId = row.id;
          console.log(`Orden encontrada con ID: ${orderId}. Estado actual: ${row.estado}. Procediendo a resetear.`);

          // 2. Obtener los pagos asociados a esta orden
          const [pagos] = await connection.query("SELECT id FROM pagos WHERE produccion_id = ?", [orderId]);
          const pagoIds = pagos.map(p => p.id);

          if (pagoIds.length > 0) {
            // 3. Eliminar descuentos personales vinculados a estos pagos
            await connection.query("DELETE FROM descuentos_personales WHERE pago_id IN (?)", [pagoIds]);
            
            // 4. Eliminar los pagos
            await connection.query("DELETE FROM pagos WHERE id IN (?)", [pagoIds]);
            console.log(`Eliminados ${pagoIds.length} pagos para la orden ID: ${orderId}`);
          }

          // 5. Restablecer el estado de la orden en 'produccion'
          await connection.query(`
            UPDATE produccion 
            SET estado = 'En proceso', 
                cantidad_recibida = NULL, 
                archivado = 0,
                fecha_terminado = NULL,
                fecha_fin = NULL
            WHERE id = ?
          `, [orderId]);

          // 6. Restaurar corte a en_inventario = 0
          await connection.query(`
            UPDATE inventario i
            JOIN produccion p ON p.inventario_id = i.id
            SET i.en_inventario = 0
            WHERE p.id = ?
          `, [orderId]);

          // 7. Eliminar registros de camión y plancha
          const [camionDetalles] = await connection.query("SELECT id FROM camion_detalles WHERE produccion_id = ?", [orderId]);
          const cdIds = camionDetalles.map(cd => cd.id);
          if (cdIds.length > 0) {
            await connection.query("DELETE FROM plancha_devoluciones WHERE camion_detalles_id IN (?)", [cdIds]);
            await connection.query("DELETE FROM plancha_trabajos WHERE camion_detalles_id IN (?)", [cdIds]);
            await connection.query("DELETE FROM camion_detalles WHERE id IN (?)", [cdIds]);
          }
          await connection.query("DELETE FROM plancha_devoluciones WHERE produccion_id = ?", [orderId]);

          console.log(`Orden ID: ${orderId} reseteada a 'En proceso' con éxito.`);
        } else {
          console.log(`La orden de Jaqueline Perez Cortes (modelo 723138) ya se encuentra en estado 'En proceso'. No se requiere acción.`);
        }
      } else {
        console.log("No se encontró la orden de Jaqueline Perez Cortes (modelo 723138, cantidad 172).");
      }
      console.log('--- FIN DE MIGRACIÓN MANUAL JAQUELINE ---');
    } catch (e) {
      console.error('Error al resetear la orden de Jaqueline:', e);
    }


    // --- NUEVO MÓDULO: PLANCHA ---
    try {
      console.log('--- MIGRACIÓN: Creando tablas para el Módulo de Plancha ---');
      
      // 1. Tabla planchadores
      await connection.query(`
        CREATE TABLE IF NOT EXISTS planchadores (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nombre VARCHAR(255) NOT NULL,
          telefono VARCHAR(50),
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // 2. Columnas en camion_detalles
      try {
        await connection.query("ALTER TABLE camion_detalles ADD COLUMN verificado TINYINT(1) DEFAULT 0");
        console.log("Migration: verificado column added to camion_detalles");
      } catch (e) {
        // Ignorar si ya existe
      }

      try {
        await connection.query("ALTER TABLE camion_detalles ADD COLUMN precio_plancha DECIMAL(10, 2) DEFAULT 0.00");
        console.log("Migration: precio_plancha column added to camion_detalles");
      } catch (e) {
        // Ignorar si ya existe
      }

      // 3. Tabla planchador_pagos
      await connection.query(`
        CREATE TABLE IF NOT EXISTS planchador_pagos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          planchador_id INT NOT NULL,
          monto DECIMAL(10, 2) NOT NULL,
          fecha DATE NOT NULL,
          tipo_pago VARCHAR(50) DEFAULT 'completo',
          FOREIGN KEY(planchador_id) REFERENCES planchadores(id) ON DELETE CASCADE
        );
      `);

      // 4. Tabla plancha_trabajos
      await connection.query(`
        CREATE TABLE IF NOT EXISTS plancha_trabajos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          planchador_id INT NOT NULL,
          camion_detalles_id INT NULL,
          talla VARCHAR(10) NOT NULL,
          piezas INT DEFAULT 0,
          burro_numero INT NOT NULL,
          estado VARCHAR(50) DEFAULT 'en_proceso',
          precio_unitario DECIMAL(10, 2) DEFAULT 0,
          neto DECIMAL(10, 2) DEFAULT 0,
          ajuste DECIMAL(10, 2) DEFAULT 0,
          total DECIMAL(10, 2) DEFAULT 0,
          pago_id INT DEFAULT NULL,
          color VARCHAR(100) DEFAULT NULL,
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          fecha_terminado TIMESTAMP NULL DEFAULT NULL,
          FOREIGN KEY(planchador_id) REFERENCES planchadores(id) ON DELETE CASCADE,
          FOREIGN KEY(camion_detalles_id) REFERENCES camion_detalles(id) ON DELETE CASCADE,
          FOREIGN KEY(pago_id) REFERENCES planchador_pagos(id) ON DELETE SET NULL
        );
      `);

      // 5. Tabla planchador_asistencias
      await connection.query(`
        CREATE TABLE IF NOT EXISTS planchador_asistencias (
          id INT AUTO_INCREMENT PRIMARY KEY,
          planchador_id INT NOT NULL,
          fecha DATE NOT NULL,
          monto DECIMAL(10, 2) DEFAULT 50.00,
          pago_id INT DEFAULT NULL,
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(planchador_id) REFERENCES planchadores(id) ON DELETE CASCADE,
          FOREIGN KEY(pago_id) REFERENCES planchador_pagos(id) ON DELETE SET NULL,
          UNIQUE KEY unique_planchador_fecha (planchador_id, fecha)
        );
      `);

      // 6. Add color column to plancha_trabajos
      try {
        await connection.query("ALTER TABLE plancha_trabajos ADD COLUMN color VARCHAR(100) DEFAULT NULL");
        console.log("Migration: color column added to plancha_trabajos");
      } catch (e) {
        // Ignorar si ya existe
      }

      // 7. Permitir NULL en camion_detalles_id para que los ajustes/cuadres no fallen por FK en MySQL
      try {
        await connection.query("ALTER TABLE plancha_trabajos MODIFY COLUMN camion_detalles_id INT NULL");
        console.log("Migration: plancha_trabajos.camion_detalles_id modified to allow NULL");
      } catch (e) {
        // Ignorar si falla o ya está
      }
      
      console.log('--- FIN MIGRACIÓN MÓDULO PLANCHA ---');
    } catch (e) {
      console.error('Error al migrar tablas del módulo de plancha:', e);
    }



    // Migration: Backfill pago_id for plancha_trabajos and planchador_asistencias
    try {
      console.log('--- MIGRACIÓN: Asociando trabajos y asistencias huérfanas a pagos históricos ---');
      const [payments] = await connection.query(`
        SELECT id, planchador_id, fecha 
        FROM planchador_pagos 
        ORDER BY fecha ASC, id ASC
      `);

      const [orphanWorks] = await connection.query(`
        SELECT id, planchador_id, fecha_terminado 
        FROM plancha_trabajos 
        WHERE pago_id IS NULL AND estado = 'terminado'
      `);

      const [orphanAsistencias] = await connection.query(`
        SELECT id, planchador_id, fecha 
        FROM planchador_asistencias 
        WHERE pago_id IS NULL
      `);

      const paymentsByPlanchador = {};
      for (const p of payments) {
        if (!paymentsByPlanchador[p.planchador_id]) {
          paymentsByPlanchador[p.planchador_id] = [];
        }
        paymentsByPlanchador[p.planchador_id].push(p);
      }

      const getCleanDateStr = (dateVal) => {
        if (!dateVal) return '';
        if (dateVal instanceof Date) {
          return dateVal.toISOString().split('T')[0];
        }
        const str = String(dateVal);
        const datePart = str.split(' ')[0];
        return datePart.split('T')[0];
      };

      let updatedWorks = 0;
      for (const w of orphanWorks) {
        const planchadorPayments = paymentsByPlanchador[w.planchador_id] || [];
        const wDate = getCleanDateStr(w.fecha_terminado);
        const matchedPayment = planchadorPayments.find(p => getCleanDateStr(p.fecha) >= wDate);
        if (matchedPayment) {
          await connection.query(
            "UPDATE plancha_trabajos SET pago_id = ? WHERE id = ?",
            [matchedPayment.id, w.id]
          );
          updatedWorks++;
        }
      }

      let updatedAsistencias = 0;
      for (const a of orphanAsistencias) {
        const planchadorPayments = paymentsByPlanchador[a.planchador_id] || [];
        const aDate = getCleanDateStr(a.fecha);
        const matchedPayment = planchadorPayments.find(p => getCleanDateStr(p.fecha) >= aDate);
        if (matchedPayment) {
          await connection.query(
            "UPDATE planchador_asistencias SET pago_id = ? WHERE id = ?",
            [matchedPayment.id, a.id]
          );
          updatedAsistencias++;
        }
      }

      console.log(`Migración completada. Trabajos asociados: ${updatedWorks}, Asistencias asociadas: ${updatedAsistencias}`);
    } catch (e) {
      console.error("Error en migración de backfill pago_id:", e);
    }

    // Migration: Add precio_plancha to inventario and inventario_real
    try {
      await connection.query("ALTER TABLE inventario ADD COLUMN precio_plancha DECIMAL(10, 2) DEFAULT 0.00");
      console.log("Migration: precio_plancha column added to inventario");
    } catch (e) {
      // Ignorar si ya existe
    }

    try {
      await connection.query("ALTER TABLE inventario_real ADD COLUMN precio_plancha DECIMAL(10, 2) DEFAULT 0.00");
      console.log("Migration: precio_plancha column added to inventario_real");
    } catch (e) {
      // Ignorar si ya existe
    }

    // Restore missing cuts to inventario_real with stock 0 so they remain visible in Inventory
    try {
      console.log("Migration: Restoring missing fully-shipped cuts to inventario_real with pieces = 0...");
      await connection.query(`
        INSERT INTO inventario_real (numero, modelo, precio, color, cliente, no_orden, piezas, imagen, observaciones, fecha_ingreso, precio_plancha)
        SELECT i.numero, i.modelo, i.precio, i.color, i.cliente, i.no_orden, 0, i.imagen, i.observaciones, i.fecha_creacion, i.precio_plancha
        FROM inventario i
        WHERE NOT EXISTS (
          SELECT 1 FROM inventario_real ir WHERE ir.no_orden = i.no_orden AND ir.modelo = i.modelo
        )
      `);
      console.log("Migration: Missing cuts successfully restored to inventario_real.");
    } catch (e) {
      console.error("Migration Error: Failed to restore missing cuts to inventario_real:", e);
    }

    // Manual one-time migration to reset plancha and camion test data
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS migrations_run (
          migration_name VARCHAR(255) PRIMARY KEY
        );
      `);

      const [run] = await connection.query("SELECT 1 FROM migrations_run WHERE migration_name = 'reset_plancha_test_data'");
      if (run.length === 0) {
        console.log('--- MIGRACIÓN MANUAL: Resetear todo lo de plancha y camiones (pruebas) ---');

        // Limpiar tablas
        console.log('Vaciando tablas de plancha, camión y devoluciones...');
        await connection.query("DELETE FROM plancha_devoluciones");
        await connection.query("DELETE FROM plancha_trabajos");
        await connection.query("DELETE FROM planchador_asistencias");
        await connection.query("DELETE FROM planchador_pagos");
        await connection.query("DELETE FROM camion_detalles");
        await connection.query("DELETE FROM camiones");
        await connection.query("DELETE FROM camion_borrador");

        // Registrar migración completada
        await connection.query("INSERT INTO migrations_run (migration_name) VALUES ('reset_plancha_test_data')");
        console.log('--- FIN DE MIGRACIÓN MANUAL: Resetear plancha completado ---');
      }
    } catch (e) {
      console.error('Error al resetear plancha:', e);
    }

    // Revert stock restoration in inventario_real
    try {
      const [run] = await connection.query("SELECT 1 FROM migrations_run WHERE migration_name = 'revert_plancha_stock_restore'");
      if (run.length === 0) {
        console.log('--- MIGRACIÓN MANUAL: Revertir restauración incorrecta de stock en inventario_real ---');
        
        const updates = [
          { modelo: '541349', no_orden: 'E04113', piezas: 50 },
          { modelo: '723119', no_orden: 'E04063', piezas: 232 },
          { modelo: '526260', no_orden: 'E04059', piezas: 268 },
          { modelo: '554258', no_orden: 'E04071', piezas: 280 },
          { modelo: '501476', no_orden: 'E03984', piezas: 290 },
          { modelo: '532148', no_orden: 'E04049', piezas: 250 },
          { modelo: '532046', no_orden: 'E04002', piezas: 210 },
          { modelo: '554296', no_orden: 'E04047', piezas: 192 },
          { modelo: '554232', no_orden: 'E04114', piezas: 100 },
          { modelo: '723053', no_orden: 'E04046', piezas: 192 },
          { modelo: '752935', no_orden: 'E03918', piezas: 184 },
          { modelo: '752935', no_orden: 'E03951', piezas: 184 }
        ];

        for (const u of updates) {
          await connection.query(
            "UPDATE inventario_real SET piezas = GREATEST(0, piezas - ?) WHERE no_orden = ? AND modelo = ?",
            [u.piezas, u.no_orden, u.modelo]
          );
          console.log(`Revertido: modelo ${u.modelo}, no_orden ${u.no_orden}, restadas ${u.piezas} piezas`);
        }

        await connection.query("INSERT INTO migrations_run (migration_name) VALUES ('revert_plancha_stock_restore')");
        console.log('--- FIN DE MIGRACIÓN MANUAL: Revertido con éxito ---');
      }
    } catch (e) {
      console.error('Error al revertir stock de plancha:', e);
    }

    // Archive plancha test production orders (set archivado = 3)
    try {
      const [run] = await connection.query("SELECT 1 FROM migrations_run WHERE migration_name = 'archive_plancha_test_orders'");
      if (run.length === 0) {
        console.log('--- MIGRACIÓN MANUAL: Archivar órdenes de producción de prueba de plancha ---');
        
        const ids = [10, 11, 12, 23, 28, 31, 46, 61, 62, 69, 76, 105, 106, 112, 113, 114, 115, 116, 118];
        
        await connection.query(
          "UPDATE produccion SET archivado = 3 WHERE id IN (?)",
          [ids]
        );
        
        console.log(`Actualizadas ${ids.length} órdenes de producción a archivado = 3`);

        await connection.query("INSERT INTO migrations_run (migration_name) VALUES ('archive_plancha_test_orders')");
        console.log('--- FIN DE MIGRACIÓN MANUAL: Archivar órdenes completado ---');
      }
    } catch (e) {
      console.error('Error al archivar órdenes de prueba:', e);
    }

    // Restore specific target orders to the truck list (unarchive and reset 541349 shipped count)
    try {
      const [run] = await connection.query("SELECT 1 FROM migrations_run WHERE migration_name = 'restore_truck_target_orders_v2'");
      if (run.length === 0) {
        console.log('--- MIGRACIÓN MANUAL: Restaurar órdenes sobrantes de camión V2 ---');
        
        // 1. Unarchive target production orders: 23 (526285), 46 (723175), 61 (723053), 76 (541349), 69 (752995), 105 (752935), 106 (752935)
        const targetIds = [23, 46, 61, 76, 69, 105, 106];
        await connection.query(
          "UPDATE produccion SET archivado = 0 WHERE id IN (?)",
          [targetIds]
        );
        console.log('Producción unarchived para IDs:', targetIds);

        // 2. Delete previous truck shipments for 541349 (produccion_id = 76) to make all 50 pieces available again
        await connection.query(
          "DELETE FROM camion_detalles WHERE produccion_id = 76"
        );
        console.log('Eliminados registros de camion_detalles para produccion_id 76');

        await connection.query("INSERT INTO migrations_run (migration_name) VALUES ('restore_truck_target_orders_v2')");
        console.log('--- FIN DE MIGRACIÓN MANUAL: Restauración V2 completada ---');
      }
    } catch (e) {
      console.error('Error al restaurar órdenes sobrantes de camión V2:', e);
    }

    // Permanently archive 526285, 723175, 723053, 752935 (archivado = 3 = eliminado permanente)
    try {
      const [run] = await connection.query("SELECT 1 FROM migrations_run WHERE migration_name = 'archive_leftover_truck_orders_v1'");
      if (run.length === 0) {
        console.log('--- MIGRACIÓN MANUAL: Archivar permanentemente órdenes sobrantes del camión ---');

        // IDs: 23 (526285), 46 (723175), 61 (723053), 105 (752935), 106 (752935)
        const idsToArchive = [23, 46, 61, 105, 106];

        // 1. Set archivado = 3 (eliminado permanente - no aparece en ninguna lista)
        await connection.query(
          "UPDATE produccion SET archivado = 3 WHERE id IN (?)",
          [idsToArchive]
        );
        console.log('Producción archivada permanentemente (archivado=3) para IDs:', idsToArchive);

        // 2. Limpiar camion_detalles para que no aparezcan en la lista del camión
        await connection.query(
          "DELETE FROM camion_detalles WHERE produccion_id IN (?)",
          [idsToArchive]
        );
        console.log('Registros de camion_detalles eliminados para IDs:', idsToArchive);

        // 3. Limpiar plancha_trabajos relacionados si los hay
        await connection.query(
          "DELETE pt FROM plancha_trabajos pt INNER JOIN camion_detalles cd ON pt.camion_detalles_id = cd.id WHERE cd.produccion_id IN (?)",
          [idsToArchive]
        );

        await connection.query("INSERT INTO migrations_run (migration_name) VALUES ('archive_leftover_truck_orders_v1')");
        console.log('--- FIN DE MIGRACIÓN MANUAL: Órdenes archivadas permanentemente ---');
      }
    } catch (e) {
      console.error('Error al archivar órdenes sobrantes del camión:', e);
    }

    // REVERT: Restore 526285, 723175, 723053, 752935 back to archivado=0 (visible in truck list)
    try {
      const [run] = await connection.query("SELECT 1 FROM migrations_run WHERE migration_name = 'revert_archive_leftover_truck_orders_v1'");
      if (run.length === 0) {
        console.log('--- MIGRACIÓN MANUAL: Revertir archivado permanente de órdenes sobrantes ---');

        // IDs: 23 (526285), 46 (723175), 61 (723053), 105 (752935), 106 (752935)
        const idsToRestore = [23, 46, 61, 105, 106];

        await connection.query(
          "UPDATE produccion SET archivado = 0 WHERE id IN (?)",
          [idsToRestore]
        );
        console.log('Producción restaurada a archivado=0 para IDs:', idsToRestore);

        await connection.query("INSERT INTO migrations_run (migration_name) VALUES ('revert_archive_leftover_truck_orders_v1')");
        console.log('--- FIN DE MIGRACIÓN MANUAL: Órdenes restauradas ---');
      }
    } catch (e) {
      console.error('Error al revertir archivado de órdenes:', e);
    }


    // FINAL MIGRATION: Restore deleted truck shipments and permanently archive target orders (archivado = 3)
    try {
      const [run] = await connection.query("SELECT 1 FROM migrations_run WHERE migration_name = 'restore_truck_19_details_final_v1'");
      if (run.length === 0) {
        console.log('--- MIGRACIÓN MANUAL: Restaurar envíos de camión y archivar órdenes ---');

        const targetIds = [23, 46, 61, 105, 106];

        // 1. Get production order details
        const [prodRows] = await connection.query(`
          SELECT p.id as produccion_id, p.cantidad, p.cantidad_recibida, p.estado, p.archivado, 
                 i.modelo, i.no_orden, i.color as variantes_json, i.precio, i.numero, i.temporada, i.cliente
          FROM produccion p
          JOIN inventario i ON p.inventario_id = i.id
          WHERE p.id IN (?)
        `, [targetIds]);

        const prodLookup = {};
        prodRows.forEach(r => {
          prodLookup[r.produccion_id] = r;
        });

        // 2. Query history logs matching the target models and truck shipments
        const [historyRows] = await connection.query(
          "SELECT description FROM historial WHERE action = 'EDIT' AND target = 'INVENTARIO_REAL' AND description LIKE 'Subió al camión %' ORDER BY id ASC"
        );

        // 3. Recreate missing camion_detalles rows
        for (const log of historyRows) {
          const regex = /Subió al camión #(\d+)\s+\(([^)]+)\)\s+(\d+)\s+piezas del modelo\s+(\S+)\s+\(Tallas:\s*(.+)\)/;
          const match = log.description.match(regex);
          if (!match) continue;

          const camionId = parseInt(match[1]);
          const fechaEnvio = match[2];
          const piezas = parseInt(match[3]);
          const modelo = match[4];
          const tallas_cantidades = match[5];

          // Determine the correct produccion_id for target models
          let produccionId = null;
          if (modelo === '526285') produccionId = 23;
          else if (modelo === '723175') produccionId = 46;
          else if (modelo === '723053') produccionId = 61;
          else if (modelo === '752935') {
            if (piezas === 92) produccionId = 106;
            else if (piezas === 96 || piezas === 20) produccionId = 105;
          }

          if (!produccionId) continue;

          const prodInfo = prodLookup[produccionId];
          if (!prodInfo) continue;

          // Set verified status to 1 (since they were verified) and use correct precio_plancha
          const verificado = 1;
          let precioPlancha = 0.00;
          if (camionId === 19) {
            if (modelo === '526285') precioPlancha = 7.00;
            else if (modelo === '723175') precioPlancha = 5.00;
            else if (modelo === '723053') precioPlancha = 8.00;
            else if (modelo === '752935') precioPlancha = 5.00;
          } else {
            if (modelo === '526285') precioPlancha = 5.00;
            else if (modelo === '723175') precioPlancha = 5.00;
            else if (modelo === '723053') precioPlancha = 7.00;
            else if (modelo === '752935') precioPlancha = 5.00;
          }

          // Check if this record already exists in camion_detalles to prevent duplicates
          const [exists] = await connection.query(
            "SELECT id FROM camion_detalles WHERE camion_id = ? AND modelo = ? AND produccion_id = ? AND piezas = ?",
            [camionId, modelo, produccionId, piezas]
          );

          if (exists.length === 0) {
            await connection.query(`
              INSERT INTO camion_detalles 
              (camion_id, numero, temporada, modelo, precio, color, cliente, no_orden, piezas, tallas_cantidades, produccion_id, precio_plancha, verificado)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              camionId,
              prodInfo.numero || null,
              prodInfo.temporada || null,
              prodInfo.modelo || null,
              parseFloat(prodInfo.precio) || 0,
              prodInfo.variantes_json || null,
              prodInfo.cliente || null,
              prodInfo.no_orden || null,
              piezas,
              tallas_cantidades,
              produccionId,
              precioPlancha,
              verificado
            ]);
            console.log(`Restaurado camion_detalles: Camion #${camionId}, Modelo ${modelo}, Piezas ${piezas}, Produccion ID ${produccionId}`);
          }
        }

        // 4. Archive production orders with archivado = 3 (permanent archive)
        await connection.query(
          "UPDATE produccion SET archivado = 3 WHERE id IN (?)",
          [targetIds]
        );
        console.log('Órdenes de producción archivadas permanentemente (archivado=3):', targetIds);

        // 5. Clean up truck #19 observaciones (remove the debug block)
        const [truck] = await connection.query("SELECT observaciones FROM camiones WHERE id = 19");
        if (truck.length > 0 && truck[0].observaciones) {
          const cleanObs = truck[0].observaciones.split('\n\n=== DEBUG DATA ===')[0];
          await connection.query("UPDATE camiones SET observaciones = ? WHERE id = 19", [cleanObs]);
          console.log('Observaciones de camión #19 limpiadas.');
        }

        await connection.query("INSERT INTO migrations_run (migration_name) VALUES ('restore_truck_19_details_final_v1')");
        console.log('--- FIN DE MIGRACIÓN MANUAL: Restauración completada ---');
      }
    } catch (e) {
      console.error('Error in final restoration migration:', e);
      global.migrationError = e.message + "\n" + e.stack;
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
