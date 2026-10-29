// ==============================================================================
// LOZADA & PARTNERS SAS - UTILIDADES DE SEGURIDAD PARA BACKEND VERCEL
// ==============================================================================
const crypto = require('crypto');

const AUTH_SECRET = process.env.ADMIN_AUTH_SECRET || 'LP_SECURE_SALT_2026_PAOLA_LOZADA';
const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://uidrncxmggbwnoxcltsd.supabase.co').replace(/\/+$/, '');
// Clave Secreta de Servicio (Service Role) leída desde Variables de Entorno de Vercel
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'sb_publishable_ZzONZA_eAa1O2Df5CVJh1g_YvADbdBT';

const LP_GATEWAY_HEADER = 'LP_VERIFIED_SERVER_2026';

function generateSessionToken(username) {
  // Token HMAC válido por bloques de 12 horas
  const timeBlock = Math.floor(Date.now() / (1000 * 60 * 60 * 12));
  const payload = `${username}:${timeBlock}`;
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

function verifyAdminToken(req) {
  const authHeader = (req && req.headers && req.headers['authorization']) || '';
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

    if (isNaN(tokenBlock) || Math.abs(currentBlock - tokenBlock) > 1) {
      return false;
    }

    const expectedPayload = `${username}:${timeBlock}`;
    const expectedSignature = crypto.createHmac('sha256', AUTH_SECRET).update(expectedPayload).digest('hex');

    const sigBuf = Buffer.from(signature, 'utf8');
    const expBuf = Buffer.from(expectedSignature, 'utf8');
    if (sigBuf.length !== expBuf.length) return false;

    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch (err) {
    return false;
  }
}

async function querySupabaseAdmin(path, options = {}) {
  const cleanPath = String(path || '').replace(/^\/+/, '');
  const url = `${SUPABASE_URL}/rest/v1/${cleanPath}`;
  const headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': options.prefer || 'return=representation',
    'x-lp-gateway': LP_GATEWAY_HEADER,
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

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await response.json();
  }
  return null;
}

/**
 * Extrae { bucket, objectPath } de una URL pública de Supabase Storage
 * Ej: https://xxx.supabase.co/storage/v1/object/public/grabaciones-pruebas/rec_123.webm
 */
function extractStorageInfoFromUrl(fileUrl, defaultBucket = 'grabaciones-pruebas') {
  if (!fileUrl || typeof fileUrl !== 'string') return null;
  try {
    const marker = '/storage/v1/object/public/';
    const idx = fileUrl.indexOf(marker);
    if (idx !== -1) {
      const rest = fileUrl.slice(idx + marker.length).split('?')[0];
      const slashIdx = rest.indexOf('/');
      if (slashIdx !== -1) {
        return {
          bucket: decodeURIComponent(rest.slice(0, slashIdx)),
          objectPath: decodeURIComponent(rest.slice(slashIdx + 1))
        };
      }
    }
    const fallbackName = fileUrl.split('?')[0].split('/').pop();
    if (fallbackName) {
      return { bucket: defaultBucket, objectPath: decodeURIComponent(fallbackName) };
    }
  } catch (e) {}
  return null;
}

/**
 * Elimina un archivo real en Supabase Storage usando el endpoint /storage/v1/object/...
 */
async function deleteSupabaseStorageObject(bucket, objectPath) {
  if (!bucket || !objectPath) return false;
  const encodedPath = objectPath
    .split('/')
    .map(seg => encodeURIComponent(seg))
    .join('/');
  const url = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    console.warn(`Advertencia al eliminar objeto Storage (${bucket}/${objectPath}) [${response.status}]:`, errText);
    return false;
  }
  return true;
}

module.exports = {
  AUTH_SECRET,
  generateSessionToken,
  verifyAdminToken,
  querySupabaseAdmin,
  extractStorageInfoFromUrl,
  deleteSupabaseStorageObject,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
};
