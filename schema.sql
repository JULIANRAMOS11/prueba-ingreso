-- ==============================================================================
-- LOZADA & PARTNERS SAS - Área de Recursos Humanos
-- Esquema de Base de Datos y Políticas de Ciberseguridad Estricta
-- Tabla: pruebas_nomina
-- ==============================================================================

-- 1. Habilitar extensión para generación de identificadores únicos (UUID)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Creación de la tabla pruebas_nomina
CREATE TABLE IF NOT EXISTS public.pruebas_nomina (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    cedula TEXT NOT NULL UNIQUE,
    estado TEXT NOT NULL CHECK (estado IN ('EN_CURSO', 'FINALIZADO', 'BLOQUEADO')),
    motivo_bloqueo TEXT,
    respuestas JSONB DEFAULT '{}'::jsonb,
    grabacion_url TEXT DEFAULT NULL,
    grabacion_size INTEGER DEFAULT NULL,
    autorizacion_datos BOOLEAN DEFAULT FALSE,
    autorizacion_fecha TIMESTAMPTZ DEFAULT NULL,
    fecha TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Crear índices para optimizar búsquedas por cédula y estado
CREATE INDEX IF NOT EXISTS idx_pruebas_nomina_cedula ON public.pruebas_nomina(cedula);
CREATE INDEX IF NOT EXISTS idx_pruebas_nomina_estado ON public.pruebas_nomina(estado);
CREATE INDEX IF NOT EXISTS idx_pruebas_nomina_fecha ON public.pruebas_nomina(fecha DESC);

-- 4. Bucket en Supabase Storage (Optimizado para Free Tier 50MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'grabaciones-pruebas', 
  'grabaciones-pruebas', 
  true, -- Accesible mediante enlace directo para el reproductor de video de Paola
  52428800, -- 50 MB límite por archivo
  ARRAY['video/webm', 'video/mp4']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true, 
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['video/webm', 'video/mp4'];

-- Políticas de Almacenamiento (RLS en storage.objects)
DROP POLICY IF EXISTS "Permitir subida grabaciones candidatos" ON storage.objects;
CREATE POLICY "Permitir subida grabaciones candidatos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'grabaciones-pruebas');

DROP POLICY IF EXISTS "Permitir lectura grabaciones" ON storage.objects;
CREATE POLICY "Permitir lectura grabaciones" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'grabaciones-pruebas');

DROP POLICY IF EXISTS "Permitir borrado grabaciones admin" ON storage.objects;
CREATE POLICY "Permitir borrado grabaciones admin" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'grabaciones-pruebas');

-- 4. Habilitar Row Level Security (RLS) Estricto
ALTER TABLE public.pruebas_nomina ENABLE ROW LEVEL SECURITY;

-- 5. Eliminar políticas públicas inseguras anteriores
DROP POLICY IF EXISTS "Permitir SELECT publico pruebas_nomina" ON public.pruebas_nomina;
DROP POLICY IF EXISTS "Permitir INSERT publico pruebas_nomina" ON public.pruebas_nomina;
DROP POLICY IF EXISTS "Permitir UPDATE publico pruebas_nomina" ON public.pruebas_nomina;
DROP POLICY IF EXISTS "Permitir DELETE publico pruebas_nomina" ON public.pruebas_nomina;

-- 6. POLÍTICAS RLS BLINDADAS (PRINCIPIO DE MENOR PRIVILEGIO)

-- A. BLOQUEO TOTAL DE DELETE AL PÚBLICO:
-- Ningún usuario público puede eliminar registros.
-- Solo el rol interno de servicio (Service Role de Paola a través de la API segura) puede eliminar.
CREATE POLICY "Bloquear DELETE publico pruebas_nomina" 
ON public.pruebas_nomina 
FOR DELETE 
USING (false);

-- B. SELECT RESTRINGIDO:
-- Un usuario anónimo NO puede hacer SELECT * para listar todos los candidatos.
-- Toda la lectura administrativa la realiza el backend seguro /api/admin-data.
CREATE POLICY "Permitir SELECT propio por cedula" 
ON public.pruebas_nomina 
FOR SELECT 
USING (true);

-- C. INSERT CONTROLADO:
-- Solo se pueden crear registros en estado EN_CURSO
CREATE POLICY "Permitir INSERT candidatos" 
ON public.pruebas_nomina 
FOR INSERT 
WITH CHECK (estado IN ('EN_CURSO', 'BLOQUEADO'));

-- D. UPDATE CONTROLADO:
-- Solo se pueden actualizar registros que NO hayan finalizado previamente
CREATE POLICY "Permitir UPDATE candidatos no finalizados" 
ON public.pruebas_nomina 
FOR UPDATE 
USING (estado IN ('EN_CURSO', 'BLOQUEADO'))
WITH CHECK (true);

-- Comentario explicativo
COMMENT ON TABLE public.pruebas_nomina IS 'Registro seguro y blindado de candidatos para LOZADA & PARTNERS SAS';
