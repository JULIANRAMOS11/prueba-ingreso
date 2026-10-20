// ==============================================================================
// LOZADA & PARTNERS SAS - API DE GESTIÓN DE CANDIDATOS (RECURSOS HUMANOS)
// Endpoint: /api/admin-data
// ==============================================================================
const { verifyAdminToken, querySupabaseAdmin } = require('./_utils');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  // 1. Blindaje: Solo Paola con Token Válido puede acceder
  if (!verifyAdminToken(req)) {
    return res.status(401).json({
      error: 'No autorizado. Se requiere token de sesión administrativo válido.'
    });
  }

  const method = req.method;

  try {
    // GET: Consultar todos los candidatos
    if (method === 'GET') {
      const data = await querySupabaseAdmin('pruebas_nomina?select=*&order=fecha.desc');
      return res.status(200).json({
        success: true,
        count: Array.isArray(data) ? data.length : 0,
        candidates: data || []
      });
    }

    // DELETE: Eliminar permanentemente un registro de prueba
    if (method === 'DELETE') {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const cedula = (url.searchParams.get('cedula') || '').trim();

      if (!cedula) {
        return res.status(400).json({ error: 'Parámetro cédula es requerido.' });
      }

      await querySupabaseAdmin(`pruebas_nomina?cedula=eq.${encodeURIComponent(cedula)}`, {
        method: 'DELETE'
      });

      return res.status(200).json({
        success: true,
        message: `Registro con cédula ${cedula} eliminado correctamente de la base de datos.`
      });
    }

    return res.status(405).json({ error: 'Método no soportado.' });
  } catch (err) {
    console.error('Error en /api/admin-data:', err);
    return res.status(500).json({ error: 'Error interno al procesar datos administrativos.' });
  }
};
