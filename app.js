/**
 * ==============================================================================
 * LOZADA & PARTNERS SAS - Área de Recursos Humanos
 * Sistema de Evaluación Técnica para Especialista de Nómina con Antifraude Estricto
 * ==============================================================================
 */

// ==============================================================================
// 1. CONFIGURACIÓN DE SUPABASE
// ==============================================================================
// Reemplace estas constantes con las de su proyecto de Supabase, o utilice
// el botón de configuración en el Panel de Administración para guardarlas en localStorage.
const DEFAULT_SUPABASE_URL = 'https://uidrncxmggbwnoxcltsd.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_ZzONZA_eAa1O2Df5CVJh1g_YvADbdBT';

const SUPABASE_CONFIG = {
  url: localStorage.getItem('LP_SUPABASE_URL') || DEFAULT_SUPABASE_URL,
  anonKey: localStorage.getItem('LP_SUPABASE_KEY') || DEFAULT_SUPABASE_ANON_KEY
};

let supabaseClient = null;

function initSupabase() {
  if (window.supabase && SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey &&
      !SUPABASE_CONFIG.url.includes('YOUR_PROJECT_ID')) {
    try {
      supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
      console.log('✅ Supabase inicializado correctamente.');
      return true;
    } catch (err) {
      console.error('Error al inicializar cliente Supabase:', err);
      return false;
    }
  } else {
    console.warn('⚠️ Credenciales de Supabase no configuradas o con valores por defecto.');
    return false;
  }
}

