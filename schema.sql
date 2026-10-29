-- ==============================================================================
-- LOZADA & PARTNERS SAS - Área de Recursos Humanos
-- Esquema de Base de Datos y Políticas de Ciberseguridad Estricta (v2.2)
-- Tabla: pruebas_nomina
-- ==============================================================================

-- 1. Habilitar extensión para generación de identificadores únicos (UUID)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Creación de la tabla pruebas_nomina
CREATE TABLE IF NOT EXISTS public.pruebas_nomina (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    cedula TEXT NOT NULL UNIQUE,
    correo TEXT DEFAULT NULL,
    estado TEXT NOT NULL CHECK (estado IN ('EN_CURSO', 'FINALIZADO', 'BLOQUEADO')),
    motivo_bloqueo TEXT,
    respuestas JSONB DEFAULT '{}'::jsonb,
    grabacion_url TEXT DEFAULT NULL,
    grabacion_size INTEGER DEFAULT NULL,
    autorizacion_datos BOOLEAN DEFAULT FALSE,
    autorizacion_fecha TIMESTAMPTZ DEFAULT NULL,
    fecha TIMESTAMPTZ DEFAULT NOW()
);

-- Migración idempotente por si la tabla ya existía sin la columna correo
ALTER TABLE public.pruebas_nomina ADD COLUMN IF NOT EXISTS correo TEXT DEFAULT NULL;

-- 3. Crear índices para optimizar búsquedas por cédula, correo, estado y fecha
CREATE INDEX IF NOT EXISTS idx_pruebas_nomina_cedula ON public.pruebas_nomina(cedula);
CREATE INDEX IF NOT EXISTS idx_pruebas_nomina_correo ON public.pruebas_nomina(correo);
CREATE INDEX IF NOT EXISTS idx_pruebas_nomina_estado ON public.pruebas_nomina(estado);
CREATE INDEX IF NOT EXISTS idx_pruebas_nomina_fecha ON public.pruebas_nomina(fecha DESC);

-- 4. Buckets en Supabase Storage (Optimizados para Free Tier 50MB)
-- 4.1 Bucket de grabaciones de pantalla y audio (Ley 1581 de 2012)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'grabaciones-pruebas',
  'grabaciones-pruebas',
  true, -- Lectura mediante enlace directo para el reproductor de auditoría de Paola
  52428800, -- 50 MB límite por archivo
  ARRAY[
    'video/webm',
    'video/mp4',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.ms-excel.sheet.macroEnabled.12',
    'text/csv',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'video/webm',
    'video/mp4',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.ms-excel.sheet.macroEnabled.12',
    'text/csv',
    'application/octet-stream'
  ];

-- 4.2 Bucket dedicado para hojas de cálculo Excel (.xlsx, .xls, .xlsm, .csv)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'archivos-pruebas',
  'archivos-pruebas',
  true,
  26214400, -- 25 MB límite por archivo Excel
  ARRAY[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.ms-excel.sheet.macroEnabled.12',
    'text/csv',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 26214400,
  allowed_mime_types = ARRAY[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.ms-excel.sheet.macroEnabled.12',
    'text/csv',
    'application/octet-stream'
  ];

-- Políticas de Almacenamiento (RLS en storage.objects)
DROP POLICY IF EXISTS "Permitir subida grabaciones candidatos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir lectura grabaciones" ON storage.objects;
DROP POLICY IF EXISTS "Permitir borrado grabaciones admin" ON storage.objects;
DROP POLICY IF EXISTS "Permitir subida archivos pruebas" ON storage.objects;
DROP POLICY IF EXISTS "Permitir lectura archivos pruebas" ON storage.objects;

-- Permitir subida de grabaciones y hojas Excel (sin sobrescritura ni borrado anónimo)
CREATE POLICY "Permitir subida archivos pruebas"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id IN ('grabaciones-pruebas', 'archivos-pruebas'));

-- Permitir lectura por URL para el reproductor y descarga en el panel de RRHH
CREATE POLICY "Permitir lectura archivos pruebas"
ON storage.objects
FOR SELECT
USING (bucket_id IN ('grabaciones-pruebas', 'archivos-pruebas'));

-- NOTA: El borrado en storage.objects queda prohibido para el rol público (anon).
-- Solo el backend /api/admin-data mediante Service Role puede purgar archivos.

-- 5. Función verificadora de pasarela backend (defensa en profundidad si no se usa Service Role)
CREATE OR REPLACE FUNCTION public.is_lp_backend()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  hdrs JSON;
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN TRUE;
  END IF;
  hdrs := COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::json;
  RETURN COALESCE(hdrs->>'x-lp-gateway', '') = 'LP_VERIFIED_SERVER_2026';
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- 6. Habilitar Row Level Security (RLS) Estricto en pruebas_nomina
ALTER TABLE public.pruebas_nomina ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas anteriores
DROP POLICY IF EXISTS "Permitir SELECT publico pruebas_nomina" ON public.pruebas_nomina;
DROP POLICY IF EXISTS "Permitir INSERT publico pruebas_nomina" ON public.pruebas_nomina;
DROP POLICY IF EXISTS "Permitir UPDATE publico pruebas_nomina" ON public.pruebas_nomina;
DROP POLICY IF EXISTS "Permitir DELETE publico pruebas_nomina" ON public.pruebas_nomina;
DROP POLICY IF EXISTS "Bloquear DELETE publico pruebas_nomina" ON public.pruebas_nomina;
DROP POLICY IF EXISTS "Permitir SELECT propio por cedula" ON public.pruebas_nomina;
DROP POLICY IF EXISTS "Permitir INSERT candidatos" ON public.pruebas_nomina;
DROP POLICY IF EXISTS "Permitir UPDATE candidatos no finalizados" ON public.pruebas_nomina;
DROP POLICY IF EXISTS "Backend exclusivo SELECT pruebas_nomina" ON public.pruebas_nomina;
DROP POLICY IF EXISTS "Backend exclusivo DELETE pruebas_nomina" ON public.pruebas_nomina;

-- A. SELECT: Bloqueado para consultas masivas anónimas desde navegador;
-- permitido únicamente a través de los endpoints seguros del servidor (/api/candidate y /api/admin-data).
CREATE POLICY "Backend exclusivo SELECT pruebas_nomina"
ON public.pruebas_nomina
FOR SELECT
USING (public.is_lp_backend());

-- B. INSERT: Permitido al backend (o registro inicial controlado en estado EN_CURSO)
CREATE POLICY "Permitir INSERT candidatos"
ON public.pruebas_nomina
FOR INSERT
WITH CHECK (public.is_lp_backend() OR estado = 'EN_CURSO');

-- C. UPDATE: Un usuario anónimo jamás puede desbloquearse (cambiar de BLOQUEADO/FINALIZADO a EN_CURSO).
CREATE POLICY "Permitir UPDATE candidatos no finalizados"
ON public.pruebas_nomina
FOR UPDATE
USING (public.is_lp_backend() OR estado = 'EN_CURSO')
WITH CHECK (public.is_lp_backend() OR estado IN ('EN_CURSO', 'FINALIZADO', 'BLOQUEADO'));

-- D. DELETE: Prohibido para usuarios públicos; exclusivo para el backend administrativo de Paola.
CREATE POLICY "Backend exclusivo DELETE pruebas_nomina"
ON public.pruebas_nomina
FOR DELETE
USING (public.is_lp_backend());

COMMENT ON TABLE public.pruebas_nomina IS 'Registro seguro y blindado de candidatos para LOZADA & PARTNERS SAS';
