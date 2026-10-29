# LOZADA & PARTNERS SAS – Sistema de Pruebas Técnicas con Antifraude Estricto (2026)

Plataforma empresarial de evaluación técnica desarrollada para la Dirección de Talento Humano de **LOZADA & PARTNERS SAS**, orientada a la selección del cargo **Especialista de Nómina**. Combina supervisión audiovisual continua bajo la **Ley 1581 de 2012**, soporte supervisado para hojas de cálculo en **Microsoft Excel**, motor confidencial de calificación automática actualizado a la **legislación laboral y tributaria colombiana 2026**, y panel administrativo blindado en **Vercel + Supabase**.

---

## 🌟 Características Principales

### 1. Vista Candidato (`/`)
- **Validación de Identidad y Unicidad:** Control estricto de Cédula de Ciudadanía, correo electrónico único, nombres normalizados y mayoría de edad verificada (`>= 18 años`).
- **Cumplimiento Ley 1581 de 2012 (Habeas Data):** Doble consentimiento informado obligatorio para tratamiento de datos personales y grabación audiovisual temporal de auditoría (retención máxima de 30 días).
- **Supervisión Audiovisual Compuesta (`1–2 FPS`):**
  - Exige compartir obligatoriamente **"Toda la pantalla"** (`displaySurface === 'monitor'`), rechazando pestañas o ventanas sueltas para supervisar con transparencia el uso de Excel local.
  - Integra cámara web facial en miniatura (con modo flotante *Picture-in-Picture* automático) y micrófono ambiental en un único archivo `.webm` ultraligero (`~15–25 MB` por 90 minutos).
  - Protección activa (`beforeunload`) al finalizar o bloquear la prueba para garantizar que el video termine de sincronizarse en Supabase Storage antes de cerrar la pestaña.
- **Uso Autorizado de Microsoft Excel Local + Carga Directa a Storage:**
  - El candidato puede realizar sus liquidaciones en **Microsoft Excel** en su equipo y adjuntar su libro de respaldo (`.xlsx`, `.xls`, `.xlsm`, `.csv` hasta **25 MB**), subido directamente al bucket `archivos-pruebas` de Supabase Storage sin saturar el límite de payload de Vercel Serverless.
- **Autoguardado Inteligente y Temporizador Sincronizado con Servidor:**
  - Cronómetro oficial de **90 minutos** calculado desde `_inicio_servidor` (inmune a recargas `F5`).
  - Guardado automático continuo de las **38 preguntas** distribuidas en **7 secciones técnicas**.

### 2. Sistema Antifraude Inteligente
- **Causales de Bloqueo Inmediato e Irreversible (`BLOQUEADO`):**
  - Cambio de pestaña del navegador o minimización (`visibilitychange`) hacia buscadores, chatbots de IA o correo.
  - Detener manualmente la compartición de pantalla completa o desconectar el flujo de supervisión.
  - Apertura o intento de uso de herramientas de inspección de código (`F12`, `Ctrl+Shift+I/J/C`, `Ctrl+U`).
  - Intento de pegar texto externo (`paste` / `Ctrl+V`) dentro de las respuestas (solo se permite pegar valores numéricos puros calculados en Excel).
  - Intento de copiar o cortar enunciados confidenciales fuera de los campos de respuesta.
- **Neutralización Preventiva sin Falsos Positivos:**
  - `Ctrl+S`, `Ctrl+P` y clic derecho (`contextmenu`) son interceptados y neutralizados con aviso informativo para evitar bloqueos accidentales cuando el candidato alterna con Excel.

### 3. Panel Administrativo y Solucionario Confidencial 2026 (Talento Humano)
- **Autenticación Backend con Token HMAC (`LP_ADMIN_TOKEN`):**
  - Acceso mediante el botón **"Acceso RR.HH."**, el atajo `Ctrl + Shift + A` o parámetro administrativo verificado contra `/api/admin-auth` (con limpieza inmediata de la URL). Ninguna contraseña ni respuesta oficial reside en el código cliente (`app.js`).
- **Tabla Ejecutiva en Tiempo Real:**
  - Métricas de candidatos (`Total`, `Finalizados`, `En Curso`, `Bloqueados`), barra real de **Avance del Cuestionario (`X / 38 · %`)**, buscador por nombre/cédula/correo y filtros por estado.