// Fallback de almacenamiento local para pruebas rápidas si Supabase no está conectado
const LocalStorageDB = {
  TABLE_KEY: 'LP_PRUEBAS_NOMINA_MOCK',
  getAll() {
    try {
      const data = localStorage.getItem(this.TABLE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  saveAll(records) {
    localStorage.setItem(this.TABLE_KEY, JSON.stringify(records));
  },
  findByCedula(cedula) {
    const records = this.getAll();
    return records.find(r => r.cedula === cedula) || null;
  },
  insert(record) {
    const records = this.getAll();
    const newRecord = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'rec_' + Date.now(),
      fecha: new Date().toISOString(),
      respuestas: {},
      ...record
    };
    records.unshift(newRecord);
    this.saveAll(records);
    return newRecord;
  },
  updateByCedula(cedula, updates) {
    const records = this.getAll();
    const idx = records.findIndex(r => r.cedula === cedula);
    if (idx !== -1) {
      records[idx] = { ...records[idx], ...updates, fecha_actualizacion: new Date().toISOString() };
      this.saveAll(records);
      return records[idx];
    }
    return null;
  },
  deleteByCedula(cedula) {
    let records = this.getAll();
    records = records.filter(r => r.cedula !== cedula);
    this.saveAll(records);
  }
};

// ==============================================================================
// 2. METADATOS Y CATÁLOGO DE PREGUNTAS (38 PREGUNTAS)
// ==============================================================================
const EXAM_QUESTIONS_MAP = {
  // Sección 1
  q1_1: { section: 'Sección 1: Liquidación de Nómina', title: '1.1 Calcule el valor de la hora ordinaria' },
  q1_2: { section: 'Sección 1: Liquidación de Nómina', title: '1.2 Calcule el valor total de horas extras diurnas' },
  q1_3: { section: 'Sección 1: Liquidación de Nómina', title: '1.3 Calcule el valor total de horas extras nocturnas' },
  q1_4: { section: 'Sección 1: Liquidación de Nómina', title: '1.4 Determine el total devengado' },
  q1_5: { section: 'Sección 1: Liquidación de Nómina', title: '1.5 Determine el Ingreso Base de Cotización (IBC)' },
  q1_6: { section: 'Sección 1: Liquidación de Nómina', title: '1.6 Calcule los descuentos del trabajador por salud y pensión' },
  q1_7: { section: 'Sección 1: Liquidación de Nómina', title: '1.7 Determine el neto a pagar' },

  // Sección 2
  q2_1: { section: 'Sección 2: Aportes a seguridad social (Planilla PILA)', title: '2.1 Determine el IBC para seguridad social' },
  q2_2: { section: 'Sección 2: Aportes a seguridad social (Planilla PILA)', title: '2.2 Calcule los aportes del empleador y del trabajador para Salud' },
  q2_3: { section: 'Sección 2: Aportes a seguridad social (Planilla PILA)', title: '2.3 Calcule los aportes del empleador y del trabajador para Pensión' },
  q2_4: { section: 'Sección 2: Aportes a seguridad social (Planilla PILA)', title: '2.4 Calcule los aportes para ARL (suponga riesgo clase I – 0.522%)' },
  q2_5: { section: 'Sección 2: Aportes a seguridad social (Planilla PILA)', title: '2.5 Calcule los aportes para Caja de compensación, SENA e ICBF' },
  q2_6: { section: 'Sección 2: Aportes a seguridad social (Planilla PILA)', title: '2.6 Determine el valor total a pagar en la planilla PILA' },

  // Sección 3
  q3_1: { section: 'Sección 3: Salario Integral y Topes (Parte A)', title: '3.1 Determine cuál es el factor prestacional del salario integral' },
  q3_2: { section: 'Sección 3: Salario Integral y Topes (Parte A)', title: '3.2 Determine el Ingreso Base de Cotización (IBC)' },
  q3_3: { section: 'Sección 3: Salario Integral y Topes (Parte A)', title: '3.3 Calcule los aportes del trabajador a salud y pensión' },
  q3_4: { section: 'Sección 3: Salario Integral y Topes (Parte A)', title: '3.4 Determine si tiene derecho a Prima, Cesantías y Recargos nocturnos' },
  q3_5: { section: 'Sección 3: Salario Integral y Topes (Parte B)', title: '3.5 Indique cuál es el tope máximo de cotización a seguridad social en Colombia' },
  q3_6: { section: 'Sección 3: Salario Integral y Topes (Parte B)', title: '3.6 Determine cuál debe ser el IBC real para aportes considerando el tope legal' },
  q3_7: { section: 'Sección 3: Salario Integral y Topes (Parte B)', title: '3.7 Calcule los aportes del trabajador a salud y pensión considerando el tope' },

  // Sección 4
  q4_1: { section: 'Sección 4: Pagos salariales y no salariales', title: '4.1 Identifique cuáles pagos constituyen salario' },
  q4_2: { section: 'Sección 4: Pagos salariales y no salariales', title: '4.2 Identifique cuáles pagos no constituyen salario' },
  q4_3: { section: 'Sección 4: Pagos salariales y no salariales', title: '4.3 Determine el IBC para seguridad social' },
  q4_4: { section: 'Sección 4: Pagos salariales y no salariales', title: '4.4 Explique qué condiciones deben cumplirse para que un pago no constituya salario' },

  // Sección 5
  q5_1: { section: 'Sección 5: Retención en la fuente', title: '5.1 Explique qué es la retención en la fuente por salarios' },
  q5_2: { section: 'Sección 5: Retención en la fuente', title: '5.2 Indique qué conceptos se pueden restar de la base de retención' },
  q5_3: { section: 'Sección 5: Retención en la fuente', title: '5.3 Mencione dos beneficios tributarios que pueden disminuir la retención' },
  q5_4: { section: 'Sección 5: Retención en la fuente', title: '5.4 Indique cuál es el límite máximo de deducciones permitidas' },

  // Sección 6
  q6_1: { section: 'Sección 6: Cumplimiento UGPP', title: '6.1 ¿Qué posible riesgo podría identificar la UGPP en esta estructura?' },
  q6_2: { section: 'Sección 6: Cumplimiento UGPP', title: '6.2 ¿Qué criterio utiliza la UGPP para determinar si un pago es realmente no salarial?' },
  q6_3: { section: 'Sección 6: Cumplimiento UGPP', title: '6.3 ¿Qué consecuencias podría tener una fiscalización de la UGPP?' },
  q6_4: { section: 'Sección 6: Cumplimiento UGPP', title: '6.4 ¿Qué recomendaciones haría para evitar sanciones?' },

  // Sección 7
  q7_1: { section: 'Sección 7: Legislación laboral', title: '7.1 ¿Qué es el Ingreso Base de Cotización (IBC)?' },
  q7_2: { section: 'Sección 7: Legislación laboral', title: '7.2 ¿Cuál es el porcentaje de aporte del trabajador a salud y pensión?' },
  q7_3: { section: 'Sección 7: Legislación laboral', title: '7.3 ¿Cuál es el porcentaje del recargo nocturno?' },
  q7_4: { section: 'Sección 7: Legislación laboral', title: '7.4 ¿Cuál es el porcentaje del recargo dominical o festivo?' },
  q7_5: { section: 'Sección 7: Legislación laboral', title: '7.5 ¿Quién paga las incapacidades del día 3 al 180?' },
  q7_6: { section: 'Sección 7: Legislación laboral', title: '7.6 ¿Quién tiene derecho al auxilio de transporte?' }
};

const TOTAL_QUESTIONS_COUNT = Object.keys(EXAM_QUESTIONS_MAP).length; // 38 preguntas

// ==============================================================================
// 3. ESTADO DE LA APLICACIÓN
// ==============================================================================
const AppState = {
  currentCandidate: null,
  isExamActive: false,
  isBlocked: false,
  autosaveTimer: null,
  adminData: [],
  adminFilter: 'ALL',
  adminSearchQuery: ''
};

// ==============================================================================
// 4. ELEMENTOS DEL DOM
// ==============================================================================
const DOM = {
  // Vistas
  viewIdentification: document.getElementById('viewIdentification'),
  viewExam: document.getElementById('viewExam'),
  viewBlocked: document.getElementById('viewBlocked'),
  viewFinished: document.getElementById('viewFinished'),
  viewAdmin: document.getElementById('viewAdmin'),

  // Formularios
  candidateLoginForm: document.getElementById('candidateLoginForm'),
  candidateFullName: document.getElementById('candidateFullName'),
  candidateCedula: document.getElementById('candidateCedula'),
  acceptSupervisionCheck: document.getElementById('acceptSupervisionCheck'),
  technicalExamForm: document.getElementById('technicalExamForm'),
  btnSubmitExam: document.getElementById('btnSubmitExam'),

  // Elementos de Cabecera y Examen
  headerCandidateName: document.getElementById('headerCandidateName'),
  headerCandidateCedula: document.getElementById('headerCandidateCedula'),
  answeredQuestionsCount: document.getElementById('answeredQuestionsCount'),
  examProgressBar: document.getElementById('examProgressBar'),
  autosaveIndicator: document.getElementById('autosaveIndicator'),

  // Elementos de Bloqueo
  blockedCandidateName: document.getElementById('blockedCandidateName'),
  blockedCandidateCedula: document.getElementById('blockedCandidateCedula'),
  blockedTimestamp: document.getElementById('blockedTimestamp'),
  blockedReasonText: document.getElementById('blockedReasonText'),

  // Elementos de Finalizado
  finishedCandidateName: document.getElementById('finishedCandidateName'),
  finishedCandidateCedula: document.getElementById('finishedCandidateCedula'),
  finishedDate: document.getElementById('finishedDate'),

  // Panel Admin
  statTotalCandidates: document.getElementById('statTotalCandidates'),
  statFinalizedCandidates: document.getElementById('statFinalizedCandidates'),
  statInProgressCandidates: document.getElementById('statInProgressCandidates'),
  statBlockedCandidates: document.getElementById('statBlockedCandidates'),
  adminSearchInput: document.getElementById('adminSearchInput'),
  adminTableBody: document.getElementById('adminTableBody'),
  btnRefreshAdminTable: document.getElementById('btnRefreshAdminTable'),
  filterPills: document.querySelectorAll('.filter-pill'),

  // Modales
  responsesModal: document.getElementById('responsesModal'),
  modalCandidateNameTitle: document.getElementById('modalCandidateNameTitle'),
  modalCandidateMetaInfo: document.getElementById('modalCandidateMetaInfo'),
  modalResponsesContent: document.getElementById('modalResponsesContent'),
  btnCloseResponsesModal: document.getElementById('btnCloseResponsesModal'),
  btnDoneViewingResponses: document.getElementById('btnDoneViewingResponses'),
  btnExportResponses: document.getElementById('btnExportResponses'),

  confirmResetModal: document.getElementById('confirmResetModal'),
  resetTargetName: document.getElementById('resetTargetName'),
  resetTargetCedula: document.getElementById('resetTargetCedula'),
  btnCancelReset: document.getElementById('btnCancelReset'),
  btnConfirmReset: document.getElementById('btnConfirmReset'),

  configModal: document.getElementById('configModal'),
  btnOpenConfigModal: document.getElementById('btnOpenConfigModal'),
  btnCloseConfig: document.getElementById('btnCloseConfig'),
  btnCancelConfig: document.getElementById('btnCancelConfig'),
  btnSaveConfig: document.getElementById('btnSaveConfig'),
  cfgSupabaseUrl: document.getElementById('cfgSupabaseUrl'),
  cfgSupabaseKey: document.getElementById('cfgSupabaseKey'),

  // Toast
  toastNotification: document.getElementById('toastNotification'),
  toastTitle: document.getElementById('toastTitle'),
  toastMessage: document.getElementById('toastMessage')
};

// ==============================================================================
// 5. UTILIDADES DE INTERFAZ (TOAST, FORMATEO)
// ==============================================================================
function showToast(title, message, type = 'info') {
  if (!DOM.toastNotification) return;
  DOM.toastTitle.textContent = title;
  DOM.toastMessage.textContent = message;
  DOM.toastNotification.className = `toast-notification ${type}`;
  DOM.toastNotification.classList.remove('hidden');

  setTimeout(() => {
    DOM.toastNotification.classList.add('hidden');
  }, 4500);
}

function formatDate(isoString) {
  if (!isoString) return '---';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch {
    return isoString;
  }
}

function sanitizeCedula(str) {
  return (str || '').toString().replace(/\D/g, '').trim();
}

// ==============================================================================
// 6. CAPA DE DATOS (SUPABASE CON FALLBACK TRANSPARENTE)
// ==============================================================================
const DatabaseService = {
  async getByCedula(cedula) {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('pruebas_nomina')
          .select('*')
          .eq('cedula', cedula)
          .maybeSingle();

        if (error) {
          console.warn('Supabase query error, fallback to local:', error);
          return LocalStorageDB.findByCedula(cedula);
        }
        return data;
      } catch (err) {
        console.warn('Network error reaching Supabase:', err);
        return LocalStorageDB.findByCedula(cedula);
      }
    }
    return LocalStorageDB.findByCedula(cedula);
  },

  async insertCandidate(candidate) {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('pruebas_nomina')
          .insert([candidate])
          .select()
          .single();

        if (error) {
          console.warn('Supabase insert error, fallback to local:', error);
          return LocalStorageDB.insert(candidate);
        }
        return data;
      } catch (err) {
        console.warn('Network error reaching Supabase:', err);
        return LocalStorageDB.insert(candidate);
      }
    }
    return LocalStorageDB.insert(candidate);
  },

  async updateCandidate(cedula, updates) {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('pruebas_nomina')
          .update(updates)
          .eq('cedula', cedula)
          .select();

        if (error) {
          console.warn('Supabase update error, fallback to local:', error);
          return LocalStorageDB.updateByCedula(cedula, updates);
        }
        return data && data[0] ? data[0] : updates;
      } catch (err) {
        console.warn('Network error reaching Supabase:', err);
        return LocalStorageDB.updateByCedula(cedula, updates);
      }
    }
    return LocalStorageDB.updateByCedula(cedula, updates);
  },

  async getAllCandidates() {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('pruebas_nomina')
          .select('*')
          .order('fecha', { ascending: false });

        if (error) {
          console.warn('Supabase select all error, fallback to local:', error);
          return LocalStorageDB.getAll();
        }
        return data || [];
      } catch (err) {
        console.warn('Network error reaching Supabase:', err);
        return LocalStorageDB.getAll();
      }
    }
    return LocalStorageDB.getAll();
  },

  async deleteCandidate(cedula) {
    if (supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from('pruebas_nomina')
          .delete()
          .eq('cedula', cedula);

        if (error) {
          console.warn('Supabase delete error, fallback to local:', error);
          LocalStorageDB.deleteByCedula(cedula);
          return true;
        }
        LocalStorageDB.deleteByCedula(cedula);
        return true;
      } catch (err) {
        console.warn('Network error reaching Supabase:', err);
        LocalStorageDB.deleteByCedula(cedula);
        return true;
      }
    }
    LocalStorageDB.deleteByCedula(cedula);
    return true;
  }
};

