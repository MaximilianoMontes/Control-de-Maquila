const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit-table');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

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

// Mock formatDateToDMY from server.js
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

async function run() {
  console.log("Starting diagnostic report generation...");
  
  // 1. PRODUCCION REPORT
  try {
    const lang = 'es';
    const tLabel = (esText, enText) => lang === 'en' ? enText : esText;
    
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
    query += ` ORDER BY p.fecha_fin DESC LIMIT 10`; // Limit to 10 for testing
    
    const [orders] = await pool.query(query);
    console.log(`Produccion Report: Found ${orders.length} finished orders.`);
    
    const doc = new PDFDocument({ margins: { top: 30, bottom: 50, left: 30, right: 30 }, size: 'A4', layout: 'landscape' });
    const outPath = path.join(__dirname, 'test_report_produccion.pdf');
    const writeStream = fs.createWriteStream(outPath);
    doc.pipe(writeStream);
    
    // Logo drawing
    const logoPath = path.join(__dirname, '../frontend/public/logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 25, 20, { width: 85 });
    }
    
    doc.y = 130;
    const subtitleDate = "Detalle completo de órdenes terminadas (Prueba)";
    
    if (orders.length === 0) {
      doc.fontSize(20).text('Reporte de Órdenes Terminadas', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text('No hay órdenes terminadas.', { align: 'center' });
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
        options: { padding: 2 }
      };

      await doc.table(tableConfig, {
        prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
        prepareRow: (row, indexColumn, indexRow, rectRow) => {
          doc.font("Helvetica").fontSize(10);
          try {
             const order = orders[indexRow];
             if (indexColumn === 1 && order.producto_imagen) {
                // Correct image path resolution relative to backend/
                const imgPath = path.join(__dirname, '../backend', order.producto_imagen);
                if (fs.existsSync(imgPath)) {
                   doc.image(imgPath, rectRow.x + 110 + 10, rectRow.y + 5, { fit: [60, 60] });
                } else {
                   // Let's print if image wasn't found for diagnostics
                   // console.log(`Image not found at: ${imgPath}`);
                }
             }
          } catch(e) {
             console.error("Error in prepareRow for produccion image:", e);
          }
        }
      });

      const totalPiezas = orders.reduce((sum, o) => sum + (o.cantidad || 0), 0);
      doc.moveDown();
      doc.fontSize(14).font("Helvetica-Bold").text(`TOTAL DE PIEZAS TERMINADAS: ${totalPiezas}`, { align: 'right' });
    }
    
    doc.end();
    await new Promise((resolve) => writeStream.on('finish', resolve));
    console.log("Produccion Report generated successfully at: " + outPath);
  } catch (error) {
    console.error("Failed generating Produccion Report:", error);
  }

  // 2. INVENTARIO REPORT
  try {
    let query = `
      SELECT i.*, 
        (SELECT COUNT(id) FROM produccion WHERE inventario_id = i.id AND archivado = 0) as producciones_count
      FROM inventario i
      ORDER BY i.id DESC LIMIT 10
    `;
    
    const [items] = await pool.query(query);
    console.log(`Inventario Report: Found ${items.length} inventory items.`);
    
    const doc = new PDFDocument({ margins: { top: 30, bottom: 50, left: 30, right: 30 }, size: 'A4', layout: 'landscape' });
    const outPath = path.join(__dirname, 'test_report_inventario.pdf');
    const writeStream = fs.createWriteStream(outPath);
    doc.pipe(writeStream);
    
    const logoPath = path.join(__dirname, '../frontend/public/logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 25, 20, { width: 85 });
    }
    
    doc.y = 130;
    
    if (items.length === 0) {
      doc.fontSize(20).text('Reporte de Estatus de Inventario', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text('No hay artículos.', { align: 'center' });
    } else {
      const tableConfig = {
        title: "Reporte de Estatus de Inventario",
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
        options: { padding: 2 }
      };

      await doc.table(tableConfig, {
        prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
        prepareRow: (row, indexColumn, indexRow, rectRow) => {
          doc.font("Helvetica").fontSize(10);
          try {
             const item = items[indexRow];
             if (indexColumn === 0 && item.imagen) {
                const imgPath = path.join(__dirname, '../backend', item.imagen);
                if (fs.existsSync(imgPath)) {
                   doc.image(imgPath, rectRow.x + 10, rectRow.y + 5, { fit: [60, 60] });
                }
             }
          } catch(e) {
             console.error("Error in prepareRow for inventario image:", e);
          }
        }
      });

      const totalPiezas = items.reduce((sum, i) => sum + (i.piezas_en_proceso || 0), 0);
      doc.moveDown();
      doc.fontSize(14).font("Helvetica-Bold").text(`TOTAL DE PIEZAS EN PROCESO: ${totalPiezas}`, { align: 'right' });
    }
    
    doc.end();
    await new Promise((resolve) => writeStream.on('finish', resolve));
    console.log("Inventario Report generated successfully at: " + outPath);
  } catch (error) {
    console.error("Failed generating Inventario Report:", error);
  }

  // 3. RECOLECCION REPORT
  try {
    let query = `
      SELECT p.*, 
        m.nombre as maquilero_nombre, m.imagen as maquilero_imagen,
        i.modelo as producto_modelo, i.numero as producto_codigo,
        i.color as producto_color, i.cliente as producto_cliente,
        i.no_orden as inventario_orden, i.imagen as producto_imagen,
        i.observaciones as producto_observaciones
      FROM produccion p 
      JOIN maquileros m ON p.maquilero_id = m.id 
      LEFT JOIN inventario i ON p.inventario_id = i.id
      WHERE p.archivado = 0 AND p.estado IN ('En proceso', 'Terminado Parcial')
      ORDER BY p.fecha_fin ASC LIMIT 10
    `;
    
    const [orders] = await pool.query(query);
    console.log(`Recoleccion Report: Found ${orders.length} pending recollections.`);
    
    const doc = new PDFDocument({ margins: { top: 30, bottom: 50, left: 30, right: 30 }, size: 'A4', layout: 'landscape' });
    const outPath = path.join(__dirname, 'test_report_recoleccion.pdf');
    const writeStream = fs.createWriteStream(outPath);
    doc.pipe(writeStream);
    
    const logoPath = path.join(__dirname, '../frontend/public/logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 25, 20, { width: 85 });
    }
    
    doc.y = 130;
    
    if (orders.length === 0) {
      doc.fontSize(20).text('Reporte de Recolección', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text('No hay entregas programadas.', { align: 'center' });
    } else {
      const tableConfig = {
        title: "Reporte de Recolección",
        subtitle: "Producción a entregar estimada - Generado el " + formatDateToDMY(new Date()),
        headers: [
          { label: "MAQUILERO", property: "maquilero", width: 110 },
          { label: "MODELO", property: "modelo", width: 80 },
          { label: "CODIGO", property: "codigo", width: 110 },
          { label: "COLOR", property: "color", width: 100 },
          { label: "OBSERVACIÓN", property: "observacion", width: 150 },
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
          observacion: o.producto_observaciones || '-',
          orden: o.inventario_orden || '-',
          piezas: String(o.cantidad || 0),
          entrega: formatDateToDMY(o.fecha_fin)
        })),
        options: { padding: 2 }
      };

      await doc.table(tableConfig, {
        prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
        prepareRow: (row, indexColumn, indexRow, rectRow) => {
          doc.font("Helvetica").fontSize(10);
          try {
             const order = orders[indexRow];
             if (indexColumn === 1 && order.producto_imagen) {
                const imgPath = path.join(__dirname, '../backend', order.producto_imagen);
                if (fs.existsSync(imgPath)) {
                   doc.image(imgPath, rectRow.x + 110 + 10, rectRow.y + 5, { fit: [60, 60] });
                }
             }
          } catch(e) {
             console.error("Error in prepareRow for recoleccion image:", e);
          }
        }
      });

      const totalPiezas = orders.reduce((sum, o) => sum + (o.cantidad || 0), 0);
      doc.moveDown();
      doc.fontSize(14).font("Helvetica-Bold").text(`TOTAL DE PIEZAS A RECOLECTAR: ${totalPiezas}`, { align: 'right' });
    }
    
    doc.end();
    await new Promise((resolve) => writeStream.on('finish', resolve));
    console.log("Recoleccion Report generated successfully at: " + outPath);
  } catch (error) {
    console.error("Failed generating Recoleccion Report:", error);
  }

  // 4. PAGOS REPORT
  try {
    let query = `
      SELECT pg.*, m.nombre as maquilero_nombre, i.modelo as producto_modelo
      FROM pagos pg
      JOIN produccion p ON pg.produccion_id = p.id
      JOIN maquileros m ON p.maquilero_id = m.id
      LEFT JOIN inventario i ON p.inventario_id = i.id
      WHERE p.estado IN ('Terminado', 'Terminado Parcial')
      ORDER BY pg.fecha ASC, pg.id ASC LIMIT 10
    `;
    
    const [rows] = await pool.query(query);
    console.log(`Pagos Report: Found ${rows.length} payments.`);
    
    const doc = new PDFDocument({ margins: { top: 30, bottom: 50, left: 30, right: 30 }, size: 'A4', layout: 'portrait' });
    const outPath = path.join(__dirname, 'test_report_pagos.pdf');
    const writeStream = fs.createWriteStream(outPath);
    doc.pipe(writeStream);
    
    const logoPath = path.join(__dirname, '../frontend/public/logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 25, 20, { width: 85 });
    }
    
    doc.y = 100;
    
    if (rows.length === 0) {
      doc.fontSize(20).text('Reporte de Pagos', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text('No se encontraron pagos.', { align: 'center' });
    } else {
      const tableConfig = {
        title: "Reporte de Pagos a Maquileros",
        subtitle: "Pagos realizados - Generado el " + formatDateToDMY(new Date()),
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
          tipo: (r.tipo_pago === 'completo' ? 'LIQUIDACIÓN' : (r.tipo_pago === 'abono' ? 'ABONO' : (r.tipo_pago || 'ABONO'))).toUpperCase(),
          monto: '$' + Number(r.monto).toFixed(2)
        })),
        options: { padding: 2 }
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
    await new Promise((resolve) => writeStream.on('finish', resolve));
    console.log("Pagos Report generated successfully at: " + outPath);
  } catch (error) {
    console.error("Failed generating Pagos Report:", error);
  }

  await pool.end();
  console.log("Diagnostic run complete.");
}

run();
