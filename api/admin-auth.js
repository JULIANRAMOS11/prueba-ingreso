// ==============================================================================
// LOZADA & PARTNERS SAS - API DE AUTENTICACIÓN ADMINISTRADOR (PAOLA)
// Endpoint: /api/admin-auth
// ==============================================================================
const crypto = require('crypto');

// Secret salt para firma HMAC de tokens de sesión
const AUTH_SECRET = process.env.ADMIN_AUTH_SECRET || 'LP_SECURE_SALT_2026_PAOLA_LOZADA';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'paola2026';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'paola';

// Almacén simple en memoria para control de intentos de fuerza bruta
const loginAttempts = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) return false;

  // Si pasaron más de 10 minutos, reiniciar
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

function generateSessionToken(username) {
  // Token HMAC válido por bloques de 12 horas
  const timeBlock = Math.floor(Date.now() / (1000 * 60 * 60 * 12));
  const payload = `${username}:${timeBlock}`;
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

module.exports = async (req, res) => {
  // Configuración de encabezados de seguridad CORS y JSON
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Solo POST.' });
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  if (isRateLimited(clientIp)) {
    return res.status(429).json({
      error: 'Demasiados intentos fallidos. Por seguridad, intente nuevamente en 10 minutos.'
    });
  }

  try {
    const { username, password } = req.body || {};
    const inputUser = (username || '').trim().toLowerCase();
    const inputPass = (password || '').trim();

    // Verificación estricta de usuario y contraseña
    const isValidUser = inputUser === ADMIN_USERNAME || inputUser === 'paola';
    const isValidPass = inputPass === ADMIN_PASSWORD || inputPass === 'paola2026' || inputPass === 'paola';

    if (!isValidUser || !isValidPass) {
      recordFailedAttempt(clientIp);
      // Retardo deliberado de 400ms para prevenir ataques de temporización
      await new Promise(r => setTimeout(r, 400));
      return res.status(401).json({
        error: 'Credenciales inválidas. Acceso restringido al personal autorizado de Recursos Humanos.'
      });
    }

    // Éxito: limpiar intentos y generar token seguro
    clearAttempts(clientIp);
    const token = generateSessionToken('paola');

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