// ==============================================================================
// 6.5 CRONÓMETRO DE EVALUACIÓN: 1 HORA Y MEDIA (90 MINUTOS = 5400 SEGUNDOS)
// ==============================================================================
const ExamTimer = {
  TOTAL_DURATION_SECONDS: 90 * 60, // 5400 segundos = 1 hora y 30 minutos
  intervalId: null,
  startTime: null,

  init(candidateCedula, existingStartTime = null) {
    this.stop();

    const storageKey = `LP_EXAM_START_${candidateCedula}`;
    let start = existingStartTime;

    if (!start) {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        start = parseInt(stored, 10);
      }
    }

    if (!start || isNaN(start)) {
      start = Date.now();
      sessionStorage.setItem(storageKey, start.toString());
    }

    this.startTime = start;
    this.updateDisplay();

    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000);
  },

  getRemainingSeconds() {
    if (!this.startTime) return this.TOTAL_DURATION_SECONDS;
    const elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    return Math.max(0, this.TOTAL_DURATION_SECONDS - elapsedSeconds);
  },

  tick() {
    if (!AppState.isExamActive || AppState.isBlocked) {
      this.stop();
      return;
    }

    const remaining = this.getRemainingSeconds();
    this.updateDisplay(remaining);

    // Advertencias en pantalla
    if (remaining === 900) { // 15 minutos
      showToast('Tiempo Restante', 'Atención: Dispone de los últimos 15 minutos para finalizar su prueba técnica.', 'warning');
    } else if (remaining === 300) { // 5 minutos
      showToast('Tiempo Crítico', 'Últimos 5 minutos de examen. Asegúrese de completar sus respuestas.', 'error');
    }

    // Al llegar a 0 segundos, auto-envío del examen
    if (remaining <= 0) {
      this.stop();
      this.handleExpired();
    }
  },

  updateDisplay(remaining = null) {
    if (remaining === null) remaining = this.getRemainingSeconds();

    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;

    const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const displayEl = document.getElementById('examCountdown');
    const pillEl = document.getElementById('examTimerPill');

    if (displayEl) {
      displayEl.textContent = formatted;
    }

    if (pillEl) {
      if (remaining <= 300) {
        pillEl.className = 'timer-pill timer-critical';
      } else if (remaining <= 900) {
        pillEl.className = 'timer-pill timer-warning';
      } else {
        pillEl.className = 'timer-pill';
      }
    }
  },

  async handleExpired() {
    console.warn('⏱️ Límite de tiempo alcanzado (1h 30m). Enviando evaluación automáticamente.');
    showToast('Tiempo Cumplido', 'Ha finalizado la hora y media de evaluación. Guardando y enviando sus respuestas...', 'warning');
    await handleSubmitExam(true);
  },

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
};

