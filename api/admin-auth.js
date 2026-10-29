// ==============================================================================
// LOZADA & PARTNERS SAS - API DE AUTENTICACIÓN ADMINISTRADOR (PAOLA)
// Endpoint: /api/admin-auth
// ==============================================================================
const crypto = require('crypto');
const { generateSessionToken } = require('./_utils');

const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'paola').trim().toLowerCase();
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || 'paola2026').trim();

// Almacén en memoria para control de intentos de fuerza bruta
const loginAttempts = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) return false;

  if (now - record.startTime > 10 * 60 * 1000) {
    loginAttempts.delete(ip);
    return false;
  }

  return record.attempts >= 7;
}

function recordFailedAttempt(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { attempts: 0, startTime: now };
  record.attempts += 1;
  loginAttempts.set(ip, record);
}

function clearAttempts(ip) {
  loginAttempts.delete(ip);
}

function safeCompare(a, b) {
  const hashA = crypto.createHash('sha256').update(String(a || '')).digest();
  const hashB = crypto.createHash('sha256').update(String(b || '')).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Solo POST.' });
  }

  const rawForwarded = req.headers && req.headers['x-forwarded-for'];
  const clientIp = (Array.isArray(rawForwarded) ? rawForwarded[0] : String(rawForwarded || '')).split(',')[0].trim()
    || (req.socket && req.socket.remoteAddress)
    || 'unknown';

  if (isRateLimited(clientIp)) {
    return res.status(429).json({
      error: 'Demasiados intentos fallidos. Por seguridad, intente nuevamente en 10 minutos.'
    });
  }

  try {
    const { username, password } = req.body || {};
    const inputUser = String(username || '').trim().toLowerCase();
    const inputPass = String(password || '').trim();

    // Verificación estricta en tiempo constante contra variables de entorno (sin puertas traseras fijas)
    const isValidUser = safeCompare(inputUser, ADMIN_USERNAME);
    const isValidPass = safeCompare(inputPass, ADMIN_PASSWORD);

    if (!isValidUser || !isValidPass) {
      recordFailedAttempt(clientIp);
      await new Promise(r => setTimeout(r, 400));
      return res.status(401).json({
        error: 'Credenciales inválidas. Acceso restringido al personal autorizado de Recursos Humanos.'
      });
    }

    clearAttempts(clientIp);
    const token = generateSessionToken(ADMIN_USERNAME);

    return res.status(200).json({
      success: true,
      token,
      user: {
        nombre: 'Paola',
        cargo: 'Coordinadora de Selección y Gestión del Talento Humano',
        empresa: 'LOZADA & PARTNERS SAS'
      }
    });
  } catch (err) {
    console.error('Error en admin-auth:', err);
    return res.status(500).json({ error: 'Error interno en el servicio de autenticación.' });
  }
};
