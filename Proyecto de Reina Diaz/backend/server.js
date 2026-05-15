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
        (SELECT COUNT(id) FROM produccion WHERE inventario_id = i.id AND archivado = 0) as producciones_count
      FROM inventario i
      ORDER BY i.id DESC
    `);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inventario', authenticateToken, upload.single('imagenBtn'), async (req, res) => {
  let { numero, modelo, precio, color, cliente, no_orden, piezas_en_proceso, imagenUrl, observaciones, es_reprogramacion } = req.body;
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
      (numero, modelo, precio, color, cliente, no_orden, piezas_en_proceso, imagen, observaciones, es_reprogramacion) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      isReprog ? 1 : 0
    ]);
    
    const logTag = isReprog ? 'REPROGRAMACION' : 'ALTA';
    await logActivity(req.user.id, logTag, 'INVENTARIO', `${isReprog ? 'Reprogramó' : 'Agregó'} ${modelo} (${piezas_en_proceso} piezas)`);
    
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
  let { numero, modelo, precio, color, cliente, no_orden, piezas_en_proceso, imagenUrl, imagen_actual, observaciones } = req.body;
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
      SET numero=?, modelo=?, precio=?, color=?, cliente=?, no_orden=?, piezas_en_proceso=?, imagen=?, observaciones=? 
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
      req.params.id
    ]);

    let changes = [];
    if (old.modelo !== modelo) changes.push(`Modelo: ${old.modelo} -> ${modelo}`);
    const numPrecio = parseFloat(String(precio).replace(/[^0-9.-]+/g,"")) || 0;
    if (old.precio !== numPrecio) changes.push(`Precio: ${old.precio} -> ${numPrecio}`);
    if (old.piezas_en_proceso !== piezas_en_proceso) changes.push(`Piezas: ${old.piezas_en_proceso} -> ${piezas_en_proceso}`);
    
    const desc = changes.length > 0 ? `Editó ${modelo}: ${changes.join(', ')}` : `Actualizó datos de ${modelo}`;
    await logActivity(req.user.id, 'EDIT', 'INVENTARIO', desc);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/inventario/:id', authenticateToken, async (req, res) => {
  try {
    const [olds] = await db.query("SELECT modelo FROM inventario WHERE id = ?", [req.params.id]);
    const old = olds[0];
    await db.query("DELETE FROM inventario WHERE id = ?", [req.params.id]);
    if (old) {
      await logActivity(req.user.id, 'BAJA', 'INVENTARIO', `Eliminó del inventario: ${old.modelo}`);
    }
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
          await connection.query(`
            INSERT INTO inventario (numero, temporada, modelo, precio, color, cliente, no_orden, piezas_en_proceso) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            piezas_en_proceso = piezas_en_proceso + VALUES(piezas_en_proceso),
            temporada = VALUES(temporada),
            precio = VALUES(precio),
            color = VALUES(color),
            cliente = VALUES(cliente),
            no_orden = VALUES(no_orden)
          `, [String(numero), temporada, String(modelo).trim(), precio, color, cliente, no_orden, piezas_en_proceso]);
        } else {
          await connection.query("INSERT INTO inventario (numero, temporada, modelo, precio, color, cliente, no_orden, piezas_en_proceso) VALUES (?, ?, NULL, ?, ?, ?, ?, ?)",
            [String(numero), temporada, precio, color, cliente, no_orden, piezas_en_proceso]);
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

app.get('/api/produccion', async (req, res) => {
  const { verArchivados } = req.query;
  const whereArchivado = verArchivados === 'true' ? 'p.archivado = 1' : 'p.archivado = 0';
  try {
    const [orders] = await db.query(`
      SELECT p.*, m.nombre as maquilero_nombre,
      i.modelo as producto_modelo, i.imagen as producto_imagen, i.precio as precio_unitario,
      (SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE produccion_id = p.id) as pagado_efectivo,
      (SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE produccion_id = p.id) + 
      (SELECT COALESCE(SUM(dp.monto_total), 0) FROM descuentos_personales dp 
       JOIN pagos pg ON dp.pago_id = pg.id 
       WHERE pg.produccion_id = p.id) as pagado
      FROM produccion p 
      JOIN maquileros m ON p.maquilero_id = m.id
      LEFT JOIN inventario i ON p.inventario_id = i.id
      WHERE ${whereArchivado}
      ORDER BY p.id DESC
    `);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/produccion', authenticateToken, async (req, res) => {
  const { maquilero_id, fecha_inicio, fecha_fin, estado, precio_total, inventario_id, cantidad } = req.body;
  try {
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
  const { maquilero_id, inventario_id, fecha_inicio, fecha_fin, estado, precio_total, cantidad, cantidad_recibida, retrasos, ajuste_tipo, ajuste_porcentaje } = req.body;
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

    let finalPrecioTotal = precio_total !== undefined ? precio_total : old.precio_total;
    
    const currentCant = cantidad_recibida !== undefined ? cantidad_recibida : old.cantidad_recibida;
    const effectiveCant = (currentCant !== null && currentCant !== undefined) ? currentCant : (cantidad !== undefined ? cantidad : old.cantidad);
    const up = old.unit_price || (old.precio_total / old.cantidad) || 0;
    
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
      ajuste_monto = ?
      WHERE id = ?
    `, [
      maquilero_id || null, 
      inventario_id || null, 
      fecha_inicio || null, 
      fecha_fin || null, 
      estado || null, 
      finalPrecioTotal, 
      cantidad || null, 
      cantidad_recibida !== undefined && cantidad_recibida !== '' ? cantidad_recibida : old.cantidad_recibida, 
      retrasos !== undefined && retrasos !== '' ? retrasos : old.retrasos, 
      curAjusteTipo, 
      curAjustePorc, 
      adjustmentAmount,
      req.params.id
    ]);

    let changes = [];
    if (estado && old.estado !== estado) changes.push(`Estado: ${old.estado} -> ${estado}`);
    if (curAjusteTipo !== old.ajuste_tipo) changes.push(`Ajuste: ${old.ajuste_tipo} -> ${curAjusteTipo} (${curAjustePorc}%)`);
    
    // Formatear fechas para comparar (YYYY-MM-DD)
    const fmtDate = (d) => d ? new Date(d).toISOString().split('T')[0] : null;
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

    const [invs] = await db.query("SELECT precio FROM inventario WHERE id = ?", [old.inventario_id]);
    const unitPrice = invs[0]?.precio || (old.precio_total / old.cantidad);
    const subtotal = (old.cantidad_recibida || old.cantidad) * unitPrice;
    
    let adjustmentAmount = subtotal * (porcentaje / 100);
    let finalTotal = (tipo === 'bono') ? (subtotal + adjustmentAmount) : (subtotal - adjustmentAmount);

    await db.query("UPDATE produccion SET ajuste_tipo = ?, ajuste_porcentaje = ?, ajuste_monto = ?, precio_total = ? WHERE id = ?", 
      [tipo, porcentaje, adjustmentAmount, finalTotal, req.params.id]);
    
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

    if (old.estado === 'Terminado') {
      await db.query("UPDATE produccion SET archivado = 1 WHERE id = ?", [req.params.id]);
      await logActivity(req.user.id, 'EDIT', 'PRODUCCION', `Archivó orden terminada de ${old.modelo || 'ID '+req.params.id} (evitó borrado de historial)`);
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
    res.json({ id: pagoId, success: true });
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
             i.modelo as producto_modelo, i.precio as precio_unitario
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
    doc.text(`Orden de Producción: #${pago.orden_id}`);
    
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
  const { date } = req.query;
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
      WHERE p.estado = 'Terminado' AND p.archivado = 0
    `;
    const params = [];
    if (date) {
      query += ` AND p.fecha_fin = ?`;
      params.push(date);
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
      doc.fontSize(12).text(date ? `No hay órdenes terminadas el día ${date}.` : 'No hay órdenes terminadas.', { align: 'center' });
    } else {
      const tableConfig = {
        title: "Reporte de Órdenes Terminadas",
        subtitle: (date ? `Reporte del día ${date}` : "Detalle completo de órdenes terminadas") + " - Generado el " + new Date().toLocaleDateString(),
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
          entrega: o.fecha_fin || '-'
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
        subtitle: "Existencias, costos y unidades actuales registrados en almacén - Generado el " + new Date().toLocaleDateString(),
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
      WHERE p.archivado = 0
    `;
    const params = [];
    let subtitleDate = "estimada";

    if (start && end) {
      if (start === end) {
        query += ` AND p.fecha_fin = ?`;
        params.push(start);
        subtitleDate = `del día ${start}`;
      } else {
        query += ` AND p.fecha_fin BETWEEN ? AND ?`;
        params.push(start, end);
        subtitleDate = `del ${start} al ${end}`;
      }
    } else if (start) {
      query += ` AND p.fecha_fin = ?`;
      params.push(start);
      subtitleDate = `del día ${start}`;
    } else if (end) {
      query += ` AND p.fecha_fin = ?`;
      params.push(end);
      subtitleDate = `del día ${end}`;
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
        subtitle: `Producción a entregar ${subtitleDate}` + " - Generado el " + new Date().toLocaleDateString(),
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
          entrega: o.fecha_fin || '-'
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
        subtitleDate = `del día ${start}`;
      } else {
        query += ` WHERE pg.fecha BETWEEN ? AND ?`;
        params.push(start, end);
        subtitleDate = `del ${start} al ${end}`;
      }
    } else if (start) {
      query += ` WHERE pg.fecha >= ?`;
      params.push(start);
      subtitleDate = `desde ${start}`;
    } else if (end) {
      query += ` WHERE pg.fecha <= ?`;
      params.push(end);
      subtitleDate = `hasta ${end}`;
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
        subtitle: `Pagos realizados ${subtitleDate}` + " - Generado el " + new Date().toLocaleDateString(),
        headers: [
          { label: "FECHA", property: "fecha", width: 80 },
          { label: "MAQUILERO", property: "maquilero", width: 160 },
          { label: "MODELO", property: "modelo", width: 100 },
          { label: "TIPO", property: "tipo", width: 80 },
          { label: "MONTO", property: "monto", width: 100 }
        ],
        datas: rows.map(r => ({
          fecha: new Date(r.fecha).toLocaleDateString(),
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