// ==============================================================================
// 7. SISTEMA ANTIFRAUDE ESTRICTO (ACTIVO ÚNICAMENTE EN EXAMEN)
// ==============================================================================
const AntiFraudSystem = {
  isPaused: false,
  eventHandlers: {},

  pause() {
    this.isPaused = true;
  },

  resume() {
    this.isPaused = false;
  },

  init() {
    this.eventHandlers = {
      // 1. Cambio de pestaña / minimización
      visibilityChange: () => {
        if (!AppState.isExamActive || AppState.isBlocked || this.isPaused) return;
        if (document.hidden) {
          this.triggerBlock('Cambio de pestaña o minimización del navegador detectado (visibilitychange).');
        }
      },

      // 2. Pérdida de foco de ventana (Alt+Tab, otra pantalla, app externa)
      windowBlur: () => {
        if (!AppState.isExamActive || AppState.isBlocked || this.isPaused) return;
        this.triggerBlock('Pérdida de foco de la ventana detectada (abrió otra ventana, aplicación o monitor secundario).');
      },

      // 3. Intento de recargar o abandonar la página
      beforeUnload: (e) => {
        if (!AppState.isExamActive || AppState.isBlocked || this.isPaused) return;
        const msg = 'La prueba técnica está en curso. Si recarga o abandona esta página, su examen será anulado definitivamente.';
        e.preventDefault();
        e.returnValue = msg;
        return msg;
      },

      // 4. Salida o navegación externa
      pageHide: () => {
        if (!AppState.isExamActive || AppState.isBlocked || this.isPaused) return;
        this.triggerBlock('Abandono de la página detectado (pagehide/navegación externa).');
      },

      // 5. Intento de navegación con botones atrás/adelante del navegador
      popState: () => {
        if (!AppState.isExamActive || AppState.isBlocked || this.isPaused) return;
        try {
          history.pushState({ inExam: true }, '', window.location.href);
        } catch (e) {}
        this.triggerBlock('Intento de navegación hacia atrás o cambio de página en el navegador.');
      },

      // 6. Intento de copiar
      copy: (e) => {
        if (!AppState.isExamActive || AppState.isBlocked || this.isPaused) return;
        e.preventDefault();
        this.triggerBlock('Intento de copiar texto de la prueba (evento copy detectado).');
      },

      // 7. Intento de cortar
      cut: (e) => {
        if (!AppState.isExamActive || AppState.isBlocked || this.isPaused) return;
        e.preventDefault();
        this.triggerBlock('Intento de cortar texto (evento cut detectado).');
      },

      // 8. Intento de pegar (incluso en inputs o textareas)
      paste: (e) => {
        if (!AppState.isExamActive || AppState.isBlocked || this.isPaused) return;
        e.preventDefault();
        this.triggerBlock('Intento de pegar contenido externo en el examen (evento paste detectado).');
      },

      // 9. Clic derecho / menú contextual
      contextMenu: (e) => {
        if (!AppState.isExamActive || AppState.isBlocked || this.isPaused) return;
        e.preventDefault();
        this.triggerBlock('Intento de abrir menú contextual con clic derecho (contextmenu).');
      },

      // 10. Intento de seleccionar texto fuera de inputs y textareas
      selectStart: (e) => {
        if (!AppState.isExamActive || AppState.isBlocked || this.isPaused) return;
        const targetTag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
        if (targetTag !== 'INPUT' && targetTag !== 'TEXTAREA') {
          e.preventDefault();
          this.triggerBlock('Intento de seleccionar texto protegido de las preguntas fuera de los campos de respuesta.');
        }
      },

      // 11. Atajos de teclado bloqueados (F12, Ctrl+Shift+I, Ctrl+C, Ctrl+V, etc.)
      keyDown: (e) => {
        if (!AppState.isExamActive || AppState.isBlocked || this.isPaused) return;

        const isCtrlOrCmd = e.ctrlKey || e.metaKey;
        const key = e.key.toUpperCase();

        // F12 (Herramientas de desarrollo)
        if (e.key === 'F12') {
          e.preventDefault();
          this.triggerBlock('Intento de abrir herramientas de desarrollo (tecla F12).');
          return;
        }

        // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C (Consola / Inspeccionar)
        if (isCtrlOrCmd && e.shiftKey && (key === 'I' || key === 'J' || key === 'C')) {
          e.preventDefault();
          this.triggerBlock('Intento de inspeccionar elementos o abrir consola del navegador.');
          return;
        }

        // Ctrl+U (Ver código fuente)
        if (isCtrlOrCmd && key === 'U') {
          e.preventDefault();
          this.triggerBlock('Intento de ver el código fuente de la página (Ctrl+U).');
          return;
        }

        // Ctrl+C (Copiar)
        if (isCtrlOrCmd && key === 'C') {
          e.preventDefault();
          this.triggerBlock('Intento de copiar texto mediante atajo de teclado (Ctrl+C).');
          return;
        }

        // Ctrl+V (Pegar)
        if (isCtrlOrCmd && key === 'V') {
          e.preventDefault();
          this.triggerBlock('Intento de pegar contenido mediante atajo de teclado (Ctrl+V).');
          return;
        }

        // Ctrl+P (Imprimir)
        if (isCtrlOrCmd && key === 'P') {
          e.preventDefault();
          this.triggerBlock('Intento de imprimir la prueba técnica (Ctrl+P).');
          return;
        }

        // Ctrl+S (Guardar página)
        if (isCtrlOrCmd && key === 'S') {
          e.preventDefault();
          this.triggerBlock('Intento de guardar la página en almacenamiento local (Ctrl+S).');
          return;
        }

        // Alt + Tab
        if (e.altKey && (e.key === 'Tab' || key === 'TAB')) {
          e.preventDefault();
          this.triggerBlock('Intento de cambiar de ventana con Alt+Tab.');
          return;
        }
      }
    };
  },

  activate() {
    this.init();
    this.isPaused = false;
    document.addEventListener('visibilitychange', this.eventHandlers.visibilityChange);
    window.addEventListener('blur', this.eventHandlers.windowBlur);
    window.addEventListener('beforeunload', this.eventHandlers.beforeUnload);
    window.addEventListener('pagehide', this.eventHandlers.pageHide);
    window.addEventListener('popstate', this.eventHandlers.popState);
    document.addEventListener('copy', this.eventHandlers.copy);
    document.addEventListener('cut', this.eventHandlers.cut);
    document.addEventListener('paste', this.eventHandlers.paste);
    document.addEventListener('contextmenu', this.eventHandlers.contextMenu);
    document.addEventListener('selectstart', this.eventHandlers.selectStart);
    document.addEventListener('keydown', this.eventHandlers.keyDown);
    console.log('🛡️ Sistema Antifraude Estricto ACTIVADO.');
  },

  deactivate() {
    if (!this.eventHandlers.visibilityChange) return;
    document.removeEventListener('visibilitychange', this.eventHandlers.visibilityChange);
    window.removeEventListener('blur', this.eventHandlers.windowBlur);
    window.removeEventListener('beforeunload', this.eventHandlers.beforeUnload);
    window.removeEventListener('pagehide', this.eventHandlers.pageHide);
    window.removeEventListener('popstate', this.eventHandlers.popState);
    document.removeEventListener('copy', this.eventHandlers.copy);
    document.removeEventListener('cut', this.eventHandlers.cut);
    document.removeEventListener('paste', this.eventHandlers.paste);
    document.removeEventListener('contextmenu', this.eventHandlers.contextMenu);
    document.removeEventListener('selectstart', this.eventHandlers.selectStart);
    document.removeEventListener('keydown', this.eventHandlers.keyDown);
    console.log('🛡️ Sistema Antifraude DESACTIVADO.');
  },

  async triggerBlock(reason) {
    if (AppState.isBlocked) return;
    AppState.isBlocked = true;
    AppState.isExamActive = false;

    // Desactivar inmediatamente para no disparar llamadas en bucle
    this.deactivate();
    ExamTimer.stop();

    console.error('🚨 BLOQUEO ANTIFRAUDE DISPARADO:', reason);

    // 1. Recoger respuestas parciales que llevaba hasta este segundo
    const partialAnswers = collectCurrentAnswers();
    const candidateCedula = AppState.currentCandidate ? AppState.currentCandidate.cedula : 'DESCONOCIDA';
    const candidateNombre = AppState.currentCandidate ? AppState.currentCandidate.nombre : 'CANDIDATO';

    // 2. Guardar estado de bloqueo en Supabase inmediatamente
    try {
      await DatabaseService.updateCandidate(candidateCedula, {
        estado: 'BLOQUEADO',
        motivo_bloqueo: reason,
        respuestas: partialAnswers
      });
    } catch (err) {
      console.error('Error al actualizar bloqueo en Supabase:', err);
    }

    // 3. Almacenar estado de bloqueo en sessionStorage para que si el candidato recarga con F5,
    // vuelva a mostrar la pantalla roja inmediatamente
    sessionStorage.setItem('LP_BLOCKED_CEDULA', candidateCedula);
    sessionStorage.setItem('LP_BLOCKED_REASON', reason);
    sessionStorage.setItem('LP_BLOCKED_NAME', candidateNombre);
    sessionStorage.setItem('LP_BLOCKED_TIMESTAMP', new Date().toISOString());

    // 4. Mostrar pantalla roja inmediata de anulación
    renderBlockedView({
      nombre: candidateNombre,
      cedula: candidateCedula,
      motivo_bloqueo: reason,
      fecha: new Date().toISOString()
    });
  }
};