- **Motor Confidencial de Auto-Calificación (`/api/grade` – Normativa Colombia 2026):**
  - Solucionario oficial 100% sincronizado con los casos prácticos del cuestionario y parámetros legales 2026 (**SMMLV 2026 `\$1.750.905`**, **Auxilio de transporte `\$249.095`**, **Ley 2101 de 2021** jornada 42h / divisor `210h` + compatibilidad con `220h–240h`, **Reforma Laboral** recargo dominical/festivo `90%` y clásico `75%`, **UVT 2026 `\$52.374`**, **Ley 1393 de 2010** tope `40%`, PILA, Salario Integral y fiscalización **UGPP**).
  - Calificación automática instantánea (`1.0`, `0.5`, `0.0`), ajuste manual pregunta por pregunta por parte de Talento Humano y exportación de **Ficha Ejecutiva en PDF / Impresión**.
- **Auditoría Multimedia y Gestión de Almacenamiento:**
  - Reproductor de video integrado con control de velocidad (`1x`, `1.5x`, `2x`, `4x`), descarga directa del libro Excel del candidato y botón **"Liberar Espacio"** que elimina físicamente el objeto `.webm` en Supabase Storage.

---

## 🏗️ Arquitectura Serverless (Vercel + Supabase)

| Archivo | Rol en el Sistema |
| :--- | :--- |
| [`index.html`](file:///c:/prueba-ingreso/index.html) | Interfaz principal (Identificación, Examen de 38 preguntas, Bloqueo, Finalización, Panel RR.HH. y Ficha PDF). |
| [`styles.css`](file:///c:/prueba-ingreso/styles.css) | Sistema de diseño corporativo, estados de calificación, indicadores multimedia y hoja de impresión `@media print`. |
| [`app.js`](file:///c:/prueba-ingreso/app.js) | Lógica de cliente, antifraude, grabador compuesto `Canvas + WebAudio + PiP`, carga a Storage y panel administrativo. |
| [`api/candidate.js`](file:///c:/prueba-ingreso/api/candidate.js) | Endpoint seguro de candidatos (`check-or-start`, `autosave`, `block`, `submit`, `save-recording`) con sanitización de campos. |
| [`api/admin-auth.js`](file:///c:/prueba-ingreso/api/admin-auth.js) | Autenticación administrativa en tiempo constante (`crypto.timingSafeEqual`) y emisión de token firmado HMAC-SHA256. |
| [`api/admin-data.js`](file:///c:/prueba-ingreso/api/admin-data.js) | Operaciones protegidas de RR.HH.: listado completo, borrado físico de grabaciones/Excel en Storage y reinicio de candidatos. |
| [`api/grade.js`](file:///c:/prueba-ingreso/api/grade.js) | Solucionario confidencial 2026 y evaluador heurístico/numérico protegido en backend (inaccesible para candidatos). |
| [`api/_utils.js`](file:///c:/prueba-ingreso/api/_utils.js) | Utilidades criptográficas HMAC, cliente administrativo Supabase REST y eliminación directa en Supabase Storage API. |
| [`schema.sql`](file:///c:/prueba-ingreso/schema.sql) | Esquema idempotente PostgreSQL (`pruebas_nomina`), buckets Storage (`grabaciones-pruebas`, `archivos-pruebas`) y políticas RLS. |

---

## ⚙️ Configuración en Supabase y Vercel

### 1. Base de Datos y Storage en Supabase
1. Ingrese al panel de su proyecto en [Supabase](https://supabase.com/).
2. Abra **SQL Editor**, pegue el contenido completo de [`schema.sql`](file:///c:/prueba-ingreso/schema.sql) y presione **Run**.
   - El script es **100% idempotente**: crea o actualiza la tabla `public.pruebas_nomina` (incluyendo la columna `correo`, metadatos de grabación y Excel), configura los buckets `grabaciones-pruebas` y `archivos-pruebas`, y endurece las políticas RLS impidiendo borrados o lecturas masivas anónimas.

### 2. Variables de Entorno en Vercel (`Settings > Environment Variables`)
Configure las siguientes variables en su proyecto de Vercel para habilitar todas las capacidades de seguridad y liberación de espacio en Storage:

| Variable | Obligatoria | Descripción |
| :--- | :---: | :--- |
| `SUPABASE_URL` | Sí | URL del proyecto Supabase (`https://<project-ref>.supabase.co`). |
| `SUPABASE_SERVICE_ROLE_KEY` | **Sí (Recomendada)** | Clave `service_role` de Supabase (solo en backend Vercel). Indispensable para que `/api/admin-data` elimine archivos físicos `.webm`/`.xlsx` en Supabase Storage bajo RLS estricto. |
| `SUPABASE_ANON_KEY` | Opcional | Clave pública `anon` de respaldo. |
| `ADMIN_USERNAME` | Sí | Usuario administrativo autorizado para Talento Humano (ej. `paola`). |
| `ADMIN_PASSWORD` | Sí | Contraseña robusta para acceso al Panel de Recursos Humanos. |
| `ADMIN_AUTH_SECRET` | Sí | Cadena aleatoria larga (`>= 32` caracteres) para firmar criptográficamente los tokens de sesión `LP_ADMIN_TOKEN`. |

---

## 💻 Ejecución en Desarrollo Local

Para probar localmente **tanto el frontend como las funciones Serverless `/api/*`** (autenticación admin, auto-calificación y persistencia segura):

```bash
npx vercel dev
```

Si solo desea previsualizar la maquetación estática del frontend:

```bash
npx -y serve . -l 3000
```

---

## 📋 Estructura Oficial del Examen (38 Preguntas · 7 Secciones)

1. **Sección 1 – Liquidación de Nómina (7 preguntas):** Caso práctico (`\$3.500.000` básico, `\$800.000` comisiones, `4 HED`, `2 HEN`), valor hora ordinaria (Ley 2101 `210h` / `220h–240h`), validación de auxilio de transporte (`> 2 SMMLV`), IBC, descuentos del trabajador y neto a pagar.
2. **Sección 2 – Aportes a Seguridad Social / PILA (6 preguntas):** Liquidación PILA sobre el trabajador de la Sección 1, Salud con exoneración Art. 114-1 E.T., Pensión (`12%` empleador / `4%` trabajador), ARL Riesgo Clase I (`0,522%`), Parafiscales (CCF `4%`, exoneración SENA/ICBF) y total planilla.
3. **Sección 3 – Salario Integral y Topes (7 preguntas):** Salario integral de `\$25.000.000` (factor prestacional `30% = \$7.500.000`, IBC `70% = \$17.500.000`, FSP `1%`, prestaciones incluidas/excluidas) y tope máximo de `25 SMMLV` (`\$43.772.625` en 2026) frente a salario de `\$42.000.000`.
4. **Sección 4 – Pagos Salariales y No Salariales (4 preguntas):** Clasificación Art. 127/128 CST (`\$5.800.000` salariales vs `\$1.100.000` no salariales), verificación del límite del `40%` (Ley 1393 de 2010) y requisitos de desalarización válida.
5. **Sección 5 – Retención en la Fuente (4 preguntas):** Caso con salario de `\$9.500.000` y aporte AFC de `\$700.000`, depuración mensual (INCRNGO, deducciones Art. 387 E.T., renta exenta `25%`) y límite global del `40%` sin exceder `1.340 UVT` anuales (Ley 2277 de 2022).
6. **Sección 6 – Cumplimiento UGPP (4 preguntas):** Caso práctico (`\$4.000.000` salario + `\$2.800.000` bono no salarial = `41,18%`, exceso `\$80.000`, IBC `\$4.080.000`), criterios de fiscalización por primacía de la realidad, sanciones y controles preventivos.
7. **Sección 7 – Legislación Laboral Colombiana (6 preguntas):** Definición legal de IBC, porcentajes de Salud y Pensión del trabajador (`4%` y `4%`), recargo nocturno (`35%`), recargo dominical/festivo (`90%` Reforma Laboral 2026 / `75%` histórico), pago de incapacidades de origen común (EPS) y derecho al auxilio de transporte (`<= 2 SMMLV`).
