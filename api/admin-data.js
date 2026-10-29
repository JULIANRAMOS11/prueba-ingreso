// ==============================================================================
// LOZADA & PARTNERS SAS - API DE GESTIÓN DE CANDIDATOS (RECURSOS HUMANOS)
// Endpoint: /api/admin-data
// ==============================================================================
const {
  verifyAdminToken,
  querySupabaseAdmin,
  extractStorageInfoFromUrl,
  deleteSupabaseStorageObject
} = require('./_utils');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  // 1. Blindaje: Solo Paola con Token HMAC válido puede acceder
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

    // DELETE: Eliminar un registro de prueba o purgar su grabación (Ley 1581)
    if (method === 'DELETE') {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const cedula = (url.searchParams.get('cedula') || '').trim();
      const action = (url.searchParams.get('action') || '').trim();

      if (!cedula) {
        return res.status(400).json({ error: 'Parámetro cédula es requerido.' });
      }

      const candidateData = await querySupabaseAdmin(`pruebas_nomina?cedula=eq.${encodeURIComponent(cedula)}`);
      const candidate = Array.isArray(candidateData) && candidateData.length > 0 ? candidateData[0] : null;

      // 1. Si solo se desea eliminar la grabación para liberar espacio (Ley 1581 de 2012)
      if (action === 'delete-recording') {
        let storageDeleted = true;
        if (candidate && candidate.grabacion_url) {
          const storageInfo = extractStorageInfoFromUrl(candidate.grabacion_url, 'grabaciones-pruebas');
          if (storageInfo) {
            storageDeleted = await deleteSupabaseStorageObject(storageInfo.bucket, storageInfo.objectPath);
          }
        }

        await querySupabaseAdmin(`pruebas_nomina?cedula=eq.${encodeURIComponent(cedula)}`, {
          method: 'PATCH',
          body: { grabacion_url: null, grabacion_size: null }
        });

        return res.status(200).json({
          success: true,
          storageDeleted,
          message: `Grabación del candidato ${cedula} eliminada correctamente. Espacio liberado.`
        });
      }

      // 2. Eliminación completa del candidato, su grabación de video y su archivo Excel en Storage
      if (candidate) {
        if (candidate.grabacion_url) {
          const recInfo = extractStorageInfoFromUrl(candidate.grabacion_url, 'grabaciones-pruebas');
          if (recInfo) {
            await deleteSupabaseStorageObject(recInfo.bucket, recInfo.objectPath);
          }
        }

        const excelAttachment = candidate.respuestas && candidate.respuestas._archivo_excel;
        if (excelAttachment) {
          if (excelAttachment.storage_bucket && excelAttachment.storage_path) {
            await deleteSupabaseStorageObject(excelAttachment.storage_bucket, excelAttachment.storage_path);
          } else if (excelAttachment.url) {
            const xlsInfo = extractStorageInfoFromUrl(excelAttachment.url, 'archivos-pruebas');
            if (xlsInfo) {
              await deleteSupabaseStorageObject(xlsInfo.bucket, xlsInfo.objectPath);
            }
          }
        }
      }

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