// ==============================================================================
// 8. GESTIÓN DEL CUESTIONARIO Y RESPUESTAS
// ==============================================================================
function collectCurrentAnswers() {
  const answers = {};
  if (!DOM.technicalExamForm) return answers;

  const inputs = DOM.technicalExamForm.querySelectorAll('input, textarea');
  inputs.forEach(input => {
    if (input.name && input.id) {
      answers[input.id] = input.value.trim();
    }
  });

  if (ExamTimer.startTime) {
    answers._exam_start_time = ExamTimer.startTime;
  }
  return answers;
}

function updateProgress() {
  if (!DOM.technicalExamForm) return;

  const inputs = DOM.technicalExamForm.querySelectorAll('input, textarea');
  let answered = 0;
  inputs.forEach(input => {
    if (input.value && input.value.trim().length > 0) {
      answered++;
    }
  });

  const percentage = Math.round((answered / TOTAL_QUESTIONS_COUNT) * 100);
  if (DOM.answeredQuestionsCount) {
    DOM.answeredQuestionsCount.textContent = answered;
  }
  if (DOM.examProgressBar) {
    DOM.examProgressBar.style.width = `${percentage}%`;
  }
}

function triggerAutosave() {
  if (!AppState.isExamActive || AppState.isBlocked || !AppState.currentCandidate) return;

  clearTimeout(AppState.autosaveTimer);
  AppState.autosaveTimer = setTimeout(async () => {
    const currentAnswers = collectCurrentAnswers();
    updateProgress();

    if (DOM.autosaveIndicator) {
      DOM.autosaveIndicator.classList.add('saving');
    }

    try {
      await DatabaseService.updateCandidate(AppState.currentCandidate.cedula, {
        respuestas: currentAnswers
      });
      if (DOM.autosaveIndicator) {
        DOM.autosaveIndicator.classList.remove('saving');
      }
    } catch (err) {
      console.warn('Error en autosave:', err);
    }
  }, 1000);
}

// ==============================================================================
// 9. VISTAS Y TRANSICIONES DE PANTALLA
// ==============================================================================
function hideAllViews() {
  [
    DOM.viewIdentification,
    DOM.viewExam,
    DOM.viewBlocked,
    DOM.viewFinished,
    DOM.viewAdmin
  ].forEach(v => {
    if (v) v.classList.add('hidden');
  });
}

function renderBlockedView(data) {
  hideAllViews();
  if (DOM.viewBlocked) {
    DOM.blockedCandidateName.textContent = data.nombre || 'Candidato';
    DOM.blockedCandidateCedula.textContent = data.cedula || '---';
    DOM.blockedTimestamp.textContent = formatDate(data.fecha || new Date());
    DOM.blockedReasonText.textContent = data.motivo_bloqueo || 'Violación de las normas antifraude';
    DOM.viewBlocked.classList.remove('hidden');
  }
}

function renderFinishedView(data) {
  hideAllViews();
  ExamTimer.stop();
  if (DOM.viewFinished) {
    DOM.finishedCandidateName.textContent = data.nombre || 'Candidato';
    DOM.finishedCandidateCedula.textContent = data.cedula || '---';
    DOM.finishedDate.textContent = formatDate(data.fecha || new Date());
    DOM.viewFinished.classList.remove('hidden');
  }
}

