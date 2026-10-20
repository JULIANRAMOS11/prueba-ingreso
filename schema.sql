-- ==============================================================================
-- LOZADA & PARTNERS SAS - Área de Recursos Humanos
-- Esquema de Base de Datos para Sistema de Pruebas Técnicas de Nómina
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
    fecha TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Crear índices para optimizar búsquedas por cédula y estado
CREATE INDEX IF NOT EXISTS idx_pruebas_nomina_cedula ON public.pruebas_nomina(cedula);
CREATE INDEX IF NOT EXISTS idx_pruebas_nomina_estado ON public.pruebas_nomina(estado);
CREATE INDEX IF NOT EXISTS idx_pruebas_nomina_fecha ON public.pruebas_nomina(fecha DESC);

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.pruebas_nomina ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de Acceso RLS (Acceso público anónimo para aplicación de evaluación)
-- Permitir SELECT a todos los usuarios para validar estado y ver resultados en panel
CREATE POLICY "Permitir SELECT publico pruebas_nomina" 
ON public.pruebas_nomina 
FOR SELECT 
USING (true);

-- Permitir INSERT a nuevos candidatos al iniciar la prueba
CREATE POLICY "Permitir INSERT publico pruebas_nomina" 
ON public.pruebas_nomina 
FOR INSERT 
WITH CHECK (true);

-- Permitir UPDATE para guardar respuestas, finalizar o bloquear por antifraude
CREATE POLICY "Permitir UPDATE publico pruebas_nomina" 
ON public.pruebas_nomina 
FOR UPDATE 
USING (true);

-- Permitir DELETE al administrador para reiniciar o eliminar registros
CREATE POLICY "Permitir DELETE publico pruebas_nomina" 
ON public.pruebas_nomina 
FOR DELETE 
USING (true);

-- Comentario explicativo
COMMENT ON TABLE public.pruebas_nomina IS 'Registro de candidatos y resultados de pruebas técnicas de nómina para LOZADA & PARTNERS SAS';
