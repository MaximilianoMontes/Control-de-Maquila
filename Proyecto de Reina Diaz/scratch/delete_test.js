const mysql = require('mysql2/promise');

async function cleanTest() {
  const db = await mysql.createConnection({
    host: 'autorack.proxy.rlwy.net',
    user: 'root',
    password: 'MvIeNoWlIsGImkYhEIdYpQOaVdIgepEn',
    database: 'railway',
    port: 39599
  });

  try {
    // Buscar la orden de prueba
    const [rows] = await db.query(
      "SELECT id FROM produccion WHERE inventario_id = (SELECT id FROM inventario WHERE modelo = '554258' LIMIT 1) AND fecha_fin = '2026-05-05' AND estado = 'Terminado'"
    );

    if (rows.length > 0) {
      const id = rows[0].id;
      console.log(`Encontrada orden de prueba con ID: ${id}. Eliminando...`);
      
      // Eliminar pagos asociados primero (si los hay)
      await db.query("DELETE FROM pagos WHERE produccion_id = ?", [id]);
      // Eliminar la orden
      await db.query("DELETE FROM produccion WHERE id = ?", [id]);
      
      console.log("Orden de prueba eliminada exitosamente.");
    } else {
      console.log("No se encontró ninguna orden que coincida exactamente con la prueba del 5/5.");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.end();
  }
}

cleanTest();