function startExamView(candidate, existingAnswers = {}) {
  hideAllViews();
  AppState.currentCandidate = candidate;
  AppState.isExamActive = true;
  AppState.isBlocked = false;

  if (DOM.headerCandidateName) DOM.headerCandidateName.textContent = candidate.nombre;
  if (DOM.headerCandidateCedula) DOM.headerCandidateCedula.textContent = candidate.cedula;

  // Restaurar respuestas si existían
  if (existingAnswers && typeof existingAnswers === 'object') {
    Object.keys(existingAnswers).forEach(key => {
      if (key.startsWith('_')) return;
      const field = document.getElementById(key);
      if (field) {
        field.value = existingAnswers[key];
      }
    });
  }

  updateProgress();
  DOM.viewExam.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Iniciar temporizador de 1 hora y 30 minutos (conserva tiempo si es reanudación)
  const prevStartTime = (existingAnswers && existingAnswers._exam_start_time)
    || (candidate.respuestas && candidate.respuestas._exam_start_time)
    || null;
  ExamTimer.init(candidate.cedula, prevStartTime);

  // Historial para capturar intento de navegación atrás
  try {
    history.pushState({ inExam: true }, '', window.location.href);
  } catch (e) {}

  // ACTIVAR EL SISTEMA ANTIFRAUDE
  AntiFraudSystem.activate();
}

// ==============================================================================
// 10. CONTROLADOR DE IDENTIFICACIÓN DE CANDIDATO
// ==============================================================================
async function handleCandidateLogin(e) {
  e.preventDefault();

  const fullName = DOM.candidateFullName.value.trim();
  const cedula = sanitizeCedula(DOM.candidateCedula.value);

  if (!fullName || fullName.length < 3) {
    showToast('Validación', 'Por favor ingrese su nombre y apellido completos.', 'warning');
    DOM.candidateFullName.focus();
    return;
  }

  if (!cedula || cedula.length < 6) {
    showToast('Validación', 'La cédula debe contener al menos 6 dígitos numéricos sin puntos ni espacios.', 'warning');
    DOM.candidateCedula.focus();
    return;
  }

  if (!DOM.acceptSupervisionCheck.checked) {
    showToast('Atención', 'Debe aceptar los términos de supervisión para iniciar.', 'warning');
    DOM.acceptSupervisionCheck.focus();
    return;
  }

  // 1. Verificar si ya fue bloqueado previamente en esta sesión de navegador
  const cachedBlockedCedula = sessionStorage.getItem('LP_BLOCKED_CEDULA');
  if (cachedBlockedCedula === cedula) {
    renderBlockedView({
      nombre: sessionStorage.getItem('LP_BLOCKED_NAME') || fullName,
      cedula: cedula,
      motivo_bloqueo: sessionStorage.getItem('LP_BLOCKED_REASON'),
      fecha: sessionStorage.getItem('LP_BLOCKED_TIMESTAMP')
    });
    return;
  }

  // 2. Consultar el estado en Supabase
  showToast('Verificando', 'Consultando estado del candidato en el sistema...', 'info');

  try {
    const existing = await DatabaseService.getByCedula(cedula);

    if (existing) {
      // Caso 1: Candidato BLOQUEADO previamente
      if (existing.estado === 'BLOQUEADO') {
        sessionStorage.setItem('LP_BLOCKED_CEDULA', existing.cedula);
        sessionStorage.setItem('LP_BLOCKED_REASON', existing.motivo_bloqueo);
        sessionStorage.setItem('LP_BLOCKED_NAME', existing.nombre);
        sessionStorage.setItem('LP_BLOCKED_TIMESTAMP', existing.fecha);

        renderBlockedView(existing);
        return;
      }

      // Caso 2: Candidato FINALIZADO
      if (existing.estado === 'FINALIZADO') {
        showToast('Prueba Ya Presentada', 'Usted ya completó y envió esta evaluación anteriormente.', 'warning');
        renderFinishedView(existing);
        return;
      }

      // Caso 3: Candidato EN_CURSO (reanudación)
      if (existing.estado === 'EN_CURSO') {
        showToast('Reanudando', 'Continuando examen en progreso...', 'info');
        startExamView(existing, existing.respuestas || {});
        return;
      }
    }

    // Caso 4: Candidato Nuevo -> Crear registro con estado EN_CURSO
    const newRecord = {
      nombre: fullName,
      cedula: cedula,
      estado: 'EN_CURSO',
      motivo_bloqueo: null,
      respuestas: {}
    };

    const saved = await DatabaseService.insertCandidate(newRecord);
    startExamView(saved || newRecord);

  } catch (err) {
    console.error('Error al procesar inicio de candidato:', err);
    showToast('Error', 'No se pudo conectar con la base de datos. Intente nuevamente.', 'error');
  }
}

// ==============================================================================
// 11. FINALIZACIÓN Y ENVÍO DEL EXAMEN
// ==============================================================================
async function handleSubmitExam(isAutoSubmit = false) {
  if (!AppState.isExamActive || AppState.isBlocked) return;

  const currentAnswers = collectCurrentAnswers();
  const answeredCount = Object.keys(currentAnswers).filter(k => !k.startsWith('_') && currentAnswers[k].length > 0).length;

  if (!isAutoSubmit) {
    // Pausar temporalmente antifraude para que el modal confirm nativo no dispare window.blur
    AntiFraudSystem.pause();

    const confirmMsg = answeredCount < TOTAL_QUESTIONS_COUNT
      ? `Ha respondido ${answeredCount} de las ${TOTAL_QUESTIONS_COUNT} preguntas. ¿Está seguro de enviar su prueba técnica ahora? No podrá modificarla después.`
      : `Ha completado las ${TOTAL_QUESTIONS_COUNT} preguntas. ¿Desea enviar y finalizar su prueba técnica de manera definitiva?`;

    const confirmed = window.confirm(confirmMsg);
    if (!confirmed) {
      AntiFraudSystem.resume();
      return;
    }
  }

  // Desactivar definitivamente el antifraude y detener el cronómetro
  AppState.isExamActive = false;
  AntiFraudSystem.deactivate();
  ExamTimer.stop();

  showToast('Enviando', 'Guardando respuestas finales en el sistema...', 'info');

  try {
    const candidateCedula = AppState.currentCandidate.cedula;
    const updated = await DatabaseService.updateCandidate(candidateCedula, {
      estado: 'FINALIZADO',
      respuestas: currentAnswers
    });

    renderFinishedView({
      nombre: AppState.currentCandidate.nombre,
      cedula: candidateCedula,
      fecha: new Date().toISOString()
    });

  } catch (err) {
    console.error('Error al finalizar examen:', err);
    showToast('Error', 'Hubo un inconveniente al guardar las respuestas finales.', 'error');
  }
}

// ==============================================================================
// 12. VISTA ADMINISTRADOR (PANEL DE CONTROL DE PAOLA)
// ==============================================================================
let candidateToReset = null;

