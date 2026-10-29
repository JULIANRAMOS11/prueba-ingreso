// ==============================================================================
// LOZADA & PARTNERS SAS - API DE CANDIDATOS Y CONTROL TEMPORAL EN SERVIDOR
// Endpoint: /api/candidate
// ==============================================================================
const { querySupabaseAdmin } = require('./_utils');

const EXAM_DURATION_SECONDS = 90 * 60; // 5400 segundos (1 hora y 30 minutos)
const GRACE_PERIOD_SECONDS = 120; // 2 minutos de tolerancia por latencia de red

const ALLOWED_QUESTION_REGEX = /^q[1-7]_[1-7]$/;

/**
 * Filtra únicamente claves permitidas del cuestionario y anexo Excel,
 * impidiendo que un cliente manipule _calificacion, _inicio_servidor o _candidato.
 */
function sanitizeCandidateAnswers(rawAnswers) {
  const safe = {};
  if (!rawAnswers || typeof rawAnswers !== 'object') return safe;

  Object.keys(rawAnswers).forEach((key) => {
    if (ALLOWED_QUESTION_REGEX.test(key)) {
      const val = rawAnswers[key];
      safe[key] = typeof val === 'string' ? val.slice(0, 10000) : String(val || '').slice(0, 10000);
    } else if (key === '_archivo_excel') {
      // null (cuando el candidato quita el archivo) o metadatos válidos del archivo
      if (rawAnswers._archivo_excel === null) {
        safe._archivo_excel = null;
      } else if (typeof rawAnswers._archivo_excel === 'object') {
        const ex = rawAnswers._archivo_excel;
        safe._archivo_excel = {
          nombre: String(ex.nombre || 'calculos_nomina.xlsx').slice(0, 260),
          tamano: Number(ex.tamano) || 0,
          tipo: String(ex.tipo || '').slice(0, 160),
          fecha_subida: String(ex.fecha_subida || new Date().toISOString()).slice(0, 60),
          url: ex.url ? String(ex.url).slice(0, 1000) : null,
          storage_bucket: ex.storage_bucket ? String(ex.storage_bucket).slice(0, 120) : null,
          storage_path: ex.storage_path ? String(ex.storage_path).slice(0, 400) : null,
          data_base64: ex.data_base64 ? String(ex.data_base64) : undefined
        };
      }
    } else if (key === '_exam_start_time') {
      const ts = Number(rawAnswers._exam_start_time);
      if (!isNaN(ts) && ts > 0) safe._exam_start_time = ts;
    }
  });

  return safe;
}

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

    if (!cleanCedula || cleanCedula.length < 5) {
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
        if (current.estado === 'BLOQUEADO') {
          return res.status(200).json({
            status: 'BLOQUEADO',
            nombre: current.nombre,
            cedula: current.cedula,
            motivo: current.motivo_bloqueo || 'Violación de protocolo antifraude',
            fecha: current.fecha
          });
        }

        if (current.estado === 'FINALIZADO') {
          return res.status(200).json({
            status: 'FINALIZADO',
            nombre: current.nombre,
            cedula: current.cedula,
            fecha: current.fecha
          });
        }

        // Si está EN_CURSO: calcular tiempo real transcurrido en el servidor
        const startTime = new Date(current.fecha).getTime();
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - startTime) / 1000);
        const remainingSeconds = Math.max(0, EXAM_DURATION_SECONDS - elapsedSeconds);

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

        return res.status(200).json({
          status: 'EN_CURSO',
          resuming: true,
          nombre: current.nombre,
          cedula: current.cedula,
          respuestas: current.respuestas || {},
          remainingSeconds
        });
      }

      // Candidato nuevo: validar datos de identidad
      const cleanNombre = String(nombre || '').replace(/\s+/g, ' ').trim();
      if (!cleanNombre || cleanNombre.length < 3) {
        return res.status(400).json({ error: 'Nombres y apellidos completos son obligatorios.' });
      }

      const cleanCorreo = String(meta.correo || '').trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!cleanCorreo || !emailRegex.test(cleanCorreo)) {
        return res.status(400).json({ error: 'El correo electrónico ingresado no es válido.' });
      }

      const cleanBirthDate = String(meta.fecha_nacimiento || '').trim();
      if (!cleanBirthDate) {
        return res.status(400).json({ error: 'La fecha de nacimiento es obligatoria.' });
      }

      const birth = new Date(cleanBirthDate + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (isNaN(birth.getTime())) {
        return res.status(400).json({ error: 'La fecha de nacimiento no tiene un formato válido.' });
      }

      if (birth > today) {
        return res.status(400).json({ error: 'La fecha de nacimiento no puede ser una fecha futura.' });
      }

      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }

      if (age < 18) {
        return res.status(400).json({
          error: `Debe ser mayor de edad (mínimo 18 años cumplidos) para participar en el proceso de selección técnica. Edad calculada: ${age} años.`
        });
      }

      if (age > 95) {
        return res.status(400).json({
          error: 'Por favor ingrese una fecha de nacimiento válida (la edad no puede ser superior a 95 años).'
        });
      }

      // 1. Validación de correo único (compatible tanto con columna correo como con JSONB respuestas)
      let existingByEmail = [];
      try {
        existingByEmail = await querySupabaseAdmin(
          `pruebas_nomina?correo=ilike.${encodeURIComponent(cleanCorreo)}&cedula=neq.${encodeURIComponent(cleanCedula)}`
        );
      } catch (colErr) {
        try {
          existingByEmail = await querySupabaseAdmin(
            `pruebas_nomina?respuestas->_candidato->>correo=ilike.${encodeURIComponent(cleanCorreo)}&cedula=neq.${encodeURIComponent(cleanCedula)}`
          );
        } catch (e2) {}
      }

      if (Array.isArray(existingByEmail) && existingByEmail.length > 0) {
        return res.status(409).json({
          error: 'El correo electrónico ya se encuentra registrado por otro candidato en la plataforma.',
          field: 'correo'
        });
      }

      // 2. Validación de nombres y apellidos únicos
      const existingByName = await querySupabaseAdmin(
        `pruebas_nomina?nombre=ilike.${encodeURIComponent(cleanNombre)}&cedula=neq.${encodeURIComponent(cleanCedula)}`
      );
      if (Array.isArray(existingByName) && existingByName.length > 0) {
        return res.status(409).json({
          error: 'Los nombres y apellidos ya se encuentran registrados en la convocatoria con otro número de documento.',
          field: 'nombre'
        });
      }

      const initialRespuestas = {
        _candidato: {
          nombres: String(meta.nombres || '').trim(),
          apellidos: String(meta.apellidos || '').trim(),
          correo: cleanCorreo,
          fecha_nacimiento: cleanBirthDate,
          userAgent: req.headers['user-agent'] || '',
          ip: req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || ''
        },
        _inicio_servidor: new Date().toISOString()
      };

      const newRecord = {
        nombre: cleanNombre,
        cedula: cleanCedula,
        correo: cleanCorreo,
        estado: 'EN_CURSO',
        motivo_bloqueo: null,
        respuestas: initialRespuestas,
        fecha: new Date().toISOString(),
        autorizacion_datos: Boolean(meta.autorizacion_datos),
        autorizacion_fecha: new Date().toISOString()
      };

      try {
        await querySupabaseAdmin('pruebas_nomina', {
          method: 'POST',
          body: newRecord
        });
      } catch (insertErr) {
        const errMsg = String(insertErr.message || '');
        if (errMsg.includes('pruebas_nomina_cedula_key') || errMsg.includes('duplicate key value')) {
          return res.status(409).json({
            error: 'Este número de cédula ya fue registrado previamente.',
            field: 'cedula'
          });
        }
        // Fallback automático si la tabla aún no tenía la columna opcional 'correo'
        if (errMsg.includes('correo')) {
          const fallbackRecord = { ...newRecord };
          delete fallbackRecord.correo;
          await querySupabaseAdmin('pruebas_nomina', {
            method: 'POST',
            body: fallbackRecord
          });
        } else {
          throw insertErr;
        }
      }

      return res.status(200).json({
        status: 'EN_CURSO',
        new: true,
        nombre: cleanNombre,
        cedula: cleanCedula,
        remainingSeconds: EXAM_DURATION_SECONDS
      });
    }

    if (!current) {
      return res.status(404).json({ error: 'Registro de candidato no encontrado.' });
    }

    // Si ya estaba bloqueado o finalizado, solo permitir vincular la grabación que termina de subirse
    if (action !== 'save-recording' && (current.estado === 'BLOQUEADO' || current.estado === 'FINALIZADO')) {
      return res.status(403).json({
        error: `Operación denegada. El examen se encuentra en estado ${current.estado}.`,
        estado: current.estado
      });
    }

    const safeAnswers = sanitizeCandidateAnswers(answers);

    // --------------------------------------------------------------------------
    // ACCIÓN: AUTOSAVE
    // --------------------------------------------------------------------------
    if (action === 'autosave') {
      const mergedAnswers = {
        ...(current.respuestas || {}),
        ...safeAnswers,
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
      const cleanReason = String(reason || 'Acción no permitida detectada por el sistema antifraude').slice(0, 500);
      const mergedAnswers = {
        ...(current.respuestas || {}),
        ...safeAnswers,
        _bloqueo_info: {
          motivo: cleanReason,
          timestamp: new Date().toISOString()
        }
      };

      const blockPayload = {
        estado: 'BLOQUEADO',
        motivo_bloqueo: cleanReason,
        respuestas: mergedAnswers
      };
      if (req.body.grabacion_url) blockPayload.grabacion_url = String(req.body.grabacion_url).slice(0, 1000);
      if (req.body.grabacion_size) blockPayload.grabacion_size = Number(req.body.grabacion_size) || null;

      await querySupabaseAdmin(`pruebas_nomina?cedula=eq.${encodeURIComponent(cleanCedula)}`, {
        method: 'PATCH',
        body: blockPayload
      });

      return res.status(200).json({
        success: true,
        status: 'BLOQUEADO',
        motivo: cleanReason,
        fecha: new Date().toISOString()
      });
    }

    // --------------------------------------------------------------------------
    // ACCIÓN: SUBMIT (Envío formal voluntario o por expiración de tiempo)
    // --------------------------------------------------------------------------
    if (action === 'submit') {
      const mergedAnswers = {
        ...(current.respuestas || {}),
        ...safeAnswers,
        _finalizado_servidor: new Date().toISOString()
      };

      const submitPayload = {
        estado: 'FINALIZADO',
        respuestas: mergedAnswers
      };
      if (req.body.grabacion_url) submitPayload.grabacion_url = String(req.body.grabacion_url).slice(0, 1000);
      if (req.body.grabacion_size) submitPayload.grabacion_size = Number(req.body.grabacion_size) || null;

      await querySupabaseAdmin(`pruebas_nomina?cedula=eq.${encodeURIComponent(cleanCedula)}`, {
        method: 'PATCH',
        body: submitPayload
      });

      return res.status(200).json({
        success: true,
        status: 'FINALIZADO',
        fecha: new Date().toISOString()
      });
    }

    // --------------------------------------------------------------------------
    // ACCIÓN: SAVE-RECORDING (Vincular URL de grabación en Supabase Storage)
    // --------------------------------------------------------------------------
    if (action === 'save-recording') {
      const { grabacion_url, grabacion_size } = req.body || {};
      await querySupabaseAdmin(`pruebas_nomina?cedula=eq.${encodeURIComponent(cleanCedula)}`, {
        method: 'PATCH',
        body: {
          grabacion_url: grabacion_url ? String(grabacion_url).slice(0, 1000) : null,
          grabacion_size: grabacion_size ? Number(grabacion_size) : null
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Grabación de auditoría registrada correctamente.'
      });
    }

    return res.status(400).json({ error: 'Acción no reconocida.' });
  } catch (err) {
    console.error('Error en /api/candidate:', err);
    return res.status(500).json({ error: 'Error interno en el servidor de evaluación.' });
  }
};
