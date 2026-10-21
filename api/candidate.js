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

      // Validar fecha de nacimiento estricta (no futura y mínimo 18 años cumplidos)
      const birth = new Date(cleanBirthDate + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (isNaN(birth.getTime())) {
        return res.status(400).json({ error: 'La fecha de nacimiento no tiene un formato válido.' });
      }

      if (birth > today) {
        return res.status(400).json({ error: 'La fecha de nacimiento no puede ser una fecha futura (mañana o posterior).' });
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

      // Validación de duplicidad en la base de datos de Supabase
      // 1. Correo electrónico único en la convocatoria
      const existingByEmail = await querySupabaseAdmin(
        `pruebas_nomina?correo=ilike.${encodeURIComponent(cleanCorreo)}&cedula=neq.${encodeURIComponent(cleanCedula)}`
      );
      if (Array.isArray(existingByEmail) && existingByEmail.length > 0) {
        return res.status(409).json({
          error: 'El correo electrónico ya se encuentra registrado por otro candidato en la plataforma.',
          field: 'correo'
        });
      }

      // 2. Nombres y apellidos únicos en la convocatoria
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
          nombres: meta.nombres || '',
          apellidos: meta.apellidos || '',
          correo: cleanCorreo,
          fecha_nacimiento: cleanBirthDate,
          userAgent: req.headers['user-agent'] || '',
          ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
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
        // En caso de colisión de índice único en base de datos
        const errMsg = String(insertErr.message || '');
        if (errMsg.includes('pruebas_nomina_cedula_key') || errMsg.includes('duplicate key value')) {
          return res.status(409).json({
            error: 'Este número de cédula o correo electrónico ya fue registrado previamente.',
            field: 'cedula'
          });
        }
        throw insertErr;
      }

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
    // Excepción: permitir guardar la grabación que termina de procesarse justo después del bloqueo/finalizado
    if (action !== 'save-recording' && (current.estado === 'BLOQUEADO' || current.estado === 'FINALIZADO')) {
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

      const blockPayload = {
        estado: 'BLOQUEADO',
        motivo_bloqueo: reason || 'Acción no permitida detectada por el sistema antifraude',
        respuestas: mergedAnswers
      };
      if (req.body.grabacion_url) blockPayload.grabacion_url = req.body.grabacion_url;
      if (req.body.grabacion_size) blockPayload.grabacion_size = Number(req.body.grabacion_size);

      await querySupabaseAdmin(`pruebas_nomina?cedula=eq.${encodeURIComponent(cleanCedula)}`, {
        method: 'PATCH',
        body: blockPayload
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

      const submitPayload = {
        estado: 'FINALIZADO',
        respuestas: mergedAnswers
      };
      if (req.body.grabacion_url) submitPayload.grabacion_url = req.body.grabacion_url;
      if (req.body.grabacion_size) submitPayload.grabacion_size = Number(req.body.grabacion_size);

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
    // ACCIÓN: SAVE-RECORDING (Vincular URL de la grabación en Supabase Storage)
    // --------------------------------------------------------------------------
    if (action === 'save-recording') {
      const { grabacion_url, grabacion_size } = req.body || {};
      await querySupabaseAdmin(`pruebas_nomina?cedula=eq.${encodeURIComponent(cleanCedula)}`, {
        method: 'PATCH',
        body: {
          grabacion_url: grabacion_url || null,
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