async function loadAdminData() {
  if (DOM.btnRefreshAdminTable) {
    DOM.btnRefreshAdminTable.classList.add('is-refreshing');
  }

  try {
    const candidates = await DatabaseService.getAllCandidates();
    AppState.adminData = candidates;
    renderAdminDashboard();
  } catch (err) {
    console.error('Error al cargar datos de administración:', err);
    showToast('Error', 'No fue posible obtener los registros de candidatos.', 'error');
  } finally {
    if (DOM.btnRefreshAdminTable) {
      setTimeout(() => DOM.btnRefreshAdminTable.classList.remove('is-refreshing'), 500);
    }
  }
}

function renderAdminDashboard() {
  const data = AppState.adminData || [];

  // 1. Calcular Métricas
  const total = data.length;
  const finalized = data.filter(c => c.estado === 'FINALIZADO').length;
  const inProgress = data.filter(c => c.estado === 'EN_CURSO').length;
  const blocked = data.filter(c => c.estado === 'BLOQUEADO').length;

  if (DOM.statTotalCandidates) DOM.statTotalCandidates.textContent = total;
  if (DOM.statFinalizedCandidates) DOM.statFinalizedCandidates.textContent = finalized;
  if (DOM.statInProgressCandidates) DOM.statInProgressCandidates.textContent = inProgress;
  if (DOM.statBlockedCandidates) DOM.statBlockedCandidates.textContent = blocked;

  // 2. Filtrar y Buscar
  let filtered = data.filter(candidate => {
    // Filtro por Estado
    if (AppState.adminFilter !== 'ALL' && candidate.estado !== AppState.adminFilter) {
      return false;
    }
    // Búsqueda por Texto
    if (AppState.adminSearchQuery) {
      const q = AppState.adminSearchQuery.toLowerCase();
      const matchName = (candidate.nombre || '').toLowerCase().includes(q);
      const matchCedula = (candidate.cedula || '').toLowerCase().includes(q);
      return matchName || matchCedula;
    }
    return true;
  });

  // 3. Renderizar Tabla
  if (!DOM.adminTableBody) return;

  if (filtered.length === 0) {
    DOM.adminTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-8 text-muted">
          No se encontraron registros de candidatos que coincidan con el criterio seleccionado.
        </td>
      </tr>
    `;
    return;
  }

  DOM.adminTableBody.innerHTML = filtered.map(item => {
    let statusBadge = '';
    if (item.estado === 'FINALIZADO') {
      statusBadge = `<span class="badge badge-success"><span class="badge-dot"></span>FINALIZADO</span>`;
    } else if (item.estado === 'EN_CURSO') {
      statusBadge = `<span class="badge badge-info"><span class="badge-dot"></span>EN CURSO</span>`;
    } else {
      statusBadge = `<span class="badge badge-danger"><span class="badge-dot"></span>BLOQUEADO</span>`;
    }

    const answersCount = item.respuestas ? Object.keys(item.respuestas).filter(k => item.respuestas[k]).length : 0;
    const isResetEligible = item.estado === 'BLOQUEADO' || item.estado === 'EN_CURSO';

    return `
      <tr data-cedula="${item.cedula}">
        <td>${formatDate(item.fecha)}</td>
        <td>
          <div class="candidate-cell">
            <span class="candidate-cell-name">${escapeHtml(item.nombre)}</span>
            <span class="candidate-cell-cedula">${answersCount} / ${TOTAL_QUESTIONS_COUNT} respuestas</span>
          </div>
        </td>
        <td><strong>${escapeHtml(item.cedula)}</strong></td>
        <td>${statusBadge}</td>
        <td>
          ${item.motivo_bloqueo
            ? `<span class="reason-tag">${escapeHtml(item.motivo_bloqueo)}</span>`
            : `<span class="text-muted text-xs">Sin incidencias</span>`
          }
        </td>
        <td class="text-right">
          <div class="table-actions">
            <button type="button" class="btn btn-secondary btn-sm btn-view-responses" data-cedula="${item.cedula}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <span>Ver Respuestas</span>
            </button>
            ${isResetEligible ? `
              <button type="button" class="btn btn-secondary btn-sm btn-reset-candidate" data-cedula="${item.cedula}" data-name="${escapeHtml(item.nombre)}" title="Desbloquear o permitir repetir prueba">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2.5 2v6h6M21.5 22v-6h-6"/><path d="M22 11.5A10 10 0 0 0 3.2 7.2M2 12.5a10 10 0 0 0 18.8 4.3"/></svg>
                <span>Desbloquear</span>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Asociar eventos a los botones generados
  attachAdminTableActions();
}

function attachAdminTableActions() {
  document.querySelectorAll('.btn-view-responses').forEach(btn => {
    btn.addEventListener('click', () => {
      const cedula = btn.getAttribute('data-cedula');
      openResponsesModal(cedula);
    });
  });

  document.querySelectorAll('.btn-reset-candidate').forEach(btn => {
    btn.addEventListener('click', () => {
      const cedula = btn.getAttribute('data-cedula');
      const name = btn.getAttribute('data-name');
      openConfirmResetModal(cedula, name);
    });
  });
}

function openResponsesModal(cedula) {
  const candidate = AppState.adminData.find(c => c.cedula === cedula);
  if (!candidate) return;

  DOM.modalCandidateNameTitle.textContent = candidate.nombre;
  DOM.modalCandidateMetaInfo.textContent = `Cédula: ${candidate.cedula} | Estado: ${candidate.estado} | Fecha: ${formatDate(candidate.fecha)}`;

  const answers = candidate.respuestas || {};

  // Agrupar preguntas por sección
  const sections = {};
  Object.keys(EXAM_QUESTIONS_MAP).forEach(qKey => {
    const meta = EXAM_QUESTIONS_MAP[qKey];
    if (!sections[meta.section]) {
      sections[meta.section] = [];
    }
    sections[meta.section].push({
      key: qKey,
      title: meta.title,
      answer: answers[qKey] || ''
    });
  });

  let html = '';
  Object.keys(sections).forEach(sectionTitle => {
    html += `
      <div class="response-section-block">
        <div class="response-section-header">${escapeHtml(sectionTitle)}</div>
    `;

    sections[sectionTitle].forEach(item => {
      const hasAnswer = item.answer && item.answer.trim().length > 0;
      html += `
        <div class="response-item-row">
          <div class="response-q-title">${escapeHtml(item.title)}</div>
          <div class="response-q-answer ${hasAnswer ? '' : 'empty'}">
            ${hasAnswer ? escapeHtml(item.answer) : '[Sin respuesta registrada por el candidato]'}
          </div>
        </div>
      `;
    });

    html += `</div>`;
  });

  DOM.modalResponsesContent.innerHTML = html;
  DOM.responsesModal.classList.remove('hidden');
}

function openConfirmResetModal(cedula, name) {
  candidateToReset = { cedula, name };
  DOM.resetTargetName.textContent = name;
  DOM.resetTargetCedula.textContent = cedula;
  DOM.confirmResetModal.classList.remove('hidden');
}

async function executeCandidateReset() {
  if (!candidateToReset) return;

  const { cedula } = candidateToReset;
  try {
    await DatabaseService.deleteCandidate(cedula);

    // Si coincide con la sesión actual, limpiar bloqueo de sessionStorage
    if (sessionStorage.getItem('LP_BLOCKED_CEDULA') === cedula) {
      sessionStorage.removeItem('LP_BLOCKED_CEDULA');
      sessionStorage.removeItem('LP_BLOCKED_REASON');
      sessionStorage.removeItem('LP_BLOCKED_NAME');
      sessionStorage.removeItem('LP_BLOCKED_TIMESTAMP');
    }
    sessionStorage.removeItem(`LP_EXAM_START_${cedula}`);

    showToast('Candidato Reiniciado', `Se ha restablecido el registro para la cédula ${cedula}. Ya puede volver a ingresar.`, 'success');
    DOM.confirmResetModal.classList.add('hidden');
    candidateToReset = null;
    loadAdminData();
  } catch (err) {
    console.error('Error al resetear candidato:', err);
    showToast('Error', 'No fue posible resetear el registro.', 'error');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==============================================================================
// 13. CONFIGURACIÓN MODAL DE CREDENCIALES
// ==============================================================================
function initConfigModal() {
  if (DOM.btnOpenConfigModal) {
    DOM.btnOpenConfigModal.addEventListener('click', () => {
      DOM.cfgSupabaseUrl.value = localStorage.getItem('LP_SUPABASE_URL') || '';
      DOM.cfgSupabaseKey.value = localStorage.getItem('LP_SUPABASE_KEY') || '';
      DOM.configModal.classList.remove('hidden');
    });
  }

  const closeConfig = () => DOM.configModal.classList.add('hidden');
  if (DOM.btnCloseConfig) DOM.btnCloseConfig.addEventListener('click', closeConfig);
  if (DOM.btnCancelConfig) DOM.btnCancelConfig.addEventListener('click', closeConfig);

  if (DOM.btnSaveConfig) {
    DOM.btnSaveConfig.addEventListener('click', () => {
      const url = DOM.cfgSupabaseUrl.value.trim();
      const key = DOM.cfgSupabaseKey.value.trim();

      if (url && key) {
        localStorage.setItem('LP_SUPABASE_URL', url);
        localStorage.setItem('LP_SUPABASE_KEY', key);
        SUPABASE_CONFIG.url = url;
        SUPABASE_CONFIG.anonKey = key;
        initSupabase();
        showToast('Conectado', 'Credenciales de Supabase actualizadas y guardadas con éxito.', 'success');
        closeConfig();
        loadAdminData();
      } else {
        showToast('Atención', 'Por favor diligencie tanto la URL como la Anon Key.', 'warning');
      }
    });
  }
}

// ==============================================================================
// 14. INICIALIZADOR GENERAL
// ==============================================================================
function initApp() {
  // 1. Inicializar Supabase
  initSupabase();

  // 2. Comprobar parámetro de URL para Vista Administrador (?admin=paola2026)
  const urlParams = new URLSearchParams(window.location.search);
  const isAdminView = urlParams.get('admin') === 'paola2026';

  if (isAdminView) {
    console.log('🔑 Acceso concedido a Vista Administrador para Paola.');
    hideAllViews();
    DOM.viewAdmin.classList.remove('hidden');

    // Inicializar listeners del panel de administración
    DOM.btnRefreshAdminTable.addEventListener('click', loadAdminData);

    DOM.adminSearchInput.addEventListener('input', (e) => {
      AppState.adminSearchQuery = e.target.value.trim();
      renderAdminDashboard();
    });

    DOM.filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        DOM.filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        AppState.adminFilter = pill.getAttribute('data-filter');
        renderAdminDashboard();
      });
    });

    // Modales de Admin
    DOM.btnCloseResponsesModal.addEventListener('click', () => DOM.responsesModal.classList.add('hidden'));
    DOM.btnDoneViewingResponses.addEventListener('click', () => DOM.responsesModal.classList.add('hidden'));
    DOM.btnExportResponses.addEventListener('click', () => window.print());

    DOM.btnCancelReset.addEventListener('click', () => {
      DOM.confirmResetModal.classList.add('hidden');
      candidateToReset = null;
    });
    DOM.btnConfirmReset.addEventListener('click', executeCandidateReset);

    initConfigModal();
    loadAdminData();

    // Actualización automática cada 15 segundos en panel admin
    setInterval(loadAdminData, 15000);
    return;
  }

  // 3. Vista Candidato: Comprobar bloqueo previo en sesión
  const blockedCedula = sessionStorage.getItem('LP_BLOCKED_CEDULA');
  if (blockedCedula) {
    renderBlockedView({
      nombre: sessionStorage.getItem('LP_BLOCKED_NAME'),
      cedula: blockedCedula,
      motivo_bloqueo: sessionStorage.getItem('LP_BLOCKED_REASON'),
      fecha: sessionStorage.getItem('LP_BLOCKED_TIMESTAMP')
    });
    return;
  }

  // 4. Iniciar en Vista de Identificación
  hideAllViews();
  DOM.viewIdentification.classList.remove('hidden');

  // Listeners de Login Candidato
  DOM.candidateLoginForm.addEventListener('submit', handleCandidateLogin);

  // Formatear cédula en tiempo real para solo permitir dígitos
  DOM.candidateCedula.addEventListener('input', (e) => {
    e.target.value = sanitizeCedula(e.target.value);
  });

  // Listeners del Formulario de Examen (Autoguardado y Progreso)
  if (DOM.technicalExamForm) {
    DOM.technicalExamForm.addEventListener('input', () => {
      triggerAutosave();
      updateProgress();
    });
  }

  // Botón de Enviar Examen
  if (DOM.btnSubmitExam) {
    DOM.btnSubmitExam.addEventListener('click', () => handleSubmitExam(false));
  }
}

// Iniciar al cargar el DOM
document.addEventListener('DOMContentLoaded', initApp);
