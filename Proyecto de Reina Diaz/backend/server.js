// Server initialized - Triggering redeploy
const express = require('express');
const cors = require('cors');
const db = require('./database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const xlsx = require('xlsx');
const PDFDocument = require('pdfkit-table');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
require('dotenv').config();

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){fs.mkdirSync(uploadDir);}

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadDir) },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '';
    cb(null, Date.now() + '-' + Math.round(Math.random()*1E9) + ext);
  }
});
const upload = multer({ storage: storage });

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET_KEY = process.env.SECRET_KEY || 'minierp_secret_key_super_secure';

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware de Autenticación
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token no proporcionado' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
    req.user = user;
    next();
  });
};

// Helper para formatear fechas a DD/MM/YYYY
const formatDateToDMY = (dateVal) => {
  if (!dateVal) return '-';
  let str = "";
  if (dateVal instanceof Date) {
    const offset = dateVal.getTimezoneOffset();
    const localDate = new Date(dateVal.getTime() - (offset * 60 * 1000));
    str = localDate.toISOString();
  } else {
    str = String(dateVal);
  }
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [_, year, month, day] = match;
    return `${parseInt(day, 10)}/${parseInt(month, 10)}/${year}`;
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return str;
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

// Helper para registrar actividad
const logActivity = async (userId, action, target, description) => {
  try {
    await db.query("INSERT INTO historial (user_id, action, target, description) VALUES (?, ?, ?, ?)", [userId, action, target, description]);
  } catch (error) {
    console.error("Error al registrar historial:", error);
  }
};

// Helper para procesar y comprimir imágenes
const processImage = async (file) => {
  if (!file) return null;
  const fileName = 'compressed-' + Date.now() + '.jpg';
  const outputPath = path.join(uploadDir, fileName);
  
  try {
    await sharp(file.path)
      .resize(1200, null, { withoutEnlargement: true }) // Máximo 1200px de ancho
      .jpeg({ quality: 80 }) // 80% de calidad para ahorrar espacio
      .toFile(outputPath);
      
    // Borrar el archivo original sin comprimir para no duplicar espacio
    fs.unlink(file.path, (err) => {
      if (err) {
        // Ignorar si el archivo no existe
      }
    });
    
    return '/uploads/' + fileName;
  } catch (error) {
    console.error("Error al procesar imagen con sharp:", error);
    return '/uploads/' + file.filename; // Fallback al original si falla sharp
  }
};

// Helper to check production conditions and transfer to inventory
const checkAndMoveToInventory = async (produccionId, userId) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get the production order details and associated cut_id
    const [prodRows] = await connection.query(`
      SELECT p.*, i.en_inventario, i.id as cut_id, i.modelo
      FROM produccion p
      LEFT JOIN inventario i ON p.inventario_id = i.id
      WHERE p.id = ?
    `, [produccionId]);

    const prod = prodRows[0];
    if (!prod || !prod.cut_id) {
      await connection.rollback();
      return;
    }

    // If the production order is archived, we hide the cut from Cortes
    if (prod.archivado >= 1) {
      if (prod.en_inventario !== 1) {
        await connection.query("UPDATE inventario SET en_inventario = 1 WHERE id = ?", [prod.cut_id]);
        
        const desc = `Marcó el modelo ${prod.modelo} como completado (oculto en Cortes) por liquidación de Orden #${produccionId}`;
        await connection.query(
          "INSERT INTO historial (user_id, action, target, description) VALUES (?, 'EDIT', 'INVENTARIO', ?)",
          [userId || 1, desc]
        );
      }
    } else {
      // If the production order is NOT archived, we make the cut visible in Cortes
      if (prod.en_inventario === 1) {
        await connection.query("UPDATE inventario SET en_inventario = 0 WHERE id = ?", [prod.cut_id]);

        const desc = `Restauró el modelo ${prod.modelo} a Cortes debido a desarchivado de la Orden #${produccionId}`;
        await connection.query(
          "INSERT INTO historial (user_id, action, target, description) VALUES (?, 'EDIT', 'INVENTARIO', ?)",
          [userId || 1, desc]
        );
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error("Error in checkAndMoveToInventory:", error);
  } finally {
    connection.release();
  }
};

// Auth Endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username y password requeridos' });
  }

  try {
    const [users] = await db.query("SELECT * FROM users WHERE username = ?", [username]);
    const user = users[0];

    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    
    const match = bcrypt.compareSync(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '12h' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// APIs Historial
app.get('/api/historial', authenticateToken, async (req, res) => {
  const { limit = 50, recent } = req.query;
  const isAdmin = req.user.role === 'admin';
  const userId = req.user.id;

  try {
    let baseQuery = `
      SELECT h.*, u.username 
      FROM historial h 
      JOIN users u ON h.user_id = u.id 
    `;
    
    let whereClause = "";
    const params = [];

    if (!isAdmin) {
      whereClause = " WHERE h.user_id = ? ";
      params.push(userId);
    }
    
    let orderLimit = "";
    if (recent) {
      orderLimit = ` ORDER BY h.timestamp DESC LIMIT 10`;
    } else {
      orderLimit = ` ORDER BY h.timestamp DESC LIMIT ?`;
      params.push(parseInt(limit));
    }
    
    const [logs] = await db.query(baseQuery + whereClause + orderLimit, params);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// APIs Maquileros
app.get('/api/maquileros', async (req, res) => {
  try {
    const [maquileros] = await db.query("SELECT * FROM maquileros");
    res.json(maquileros);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/maquileros/:id', async (req, res) => {
  try {
    const [maquileros] = await db.query("SELECT * FROM maquileros WHERE id = ?", [req.params.id]);
    const maquilero = maquileros[0];
    if (!maquilero) {
      return res.status(404).json({ error: 'Maquilero no encontrado' });
    }

    // Obtener historial de produccion
    const [historial] = await db.query(`
      SELECT p.*, i.modelo as producto_modelo, i.imagen as producto_imagen,
             (SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE produccion_id = p.id) as pagado_efectivo,
             (SELECT COALESCE(SUM(dp.monto_total), 0) FROM descuentos_personales dp 
              JOIN pagos pg ON dp.pago_id = pg.id 
              WHERE pg.produccion_id = p.id) as descuento_aplicado
      FROM produccion p
      LEFT JOIN inventario i ON p.inventario_id = i.id
      WHERE p.maquilero_id = ?
      ORDER BY p.id DESC
    `, [req.params.id]);

    let totalEntregadas = 0;
    let totalEnviadas = 0;
    let totalRetrasos = 0;
    let numOrdenes = historial.length;

    historial.forEach(h => {
      totalEnviadas += h.cantidad || 0;
      totalEntregadas += (h.cantidad_recibida !== null ? h.cantidad_recibida : h.cantidad) || 0;
      totalRetrasos += h.retrasos || 0;
    });

    let scoreFulfillment = totalEnviadas > 0 ? (totalEntregadas / totalEnviadas) * 100 : 0;
    let scorePunctuality = numOrdenes > 0 ? Math.max(0, 100 - (totalRetrasos * 10)) : 0;
    
    maquilero.historial = historial;
    maquilero.rating = {
      fulfillment: scoreFulfillment.toFixed(1),
      punctuality: scorePunctuality.toFixed(1),
      total: numOrdenes > 0 ? ((scoreFulfillment + scorePunctuality) / 2).toFixed(1) : "0.0"
    };

    res.json(maquilero);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/maquileros', authenticateToken, upload.single('imagenBtn'), async (req, res) => {
  const { nombre, maquinaria, personal, domicilio, colonia, codigo_postal, telefono } = req.body;
  const imagen = await processImage(req.file);
  const numPersonal = parseInt(personal) || null;
  
  try {
    const [result] = await db.query("INSERT INTO maquileros (nombre, maquinaria, personal, domicilio, colonia, codigo_postal, telefono, imagen) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", 
      [nombre, maquinaria, numPersonal, domicilio, colonia, codigo_postal, telefono, imagen]);
    
    await logActivity(req.user.id, 'ALTA', 'MAQUILERO', `Se registró al maquilero: ${nombre}`);
    
    res.json({ id: result.insertId, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/maquileros/:id/imagen', upload.single('imagenBtn'), async (req, res) => {
  const imagen = await processImage(req.file);
  if (!imagen) return res.status(400).json({ error: 'No se recibió imagen' });
  try {
    await db.query("UPDATE maquileros SET imagen = ? WHERE id = ?", [imagen, req.params.id]);
    res.json({ success: true, imagen });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/maquileros/:id', authenticateToken, upload.single('imagenBtn'), async (req, res) => {
  const { nombre, maquinaria, personal, domicilio, colonia, codigo_postal, telefono } = req.body;
  const imagen = req.file ? await processImage(req.file) : (req.body.imagen_actual || null);
  const numPersonal = parseInt(personal) || null;

  try {
    const [olds] = await db.query("SELECT * FROM maquileros WHERE id = ?", [req.params.id]);
    const old = olds[0];
    if (!old) return res.status(404).json({ error: 'Maquilero no encontrado' });

    await db.query("UPDATE maquileros SET nombre=?, maquinaria=?, personal=?, domicilio=?, colonia=?, codigo_postal=?, telefono=?, imagen=? WHERE id=?",
      [nombre, maquinaria, numPersonal, domicilio, colonia, codigo_postal, telefono, imagen, req.params.id]);

    let changes = [];
    if (old.nombre !== nombre) changes.push(`Nombre: ${old.nombre} -> ${nombre}`);
    if (old.telefono !== telefono) changes.push(`Tel: ${old.telefono || 'N/A'} -> ${telefono || 'N/A'}`);
    if (old.maquinaria !== maquinaria) changes.push(`Maq: ${old.maquinaria || 'N/A'} -> ${maquinaria || 'N/A'}`);
    
    const desc = changes.length > 0 ? `Editó a ${nombre}: ${changes.join(', ')}` : `Actualizó datos de ${nombre}`;
    await logActivity(req.user.id, 'EDIT', 'MAQUILERO', desc);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/maquileros/:id', authenticateToken, async (req, res) => {
  try {
    const [olds] = await db.query("SELECT nombre FROM maquileros WHERE id = ?", [req.params.id]);
    const old = olds[0];
    await db.query("DELETE FROM maquileros WHERE id = ?", [req.params.id]);
    if (old) {
      await logActivity(req.user.id, 'BAJA', 'MAQUILERO', `Eliminó al maquilero: ${old.nombre}`);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// APIs Inventario
app.get('/api/inventario', async (req, res) => {
  try {
    const [items] = await db.query(`
      SELECT i.*, 
        (SELECT COUNT(id) FROM produccion WHERE inventario_id = i.id) as producciones_count
      FROM inventario i
      WHERE i.en_inventario = 0 OR i.en_inventario IS NULL
      ORDER BY i.id DESC
    `);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inventario', authenticateToken, upload.single('imagenBtn'), async (req, res) => {
  let { numero, modelo, precio, color, cliente, no_orden, piezas_en_proceso, imagenUrl, observaciones, es_reprogramacion, precio_plancha } = req.body;
  const finalImageUrl = req.file ? await processImage(req.file) : (imagenUrl || null);
  const isReprog = (es_reprogramacion === 'true' || es_reprogramacion === true || es_reprogramacion === 1) ? 1 : 0;

  try {
    const variantes = JSON.parse(color);
    if (Array.isArray(variantes)) {
      piezas_en_proceso = variantes.reduce((sum, v) => sum + (parseInt(v.cantidad) || 0), 0);
    }
  } catch (e) {
    piezas_en_proceso = parseInt(piezas_en_proceso) || 0;
  }

  try {
    if (!isReprog) {
      const [existingRows] = await db.query("SELECT id FROM inventario WHERE numero = ? OR modelo = ?", [
        numero ? String(numero) : null, 
        modelo ? String(modelo) : null
      ]);
      if (existingRows.length > 0) {
        return res.status(400).json({ error: 'Este Código/Modelo ya existe. Si deseas hacer una nueva corrida, usa el botón de Reprogramar.' });
      }
    }

    const [result] = await db.query(`
      INSERT INTO inventario 
      (numero, modelo, precio, color, cliente, no_orden, piezas_en_proceso, imagen, observaciones, es_reprogramacion, precio_plancha) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      numero ? String(numero) : null,
      modelo ? String(modelo) : null,
      parseFloat(String(precio).replace(/[^0-9.-]+/g,"")) || 0,
      color ? String(color) : null,
      cliente ? String(cliente) : null,
      no_orden ? String(no_orden) : null,
      parseInt(piezas_en_proceso) || 0,
      finalImageUrl ? String(finalImageUrl) : null,
      observaciones ? String(observaciones) : null,
      isReprog ? 1 : 0,
      parseFloat(String(precio_plancha).replace(/[^0-9.-]+/g,"")) || 0
    ]);
    
    const logTag = isReprog ? 'REPROGRAMACION' : 'ALTA';
    await logActivity(req.user.id, logTag, 'INVENTARIO', `${isReprog ? 'Reprogramó' : 'Agregó'} ${modelo} (${piezas_en_proceso} piezas)`);
    
    // Automatically mirror the new cut in inventario_real
    await db.query(`
      INSERT INTO inventario_real (numero, temporada, modelo, precio, color, cliente, no_orden, piezas, imagen, observaciones, fecha_ingreso, precio_plancha)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
    `, [
      numero ? String(numero) : null,
      req.body.temporada ? String(req.body.temporada) : null,
      modelo ? String(modelo) : null,
      parseFloat(String(precio).replace(/[^0-9.-]+/g,"")) || 0,
      color ? String(color) : null,
      cliente ? String(cliente) : null,
      no_orden ? String(no_orden) : null,
      parseInt(piezas_en_proceso) || 0,
      finalImageUrl ? String(finalImageUrl) : null,
      observaciones ? String(observaciones) : null,
      parseFloat(String(precio_plancha).replace(/[^0-9.-]+/g,"")) || 0
    ]);

    res.json({ id: result.insertId, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/inventario/:id/imagen', upload.single('imagenBtn'), async (req, res) => {
  const { imagenUrl } = req.body;
  const finalImageUrl = req.file ? await processImage(req.file) : (imagenUrl || null);
  try {
    await db.query("UPDATE inventario SET imagen = ? WHERE id = ?", [
      finalImageUrl ? String(finalImageUrl) : null, 
      req.params.id
    ]);
    res.json({ success: true, imagen: finalImageUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/inventario/:id', authenticateToken, upload.single('imagenBtn'), async (req, res) => {
  let { numero, modelo, precio, color, cliente, no_orden, piezas_en_proceso, imagenUrl, imagen_actual, observaciones, precio_plancha } = req.body;
  const imagen = req.file ? await processImage(req.file) : (imagenUrl || imagen_actual || null);
  
  try {
    const variantes = JSON.parse(color);
    if (Array.isArray(variantes)) {
      piezas_en_proceso = variantes.reduce((sum, v) => sum + (parseInt(v.cantidad) || 0), 0);
    }
  } catch (e) {
    piezas_en_proceso = parseInt(piezas_en_proceso) || 0;
  }

  try {
    const [olds] = await db.query("SELECT * FROM inventario WHERE id = ?", [req.params.id]);
    const old = olds[0];
    if (!old) return res.status(404).json({ error: 'Producto no encontrado' });

    await db.query(`
      UPDATE inventario 
      SET numero=?, modelo=?, precio=?, color=?, cliente=?, no_orden=?, piezas_en_proceso=?, imagen=?, observaciones=?, precio_plancha=? 
      WHERE id=?
    `, [
      numero ? String(numero) : null,
      modelo ? String(modelo) : null,
      parseFloat(String(precio).replace(/[^0-9.-]+/g,"")) || 0,
      color ? String(color) : null,
      cliente ? String(cliente) : null,
      no_orden ? String(no_orden) : null,
      parseInt(piezas_en_proceso) || 0,
      imagen ? String(imagen) : null,
      observaciones ? String(observaciones) : null,
      parseFloat(String(precio_plancha).replace(/[^0-9.-]+/g,"")) || 0,
      req.params.id
    ]);

    let changes = [];
    if (old.modelo !== modelo) changes.push(`Modelo: ${old.modelo} -> ${modelo}`);
    const numPrecio = parseFloat(String(precio).replace(/[^0-9.-]+/g,"")) || 0;
    if (old.precio !== numPrecio) changes.push(`Precio: ${old.precio} -> ${numPrecio}`);
    if (old.piezas_en_proceso !== piezas_en_proceso) changes.push(`Piezas: ${old.piezas_en_proceso} -> ${piezas_en_proceso}`);
    const numPrecioPlancha = parseFloat(String(precio_plancha).replace(/[^0-9.-]+/g,"")) || 0;
    if (old.precio_plancha !== numPrecioPlancha) changes.push(`Precio Plancha: ${old.precio_plancha} -> ${numPrecioPlancha}`);
    
    const desc = changes.length > 0 ? `Editó ${modelo}: ${changes.join(', ')}` : `Actualizó datos de ${modelo}`;
    await logActivity(req.user.id, 'EDIT', 'INVENTARIO', desc);

    // Automatically update the mirrored record in inventario_real
    const [updateResult] = await db.query(`
      UPDATE inventario_real 
      SET numero=?, modelo=?, precio=?, color=?, cliente=?, no_orden=?, piezas=?, imagen=?, observaciones=?, precio_plancha=?
      WHERE no_orden=? AND modelo=?
    `, [
      numero ? String(numero) : null,
      modelo ? String(modelo) : null,
      parseFloat(String(precio).replace(/[^0-9.-]+/g,"")) || 0,
      color ? String(color) : null,
      cliente ? String(cliente) : null,
      no_orden ? String(no_orden) : null,
      parseInt(piezas_en_proceso) || 0,
      imagen ? String(imagen) : null,
      observaciones ? String(observaciones) : null,
      parseFloat(String(precio_plancha).replace(/[^0-9.-]+/g,"")) || 0,
      old.no_orden || '',
      old.modelo
    ]);

    if (updateResult.affectedRows === 0) {
      await db.query(`
        INSERT INTO inventario_real (numero, modelo, precio, color, cliente, no_orden, piezas, imagen, observaciones, fecha_ingreso, precio_plancha)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
      `, [
        numero ? String(numero) : null,
        modelo ? String(modelo) : null,
        parseFloat(String(precio).replace(/[^0-9.-]+/g,"")) || 0,
        color ? String(color) : null,
        cliente ? String(cliente) : null,
        no_orden ? String(no_orden) : null,
        parseInt(piezas_en_proceso) || 0,
        imagen ? String(imagen) : null,
        observaciones ? String(observaciones) : null,
        parseFloat(String(precio_plancha).replace(/[^0-9.-]+/g,"")) || 0
      ]);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/inventario/:id', authenticateToken, async (req, res) => {
  try {
    const [olds] = await db.query("SELECT modelo, no_orden FROM inventario WHERE id = ?", [req.params.id]);
    const old = olds[0];
    if (!old) return res.status(404).json({ error: 'Producto no encontrado' });

    await db.query("DELETE FROM inventario WHERE id = ?", [req.params.id]);

    // Automatically delete the mirrored record in inventario_real
    await db.query("DELETE FROM inventario_real WHERE no_orden = ? AND modelo = ?", [old.no_orden || '', old.modelo]);

    await logActivity(req.user.id, 'BAJA', 'INVENTARIO', `Eliminó del inventario: ${old.modelo}`);
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(400).json({ error: 'No se puede eliminar este producto porque ya tiene órdenes de producción o descuentos vinculados. Primero debe eliminar esas vinculaciones.' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inventario/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Archivo no proporcionado' });
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      for (const row of data) {
        let rawNumero = row['#'] || '';
        let numero = Array.isArray(rawNumero) ? rawNumero[0] : rawNumero;
        const temporada = String(row['TEMPORADA'] || row['Temporada'] || '');
        const modelo = row['MODELO'] || row['Modelo'] || null;
        let rawPrecio = String(row['PRECIO'] || row['Precio'] || '0').replace(/[^0-9.-]+/g,"");
        let precio = parseFloat(rawPrecio) || 0;
        const color = String(row['COLOR'] || row['Color'] || '');
        const cliente = String(row['CLIENTE'] || row['Cliente'] || '');
        const no_orden = String(row['NO. ORDEN'] || row['no. orden'] || row['No. Orden'] || row['NO ORDEN'] || '');
        const piezasStr = row['PIEZAS EN PROCESO'] || row['Piezas en proceso'] || row['PIEZAS'] || '0';
        const piezas_en_proceso = parseInt(String(piezasStr), 10) || 0;
        
        if (modelo) {
          const m = String(modelo).trim();
          await connection.query(`
            INSERT INTO inventario (numero, temporada, modelo, precio, color, cliente, no_orden, piezas_en_proceso, en_inventario) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
            ON DUPLICATE KEY UPDATE 
            piezas_en_proceso = piezas_en_proceso + VALUES(piezas_en_proceso),
            temporada = VALUES(temporada),
            precio = VALUES(precio),
            color = VALUES(color),
            cliente = VALUES(cliente),
            no_orden = VALUES(no_orden)
          `, [String(numero), temporada, m, precio, color, cliente, no_orden, piezas_en_proceso]);

          // Mirror immediately to inventario_real
          const [existingReal] = await connection.query("SELECT id FROM inventario_real WHERE no_orden = ? AND modelo = ?", [no_orden, m]);
          if (existingReal.length > 0) {
            await connection.query(`
              UPDATE inventario_real 
              SET numero=?, temporada=?, precio=?, color=?, cliente=?, piezas=piezas + ?
              WHERE no_orden=? AND modelo=?
            `, [String(numero), temporada, precio, color, cliente, piezas_en_proceso, no_orden, m]);
          } else {
            await connection.query(`
              INSERT INTO inventario_real (numero, temporada, modelo, precio, color, cliente, no_orden, piezas, fecha_ingreso)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [String(numero), temporada, m, precio, color, cliente, no_orden, piezas_en_proceso]);
          }
        }
      }
      
      await connection.commit();
      res.json({ success: true, count: data.length });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// APIs Inventario Real
app.get('/api/inventario_real', async (req, res) => {
  try {
    const [items] = await db.query("SELECT * FROM inventario_real ORDER BY id DESC");
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/inventario_real/:id', authenticateToken, async (req, res) => {
  try {
    const [olds] = await db.query("SELECT modelo FROM inventario_real WHERE id = ?", [req.params.id]);
    const old = olds[0];
    await db.query("DELETE FROM inventario_real WHERE id = ?", [req.params.id]);
    if (old) {
      await logActivity(req.user.id, 'BAJA', 'INVENTARIO_REAL', `Eliminó del inventario general: ${old.modelo}`);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// APIs Camiones
app.get('/api/camiones', authenticateToken, async (req, res) => {
  const allowedRoles = ['admin', 'produccion1', 'produccion2'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'No autorizado para esta sección' });
  }

  try {
    const [camiones] = await db.query("SELECT * FROM camiones ORDER BY id DESC");
    const [detalles] = await db.query("SELECT * FROM camion_detalles");
    
    // Group details by camion_id
    const detallesMap = {};
    for (const d of detalles) {
      if (d.tallas_cantidades) {
        try {
          d.tallas_cantidades = JSON.parse(d.tallas_cantidades);
        } catch (e) {
          d.tallas_cantidades = {};
        }
      } else {
        d.tallas_cantidades = {};
      }
      if (!detallesMap[d.camion_id]) {
        detallesMap[d.camion_id] = [];
      }
      detallesMap[d.camion_id].push(d);
    }

    // Attach details to camiones
    const result = camiones.map(c => ({
      ...c,
      items: detallesMap[c.id] || []
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/camiones/disponibles', authenticateToken, async (req, res) => {
  const allowedRoles = ['admin', 'produccion1', 'produccion2'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'No autorizado para esta sección' });
  }

  try {
    await autoArchiveOrders();

    const [rows] = await db.query(`
      SELECT p.id as id, p.id as produccion_id, p.cantidad, p.cantidad_recibida, p.estado,
             m.nombre as maquilero_nombre,
             i.id as inventario_id, i.modelo, i.numero, i.temporada, i.color, i.cliente, i.no_orden, i.precio, i.imagen,
             (
               SELECT COALESCE(SUM(cd.piezas), 0)
               FROM camion_detalles cd
               WHERE cd.produccion_id = p.id
             ) as piezas_enviadas
      FROM produccion p
      JOIN maquileros m ON p.maquilero_id = m.id
      JOIN inventario i ON p.inventario_id = i.id
      WHERE p.estado IN ('Terminado', 'Terminado Parcial') AND p.archivado = 0 AND (p.es_extra = 0 OR p.es_extra IS NULL)
    `);

    const available = rows.map(r => {
      const piezas_producidas = r.cantidad_recibida !== null ? r.cantidad_recibida : r.cantidad;
      const piezas_disponibles = piezas_producidas - r.piezas_enviadas;
      return {
        ...r,
        piezas_producidas,
        piezas: piezas_disponibles // Map to piezas for frontend compatibility
      };
    }).filter(item => item.piezas > 0);

    res.json(available);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET TRUCK LOAD DRAFT
app.get('/api/camiones/borrador', authenticateToken, async (req, res) => {
  const allowedRoles = ['admin', 'produccion1', 'produccion2'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'No autorizado para esta sección' });
  }
  try {
    const [rows] = await db.query(
      "SELECT cargo, observaciones, fecha_envio FROM camion_borrador WHERE user_id = ? OR user_id IS NULL ORDER BY id DESC LIMIT 1",
      [req.user.id]
    );
    if (rows.length > 0) {
      let parsedCargo = [];
      try {
        parsedCargo = JSON.parse(rows[0].cargo);
      } catch (e) {
        parsedCargo = [];
      }
      res.json({
        cargo: parsedCargo,
        observaciones: rows[0].observaciones || '',
        fecha_envio: rows[0].fecha_envio || ''
      });
    } else {
      res.json({ cargo: [], observaciones: '', fecha_envio: '' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SAVE TRUCK LOAD DRAFT
app.post('/api/camiones/borrador', authenticateToken, async (req, res) => {
  const allowedRoles = ['admin', 'produccion1', 'produccion2'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'No autorizado para esta sección' });
  }
  const { cargo, observaciones, fecha_envio } = req.body;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    // Delete any existing draft for this user
    await connection.query(
      "DELETE FROM camion_borrador WHERE user_id = ? OR user_id IS NULL",
      [req.user.id]
    );
    // Insert new draft
    await connection.query(
      "INSERT INTO camion_borrador (user_id, cargo, observaciones, fecha_envio) VALUES (?, ?, ?, ?)",
      [req.user.id, JSON.stringify(cargo || []), observaciones || '', fecha_envio || '']
    );
    await connection.commit();
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

app.post('/api/camiones', authenticateToken, async (req, res) => {
  const allowedRoles = ['admin', 'produccion1', 'produccion2'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'No autorizado para esta sección' });
  }

  const { fecha_envio, observaciones, items } = req.body;
  if (!fecha_envio || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Datos de envío incompletos o inválidos' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Insert into camiones
    const [camionResult] = await connection.query(
      "INSERT INTO camiones (fecha_envio, observaciones) VALUES (?, ?)",
      [fecha_envio, observaciones || '']
    );
    const camionId = camionResult.insertId;

    // 2. Process each item
    for (const item of items) {
      const piezas = parseInt(item.piezas) || 0;
      if (piezas <= 0) {
        throw new Error(`Cantidad inválida para el modelo ${item.modelo}`);
      }

      // Validate sizes sum
      const tallas_cantidades = item.tallas_cantidades || {};
      const tallasSum = Object.values(tallas_cantidades).reduce((sum, val) => {
        if (typeof val === 'object' && val !== null) {
          return sum + Object.values(val).reduce((subSum, subVal) => subSum + (parseInt(subVal) || 0), 0);
        }
        return sum + (parseInt(val) || 0);
      }, 0);
      if (tallasSum !== piezas) {
        throw new Error(`La suma de tallas (${tallasSum}) no coincide con las piezas (${piezas}) para el modelo ${item.modelo}`);
      }

      // Check stock in produccion order (fallback to item.id if item.produccion_id is not provided)
      const prodId = item.produccion_id || item.id;
      const [prodRows] = await connection.query(
        "SELECT p.cantidad, p.cantidad_recibida, i.precio_plancha FROM produccion p LEFT JOIN inventario i ON p.inventario_id = i.id WHERE p.id = ?",
        [prodId]
      );
      const prodRow = prodRows[0];
      if (!prodRow) {
        throw new Error(`La orden de producción para el modelo ${item.modelo} no existe.`);
      }

      const piezas_producidas = prodRow.cantidad_recibida !== null ? prodRow.cantidad_recibida : prodRow.cantidad;
      const precioPlancha = prodRow.precio_plancha || 0.00;
      
      const [shippedRows] = await connection.query(
        "SELECT COALESCE(SUM(piezas), 0) as total FROM camion_detalles WHERE produccion_id = ?",
        [prodId]
      );
      const piezas_ya_enviadas = parseInt(shippedRows[0].total) || 0;
      const disponible = piezas_producidas - piezas_ya_enviadas;

      if (disponible < piezas) {
        throw new Error(`Stock insuficiente para la orden del modelo ${item.modelo} (Disponible: ${disponible}, Requerido: ${piezas}).`);
      }

      // Insert into camion_detalles including produccion_id and precio_plancha
      await connection.query(`
        INSERT INTO camion_detalles (camion_id, numero, temporada, modelo, precio, color, cliente, no_orden, piezas, tallas_cantidades, produccion_id, precio_plancha)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        camionId,
        item.numero || null,
        item.temporada || null,
        item.modelo || null,
        parseFloat(item.precio) || 0,
        item.color || null,
        item.cliente || null,
        item.no_orden || null,
        piezas,
        JSON.stringify(tallas_cantidades),
        prodId,
        precioPlancha
      ]);

      // Deduct from inventario_real by matching no_orden and modelo
      await connection.query(
        "UPDATE inventario_real SET piezas = piezas - ? WHERE no_orden = ? AND modelo = ?",
        [piezas, item.no_orden || '', item.modelo || '']
      );



      // Log activity
      const descLog = `Subió al camión #${camionId} (${fecha_envio}) ${piezas} piezas del modelo ${item.modelo} (Tallas: ${JSON.stringify(tallas_cantidades)})`;
      await connection.query(
        "INSERT INTO historial (user_id, action, target, description) VALUES (?, 'EDIT', 'INVENTARIO_REAL', ?)",
        [req.user.id, descLog]
      );
    }

    // Clear draft for this user upon checkout success
    await connection.query("DELETE FROM camion_borrador WHERE user_id = ? OR user_id IS NULL", [req.user.id]);

    await connection.commit();
    
    // Auto-archive matching production orders after committing
    try {
      await autoArchiveOrders();
    } catch (e) {
      console.error("Error running autoArchiveOrders after truck commit:", e);
    }

    res.json({ success: true, camionId });
  } catch (error) {
    await connection.rollback();
    res.status(400).json({ error: error.message });
  } finally {
    connection.release();
  }
});

const autoArchiveOrders = async () => {
  try {
    // 1. Get orders that should be archived but are not yet (archivado < 2)
    // Condition: fully loaded/shipped on the truck in the system, regardless of their current status (except cancelled ones)
    const [toArchive] = await db.query(`
      SELECT p.id 
      FROM produccion p
      WHERE p.archivado < 2
        AND p.estado != 'Cancelado'
        AND (
          SELECT COALESCE(SUM(cd.piezas), 0)
          FROM camion_detalles cd
          WHERE cd.produccion_id = p.id
        ) >= COALESCE(p.cantidad_recibida, p.cantidad)
    `);

    // 2. Get orders that are currently auto-archived (archivado = 2) but no longer meet the criteria to be archived
    // (e.g. they were cancelled, or pieces were removed from the truck)
    const [toUnarchive] = await db.query(`
      SELECT p.id 
      FROM produccion p
      WHERE p.archivado = 2
        AND (
          p.estado = 'Cancelado'
          OR (
            SELECT COALESCE(SUM(cd.piezas), 0)
            FROM camion_detalles cd
            WHERE cd.produccion_id = p.id
          ) < COALESCE(p.cantidad_recibida, p.cantidad)
        )
    `);

    // 3. Process archiving to state 2 (Factory Delivered / Permanent Hide)
    for (const p of toArchive) {
      // Automatically ensure they are marked as Terminado and archived, setting fecha_terminado to NOW if null
      await db.query(
        "UPDATE produccion SET estado = 'Terminado', archivado = 2, fecha_terminado = COALESCE(fecha_terminado, NOW()) WHERE id = ?",
        [p.id]
      );
      await checkAndMoveToInventory(p.id, 1); // 1 = System user
    }

    // 4. Process un-archiving back to state 0 (Active)
    for (const p of toUnarchive) {
      await db.query("UPDATE produccion SET archivado = 0 WHERE id = ?", [p.id]);
      await checkAndMoveToInventory(p.id, 1);
    }
  } catch (error) {
    console.error("Error running auto-archive:", error);
  }
};

app.get('/api/produccion', async (req, res) => {
  const { verArchivados, incluirExtras } = req.query;
  const whereArchivado = verArchivados === 'true' ? 'p.archivado = 1' : 'p.archivado = 0';
  const whereExtra = incluirExtras === 'true' ? '' : 'AND p.es_extra = 0';
  try {
    await autoArchiveOrders();

    const [orders] = await db.query(`
      SELECT p.*, m.nombre as maquilero_nombre,
      i.modelo as producto_modelo, i.imagen as producto_imagen, 
      COALESCE(p.precio_extra, i.precio) as precio_unitario,
      (SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE produccion_id = p.id) as pagado_efectivo,
      (SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE produccion_id = p.id) + 
      (SELECT COALESCE(SUM(dp.monto_total), 0) FROM descuentos_personales dp 
       JOIN pagos pg ON dp.pago_id = pg.id 
       WHERE pg.produccion_id = p.id) as pagado
      FROM produccion p 
      JOIN maquileros m ON p.maquilero_id = m.id
      LEFT JOIN inventario i ON p.inventario_id = i.id
      WHERE ${whereArchivado} ${whereExtra}
      ORDER BY p.id DESC
    `);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/extras', async (req, res) => {
  const { verArchivados } = req.query;
  const whereArchivado = verArchivados === 'true' ? 'p.archivado = 1' : 'p.archivado = 0';
  try {
    await autoArchiveOrders();

    const [orders] = await db.query(`
      SELECT p.*, m.nombre as maquilero_nombre,
      i.modelo as producto_modelo, i.imagen as producto_imagen, 
      COALESCE(p.precio_extra, i.precio) as precio_unitario,
      (SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE produccion_id = p.id) as pagado_efectivo,
      (SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE produccion_id = p.id) + 
      (SELECT COALESCE(SUM(dp.monto_total), 0) FROM descuentos_personales dp 
       JOIN pagos pg ON dp.pago_id = pg.id 
       WHERE pg.produccion_id = p.id) as pagado
      FROM produccion p 
      JOIN maquileros m ON p.maquilero_id = m.id
      LEFT JOIN inventario i ON p.inventario_id = i.id
      WHERE ${whereArchivado} AND p.es_extra = 1
      ORDER BY p.id DESC
    `);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/extras', authenticateToken, async (req, res) => {
  const { maquilero_id, inventario_id, cantidad, precio_extra, fecha_inicio, fecha_fin } = req.body;
  try {
    const [maqs] = await db.query("SELECT nombre FROM maquileros WHERE id = ?", [maquilero_id]);
    const maq = maqs[0];
    const [invs] = await db.query("SELECT modelo FROM inventario WHERE id = ?", [inventario_id]);
    const inv = invs[0];

    const qty = parseInt(cantidad) || 0;
    const priceUnit = parseFloat(precio_extra) || 0;
    const finalPrecioTotal = qty * priceUnit;

    const [result] = await db.query(
      "INSERT INTO produccion (maquilero_id, inventario_id, cantidad, precio_extra, precio_total, fecha_inicio, fecha_fin, es_extra, estado) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'En proceso')",
      [maquilero_id, inventario_id || null, qty, priceUnit, finalPrecioTotal, fecha_inicio, fecha_fin]
    );

    await logActivity(req.user.id, 'ALTA', 'PRODUCCION', `Nuevo EXTRA para ${maq ? maq.nombre : 'ID '+maquilero_id} (${inv ? inv.modelo : 'ID '+inventario_id}) - Precio Extra: $${priceUnit}`);

    res.json({ id: result.insertId, success: true });
  } catch (error) {
    console.error("Error en POST /api/extras:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/produccion', authenticateToken, async (req, res) => {
  const { maquilero_id, fecha_inicio, fecha_fin, estado, precio_total, inventario_id, cantidad } = req.body;
  try {
    if (inventario_id) {
      const [existing] = await db.query(
        "SELECT id FROM produccion WHERE inventario_id = ? AND estado != 'Cancelado'",
        [inventario_id]
      );
      if (existing.length > 0) {
        return res.status(400).json({ error: 'errorDuplicate' });
      }
    }

    const [maqs] = await db.query("SELECT nombre FROM maquileros WHERE id = ?", [maquilero_id]);
    const maq = maqs[0];
    const [invs] = await db.query("SELECT modelo FROM inventario WHERE id = ?", [inventario_id]);
    const inv = invs[0];
    
    const [result] = await db.query("INSERT INTO produccion (maquilero_id, fecha_inicio, fecha_fin, estado, precio_total, inventario_id, cantidad) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [maquilero_id, fecha_inicio, fecha_fin, estado || 'En proceso', precio_total || 0, inventario_id || null, cantidad || 1]);
    
    await logActivity(req.user.id, 'ALTA', 'PRODUCCION', `Nueva orden para ${maq ? maq.nombre : 'ID '+maquilero_id} (${inv ? inv.modelo : 'ID '+inventario_id})`);
    
    res.json({ id: result.insertId, success: true });
  } catch (error) {
    console.error("Error en POST /api/produccion:", error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/produccion/:id', authenticateToken, async (req, res) => {
  const { maquilero_id, inventario_id, fecha_inicio, fecha_fin, estado, precio_total, cantidad, cantidad_recibida, retrasos, ajuste_tipo, ajuste_porcentaje, precio_extra } = req.body;
  try {
    const [olds] = await db.query(`
      SELECT p.*, i.precio as unit_price, i.modelo as inv_m, m.nombre as maq_n
      FROM produccion p 
      LEFT JOIN inventario i ON p.inventario_id = i.id 
      LEFT JOIN maquileros m ON p.maquilero_id = m.id
      WHERE p.id = ?
    `, [req.params.id]);
    const old = olds[0];
    if (!old) return res.status(404).json({ error: 'Producción no encontrada' });

    if (inventario_id && inventario_id !== old.inventario_id) {
      const [existing] = await db.query(
        "SELECT id FROM produccion WHERE inventario_id = ? AND estado != 'Cancelado'",
        [inventario_id]
      );
      if (existing.length > 0) {
        return res.status(400).json({ error: 'errorDuplicate' });
      }
    }

    let finalPrecioTotal = precio_total !== undefined ? precio_total : old.precio_total;
    
    let dbCantidadRecibida = old.cantidad_recibida;
    if (cantidad_recibida === null || cantidad_recibida === '') {
      dbCantidadRecibida = null;
    } else if (cantidad_recibida !== undefined) {
      dbCantidadRecibida = parseInt(cantidad_recibida);
      if (isNaN(dbCantidadRecibida)) dbCantidadRecibida = null;
    }

    const currentCant = dbCantidadRecibida;
    const effectiveCant = (currentCant !== null && currentCant !== undefined) ? currentCant : (cantidad !== undefined ? cantidad : old.cantidad);
    
    const curPrecioExtra = precio_extra !== undefined ? precio_extra : old.precio_extra;
    const up = old.es_extra === 1
      ? (curPrecioExtra !== null ? parseFloat(curPrecioExtra) : 0)
      : (old.unit_price || (old.precio_total / old.cantidad) || 0);
    
    let subtotal = effectiveCant * up;
    
    const curAjusteTipo = ajuste_tipo !== undefined ? ajuste_tipo : old.ajuste_tipo;
    const curAjustePorc = ajuste_porcentaje !== undefined ? ajuste_porcentaje : old.ajuste_porcentaje;
    
    let adjustmentAmount = 0;
    if (curAjusteTipo === 'bono') {
      adjustmentAmount = subtotal * (curAjustePorc / 100);
      finalPrecioTotal = subtotal + adjustmentAmount;
    } else if (curAjusteTipo === 'descuento') {
      adjustmentAmount = subtotal * (curAjustePorc / 100);
      finalPrecioTotal = subtotal - adjustmentAmount;
    } else {
      finalPrecioTotal = subtotal;
    }

    let finalFechaTerminado = old.fecha_terminado;
    if (estado !== undefined) {
      if (estado === 'Terminado' && old.estado !== 'Terminado') {
        finalFechaTerminado = new Date();
      } else if (estado !== 'Terminado') {
        finalFechaTerminado = null;
      }
    }

    await db.query(`
      UPDATE produccion SET 
      maquilero_id = COALESCE(?, maquilero_id),
      inventario_id = COALESCE(?, inventario_id),
      fecha_inicio = COALESCE(?, fecha_inicio),
      fecha_fin = COALESCE(?, fecha_fin),
      estado = COALESCE(?, estado),
      precio_total = ?,
      cantidad = COALESCE(?, cantidad),
      cantidad_recibida = ?,
      retrasos = COALESCE(?, retrasos),
      ajuste_tipo = ?,
      ajuste_porcentaje = ?,
      ajuste_monto = ?,
      fecha_terminado = ?,
      precio_extra = COALESCE(?, precio_extra)
      WHERE id = ?
    `, [
      maquilero_id || null, 
      inventario_id || null, 
      fecha_inicio || null, 
      fecha_fin || null, 
      estado || null, 
      finalPrecioTotal, 
      cantidad || null, 
      dbCantidadRecibida, 
      retrasos !== undefined && retrasos !== '' ? retrasos : old.retrasos, 
      curAjusteTipo, 
      curAjustePorc, 
      adjustmentAmount,
      finalFechaTerminado,
      precio_extra !== undefined ? precio_extra : null,
      req.params.id
    ]);

    let changes = [];
    if (estado && old.estado !== estado) changes.push(`Estado: ${old.estado} -> ${estado}`);
    if (curAjusteTipo !== old.ajuste_tipo) changes.push(`Ajuste: ${old.ajuste_tipo} -> ${curAjusteTipo} (${curAjustePorc}%)`);
    
    // Formatear fechas para comparar (YYYY-MM-DD) usando UTC para evitar desfases
    const fmtDate = (d) => {
      if (!d) return null;
      const dateObj = new Date(d);
      if (isNaN(dateObj.getTime())) return null;
      return dateObj.toISOString().split('T')[0];
    };
    
    if (fecha_fin && fmtDate(old.fecha_fin) !== fmtDate(fecha_fin)) {
      changes.push(`Fecha Entrega: ${fmtDate(old.fecha_fin)} -> ${fmtDate(fecha_fin)}`);
    }
    if (fecha_inicio && fmtDate(old.fecha_inicio) !== fmtDate(fecha_inicio)) {
      changes.push(`Fecha Inicio: ${fmtDate(old.fecha_inicio)} -> ${fmtDate(fecha_inicio)}`);
    }
    
    const silentFields = ['cantidad_recibida', 'ajuste_tipo', 'ajuste_porcentaje'];
    const isSilentUpdate = Object.keys(req.body).every(key => silentFields.includes(key));

    if (!isSilentUpdate) {
      const desc = changes.length > 0 ? `Editó Producción ${old.inv_m} (${old.maq_n}): ${changes.join(', ')}` : `Actualizó datos de producción ${old.inv_m}`;
      await logActivity(req.user.id, 'EDIT', 'PRODUCCION', desc);
    }

    // Run checking logic for auto-transfer to inventory
    await checkAndMoveToInventory(req.params.id, req.user.id);
    await autoArchiveOrders();

    res.json({ success: true });
  } catch (error) {
    console.error("Error en PUT produccion:", error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/produccion/:id/ajuste', authenticateToken, async (req, res) => {
  const { tipo, porcentaje } = req.body;
  try {
    const [olds] = await db.query("SELECT * FROM produccion WHERE id = ?", [req.params.id]);
    const old = olds[0];
    if (!old) return res.status(404).json({ error: 'Orden no encontrada' });

    let unitPrice = old.precio_extra;
    if (old.es_extra !== 1) {
      const [invs] = await db.query("SELECT precio FROM inventario WHERE id = ?", [old.inventario_id]);
      unitPrice = invs[0]?.precio || (old.precio_total / old.cantidad);
    }
    const subtotal = (old.cantidad_recibida !== null ? old.cantidad_recibida : old.cantidad) * unitPrice;
    
    let adjustmentAmount = subtotal * (porcentaje / 100);
    let finalTotal = (tipo === 'bono') ? (subtotal + adjustmentAmount) : (subtotal - adjustmentAmount);

    await db.query("UPDATE produccion SET ajuste_tipo = ?, ajuste_porcentaje = ?, ajuste_monto = ?, precio_total = ? WHERE id = ?", 
      [tipo, porcentaje, adjustmentAmount, finalTotal, req.params.id]);
    
    // Check and update inventory and archiving status dynamically
    await checkAndMoveToInventory(req.params.id, req.user.id);
    await autoArchiveOrders();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/produccion/:id/agregar-dia', authenticateToken, async (req, res) => {
  const { dias } = req.body;
  const numDias = parseInt(dias) || 1;
  try {
    // Primero actualizamos usando aritmética de SQL para evitar problemas de zona horaria en JS
    await db.query("UPDATE produccion SET fecha_fin = DATE_ADD(fecha_fin, INTERVAL ? DAY), retrasos = retrasos + 1 WHERE id = ?", [numDias, req.params.id]);
    
    // Obtenemos los datos actualizados para el log y la respuesta
    const [rows] = await db.query(`
      SELECT p.fecha_fin, p.retrasos, i.modelo 
      FROM produccion p 
      LEFT JOIN inventario i ON p.inventario_id = i.id 
      WHERE p.id = ?
    `, [req.params.id]);
    
    const updated = rows[0];
    if (updated) {
      const fmtDate = updated.fecha_fin ? new Date(updated.fecha_fin).toISOString().split('T')[0] : 'N/A';
      await logActivity(req.user.id, 'EDIT', 'PRODUCCION', `Agregó ${numDias} días de prórroga a ${updated.modelo || 'ID '+req.params.id} (Nueva fecha: ${fmtDate})`);
      res.json({ success: true, newDate: updated.fecha_fin, newRetrasos: updated.retrasos });
    } else {
      res.status(404).json({ error: 'Orden no encontrada' });
    }
  } catch (error) {
    console.error("Error en /agregar-dia:", error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/produccion/:id/archivo', authenticateToken, async (req, res) => {
  const { archivado } = req.body;
  try {
    const [olds] = await db.query("SELECT i.modelo FROM produccion p LEFT JOIN inventario i ON p.inventario_id = i.id WHERE p.id = ?", [req.params.id]);
    const old = olds[0];
    await db.query("UPDATE produccion SET archivado = ? WHERE id = ?", [archivado ? 1 : 0, req.params.id]);
    
    await logActivity(req.user.id, 'EDIT', 'PRODUCCION', `${archivado ? 'Archivó' : 'Desarchivó'} orden de ${old ? old.modelo : req.params.id}`);
    
    await checkAndMoveToInventory(req.params.id, req.user.id);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/produccion/:id', authenticateToken, async (req, res) => {
  try {
    const [olds] = await db.query("SELECT p.*, i.modelo FROM produccion p LEFT JOIN inventario i ON p.inventario_id = i.id WHERE p.id = ?", [req.params.id]);
    const old = olds[0];
    if (!old) return res.status(404).json({ error: 'Producción no encontrada' });

    if (old.estado === 'Terminado' || old.estado === 'Terminado Parcial') {
      await db.query("UPDATE produccion SET archivado = 3 WHERE id = ?", [req.params.id]);
      await checkAndMoveToInventory(req.params.id, req.user.id);
      await logActivity(req.user.id, 'EDIT', 'PRODUCCION', `Ocultó orden terminada de ${old.modelo || 'ID '+req.params.id} (evitó borrado de historial)`);
      return res.json({ success: true, archived: true });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query("DELETE FROM pagos WHERE produccion_id = ?", [req.params.id]);
      await connection.query("DELETE FROM produccion WHERE id = ?", [req.params.id]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    await logActivity(req.user.id, 'BAJA', 'PRODUCCION', `Eliminó orden de ${old.modelo || 'ID '+req.params.id}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// APIs Pagos
app.get('/api/pagos/:produccion_id', async (req, res) => {
  try {
    const [pagos] = await db.query("SELECT * FROM pagos WHERE produccion_id = ? ORDER BY id DESC", [req.params.produccion_id]);
    res.json(pagos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pagos', authenticateToken, async (req, res) => {
  const { produccion_id, monto, tipo_pago } = req.body;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const fecha = new Date().toISOString().split('T')[0];
    
    // 1. Insertar el Pago
    const [result] = await connection.query("INSERT INTO pagos (produccion_id, monto, fecha, tipo_pago) VALUES (?, ?, ?, ?)",
      [produccion_id, monto, fecha, tipo_pago]);
    const pagoId = result.insertId;
    
    // 2. Obtener el Maquilero de la orden
    const [orders] = await connection.query("SELECT maquilero_id FROM produccion WHERE id = ?", [produccion_id]);
    if (orders.length > 0) {
      const maquileroId = orders[0].maquilero_id;
      // 3. Vincular y marcar como aplicados los descuentos pendientes de ese maquilero
      await connection.query(
        "UPDATE descuentos_personales SET aplicado = 1, pago_id = ? WHERE maquilero_id = ? AND aplicado = 0",
        [pagoId, maquileroId]
      );
    }

    // 4. Log Actividad
    const [prods] = await connection.query("SELECT i.modelo FROM produccion p JOIN inventario i ON p.inventario_id = i.id WHERE p.id = ?", [produccion_id]);
    const prod = prods[0];
    await connection.query(
      "INSERT INTO historial (user_id, action, target, description) VALUES (?, ?, ?, ?)",
      [req.user.id, 'ALTA', 'PAGO', `Registró pago de $${monto} para ${prod ? prod.modelo : 'Orden '+produccion_id} (Multas liquidadas)`]
    );

    await connection.commit();

    // Check if the order is completed and fully paid, then move to finished inventory
    await checkAndMoveToInventory(produccion_id, req.user.id);
    await autoArchiveOrders();

    res.json({ id: pagoId, success: true });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

app.delete('/api/pagos/:id', authenticateToken, async (req, res) => {
  const pagoId = req.params.id;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get payment details
    const [pagos] = await connection.query("SELECT * FROM pagos WHERE id = ?", [pagoId]);
    const pago = pagos[0];
    if (!pago) {
      await connection.rollback();
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    // 2. Unlink/restore any discounts associated with this payment
    await connection.query(
      "UPDATE descuentos_personales SET aplicado = 0, pago_id = NULL WHERE pago_id = ?",
      [pagoId]
    );

    // 3. Delete the payment
    await connection.query("DELETE FROM pagos WHERE id = ?", [pagoId]);

    // 4. Log the activity
    const [prods] = await connection.query("SELECT i.modelo FROM produccion p JOIN inventario i ON p.inventario_id = i.id WHERE p.id = ?", [pago.produccion_id]);
    const prod = prods[0];
    await connection.query(
      "INSERT INTO historial (user_id, action, target, description) VALUES (?, ?, ?, ?)",
      [req.user.id, 'BAJA', 'PAGO', `Eliminó pago ID #${pagoId} de $${pago.monto} para ${prod ? prod.modelo : 'Orden '+pago.produccion_id} (Descuentos desvinculados)`]
    );

    await connection.commit();

    // 5. Update archiving and inventory status dynamically
    await checkAndMoveToInventory(pago.produccion_id, req.user.id);
    await autoArchiveOrders();

    res.json({ success: true, message: 'Pago eliminado y descuentos restaurados' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

app.get('/api/pagos/:id/comprobante', async (req, res) => {
  const pagoId = req.params.id;
  try {
    const [pagos] = await db.query(`
      SELECT pg.*, p.id as orden_id, p.maquilero_id, p.inventario_id, 
             p.cantidad, p.cantidad_recibida, p.ajuste_tipo, p.ajuste_porcentaje, p.ajuste_monto,
             m.nombre as maquilero_nombre,
             i.modelo as producto_modelo, i.precio as precio_unitario, i.no_orden as no_orden
      FROM pagos pg
      JOIN produccion p ON pg.produccion_id = p.id
      JOIN maquileros m ON p.maquilero_id = m.id
      LEFT JOIN inventario i ON p.inventario_id = i.id
      WHERE pg.id = ?
    `, [pagoId]);
    const pago = pagos[0];

    if (!pago) return res.status(404).json({ error: 'Pago no encontrado' });

    const [todosLosPagos] = await db.query("SELECT id FROM pagos WHERE produccion_id = ? ORDER BY id ASC", [pago.produccion_id]);
    const index = todosLosPagos.findIndex(p => p.id === parseInt(pagoId));
    const nroPago = index + 1;

    const doc = new PDFDocument({ margin: 40, size: 'LETTER' });
    res.setHeader('Content-disposition', `attachment; filename="Comprobante_Pago_${pagoId}.pdf"`);
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);

    doc.rect(20, 20, 570, 410).stroke();

    try {
      const logoPath = path.join(__dirname, '..', 'frontend', 'public', 'logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 35, 35, { width: 80 });
      }
    } catch (e) {}
    
    doc.fontSize(20).font('Helvetica-Bold').text('COMPROBANTE DE PAGO', { align: 'center' });
    doc.moveDown(2); 

    doc.fontSize(12).font('Helvetica').text(`Folio Interno: #${pago.id}`, { align: 'right' });
    const fechaFormateada = new Date(pago.fecha).toLocaleDateString('es-MX', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    doc.text(`Fecha: ${fechaFormateada}`, { align: 'right' });
    doc.moveDown(1.5);

    doc.fontSize(14).font('Helvetica-Bold').text('DATOS DEL MAQUILERO');
    doc.fontSize(12).font('Helvetica').text(`Nombre: ${pago.maquilero_nombre}`);
    doc.moveDown(1);

    doc.fontSize(14).font('Helvetica-Bold').text('DETALLE DEL TRABAJO');
    doc.fontSize(12).font('Helvetica').text(`Producto / Modelo: ${pago.producto_modelo || 'N/A'}`);
    doc.text(`Número de Orden: ${pago.no_orden || 'N/A'}`);
    
    const cantFinal = pago.cantidad_recibida !== null ? pago.cantidad_recibida : pago.cantidad;
    doc.text(`Cantidad Maquilada: ${cantFinal} piezas`);
    doc.text(`Precio de Maquila: $${pago.precio_unitario || 0} por pieza`);
    
    if (pago.ajuste_tipo && pago.ajuste_tipo !== 'ninguno') {
      const label = pago.ajuste_tipo === 'bono' ? 'BONO EXTRA' : 'DESCUENTO (PENALIZACIÓN)';
      const sign = pago.ajuste_tipo === 'bono' ? '+' : '-';
      doc.font('Helvetica-Bold').text(`${label} (${pago.ajuste_porcentaje}%): ${sign}$${pago.ajuste_monto.toFixed(2)}`);
      doc.font('Helvetica');
    }
    
    doc.moveDown(0.5);
    
    doc.fontSize(14).font('Helvetica-Bold').text('DETALLE DEL PAGO');
    doc.fontSize(12).font('Helvetica').text(`Concepto: ${pago.tipo_pago === 'completo' ? 'LIQUIDACIÓN' : 'ABONO'} DE PRODUCCIÓN`);
    doc.text(`Número de Pago: ${nroPago} de ${todosLosPagos.length}`);
    doc.moveDown();

    doc.fontSize(18).font('Helvetica-Bold').fillColor('#059669').text(`MONTO PAGADO: $${Number(pago.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, { align: 'center' });
    
    // Cálculo de saldo restante
    const [totalPagadoRows] = await db.query("SELECT SUM(monto) as total FROM pagos WHERE produccion_id = ? AND id <= ?", [pago.produccion_id, pagoId]);
    const [ordenRows] = await db.query("SELECT precio_total FROM produccion WHERE id = ?", [pago.produccion_id]);
    
    const totalPagadoHastaAhora = totalPagadoRows[0].total || 0;
    const precioTotalOrden = ordenRows[0].precio_total || 0;
    const saldoRestante = Math.max(0, precioTotalOrden - totalPagadoHastaAhora);

    doc.moveDown(0.2);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#ef4444').text(`SALDO RESTANTE: $${saldoRestante.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, { align: 'center' });
    
    doc.fillColor('black');
    doc.moveDown(1.5);

    const startY = doc.y;
    doc.moveTo(60, startY + 40).lineTo(240, startY + 40).stroke();
    doc.moveTo(370, startY + 40).lineTo(550, startY + 40).stroke();

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('FIRMA DEL GERENTE', 60, startY + 45, { width: 180, align: 'center' });
    doc.text('FIRMA DEL MAQUILERO', 370, startY + 45, { width: 180, align: 'center' });

    doc.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// APIs Reportes
app.get('/api/reportes/produccion', async (req, res) => {
    const { start, end, date } = req.query;
    try {
      let query = `
        SELECT p.*, 
          m.nombre as maquilero_nombre, m.imagen as maquilero_imagen,
          i.modelo as producto_modelo, i.numero as producto_codigo,
          i.color as producto_color, i.cliente as producto_cliente,
          i.no_orden as inventario_orden, i.imagen as producto_imagen
        FROM produccion p 
        JOIN maquileros m ON p.maquilero_id = m.id 
        LEFT JOIN inventario i ON p.inventario_id = i.id
        WHERE p.estado = 'Terminado' AND p.es_extra = 0
      `;
      const params = [];
      let subtitleDate = "Detalle completo de órdenes terminadas";

      if (start && end) {
        if (start === end) {
          query += ` AND p.fecha_fin = ?`;
          params.push(start);
          subtitleDate = `Reporte del día ${formatDateToDMY(start)}`;
        } else {
          query += ` AND p.fecha_fin BETWEEN ? AND ?`;
          params.push(start, end);
          subtitleDate = `Del ${formatDateToDMY(start)} al ${formatDateToDMY(end)}`;
        }
      } else if (start) {
        query += ` AND p.fecha_fin = ?`;
        params.push(start);
        subtitleDate = `Reporte del día ${formatDateToDMY(start)}`;
      } else if (date) {
        query += ` AND p.fecha_fin = ?`;
        params.push(date);
        subtitleDate = `Reporte del día ${formatDateToDMY(date)}`;
      }
      query += ` ORDER BY p.fecha_fin DESC`;

    const [orders] = await db.query(query, params);

    const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-disposition', 'attachment; filename="Reporte_Produccion.pdf"');
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);

    try {
      const logoPath = path.join(__dirname, '..', 'frontend', 'public', 'logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 25, 20, { width: 85 });
      }
    } catch (e) {}

    doc.y = 130;

    if (orders.length === 0) {
      doc.fontSize(20).text('Reporte de Órdenes Terminadas', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(subtitleDate.includes('el') || subtitleDate.includes('Del') ? `No hay órdenes terminadas ${subtitleDate.toLowerCase()}.` : 'No hay órdenes terminadas.', { align: 'center' });
    } else {
      const tableConfig = {
        title: "Reporte de Órdenes Terminadas",
        subtitle: subtitleDate + " - Generado el " + formatDateToDMY(new Date()),
        headers: [
          { label: "MAQUILERO", property: "maquilero", width: 110 },
          { label: "MODELO", property: "modelo", width: 80 },
          { label: "CODIGO", property: "codigo", width: 110 },
          { label: "COLOR", property: "color", width: 100 },
          { label: "CLIENTE", property: "cliente", width: 150 },
          { label: "ORDEN", property: "orden", width: 90 },
          { label: "PIEZAS", property: "piezas", width: 60 },
          { label: "ENTREGA", property: "entrega", width: 100 }
        ],
        datas: orders.map(o => ({
          maquilero: (o.maquilero_nombre || '').toUpperCase(),
          modelo: '\n\n\n\n\n\n',
          codigo: o.producto_modelo || '-',
          color: (() => {
             try {
                const arr = JSON.parse(o.producto_color);
                return Array.isArray(arr) ? arr.map(c => c.color).join(', ') : (o.producto_color || '-');
             } catch(e) { return o.producto_color || '-'; }
          })(),
          cliente: o.producto_cliente || '-',
          orden: o.inventario_orden || '-',
          piezas: String(o.cantidad || 0),
          entrega: formatDateToDMY(o.fecha_fin)
        })),
        options: { padding: 5 }
      };

      await doc.table(tableConfig, {
        prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
        prepareRow: (row, indexColumn, indexRow, rectRow) => {
          doc.font("Helvetica").fontSize(10);
          try {
             const order = orders[indexRow];
             if (indexColumn === 1 && order.producto_imagen) {
                const imgPath = path.join(__dirname, order.producto_imagen);
                if (fs.existsSync(imgPath)) {
                   doc.image(imgPath, rectRow.x + 110 + 10, rectRow.y + 5, { fit: [60, 60] });
                }
             }
          } catch(e) {}
        }
      });

      const totalPiezas = orders.reduce((sum, o) => sum + (o.cantidad || 0), 0);
      doc.moveDown();
      doc.fontSize(14).font("Helvetica-Bold").text(`TOTAL DE PIEZAS TERMINADAS: ${totalPiezas}`, { align: 'right' });
    }

    doc.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reportes/inventario', async (req, res) => {
  const { filter } = req.query;
  try {
    let query = `
      SELECT i.*, 
        (SELECT COUNT(id) FROM produccion WHERE inventario_id = i.id AND archivado = 0) as producciones_count
      FROM inventario i
    `;
    
    if (filter === 'asignados') {
      query += ` WHERE (SELECT COUNT(id) FROM produccion WHERE inventario_id = i.id AND archivado = 0) > 0`;
    } else if (filter === 'pendientes') {
      query += ` WHERE (SELECT COUNT(id) FROM produccion WHERE inventario_id = i.id AND archivado = 0) = 0`;
    }
    
    query += ` ORDER BY i.id DESC`;
    
    const [items] = await db.query(query);

    const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-disposition', 'attachment; filename="Reporte_Inventario.pdf"');
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);

    try {
      const logoPath = path.join(__dirname, '..', 'frontend', 'public', 'logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 25, 20, { width: 85 });
      }
    } catch (e) {}

    doc.y = 130;

    if (items.length === 0) {
      doc.fontSize(20).text('Reporte de Estatus de Inventario', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text('No hay artículos con el criterio seleccionado.', { align: 'center' });
    } else {
      const reportTitle = filter === 'asignados' ? "Reporte de Inventario (Asignados)" : (filter === 'pendientes' ? "Reporte de Inventario (Disponibles)" : "Reporte de Estatus de Inventario");
      const tableConfig = {
        title: reportTitle,
        subtitle: "Existencias, costos y unidades actuales registrados en almacén - Generado el " + formatDateToDMY(new Date()),
        headers: [
          { label: "MODELO", property: "modelo", width: 80 },
          { label: "CODIGO", property: "codigo", width: 160 },
          { label: "COLOR", property: "color", width: 120 },
          { label: "CLIENTE", property: "cliente", width: 180 },
          { label: "ORDEN", property: "orden", width: 100 },
          { label: "PRECIO", property: "precio", width: 80 },
          { label: "PZAS PROC.", property: "piezas", width: 80 }
        ],
        datas: items.map(i => ({
          modelo: '\n\n\n\n\n\n',
          codigo: (i.modelo || '-'),
          color: (() => {
             try {
                const arr = JSON.parse(i.color);
                return Array.isArray(arr) ? arr.map(c => c.color).join(', ') : (i.color || '-');
             } catch(e) { return i.color || '-'; }
          })(),
          cliente: i.cliente || '-',
          orden: i.no_orden || '-',
          precio: '$' + (i.precio || 0),
          piezas: String(i.piezas_en_proceso || 0)
        })),
        options: { padding: 5 }
      };

      await doc.table(tableConfig, {
        prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
        prepareRow: (row, indexColumn, indexRow, rectRow) => {
          doc.font("Helvetica").fontSize(10);
          try {
             const item = items[indexRow];
             if (indexColumn === 0 && item.imagen) {
                const imgPath = path.join(__dirname, item.imagen);
                if (fs.existsSync(imgPath)) {
                   doc.image(imgPath, rectRow.x + 10, rectRow.y + 5, { fit: [60, 60] });
                }
             }
          } catch(e) {}
        }
      });

      const totalPiezas = items.reduce((sum, i) => sum + (i.piezas_en_proceso || 0), 0);
      doc.moveDown();
      doc.fontSize(14).font("Helvetica-Bold").text(`TOTAL DE PIEZAS EN PROCESO: ${totalPiezas}`, { align: 'right' });
    }

    doc.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reportes/recoleccion', async (req, res) => {
  const { start, end } = req.query;
  try {
    let query = `
      SELECT p.*, 
        m.nombre as maquilero_nombre, m.imagen as maquilero_imagen,
        i.modelo as producto_modelo, i.numero as producto_codigo,
        i.color as producto_color, i.cliente as producto_cliente,
        i.no_orden as inventario_orden, i.imagen as producto_imagen
      FROM produccion p 
      JOIN maquileros m ON p.maquilero_id = m.id 
      LEFT JOIN inventario i ON p.inventario_id = i.id
      WHERE p.archivado = 0 AND p.estado = 'En proceso'
    `;
    const params = [];
    let subtitleDate = "estimada";

    if (start && end) {
      if (start === end) {
        query += ` AND p.fecha_fin = ?`;
        params.push(start);
        subtitleDate = `del día ${formatDateToDMY(start)}`;
      } else {
        query += ` AND p.fecha_fin BETWEEN ? AND ?`;
        params.push(start, end);
        subtitleDate = `del ${formatDateToDMY(start)} al ${formatDateToDMY(end)}`;
      }
    } else if (start) {
      query += ` AND p.fecha_fin = ?`;
      params.push(start);
      subtitleDate = `del día ${formatDateToDMY(start)}`;
    } else if (end) {
      query += ` AND p.fecha_fin = ?`;
      params.push(end);
      subtitleDate = `del día ${formatDateToDMY(end)}`;
    }
    query += ` ORDER BY p.fecha_fin ASC`;
    const [orders] = await db.query(query, params);

    const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-disposition', 'attachment; filename="Reporte_Recoleccion.pdf"');
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);

    try {
      const logoPath = path.join(__dirname, '..', 'frontend', 'public', 'logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 25, 20, { width: 85 });
      }
    } catch (e) {}

    doc.y = 130;

    if (orders.length === 0) {
      doc.fontSize(20).text('Reporte de Recolección', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text('No hay entregas programadas.', { align: 'center' });
    } else {
      const tableConfig = {
        title: "Reporte de Recolección",
        subtitle: `Producción a entregar ${subtitleDate}` + " - Generado el " + formatDateToDMY(new Date()),
        headers: [
          { label: "MAQUILERO", property: "maquilero", width: 110 },
          { label: "MODELO", property: "modelo", width: 80 },
          { label: "CODIGO", property: "codigo", width: 110 },
          { label: "COLOR", property: "color", width: 100 },
          { label: "CLIENTE", property: "cliente", width: 150 },
          { label: "ORDEN", property: "orden", width: 90 },
          { label: "PIEZAS", property: "piezas", width: 60 },
          { label: "ENTREGA", property: "entrega", width: 100 }
        ],
        datas: orders.map(o => ({
          maquilero: (o.maquilero_nombre || '').toUpperCase(),
          modelo: '\n\n\n\n\n\n',
          codigo: o.producto_modelo || '-',
          color: (() => {
             try {
                const arr = JSON.parse(o.producto_color);
                return Array.isArray(arr) ? arr.map(c => c.color).join(', ') : (o.producto_color || '-');
             } catch(e) { return o.producto_color || '-'; }
          })(),
          cliente: o.producto_cliente || '-',
          orden: o.inventario_orden || '-',
          piezas: String(o.cantidad || 0),
          entrega: formatDateToDMY(o.fecha_fin)
        })),
        options: { padding: 5 }
      };

      await doc.table(tableConfig, {
        prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
        prepareRow: (row, indexColumn, indexRow, rectRow) => {
          doc.font("Helvetica").fontSize(10);
          try {
             const order = orders[indexRow];
             if (indexColumn === 1 && order.producto_imagen) {
                const imgPath = path.join(__dirname, order.producto_imagen);
                if (fs.existsSync(imgPath)) {
                   doc.image(imgPath, rectRow.x + 110 + 10, rectRow.y + 5, { fit: [60, 60] });
                }
             }
          } catch(e) {}
        }
      });

      const totalPiezas = orders.reduce((sum, o) => sum + (o.cantidad || 0), 0);
      doc.moveDown();
      doc.fontSize(14).font("Helvetica-Bold").text(`TOTAL DE PIEZAS A RECOLECTAR: ${totalPiezas}`, { align: 'right' });
    }

    doc.end();
  } catch (error) {
    console.error("Error generando reporte recoleccion:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reportes/pagos', async (req, res) => {
  const { start, end } = req.query;
  try {
    let query = `
      SELECT pg.*, m.nombre as maquilero_nombre, i.modelo as producto_modelo
      FROM pagos pg
      JOIN produccion p ON pg.produccion_id = p.id
      JOIN maquileros m ON p.maquilero_id = m.id
      LEFT JOIN inventario i ON p.inventario_id = i.id
    `;
    const params = [];
    let subtitleDate = "";

    if (start && end) {
      if (start === end) {
        query += ` WHERE pg.fecha = ?`;
        params.push(start);
        subtitleDate = `del día ${formatDateToDMY(start)}`;
      } else {
        query += ` WHERE pg.fecha BETWEEN ? AND ?`;
        params.push(start, end);
        subtitleDate = `del ${formatDateToDMY(start)} al ${formatDateToDMY(end)}`;
      }
    } else if (start) {
      query += ` WHERE pg.fecha >= ?`;
      params.push(start);
      subtitleDate = `desde ${formatDateToDMY(start)}`;
    } else if (end) {
      query += ` WHERE pg.fecha <= ?`;
      params.push(end);
      subtitleDate = `hasta ${formatDateToDMY(end)}`;
    }
    
    query += ` ORDER BY pg.fecha ASC, pg.id ASC`;
    const [rows] = await db.query(query, params);

    const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'portrait' });
    res.setHeader('Content-disposition', 'attachment; filename="Reporte_Pagos.pdf"');
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);

    try {
      const logoPath = path.join(__dirname, '..', 'frontend', 'public', 'logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 25, 20, { width: 85 });
      }
    } catch (e) {}

    doc.y = 100;

    if (rows.length === 0) {
      doc.fontSize(20).text('Reporte de Pagos', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text('No se encontraron pagos en el periodo seleccionado.', { align: 'center' });
    } else {
      const tableConfig = {
        title: "Reporte de Pagos a Maquileros",
        subtitle: `Pagos realizados ${subtitleDate}` + " - Generado el " + formatDateToDMY(new Date()),
        headers: [
          { label: "FECHA", property: "fecha", width: 80 },
          { label: "MAQUILERO", property: "maquilero", width: 160 },
          { label: "MODELO", property: "modelo", width: 100 },
          { label: "TIPO", property: "tipo", width: 80 },
          { label: "MONTO", property: "monto", width: 100 }
        ],
        datas: rows.map(r => ({
          fecha: formatDateToDMY(r.fecha),
          maquilero: (r.maquilero_nombre || '').toUpperCase(),
          modelo: r.producto_modelo || '-',
          tipo: (r.tipo_pago || 'ABONO').toUpperCase(),
          monto: '$' + Number(r.monto).toFixed(2)
        })),
        options: { padding: 5 }
      };

      await doc.table(tableConfig, {
        prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
        prepareRow: () => doc.font("Helvetica").fontSize(10)
      });

      const totalMonto = rows.reduce((sum, r) => sum + Number(r.monto), 0);
      doc.moveDown();
      doc.fontSize(14).font("Helvetica-Bold").text(`TOTAL PAGADO EN EL PERIODO: $${totalMonto.toFixed(2)}`, { align: 'right' });
    }

    doc.end();
  } catch (error) {
    console.error("Error generando reporte pagos:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/descuentos/pendientes/:maquileroId', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT SUM(monto_total) as total_pendiente FROM descuentos_personales WHERE maquilero_id = ? AND aplicado = 0",
      [req.params.maquileroId]
    );
    res.json({ total_pendiente: rows[0].total_pendiente || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// APIs Descuentos Personales
app.post('/api/descuentos', authenticateToken, async (req, res) => {
  const { maquilero_id, inventario_id, motivo, monto_total, piezas_afectadas } = req.body;
  try {
    const [result] = await db.query(
      "INSERT INTO descuentos_personales (maquilero_id, inventario_id, motivo, monto_total, piezas_afectadas) VALUES (?, ?, ?, ?, ?)",
      [maquilero_id, inventario_id || null, motivo, monto_total, piezas_afectadas || 0]
    );

    // Registrar en historial
    await db.query(
      "INSERT INTO historial (user_id, action, target, description) VALUES (?, ?, ?, ?)",
      [req.user.id, 'CREAR', 'DESCUENTO', `Descuento de $${monto_total} a maquilero ID ${maquilero_id} por: ${motivo}`]
    );

    res.status(201).json({ message: 'Descuento registrado correctamente', id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/descuentos/maquilero/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT d.*, i.modelo as producto_modelo 
       FROM descuentos_personales d 
       LEFT JOIN inventario i ON d.inventario_id = i.id 
       WHERE d.maquilero_id = ? 
       ORDER BY d.fecha DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DIAGNOSTIC RESTORE MODELS
app.get('/api/admin/restore-models', async (req, res) => {
  try {
    const targetModels = ['554258', '554296', '526260', '554223'];
    const diagnostics = {};

    // Get first maquilero as fallback for new production orders
    const [maqs] = await db.query("SELECT id, nombre FROM maquileros LIMIT 1");
    const defaultMaquilero = maqs[0] || null;

    diagnostics.defaultMaquilero = defaultMaquilero;
    diagnostics.results = [];

    for (const model of targetModels) {
      const modelResult = { model, status: 'Not processed' };
      
      // 1. Search cuts exact
      let [cuts] = await db.query("SELECT * FROM inventario WHERE modelo = ?", [model]);
      
      // 2. If not found, search with LIKE
      if (cuts.length === 0) {
        const [likeCuts] = await db.query("SELECT * FROM inventario WHERE modelo LIKE ?", [`%${model}%`]);
        cuts = likeCuts;
        modelResult.searchType = 'LIKE';
      } else {
        modelResult.searchType = 'EXACT';
      }

      modelResult.foundCutsCount = cuts.length;
      modelResult.cuts = cuts.map(c => ({ id: c.id, modelo: c.modelo, en_inventario: c.en_inventario }));

      if (cuts.length > 0) {
        modelResult.actions = [];
        for (const cut of cuts) {
          const cutActions = { cutId: cut.id, modelo: cut.modelo };

          // A. Ensure en_inventario = 0 (so it shows in production/cuts list)
          if (cut.en_inventario !== 0) {
            await db.query("UPDATE inventario SET en_inventario = 0 WHERE id = ?", [cut.id]);
            cutActions.cutStatusUpdated = 'Set en_inventario = 0';
          } else {
            cutActions.cutStatusUpdated = 'Already 0';
          }

          // B. Get production rows for this cut
          const [prodRows] = await db.query("SELECT * FROM produccion WHERE inventario_id = ?", [cut.id]);
          cutActions.productionCount = prodRows.length;
          cutActions.productionRowsBefore = prodRows.map(p => ({ id: p.id, estado: p.estado, archivado: p.archivado }));

          if (prodRows.length > 0) {
            // Update existing production rows to 'Terminado' and archived = 2 (so they disappear from Maquila active list)
            const [updateResult] = await db.query(
              "UPDATE produccion SET estado = 'Terminado', archivado = 2, fecha_terminado = NOW() WHERE inventario_id = ?",
              [cut.id]
            );
            cutActions.actionPerformed = `Updated ${updateResult.affectedRows} existing production rows to Terminado / Archived`;
          } else {
            // No production rows! Let's insert a completed one so it is in history
            if (defaultMaquilero) {
              const [insertResult] = await db.query(
                "INSERT INTO produccion (maquilero_id, inventario_id, cantidad, precio_total, fecha_inicio, fecha_fin, estado, archivado) VALUES (?, ?, 100, 0, CURRENT_DATE(), CURRENT_DATE(), 'Terminado', 2)",
                [defaultMaquilero.id, cut.id]
              );
              cutActions.actionPerformed = `Created new production row ID ${insertResult.insertId} with Terminado / Archived state for maquilero: ${defaultMaquilero.nombre}`;
            } else {
              cutActions.actionPerformed = `Could not create production row because no maquileros exist in the database. Please create a maquilero first!`;
            }
          }
          modelResult.actions.push(cutActions);
        }
        modelResult.status = 'Processed and Restored';
      } else {
        // Model not found in inventario at all!
        // Let's create it in inventario and then create its production order as completed!
        if (defaultMaquilero) {
          // Create cut in inventario
          const [invInsert] = await db.query(
            "INSERT INTO inventario (modelo, numero, piezas_en_proceso, en_inventario) VALUES (?, 'RESTORED', 100, 0)",
            [model]
          );
          const newCutId = invInsert.insertId;
          
          // Create production order as completed
          const [prodInsert] = await db.query(
            "INSERT INTO produccion (maquilero_id, inventario_id, cantidad, precio_total, fecha_inicio, fecha_fin, estado, archivado) VALUES (?, ?, 100, 0, CURRENT_DATE(), CURRENT_DATE(), 'Terminado', 2)",
            [defaultMaquilero.id, newCutId]
          );
          
          modelResult.status = 'Created brand new cut and completed production row';
          modelResult.actions = [{
            cutId: newCutId,
            modelo: model,
            cutStatusUpdated: 'Created new cut in inventario',
            actionPerformed: `Created new production row ID ${prodInsert.insertId} with Terminado / Archived state for maquilero: ${defaultMaquilero.nombre}`
          }];
        } else {
          modelResult.status = 'Failed to create because no default maquilero exists';
        }
      }
      
      diagnostics.results.push(modelResult);
    }

    // --- INTEGRACIÓN CON MÓDULO PLANCHA (HISTORIAL) ---
    const planchaResults = [];
    
    // 1. Get or create a default truck
    let [trucks] = await db.query("SELECT id FROM camiones ORDER BY id DESC LIMIT 1");
    let truckId;
    let truckStatus = "Found existing truck";
    if (trucks.length > 0) {
      truckId = trucks[0].id;
    } else {
      const [tInsert] = await db.query(
        "INSERT INTO camiones (fecha_envio, observaciones) VALUES (CURRENT_DATE(), 'Camion de recuperacion automatica')"
      );
      truckId = tInsert.insertId;
      truckStatus = "Created new truck";
    }

    // 2. Get or create a default planchador
    let [planchadores] = await db.query("SELECT id, nombre FROM planchadores LIMIT 1");
    let planchadorId;
    let planchadorNombre;
    let planchadorStatus = "Found existing planchador";
    if (planchadores.length > 0) {
      planchadorId = planchadores[0].id;
      planchadorNombre = planchadores[0].nombre;
    } else {
      const [pInsert] = await db.query(
        "INSERT INTO planchadores (nombre, telefono) VALUES ('Hernàndez Bravo Olga', '3121234567')"
      );
      planchadorId = pInsert.insertId;
      planchadorNombre = 'Hernàndez Bravo Olga';
      planchadorStatus = "Created default planchador (Hernàndez Bravo Olga)";
    }

    diagnostics.planchaSetup = {
      truckId,
      truckStatus,
      planchadorId,
      planchadorNombre,
      planchadorStatus
    };

    // 3. Process each model for plancha history
    for (const model of targetModels) {
      const planchaItem = { model };

      // A. Get or create camion_detalles for this model
      let [cdRows] = await db.query("SELECT id, piezas, precio_plancha FROM camion_detalles WHERE modelo = ? AND camion_id = ?", [model, truckId]);
      let camionDetallesId;
      if (cdRows.length > 0) {
        camionDetallesId = cdRows[0].id;
        planchaItem.camionDetalles = { id: camionDetallesId, status: "Found existing" };
      } else {
        const [cdInsert] = await db.query(
          `INSERT INTO camion_detalles 
           (camion_id, modelo, piezas, tallas_cantidades, precio_plancha, no_orden, color, cliente, temporada, numero)
           VALUES (?, ?, 100, '{"U": 100}', 5.00, 'CD-RESTORED', 'Único', 'General', '2026', 'RESTORED')`,
          [truckId, model]
        );
        camionDetallesId = cdInsert.insertId;
        planchaItem.camionDetalles = { id: camionDetallesId, status: "Created new" };
      }

      // B. Get or create plancha_trabajos for this planchador and camion_detalles_id
      let [ptRows] = await db.query("SELECT id, piezas, estado FROM plancha_trabajos WHERE camion_detalles_id = ? AND planchador_id = ?", [camionDetallesId, planchadorId]);
      if (ptRows.length > 0) {
        planchaItem.planchaTrabajo = { id: ptRows[0].id, status: "Found existing, already in history" };
      } else {
        const [ptInsert] = await db.query(
          `INSERT INTO plancha_trabajos 
           (planchador_id, camion_detalles_id, talla, piezas, burro_numero, estado, precio_unitario, neto, total, fecha_terminado)
           VALUES (?, ?, 'U', 100, 1, 'terminado', 5.00, 500.00, 500.00, NOW())`,
          [planchadorId, camionDetallesId]
        );
        planchaItem.planchaTrabajo = { id: ptInsert.insertId, status: "Created new completed job in history" };
      }

      planchaResults.push(planchaItem);
    }
    diagnostics.planchaResults = planchaResults;

    res.json({
      success: true,
      message: "Diagnostics, Maquila, and Plancha recovery run successfully.",
      diagnostics
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// --- NUEVO MÓDULO: PLANCHA (IRONING) ------
// ==========================================

// 1. OBTENER LISTA DE PLANCHADORES
app.get('/api/planchadores', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM planchadores ORDER BY nombre ASC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. OBTENER DETALLE E HISTORIAL DEL PLANCHADOR
app.get('/api/planchadores/:id', authenticateToken, async (req, res) => {
  try {
    const [planchadores] = await db.query("SELECT * FROM planchadores WHERE id = ?", [req.params.id]);
    const planchador = planchadores[0];
    if (!planchador) return res.status(404).json({ error: 'Planchador no encontrado' });

    // Historial de trabajos terminados
    const [historial] = await db.query(`
      SELECT pt.*, cd.modelo as modelo_nombre,
             (SELECT imagen FROM inventario WHERE modelo = cd.modelo LIMIT 1) as modelo_imagen,
             cd.no_orden, COALESCE(pt.color, cd.color, 'Único') as color
      FROM plancha_trabajos pt
      LEFT JOIN camion_detalles cd ON pt.camion_detalles_id = cd.id
      WHERE pt.planchador_id = ?
      ORDER BY pt.id DESC
    `, [req.params.id]);

    planchador.historial = historial;
    res.json(planchador);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. REGISTRAR PLANCHADOR
app.post('/api/planchadores', authenticateToken, async (req, res) => {
  const { nombre, telefono } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
  try {
    const [result] = await db.query(
      "INSERT INTO planchadores (nombre, telefono) VALUES (?, ?)",
      [nombre, telefono || '']
    );
    await logActivity(req.user.id, 'ADD', 'PLANCHADORES', `Registró al planchador ${nombre}`);
    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. ELIMINAR PLANCHADOR
app.delete('/api/planchadores/:id', authenticateToken, async (req, res) => {
  try {
    const [planchadores] = await db.query("SELECT nombre FROM planchadores WHERE id = ?", [req.params.id]);
    const planchador = planchadores[0];
    if (!planchador) return res.status(404).json({ error: 'Planchador no encontrado' });
    
    await db.query("DELETE FROM planchadores WHERE id = ?", [req.params.id]);
    await logActivity(req.user.id, 'DELETE', 'PLANCHADORES', `Eliminó al planchador ${planchador.nombre}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. OBTENER MODELOS DE LOS CAMIONES
app.get('/api/plancha/modelos', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT cd.*, c.fecha_envio, c.observaciones as camion_observaciones,
             (SELECT imagen FROM inventario WHERE modelo = cd.modelo LIMIT 1) as imagen
      FROM camion_detalles cd
      JOIN camiones c ON cd.camion_id = c.id
      ORDER BY c.fecha_envio DESC, cd.id DESC
    `);
    
    const processed = rows.map(r => {
      try {
        r.tallas_cantidades = r.tallas_cantidades ? JSON.parse(r.tallas_cantidades) : {};
      } catch (e) {
        r.tallas_cantidades = {};
      }
      return r;
    });

    res.json(processed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. VERIFICAR LLEGADA DE MODELO A COLIMA
app.post('/api/plancha/modelos/:id/verificar', authenticateToken, async (req, res) => {
  const { precio_plancha } = req.body;
  if (precio_plancha === undefined || precio_plancha < 0) {
    return res.status(400).json({ error: 'El precio de plancha es requerido y debe ser positivo o cero' });
  }
  try {
    const [olds] = await db.query("SELECT modelo FROM camion_detalles WHERE id = ?", [req.params.id]);
    const old = olds[0];
    if (!old) return res.status(404).json({ error: 'Modelo no encontrado' });

    await db.query(
      "UPDATE camion_detalles SET verificado = 1, precio_plancha = ? WHERE id = ?",
      [precio_plancha, req.params.id]
    );

    await logActivity(req.user.id, 'EDIT', 'PLANCHA_MODELO', `Verificó llegada completa y asignó precio de plancha $${precio_plancha} al modelo ${old.modelo}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. OBTENER STOCK DISPONIBLE POR TALLA PARA PLANCHAR
app.get('/api/plancha/disponibles', authenticateToken, async (req, res) => {
  try {
    const [models] = await db.query(`
      SELECT cd.*, c.fecha_envio,
             (SELECT imagen FROM inventario WHERE modelo = cd.modelo LIMIT 1) as imagen
      FROM camion_detalles cd
      JOIN camiones c ON cd.camion_id = c.id
      WHERE cd.verificado = 1
      ORDER BY c.fecha_envio DESC, cd.id DESC
    `);

    const [assigned] = await db.query(`
      SELECT pt.camion_detalles_id, pt.talla, pt.color, SUM(pt.piezas) as total_piezas
      FROM plancha_trabajos pt
      GROUP BY pt.camion_detalles_id, pt.talla, pt.color
    `);

    const assignedLookup = {};
    assigned.forEach(a => {
      const colorKey = a.color || "";
      const key = `${a.camion_detalles_id}_${a.talla}_${colorKey}`;
      assignedLookup[key] = parseInt(a.total_piezas) || 0;
    });

    const result = models.map(m => {
      let originalTallas = {};
      try {
        originalTallas = m.tallas_cantidades ? JSON.parse(m.tallas_cantidades) : {};
      } catch (e) {
        originalTallas = {};
      }

      const firstVal = Object.values(originalTallas)[0];
      const isNested = (typeof firstVal === 'object' && firstVal !== null);

      const flatTallasDisponibles = {};
      const tallasColoresDisponibles = {};
      let totalDisponible = 0;

      if (isNested) {
        Object.entries(originalTallas).forEach(([color, tallasObj]) => {
          tallasColoresDisponibles[color] = {};
          Object.entries(tallasObj).forEach(([talla, cantidad]) => {
            const key = `${m.id}_${talla}_${color}`;
            const gastado = assignedLookup[key] || 0;
            const disp = Math.max(0, parseInt(cantidad) - gastado);
            
            tallasColoresDisponibles[color][talla] = disp;
            flatTallasDisponibles[talla] = (flatTallasDisponibles[talla] || 0) + disp;
            totalDisponible += disp;
          });
        });
      } else {
        tallasColoresDisponibles[""] = {};
        Object.entries(originalTallas).forEach(([talla, cantidad]) => {
          const key = `${m.id}_${talla}_`;
          const gastado = assignedLookup[key] || 0;
          const disp = Math.max(0, parseInt(cantidad) - gastado);
          
          tallasColoresDisponibles[""][talla] = disp;
          flatTallasDisponibles[talla] = disp;
          totalDisponible += disp;
        });
      }

      return {
        ...m,
        tallas_cantidades: originalTallas,
        tallas_disponibles: flatTallasDisponibles,
        tallas_colores_disponibles: tallasColoresDisponibles,
        piezas_disponibles_total: totalDisponible
      };
    }).filter(m => m.piezas_disponibles_total > 0);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const normalizeTalla = (t) => {
  if (!t) return "";
  const num = parseInt(t, 10);
  return isNaN(num) ? t.trim() : num.toString();
};

// 8. ASIGNAR Y FINALIZAR TRABAJOS DE PLANCHA
app.post('/api/plancha/asignar', authenticateToken, async (req, res) => {
  const { planchador_id, burro_numero, talla, modelos } = req.body;
  if (!planchador_id || !burro_numero || !talla || !modelos || !Array.isArray(modelos)) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos o formato inválido' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [planchadores] = await connection.query("SELECT nombre FROM planchadores WHERE id = ?", [planchador_id]);
    const planchador = planchadores[0];
    if (!planchador) throw new Error('Planchador no encontrado');

    for (const m of modelos) {
      const { camion_detalles_id, piezas, color, talla: modelTalla } = m;
      if (!camion_detalles_id || piezas <= 0) continue;

      const itemTalla = modelTalla || talla;
      const normTalla = normalizeTalla(itemTalla);

      const [models] = await connection.query(
        "SELECT precio_plancha, modelo, tallas_cantidades FROM camion_detalles WHERE id = ?", 
        [camion_detalles_id]
      );
      const model = models[0];
      if (!model) throw new Error(`Modelo con ID ${camion_detalles_id} no encontrado`);

      let tallasOriginales = {};
      try {
        tallasOriginales = model.tallas_cantidades ? JSON.parse(model.tallas_cantidades) : {};
      } catch (e) {
        tallasOriginales = {};
      }

      const firstVal = Object.values(tallasOriginales)[0];
      const isNested = (typeof firstVal === 'object' && firstVal !== null);
      const selectedColor = color || "";

      // Encontrar la clave original de talla que coincida con normTalla (por ejemplo, "05")
      let matchingTallaKey = itemTalla;
      if (isNested) {
        const colorObj = tallasOriginales[selectedColor] || {};
        matchingTallaKey = Object.keys(colorObj).find(k => normalizeTalla(k) === normTalla) || itemTalla;
      } else {
        matchingTallaKey = Object.keys(tallasOriginales).find(k => normalizeTalla(k) === normTalla) || itemTalla;
      }

      let maxPiezas = 0;
      if (isNested) {
        maxPiezas = (tallasOriginales[selectedColor] && tallasOriginales[selectedColor][matchingTallaKey]) || 0;
      } else {
        maxPiezas = tallasOriginales[matchingTallaKey] || 0;
      }

      const [alreadyIroned] = await connection.query(
        "SELECT COALESCE(SUM(piezas), 0) as total FROM plancha_trabajos WHERE camion_detalles_id = ? AND talla = ? AND (color = ? OR (? = '' AND color IS NULL))",
        [camion_detalles_id, matchingTallaKey, selectedColor, selectedColor]
      );
      const ironedCount = alreadyIroned[0].total || 0;
      const disponible = maxPiezas - ironedCount;

      if (piezas > disponible) {
        throw new Error(`Cantidad insuficiente. Talla ${matchingTallaKey} del modelo ${model.modelo} (Color: ${selectedColor || 'Único'}) solo tiene ${disponible} piezas disponibles (solicitado: ${piezas}).`);
      }

      const precio_unitario = model.precio_plancha || 0;
      const neto = piezas * precio_unitario;
      const total = neto;

      await connection.query(`
        INSERT INTO plancha_trabajos 
        (planchador_id, camion_detalles_id, talla, piezas, burro_numero, estado, precio_unitario, neto, total, color, fecha_terminado)
        VALUES (?, ?, ?, ?, ?, 'terminado', ?, ?, ?, ?, NOW())
      `, [
        planchador_id,
        camion_detalles_id,
        matchingTallaKey,
        piezas,
        burro_numero,
        precio_unitario,
        neto,
        total,
        selectedColor || null
      ]);
    }

    await connection.commit();
    await logActivity(req.user.id, 'ADD', 'PLANCHA_ASIGNACION', `Asignó y completó planchado en burro #${burro_numero} (Talla ${talla}) para el planchador ${planchador.nombre}`);
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    res.status(400).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// 9. HISTORIAL DE PAGOS DE UN PLANCHADOR
app.get('/api/planchadores/:id/pagos', authenticateToken, async (req, res) => {
  try {
    const [pagos] = await db.query(
      "SELECT * FROM planchador_pagos WHERE planchador_id = ? ORDER BY fecha DESC, id DESC",
      [req.params.id]
    );

    const [paymentsResult] = await db.query(
      "SELECT COALESCE(SUM(monto), 0) as pagado FROM planchador_pagos WHERE planchador_id = ?",
      [req.params.id]
    );
    const pagado = parseFloat(paymentsResult[0].pagado) || 0;

    const [trabajosPendientes] = await db.query(`
      SELECT pt.*, cd.modelo as modelo_nombre,
             (SELECT imagen FROM inventario WHERE modelo = cd.modelo LIMIT 1) as modelo_imagen
      FROM plancha_trabajos pt
      LEFT JOIN camion_detalles cd ON pt.camion_detalles_id = cd.id
      WHERE pt.planchador_id = ? AND pt.estado = 'terminado' AND pt.pago_id IS NULL
      ORDER BY pt.fecha_creacion DESC
    `, [req.params.id]);

    const [asistenciasPendientes] = await db.query(
      "SELECT * FROM planchador_asistencias WHERE planchador_id = ? AND pago_id IS NULL ORDER BY fecha DESC",
      [req.params.id]
    );

    const pendingWorksSum = trabajosPendientes.reduce((sum, pt) => sum + parseFloat(pt.total || 0), 0);
    const pendingAsistenciasSum = asistenciasPendientes.reduce((sum, pa) => sum + parseFloat(pa.monto || 0), 0);
    const pendiente = pendingWorksSum + pendingAsistenciasSum;
    const ganado = pagado + pendiente;

    res.json({
      ganado,
      pagado,
      pendiente,
      pagos,
      trabajosPendientes,
      asistenciasPendientes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 10. REGISTRAR PAGO A PLANCHADOR
app.post('/api/plancha/pagos', authenticateToken, async (req, res) => {
  const { planchador_id, monto, tipo_pago } = req.body;
  if (!planchador_id || !monto || monto <= 0) {
    return res.status(400).json({ error: 'Parámetros requeridos inválidos' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [planchadores] = await connection.query("SELECT nombre FROM planchadores WHERE id = ?", [planchador_id]);
    const planchador = planchadores[0];
    if (!planchador) throw new Error('Planchador no encontrado');

    const [paymentResult] = await connection.query(`
      INSERT INTO planchador_pagos (planchador_id, monto, fecha, tipo_pago)
      VALUES (?, ?, CURDATE(), ?)
    `, [planchador_id, monto, tipo_pago || 'completo']);
    const pagoId = paymentResult.insertId;

    await connection.query(
      "UPDATE plancha_trabajos SET pago_id = ? WHERE planchador_id = ? AND estado = 'terminado' AND pago_id IS NULL",
      [pagoId, planchador_id]
    );

    await connection.query(
      "UPDATE planchador_asistencias SET pago_id = ? WHERE planchador_id = ? AND pago_id IS NULL",
      [pagoId, planchador_id]
    );

    await connection.commit();
    await logActivity(req.user.id, 'ADD', 'PLANCHA_PAGO', `Registró pago de $${monto} al planchador ${planchador.nombre}`);
    res.json({ success: true, pagoId });
  } catch (error) {
    await connection.rollback();
    res.status(400).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// 10.1 REGISTRAR ASISTENCIA DE PLANCHADOR
app.post('/api/planchadores/:id/asistencia', authenticateToken, async (req, res) => {
  const planchadorId = req.params.id;
  try {
    // 1. Verificar si ya tiene registrada la asistencia para el día de hoy
    const [existing] = await db.query(
      "SELECT id FROM planchador_asistencias WHERE planchador_id = ? AND fecha = CURDATE()",
      [planchadorId]
    );

    let newlyRegistered = false;
    if (existing.length === 0) {
      await db.query(
        "INSERT INTO planchador_asistencias (planchador_id, fecha, monto) VALUES (?, CURDATE(), 50.00)",
        [planchadorId]
      );
      newlyRegistered = true;
    }

    // 2. Obtener conteo de asistencias del lunes a viernes de la semana actual
    const [countResult] = await db.query(`
      SELECT COUNT(*) as count 
      FROM planchador_asistencias 
      WHERE planchador_id = ? 
        AND fecha >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
        AND WEEKDAY(fecha) < 5
    `, [planchadorId]);

    const count = countResult[0].count || 0;

    res.json({
      success: true,
      registered: newlyRegistered,
      asistencias_count: count,
      monto: 50.00
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 10.2 REGISTRAR AJUSTE / PAGO FIJO DE PLANCHADOR
app.post('/api/plancha/ajustes', authenticateToken, async (req, res) => {
  const { planchador_id, razon, monto, fecha } = req.body;
  if (!planchador_id || !razon || monto === undefined) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [planchadores] = await connection.query("SELECT nombre FROM planchadores WHERE id = ?", [planchador_id]);
    const planchador = planchadores[0];
    if (!planchador) throw new Error('Planchador no encontrado');

    const targetDateStr = fecha ? fecha : null;

    // Validar si ya se registró un ajuste con la misma descripción en esta fecha para este planchador
    const checkQuery = targetDateStr
      ? `SELECT id FROM plancha_trabajos WHERE planchador_id = ? AND (camion_detalles_id = 0 OR camion_detalles_id IS NULL) AND DATE(fecha_creacion) = ? AND color = ?`
      : `SELECT id FROM plancha_trabajos WHERE planchador_id = ? AND (camion_detalles_id = 0 OR camion_detalles_id IS NULL) AND DATE(fecha_creacion) = CURDATE() AND color = ?`;
    
    const checkParams = targetDateStr ? [planchador_id, targetDateStr, razon] : [planchador_id, razon];
    const [existing] = await connection.query(checkQuery, checkParams);

    if (existing.length > 0) {
      throw new Error(`Ya se registró un ajuste o pago fijo con la descripción "${razon}" para este planchador en la fecha seleccionada (${targetDateStr || 'hoy'}).`);
    }

    const adjustmentDate = targetDateStr ? `${targetDateStr} 12:00:00` : new Date();

    // Insertar como un trabajo especial en plancha_trabajos
    await connection.query(`
      INSERT INTO plancha_trabajos 
      (planchador_id, camion_detalles_id, talla, piezas, burro_numero, estado, precio_unitario, neto, total, color, fecha_terminado, fecha_creacion)
      VALUES (?, NULL, 'AJUSTE', 1, 0, 'terminado', ?, ?, ?, ?, ?, ?)
    `, [
      planchador_id,
      monto,
      monto,
      monto,
      razon,
      adjustmentDate,
      adjustmentDate
    ]);

    await connection.commit();
    await logActivity(req.user.id, 'ADD', 'PLANCHA_AJUSTE', `Registró ajuste de $${monto} por '${razon}' al planchador ${planchador.nombre}`);
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    res.status(400).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// DELETE TRABAJO O AJUSTE DE PLANCHA
app.delete('/api/plancha/trabajos/:id', authenticateToken, async (req, res) => {
  const allowedRoles = ['admin', 'produccion1', 'produccion2'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'No autorizado para esta sección' });
  }

  try {
    const [olds] = await db.query(
      "SELECT pt.*, p.nombre as planchador_nombre FROM plancha_trabajos pt JOIN planchadores p ON pt.planchador_id = p.id WHERE pt.id = ?",
      [req.params.id]
    );
    const old = olds[0];
    if (!old) return res.status(404).json({ error: 'Registro no encontrado' });

    // Si ya está pagado, no permitir eliminar
    if (old.pago_id) {
      return res.status(400).json({ error: 'No se puede eliminar un registro que ya fue pagado/liquidado' });
    }

    await db.query("DELETE FROM plancha_trabajos WHERE id = ?", [req.params.id]);

    const desc = old.talla === 'AJUSTE'
      ? `Eliminó ajuste de $${old.total} (${old.color}) del planchador ${old.planchador_nombre}`
      : `Eliminó trabajo de plancha del modelo ${old.color} (Talla: ${old.talla}) del planchador ${old.planchador_nombre}`;

    await logActivity(req.user.id, 'DELETE', 'PLANCHA_TRABAJO', desc);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE ASISTENCIA DE PLANCHADOR
app.delete('/api/plancha/asistencias/:id', authenticateToken, async (req, res) => {
  const allowedRoles = ['admin', 'produccion1', 'produccion2'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'No autorizado para esta sección' });
  }

  try {
    const [olds] = await db.query(
      "SELECT pa.*, p.nombre as planchador_nombre FROM planchador_asistencias pa JOIN planchadores p ON pa.planchador_id = p.id WHERE pa.id = ?",
      [req.params.id]
    );
    const old = olds[0];
    if (!old) return res.status(404).json({ error: 'Asistencia no encontrada' });

    if (old.pago_id) {
      return res.status(400).json({ error: 'No se puede eliminar una asistencia que ya fue pagada/liquidada' });
    }

    await db.query("DELETE FROM planchador_asistencias WHERE id = ?", [req.params.id]);

    await logActivity(req.user.id, 'DELETE', 'PLANCHA_ASISTENCIA', `Eliminó asistencia del día ${old.fecha} ($${old.monto}) del planchador ${old.planchador_nombre}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 10.3 OBTENER TOTAL DE PIEZAS PLANCHADAS EN UN RANGO DE FECHAS
app.get('/api/planchadores/:id/piezas-rango', authenticateToken, async (req, res) => {
  const planchadorId = req.params.id;
  const { start, end } = req.query;
  if (!start || !end) {
    return res.status(400).json({ error: 'Rango de fechas requerido' });
  }
  try {
    const [result] = await db.query(`
      SELECT 
        COALESCE(SUM(piezas), 0) as total_piezas,
        COALESCE(SUM(total), 0) as total_ganado
      FROM plancha_trabajos 
      WHERE planchador_id = ? 
        AND estado = 'terminado' 
        AND COALESCE(camion_detalles_id, 0) > 0
        AND DATE(fecha_terminado) BETWEEN ? AND ?
    `, [planchadorId, start, end]);

    res.json({ 
      total_piezas: parseFloat(result[0].total_piezas) || 0,
      total_ganado: parseFloat(result[0].total_ganado) || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 10.4 REPORTES DE PAGOS DE PLANCHA EN PDF
app.get('/api/reportes/plancha/pagos', async (req, res) => {
  const { start, end } = req.query;
  try {
    let whereClause = "";
    const params = [];
    let subtitleDate = "";

    if (start && end) {
      if (start === end) {
        whereClause = ` WHERE DATE(pp.fecha) = ?`;
        params.push(start);
        subtitleDate = `del día ${formatDateToDMY(start)}`;
      } else {
        whereClause = ` WHERE DATE(pp.fecha) BETWEEN ? AND ?`;
        params.push(start, end);
        subtitleDate = `del ${formatDateToDMY(start)} al ${formatDateToDMY(end)}`;
      }
    } else if (start) {
      whereClause = ` WHERE DATE(pp.fecha) >= ?`;
      params.push(start);
      subtitleDate = `desde ${formatDateToDMY(start)}`;
    } else if (end) {
      whereClause = ` WHERE DATE(pp.fecha) <= ?`;
      params.push(end);
      subtitleDate = `hasta ${formatDateToDMY(end)}`;
    }

    const paymentsQuery = `
      SELECT 
        pp.id,
        pp.planchador_id,
        pp.fecha,
        pp.monto as total_pagado,
        p.nombre as planchador_nombre
      FROM planchador_pagos pp
      JOIN planchadores p ON pp.planchador_id = p.id
      ${whereClause}
      ORDER BY pp.fecha ASC, pp.id ASC
    `;

    const [payments] = await db.query(paymentsQuery, params);

    const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'portrait' });
    res.setHeader('Content-disposition', 'attachment; filename="Reporte_Pagos_Plancha.pdf"');
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);

    try {
      const logoPath = path.join(__dirname, '..', 'frontend', 'public', 'logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 25, 20, { width: 85 });
      }
    } catch (e) {}

    doc.y = 100;

    if (payments.length === 0) {
      doc.fontSize(20).text('Reporte de Pagos de Plancha', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text('No se encontraron registros de pagos en el periodo seleccionado.', { align: 'center' });
    } else {
      const formatDateUTC = (dateVal) => {
        if (!dateVal) return '';
        let dateStr = "";
        if (dateVal instanceof Date) {
          dateStr = dateVal.toISOString();
        } else {
          dateStr = String(dateVal);
        }
        const cleanDate = dateStr.split('T')[0];
        const parts = cleanDate.split('-');
        if (parts.length < 3) return dateStr;
        const [year, month, day] = parts;
        return `${parseInt(day, 10)}/${parseInt(month, 10)}/${year}`;
      };

      const paymentIds = payments.map(p => p.id);

      const [works] = await db.query(`
        SELECT id, planchador_id, total, camion_detalles_id, color, fecha_terminado, pago_id
        FROM plancha_trabajos
        WHERE estado = 'terminado' AND (pago_id IS NULL OR pago_id IN (?)) AND (burro_numero IS NULL OR burro_numero < 11)
      `, [paymentIds]);

      const [asistencias] = await db.query(`
        SELECT id, planchador_id, monto, fecha, pago_id
        FROM planchador_asistencias
        WHERE pago_id IS NULL OR pago_id IN (?)
      `, [paymentIds]);

      for (const p of payments) {
        p.total_produccion = 0;
        p.total_bono = 0;
        p.total_pago_fijo = 0;
        p.total_diferencia_dia_adelantado = 0;
      }

      const paymentMap = {};
      for (const p of payments) {
        paymentMap[p.id] = p;
      }

      const orphanWorks = [];
      const orphanAsistencias = [];

      for (const w of works) {
        if (w.pago_id !== null) {
          const p = paymentMap[w.pago_id];
          if (p) {
            const isProduccion = (Number(w.camion_detalles_id) || 0) > 0;
            const isDiferencia = w.color && w.color.includes('Diferencia');
            if (isProduccion) {
              p.total_produccion += Number(w.total) || 0;
            } else if (isDiferencia) {
              p.total_diferencia_dia_adelantado += Number(w.total) || 0;
            } else {
              p.total_pago_fijo += Number(w.total) || 0;
            }
          }
        } else {
          orphanWorks.push(w);
        }
      }

      for (const a of asistencias) {
        if (a.pago_id !== null) {
          const p = paymentMap[a.pago_id];
          if (p) {
            p.total_bono += Number(a.monto) || 0;
          }
        } else {
          orphanAsistencias.push(a);
        }
      }

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

      for (const w of orphanWorks) {
        const planchadorPayments = paymentsByPlanchador[w.planchador_id] || [];
        const wDate = getCleanDateStr(w.fecha_terminado);
        
        const matchedPayment = planchadorPayments.find(p => {
          const pDate = getCleanDateStr(p.fecha);
          return pDate >= wDate;
        });

        if (matchedPayment) {
          const isProduccion = (Number(w.camion_detalles_id) || 0) > 0;
          const isDiferencia = w.color && w.color.includes('Diferencia');
          if (isProduccion) {
            matchedPayment.total_produccion += Number(w.total) || 0;
          } else if (isDiferencia) {
            matchedPayment.total_diferencia_dia_adelantado += Number(w.total) || 0;
          } else {
            matchedPayment.total_pago_fijo += Number(w.total) || 0;
          }
        }
      }

      for (const a of orphanAsistencias) {
        const planchadorPayments = paymentsByPlanchador[a.planchador_id] || [];
        const aDate = getCleanDateStr(a.fecha);
        
        const matchedPayment = planchadorPayments.find(p => {
          const pDate = getCleanDateStr(p.fecha);
          return pDate >= aDate;
        });

        if (matchedPayment) {
          matchedPayment.total_bono += Number(a.monto) || 0;
        }
      }

      const consolidatedMap = {};
      for (const r of payments) {
        const cleanDate = formatDateUTC(r.fecha);
        const nameKey = (r.planchador_nombre || '').toUpperCase();
        const key = `${cleanDate}_${nameKey}`;

        if (!consolidatedMap[key]) {
          consolidatedMap[key] = {
            fecha: cleanDate,
            nombre: nameKey,
            total_produccion: 0,
            total_bono: 0,
            total_pago_fijo: 0,
            total_diferencia_dia_adelantado: 0,
            sum_payment_montos: 0
          };
        }

        consolidatedMap[key].total_produccion += Number(r.total_produccion) || 0;
        consolidatedMap[key].total_bono += Number(r.total_bono) || 0;
        consolidatedMap[key].total_pago_fijo += Number(r.total_pago_fijo) || 0;
        consolidatedMap[key].total_diferencia_dia_adelantado += Number(r.total_diferencia_dia_adelantado) || 0;
        consolidatedMap[key].sum_payment_montos += Number(r.total_pagado) || 0;
      }

      const consolidatedRows = Object.values(consolidatedMap).map(row => {
        const breakdownSum = row.total_produccion + row.total_bono + row.total_pago_fijo + row.total_diferencia_dia_adelantado;
        const total = breakdownSum > 0 ? breakdownSum : row.sum_payment_montos;
        return {
          ...row,
          total_pagado: total
        };
      });

      const localNow = new Date(new Date().getTime() - 6 * 60 * 60 * 1000);

      const tableConfig = {
        title: "Reporte de Pagos de Plancha",
        subtitle: `Pagos registrados ${subtitleDate}` + " - Generado el " + formatDateUTC(localNow),
        headers: [
          { label: "FECHA", property: "fecha", width: 65 },
          { label: "PLANCHADOR", property: "nombre", width: 120 },
          { label: "PRODUCCIÓN", property: "produccion", width: 75 },
          { label: "BONO", property: "bono", width: 65 },
          { label: "PAGO FIJO", property: "pago_fijo", width: 75 },
          { label: "DIF. DÍA ADELANTADO", property: "dif_dia_adelantado", width: 85 },
          { label: "TOTAL", property: "total", width: 70 }
        ],
        datas: consolidatedRows.map(r => ({
          fecha: r.fecha,
          nombre: r.nombre,
          produccion: '$' + r.total_produccion.toFixed(2),
          bono: '$' + r.total_bono.toFixed(2),
          pago_fijo: '$' + r.total_pago_fijo.toFixed(2),
          dif_dia_adelantado: '$' + r.total_diferencia_dia_adelantado.toFixed(2),
          total: '$' + r.total_pagado.toFixed(2)
        })),
        options: { padding: 5 }
      };

      await doc.table(tableConfig, {
        prepareHeader: () => doc.font("Helvetica-Bold").fontSize(9),
        prepareRow: () => doc.font("Helvetica").fontSize(8)
      });

      const totalMonto = consolidatedRows.reduce((sum, r) => sum + r.total_pagado, 0);
      doc.moveDown();
      doc.fontSize(14).font("Helvetica-Bold").text(`TOTAL PAGADO EN EL PERIODO: $${totalMonto.toFixed(2)}`, { align: 'right' });
    }

    doc.end();
  } catch (error) {
    console.error("Error generando reporte pagos plancha:", error);
    res.status(500).json({ error: error.message });
  }
});

// 10.5 REPORTE RESUMEN GENERAL DE PLANCHADORES EN PDF
app.get('/api/reportes/plancha/resumen', async (req, res) => {
  const { start, end } = req.query;
  try {
    const [planchadores] = await db.query("SELECT id, nombre FROM planchadores ORDER BY nombre ASC");
    
    let subtitleDate = "";
    if (start && end) {
      subtitleDate = `del ${formatDateToDMY(start)} al ${formatDateToDMY(end)}`;
    } else if (start) {
      subtitleDate = `desde ${formatDateToDMY(start)}`;
    } else if (end) {
      subtitleDate = `hasta ${formatDateToDMY(end)}`;
    } else {
      subtitleDate = "de todos los tiempos";
    }

    const rowsData = [];

    for (const planchador of planchadores) {
      // 1. Get works (excluding special burros 11 and 12)
      let worksQuery = `
        SELECT talla, color, total
        FROM plancha_trabajos
        WHERE planchador_id = ? AND estado = 'terminado' AND (burro_numero IS NULL OR burro_numero < 11)
      `;
      let worksParams = [planchador.id];
      if (start && end) {
        worksQuery += ` AND DATE(fecha_terminado) BETWEEN ? AND ?`;
        worksParams.push(start, end);
      } else if (start) {
        worksQuery += ` AND DATE(fecha_terminado) >= ?`;
        worksParams.push(start);
      } else if (end) {
        worksQuery += ` AND DATE(fecha_terminado) <= ?`;
        worksParams.push(end);
      }
      
      const [works] = await db.query(worksQuery, worksParams);

      let regularWork = 0;
      let cuadreDif = 0;
      let pagoFijo = 0;

      for (const w of works) {
        const total = Number(w.total) || 0;
        if (w.talla === 'AJUSTE') {
          if (w.color && (w.color.includes('Cuadre') || w.color.includes('Diferencia'))) {
            cuadreDif += total;
          } else {
            pagoFijo += total;
          }
        } else {
          regularWork += total;
        }
      }

      // 2. Get asistencias
      let astQuery = `
        SELECT monto FROM planchador_asistencias WHERE planchador_id = ?
      `;
      let astParams = [planchador.id];
      if (start && end) {
        astQuery += ` AND DATE(fecha) BETWEEN ? AND ?`;
        astParams.push(start, end);
      } else if (start) {
        astQuery += ` AND DATE(fecha) >= ?`;
        astParams.push(start);
      } else if (end) {
        astQuery += ` AND DATE(fecha) <= ?`;
        astParams.push(end);
      }
      
      const [asistencias] = await db.query(astQuery, astParams);
      const asistenciasTotal = asistencias.reduce((sum, a) => sum + (Number(a.monto) || 0), 0);

      // 3. Get payments
      let payQuery = `
        SELECT monto FROM planchador_pagos WHERE planchador_id = ?
      `;
      let payParams = [planchador.id];
      if (start && end) {
        payQuery += ` AND DATE(fecha) BETWEEN ? AND ?`;
        payParams.push(start, end);
      } else if (start) {
        payQuery += ` AND DATE(fecha) >= ?`;
        payParams.push(start);
      } else if (end) {
        payQuery += ` AND DATE(fecha) <= ?`;
        payParams.push(end);
      }
      
      const [payments] = await db.query(payQuery, payParams);
      const pagadoTotal = payments.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);

      const ganadoTotal = regularWork + asistenciasTotal + pagoFijo + cuadreDif;
      const pendienteTotal = ganadoTotal - pagadoTotal;

      rowsData.push({
        nombre: planchador.nombre.toUpperCase(),
        regular: regularWork,
        asistencias: asistenciasTotal,
        pago_fijo: pagoFijo,
        cuadre: cuadreDif,
        ganado: ganadoTotal,
        pagado: pagadoTotal,
        pendiente: pendienteTotal
      });
    }

    const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-disposition', 'attachment; filename="Resumen_General_Plancha.pdf"');
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);

    try {
      const logoPath = path.join(__dirname, '..', 'frontend', 'public', 'logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 25, 20, { width: 85 });
      }
    } catch (e) {}

    doc.y = 80;

    const localNow = new Date(new Date().getTime() - 6 * 60 * 60 * 1000);

    const formatDateUTC = (dateVal) => {
      if (!dateVal) return '';
      let dateStr = (dateVal instanceof Date) ? dateVal.toISOString() : String(dateVal);
      const cleanDate = dateStr.split('T')[0];
      const parts = cleanDate.split('-');
      if (parts.length < 3) return dateStr;
      const [year, month, day] = parts;
      return `${parseInt(day, 10)}/${parseInt(month, 10)}/${year}`;
    };

    const tableConfig = {
      title: "Resumen General de Planchadores",
      subtitle: `Resumen de actividades y saldos ${subtitleDate} - Generado el ${formatDateUTC(localNow)}`,
      headers: [
        { label: "PLANCHADOR", property: "nombre", width: 140 },
        { label: "PLANCHA REGULAR", property: "regular", width: 90 },
        { label: "ASISTENCIAS", property: "asistencias", width: 80 },
        { label: "PAGO FIJO", property: "pago_fijo", width: 80 },
        { label: "DIF. CUADRE", property: "cuadre", width: 80 },
        { label: "TOTAL GANADO", property: "ganado", width: 90 },
        { label: "TOTAL PAGADO", property: "pagado", width: 90 },
        { label: "SALDO PENDIENTE", property: "pendiente", width: 95 }
      ],
      datas: rowsData.map(r => ({
        nombre: r.nombre,
        regular: '$' + r.regular.toFixed(2),
        asistencias: '$' + r.asistencias.toFixed(2),
        pago_fijo: '$' + r.pago_fijo.toFixed(2),
        cuadre: (r.cuadre >= 0 ? '+' : '') + '$' + r.cuadre.toFixed(2),
        ganado: '$' + r.ganado.toFixed(2),
        pagado: '$' + r.pagado.toFixed(2),
        pendiente: '$' + r.pendiente.toFixed(2)
      })),
      options: { padding: 5 }
    };

    await doc.table(tableConfig, {
      prepareHeader: () => doc.font("Helvetica-Bold").fontSize(9),
      prepareRow: () => doc.font("Helvetica").fontSize(8)
    });

    doc.end();
  } catch (error) {
    console.error("Error generando resumen plancha:", error);
    res.status(500).json({ error: error.message });
  }
});

// 11. HISTORIAL GENERAL DE PLANCHADO
app.get('/api/plancha/historial', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT pt.*, p.nombre as planchador_nombre,
             COALESCE(cd.modelo, CONCAT('Ajuste: ', pt.color)) as modelo_nombre, 
             COALESCE(pt.color, cd.color, 'Único') as color, 
             cd.no_orden, 
             COALESCE(cd.precio_plancha, pt.precio_unitario) as precio_plancha,
             (SELECT imagen FROM inventario WHERE modelo = cd.modelo LIMIT 1) as modelo_imagen
      FROM plancha_trabajos pt
      JOIN planchadores p ON pt.planchador_id = p.id
      LEFT JOIN camion_detalles cd ON pt.camion_detalles_id = cd.id
      ORDER BY pt.fecha_terminado DESC, pt.id DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug payments removed

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

module.exports = { app, checkAndMoveToInventory, autoArchiveOrders };
