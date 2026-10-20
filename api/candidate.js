// ==============================================================================
// LOZADA & PARTNERS SAS - API DE CANDIDATOS Y CONTROL TEMPORAL EN SERVIDOR
// Endpoint: /api/candidate
// ==============================================================================
const { querySupabaseAdmin } = require('./_utils');

const EXAM_DURATION_SECONDS = 90 * 60; // 5400 segundos (1 hora y 30 minutos)
const GRACE_PERIOD_SECONDS = 120; // 2 minutos de tolerancia por latencia de red

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no soportado. Utilice POST.' });
  }

  try {
    const { action, cedula, nombre, meta = {}, answers = {}, reason = '' } = req.body || {};
    const cleanCedula = String(cedula || '').replace(/\D/g, '').trim();

    if (!cleanCedula) {
      return res.status(400).json({ error: 'Cédula válida es requerida.' });
    }

    // 1. Obtener registro actual en Supabase (si existe)
    const existingList = await querySupabaseAdmin(`pruebas_nomina?cedula=eq.${encodeURIComponent(cleanCedula)}`);
    const current = Array.isArray(existingList) && existingList.length > 0 ? existingList[0] : null;

    // --------------------------------------------------------------------------
    // ACCIÓN: CHECK-OR-START (Ingreso inicial del candidato)
    // --------------------------------------------------------------------------
    if (action === 'check-or-start') {
      if (current) {
        // A. Si está bloqueado previamente
        if (current.estado === 'BLOQUEADO') {
          return res.status(200).json({
            status: 'BLOQUEADO',
            nombre: current.nombre,
            cedula: current.cedula,
            motivo: current.motivo_bloqueo || 'Violación de protocolo antifraude',
            fecha: current.fecha
          });
        }

        // B. Si ya finalizó previamente
        if (current.estado === 'FINALIZADO') {
          return res.status(200).json({
            status: 'FINALIZADO',
            nombre: current.nombre,
            cedula: current.cedula,
            fecha: current.fecha
          });
        }

        // C. Si está EN_CURSO: calcular tiempo real transcurrido en el servidor
        const startTime = new Date(current.fecha).getTime();
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - startTime) / 1000);
        const remainingSeconds = Math.max(0, EXAM_DURATION_SECONDS - elapsedSeconds);

        // Si expiró el tiempo en el servidor (+ margen de gracia)
        if (elapsedSeconds > (EXAM_DURATION_SECONDS + GRACE_PERIOD_SECONDS)) {
          await querySupabaseAdmin(`pruebas_nomina?cedula=eq.${encodeURIComponent(cleanCedula)}`, {
            method: 'PATCH',
            body: { estado: 'FINALIZADO' }
          });
          return res.status(200).json({
            status: 'FINALIZADO',
            expired: true,
            nombre: current.nombre,
            cedula: current.cedula,
            fecha: current.fecha
          });
        }

        // Reanudar prueba con el tiempo exacto que le queda
        return res.status(200).json({
          status: 'EN_CURSO',
          resuming: true,
          nombre: current.nombre,
          cedula: current.cedula,
          respuestas: current.respuestas || {},
          remainingSeconds
        });
      }

      // Si es un candidato nuevo: registrarlo en la base de datos
      const cleanNombre = String(nombre || '').trim();
      if (!cleanNombre) {
        return res.status(400).json({ error: 'Nombre completo es obligatorio.' });
      }

      const initialRespuestas = {
        _candidato: {
          nombres: meta.nombres || '',
          apellidos: meta.apellidos || '',
          correo: meta.correo || '',
          fecha_nacimiento: meta.fecha_nacimiento || '',
          userAgent: req.headers['user-agent'] || '',
          ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
        },
        _inicio_servidor: new Date().toISOString()
      };

      const newRecord = {
        nombre: cleanNombre,
        cedula: cleanCedula,
        estado: 'EN_CURSO',
        motivo_bloqueo: null,
        respuestas: initialRespuestas,
        fecha: new Date().toISOString()
      };

      const inserted = await querySupabaseAdmin('pruebas_nomina', {
        method: 'POST',
        body: newRecord
      });

      return res.status(200).json({
        status: 'EN_CURSO',
        new: true,
        nombre: cleanNombre,
        cedula: cleanCedula,
        remainingSeconds: EXAM_DURATION_SECONDS
      });
    }

    // Para cualquier otra acción, el candidato debe existir
    if (!current) {
      return res.status(404).json({ error: 'Registro de candidato no encontrado.' });
    }

    // Si ya estaba bloqueado o finalizado en el servidor, no permitir más escrituras
    if (current.estado === 'BLOQUEADO' || current.estado === 'FINALIZADO') {
      return res.status(403).json({
        error: `Operación denegada. El examen se encuentra en estado ${current.estado}.`,
        estado: current.estado
      });
    }

    // --------------------------------------------------------------------------
    // ACCIÓN: AUTOSAVE (Guardar respuestas parciales periódicamente)
    // --------------------------------------------------------------------------
    if (action === 'autosave') {
      const mergedAnswers = {
        ...(current.respuestas || {}),
        ...answers,
        _ultimo_guardado: new Date().toISOString()
      };

      await querySupabaseAdmin(`pruebas_nomina?cedula=eq.${encodeURIComponent(cleanCedula)}`, {
        method: 'PATCH',
        body: { respuestas: mergedAnswers }
      });

      return res.status(200).json({ success: true, savedAt: new Date().toISOString() });
    }

    // --------------------------------------------------------------------------
    // ACCIÓN: BLOCK (Violación de seguridad antifraude)
    // --------------------------------------------------------------------------
    if (action === 'block') {
      const mergedAnswers = {
        ...(current.respuestas || {}),
        ...answers,
        _bloqueo_info: {
          motivo: reason,
          timestamp: new Date().toISOString()
        }
      };

      await querySupabaseAdmin(`pruebas_nomina?cedula=eq.${encodeURIComponent(cleanCedula)}`, {
        method: 'PATCH',
        body: {
          estado: 'BLOQUEADO',
          motivo_bloqueo: reason || 'Acción no permitida detectada por el sistema antifraude',
          respuestas: mergedAnswers
        }
      });

      return res.status(200).json({
        success: true,
        status: 'BLOQUEADO',
        motivo: reason,
        fecha: new Date().toISOString()
      });
    }

    // --------------------------------------------------------------------------
    // ACCIÓN: SUBMIT (Envío formal voluntario o por tiempo)
    // --------------------------------------------------------------------------
    if (action === 'submit') {
      const mergedAnswers = {
        ...(current.respuestas || {}),
        ...answers,
        _finalizado_servidor: new Date().toISOString()
      };

      await querySupabaseAdmin(`pruebas_nomina?cedula=eq.${encodeURIComponent(cleanCedula)}`, {
        method: 'PATCH',
        body: {
          estado: 'FINALIZADO',
          respuestas: mergedAnswers
        }
      });

      return res.status(200).json({
        success: true,
        status: 'FINALIZADO',
        fecha: new Date().toISOString()
      });
    }

    return res.status(400).json({ error: 'Acción no reconocida.' });
  } catch (err) {
    console.error('Error en /api/candidate:', err);
    return res.status(500).json({ error: 'Error interno en el servidor de evaluación.' });
  }
};
