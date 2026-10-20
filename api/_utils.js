// ==============================================================================
// LOZADA & PARTNERS SAS - UTILIDADES DE SEGURIDAD PARA BACKEND VERCEL
// ==============================================================================
const crypto = require('crypto');

const AUTH_SECRET = process.env.ADMIN_AUTH_SECRET || 'LP_SECURE_SALT_2026_PAOLA_LOZADA';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uidrncxmggbwnoxcltsd.supabase.co';
// Clave Secreta de Servicio (Service Role) leída desde Variables de Entorno de Vercel
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_ZzONZA_eAa1O2Df5CVJh1g_YvADbdBT';

function verifyAdminToken(req) {
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) return false;

  const rawToken = authHeader.slice(7).trim();
  if (!rawToken) return false;

  try {
    const decoded = Buffer.from(rawToken, 'base64').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return false;

    const [username, timeBlock, signature] = parts;
    const currentBlock = Math.floor(Date.now() / (1000 * 60 * 60 * 12));
    const tokenBlock = parseInt(timeBlock, 10);

    // Permitir el bloque actual y el bloque anterior (ventana de 12 a 24 horas)
    if (Math.abs(currentBlock - tokenBlock) > 1) {
      return false;
    }

    const expectedPayload = `${username}:${timeBlock}`;
    const expectedSignature = crypto.createHmac('sha256', AUTH_SECRET).update(expectedPayload).digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch (err) {
    return false;
  }
}

async function querySupabaseAdmin(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': options.prefer || 'return=representation',
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error en Supabase (${response.status}): ${errorText}`);
  }

  // Si no hay contenido (por ejemplo DELETE con return=minimal)
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await response.json();
  }
  return null;
}

module.exports = {
  verifyAdminToken,
  querySupabaseAdmin,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
};
