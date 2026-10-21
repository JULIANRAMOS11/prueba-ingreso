# LOZADA & PARTNERS SAS – Sistema de Pruebas Técnicas con Antifraude Estricto

Aplicación web empresarial desarrollada para el Área de Recursos Humanos de **LOZADA & PARTNERS SAS**, diseñada para la evaluación técnica de candidatos al cargo de **Especialista de Nómina**. Integra un protocolo estricto de supervisión antifraude en tiempo real y panel de control administrativo para selección de talento.

---

## 🌟 Características Principales

1. **Vista Candidato (`/`):**
   - Formulario de identificación inicial con validación de Cédula de Ciudadanía única (sin puntos ni caracteres especiales).
   - **Consentimiento Ley 1581 de 2012 (Habeas Data):** Autorización previa, expresa e informada para el tratamiento de datos personales, voz y pantalla compartida, con compromiso de destrucción a los 30 días.
   - **Grabación Audiovisual Continua de Supervisión:** Captura simultánea de pantalla completa y micrófono ambiental optimizada para el plan Free de Supabase (1-2 FPS, audio mono 16 kbps, ~15-25 MB por 90 min).
   - Control de estados en Supabase (`EN_CURSO`, `FINALIZADO`, `BLOQUEADO`).
   - Bloqueo persistente que impide evadir la anulación recargando la página con F5.
   - Guardado automático (Autosave) continuo de respuestas para prevenir pérdidas de datos.
   - Cuestionario íntegro con **38 preguntas estructuradas** en 7 secciones de alta exigencia laboral y tributaria colombiana.

2. **Sistema Antifraude Estricto (Activo únicamente durante el examen):**
   - **Bloqueo CSS:** `user-select: none` en todo el documento excepto dentro de los campos `input` y `textarea`.
   - **Supervisión de Pantalla Compartida:** Si el candidato presiona "Dejar de compartir" en la barra del navegador, se dispara el bloqueo inmediato e irreversible.
   - **Eventos Monitoreados con Anulación Inmediata:**
     - Cambio de pestaña o minimización del navegador (`visibilitychange`).
     - Pérdida de foco de la ventana (`blur`: cambio de monitor, apertura de otra aplicación, Alt+Tab).
     - Intento de copiar texto (`copy`).
     - Intento de cortar texto (`cut`).
     - Intento de pegar contenido externo (`paste`).
     - Clic derecho o menú contextual (`contextmenu`).
     - Selección no autorizada de texto (`selectstart`).
     - Atajos de teclado: `F12`, `Ctrl+Shift+I/J/C`, `Ctrl+U`, `Ctrl+C`, `Ctrl+V`, `Ctrl+P`, `Ctrl+S`, `Alt+Tab`.
   - **Protocolo de Bloqueo Automático:**
     - Detiene la prueba de forma irreversible.
     - Realiza un `UPDATE` en Supabase marcando el estado como `BLOQUEADO`, especificando el motivo exacto, resguardando las respuestas acumuladas y subiendo la grabación de auditoría a Supabase Storage.
     - Despliega inmediatamente la **pantalla roja de alerta institucional**.

3. **Panel Administrativo para Paola (`/?admin=paola2026`):**
   - Métricas en tiempo real: Total de candidatos, Finalizados, En Curso y Bloqueados.
   - Tabla interactiva con orden cronológico descendente.
   - Badges de estado con iluminación: `FINALIZADO` (verde esmeralda), `EN_CURSO` (azul con pulso animado), `BLOQUEADO` (rojo carmesí con detalle del motivo).
   - **Reproductor de Auditoría (Pantalla y Audio):** Video integrado en el modal del candidato con selector de velocidad rápida (1x, 1.5x, 2x, 4x) para auditar un examen de 90 minutos en solo 15-20 minutos.
   - **Liberación de Almacenamiento (Ley 1581):** Botón directo para purgar el video de Supabase Storage una vez evaluado el candidato, garantizando que el plan gratuito de 1 GB nunca se agote.
   - **Ver Respuestas:** Modal estructurado que desglosa las 7 secciones y respuestas del candidato con opción de impresión / exportación a PDF.
   - **Desbloquear / Reiniciar:** Permite a Recursos Humanos restablecer a un candidato bloqueado por falso positivo para que pueda volver a presentar la prueba.
   - Barra de búsqueda por nombre/cédula y filtros dinámicos.
   - Botón de actualización en vivo.

---

## 🗄️ Estructura de la Base de Datos (Supabase)

El archivo [`schema.sql`](file:///c:/prueba-ingreso/schema.sql) contiene la definición completa de la tabla y políticas RLS:

```sql
CREATE TABLE IF NOT EXISTS public.pruebas_nomina (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    cedula TEXT NOT NULL UNIQUE,
    estado TEXT NOT NULL CHECK (estado IN ('EN_CURSO', 'FINALIZADO', 'BLOQUEADO')),
    motivo_bloqueo TEXT,
    respuestas JSONB DEFAULT '{}'::jsonb,
    fecha TIMESTAMPTZ DEFAULT NOW()
);
```

### Pasos para configurar en Supabase:
1. Ingrese a su consola de [Supabase](https://supabase.com/).
2. Abra el **SQL Editor** y ejecute el contenido de [`schema.sql`](file:///c:/prueba-ingreso/schema.sql).
3. Copie su **Project URL** y su **Anon Public Key** desde `Project Settings > API`.
4. Puede configurarlas directamente en [`app.js`](file:///c:/prueba-ingreso/app.js) en las constantes `DEFAULT_SUPABASE_URL` y `DEFAULT_SUPABASE_ANON_KEY`, o ingresarlas en vivo usando el botón de tuerca en el panel de administración.

---

## 🚀 Cómo Ejecutar la Aplicación Localmente

Dado que es un proyecto limpio con Vanilla JavaScript, HTML5 y CSS3, puede ser servido con cualquier servidor local estático.

### Opción 1: Con Node.js / npx (Recomendado)
```bash
npx -y serve . -l 3000
```
O con `http-server`:
```bash
npx -y http-server . -p 3000
```

### Opción 2: Con Python
```bash
python -m http.server 3000
```

Luego acceda desde el navegador:
- **Vista Candidato:** `http://localhost:3000/`
- **Panel Administrador (Paola):** `http://localhost:3000/?admin=paola2026`

---

## 📋 Contenido de la Prueba Técnica (7 Secciones)

1. **Sección 1: Liquidación de Nómina** (7 preguntas numéricas y fórmulas).
2. **Sección 2: Aportes a Seguridad Social (Planilla PILA)** (6 preguntas de liquidación PILA).
3. **Sección 3: Salario Integral y Topes** (7 preguntas: 4 de salario integral y 3 de topes legales).
4. **Sección 4: Pagos Salariales y No Salariales** (4 preguntas sobre desalarización y Ley 1393).
5. **Sección 5: Retención en la Fuente** (4 preguntas conceptuales y procedimentales).
6. **Sección 6: Cumplimiento UGPP** (4 preguntas sobre riesgos, fiscalización y criterios).
7. **Sección 7: Legislación Laboral** (6 preguntas de respuesta breve sobre normativa CST).
