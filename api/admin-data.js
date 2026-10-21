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

    // DELETE: Eliminar permanentemente un registro de prueba o su grabación
    if (method === 'DELETE') {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const cedula = (url.searchParams.get('cedula') || '').trim();
      const action = (url.searchParams.get('action') || '').trim();

      if (!cedula) {
        return res.status(400).json({ error: 'Parámetro cédula es requerido.' });
      }

      // 1. Si solo se desea eliminar la grabación para liberar espacio (Ley 1581)
      if (action === 'delete-recording') {
        const candidateData = await querySupabaseAdmin(`pruebas_nomina?cedula=eq.${encodeURIComponent(cedula)}`);
        const candidate = Array.isArray(candidateData) && candidateData.length > 0 ? candidateData[0] : null;

        if (candidate && candidate.grabacion_url) {
          try {
            // Eliminar de storage.objects
            const fileName = candidate.grabacion_url.split('/').pop();
            if (fileName) {
              await querySupabaseAdmin(`storage/v1/object/grabaciones-pruebas/${encodeURIComponent(fileName)}`, {
                method: 'DELETE'
              }).catch(() => {});
            }
          } catch (e) {
            console.warn('No se pudo borrar objeto de storage:', e);
          }
        }

        await querySupabaseAdmin(`pruebas_nomina?cedula=eq.${encodeURIComponent(cedula)}`, {
          method: 'PATCH',
          body: { grabacion_url: null, grabacion_size: null }
        });

        return res.status(200).json({
          success: true,
          message: `Grabación del candidato ${cedula} eliminada correctamente. Espacio liberado.`
        });
      }

      // 2. Eliminación completa del candidato y su grabación asociada
      try {
        const candidateData = await querySupabaseAdmin(`pruebas_nomina?cedula=eq.${encodeURIComponent(cedula)}`);
        const candidate = Array.isArray(candidateData) && candidateData.length > 0 ? candidateData[0] : null;
        if (candidate && candidate.grabacion_url) {
          const fileName = candidate.grabacion_url.split('/').pop();
          if (fileName) {
            await querySupabaseAdmin(`storage/v1/object/grabaciones-pruebas/${encodeURIComponent(fileName)}`, {
              method: 'DELETE'
            }).catch(() => {});
          }
        }
      } catch (e) {}

      await querySupabaseAdmin(`pruebas_nomina?cedula=eq.${encodeURIComponent(cedula)}`, {
        method: 'DELETE'
      });

      return res.status(200).json({
        success: true,
        message: `Registro con cédula ${cedula} y archivos asociados eliminados correctamente.`
      });
    }

    return res.status(405).json({ error: 'Método no soportado.' });
  } catch (err) {
    console.error('Error en /api/admin-data:', err);
    return res.status(500).json({ error: 'Error interno al procesar datos administrativos.' });
  }
};
