/**
 * ==============================================================================
 * LOZADA & PARTNERS SAS - Área de Recursos Humanos
 * Sistema de Evaluación Técnica para Especialista de Nómina con Antifraude Estricto
 * Versión: 2.1.0 (Enterprise Secured & Blindada)
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

// NOTA DE CIBERSEGURIDAD:
// El Solucionario Oficial confidencial y el motor de evaluación residen 100% protegidos
// en el servidor Vercel (/api/grade). Ninguna respuesta ni criterio viaja al código del cliente.

// ==============================================================================
// 3. ESTADO DE LA APLICACIÓN
// ==============================================================================
const AppState = {
  currentCandidate: null,
  candidateMeta: null,
  isExamActive: false,
  isBlocked: false,
  autosaveTimer: null,
  adminData: [],
  adminFilter: 'ALL',
  adminSearchQuery: '',
  currentGradingCedula: null,
  showAnswerKeyInModal: true,
  adminAnswerKey: null // Entregado dinámicamente solo a Paola tras autenticación segura
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
  candidateNombres: document.getElementById('candidateNombres'),
  candidateApellidos: document.getElementById('candidateApellidos'),
  candidateCedula: document.getElementById('candidateCedula'),
  candidateEmail: document.getElementById('candidateEmail'),
  candidateBirthDate: document.getElementById('candidateBirthDate'),
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
  liveGradingScore: document.getElementById('liveGradingScore'),
  btnAutoGradeCandidate: document.getElementById('btnAutoGradeCandidate'),
  btnToggleAnswerKey: document.getElementById('btnToggleAnswerKey'),
  labelToggleAnswerKey: document.getElementById('labelToggleAnswerKey'),
  btnSaveGrading: document.getElementById('btnSaveGrading'),

  confirmResetModal: document.getElementById('confirmResetModal'),
  confirmModalTitle: document.getElementById('confirmModalTitle'),
  confirmModalSubtitle: document.getElementById('confirmModalSubtitle'),
  confirmModalIconBox: document.getElementById('confirmModalIconBox'),
  resetTargetName: document.getElementById('resetTargetName'),
  resetTargetCedula: document.getElementById('resetTargetCedula'),
  btnCancelReset: document.getElementById('btnCancelReset'),
  btnConfirmReset: document.getElementById('btnConfirmReset'),

  // Login de Administrador (Paola)
  btnOpenAdminLogin: document.getElementById('btnOpenAdminLogin'),
  adminLoginModal: document.getElementById('adminLoginModal'),
  btnCloseAdminLogin: document.getElementById('btnCloseAdminLogin'),
  btnCancelAdminLogin: document.getElementById('btnCancelAdminLogin'),
  adminLoginForm: document.getElementById('adminLoginForm'),
  adminUsernameInput: document.getElementById('adminUsernameInput'),
  adminPasswordInput: document.getElementById('adminPasswordInput'),
  adminLoginError: document.getElementById('adminLoginError'),
  btnAdminLogout: document.getElementById('btnAdminLogout'),

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
// 6. CAPA DE DATOS Y SERVICIOS BLINDADOS (BACKEND VERCEL + SUPABASE PROTEGIDO)
// ==============================================================================
const DatabaseService = {
  // 1. Acciones seguras del candidato mediadas por /api/candidate
  async candidateAction(action, payload) {
    try {
      const res = await fetch('/api/candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload })
      });
      if (res.ok) {
        return await res.json();
      }
      if (res.status === 404) {
        return null; // Modo fallback sin servidor local
      }
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Error ${res.status}`);
    } catch (err) {
      console.warn(`[ApiService] /api/candidate (${action}) fallback local:`, err);
      return null;
    }
  },

  // 2. Consulta de candidatos para Paola (Solo con token administrativo HMAC)
  async getAllCandidates() {
    const token = sessionStorage.getItem('LP_ADMIN_TOKEN');
    if (token) {
      try {
        const res = await fetch('/api/admin-data', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          return json.candidates || [];
        }
        if (res.status === 401) {
          sessionStorage.removeItem('LP_ADMIN_AUTH');
          sessionStorage.removeItem('LP_ADMIN_TOKEN');
          closeAdminPanel();
          showToast('Sesión Expirada', 'Su sesión de Recursos Humanos ha expirado. Ingrese nuevamente.', 'warning');
          return [];
        }
      } catch (err) {
        console.warn('Fallo /api/admin-data, intentando fallback:', err);
      }
    }

    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('pruebas_nomina')
          .select('*')
          .order('fecha', { ascending: false });
        if (!error && data) return data;
      } catch (e) {
        console.warn(e);
      }
    }
    return LocalStorageDB.getAll();
  },

  // 3. Eliminar candidato (Solo con token administrativo HMAC)
  async deleteCandidate(cedula) {
    const token = sessionStorage.getItem('LP_ADMIN_TOKEN');
    if (token) {
      try {
        const res = await fetch(`/api/admin-data?cedula=${encodeURIComponent(cedula)}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          LocalStorageDB.deleteByCedula(cedula);
          return true;
        }
      } catch (err) {
        console.warn('Fallo /api/admin-data delete:', err);
      }
    }

    if (supabaseClient) {
      try {
        await supabaseClient.from('pruebas_nomina').delete().eq('cedula', cedula);
      } catch (e) {
        console.warn(e);
      }
    }
    LocalStorageDB.deleteByCedula(cedula);
    return true;
  },

  // 4. Servicio Confidencial de Calificación y Solucionario (/api/grade)
  async getOrSaveGrade(cedula, answers, customGrades = null, save = false) {
    const token = sessionStorage.getItem('LP_ADMIN_TOKEN');
    if (!token) throw new Error('Token administrativo no encontrado');

    const res = await fetch('/api/grade', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ cedula, answers, customGrades, save })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Error ${res.status}`);
    }
    return await res.json();
  },

  // Fallbacks de compatibilidad
  async getByCedula(cedula) {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('pruebas_nomina')
          .select('*')
          .eq('cedula', cedula)
          .maybeSingle();
        if (!error && data) return data;
      } catch (err) {
        console.warn(err);
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
        if (!error && data) return data;
      } catch (err) {
        console.warn(err);
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
        if (!error && data && data[0]) return data[0];
      } catch (err) {
        console.warn(err);
      }
    }
    return LocalStorageDB.updateByCedula(cedula, updates);
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

    // 2. Guardar estado de bloqueo mediante API segura del servidor
    try {
      const serverBlock = await DatabaseService.candidateAction('block', {
        cedula: candidateCedula,
        reason: reason,
        answers: partialAnswers
      });
      if (!serverBlock) {
        await DatabaseService.updateCandidate(candidateCedula, {
          estado: 'BLOQUEADO',
          motivo_bloqueo: reason,
          respuestas: partialAnswers
        });
      }
    } catch (err) {
      console.error('Error al actualizar bloqueo:', err);
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
  if (AppState.candidateMeta) {
    answers._candidato = AppState.candidateMeta;
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
      const serverSave = await DatabaseService.candidateAction('autosave', {
        cedula: AppState.currentCandidate.cedula,
        answers: currentAnswers
      });
      if (!serverSave) {
        await DatabaseService.updateCandidate(AppState.currentCandidate.cedula, {
          respuestas: currentAnswers
        });
      }
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

function startExamView(candidate, existingAnswers = {}, remainingSeconds = null) {
  hideAllViews();
  AppState.currentCandidate = candidate;
  AppState.isExamActive = true;
  AppState.isBlocked = false;

  // Restaurar metadatos del candidato si existían en respuestas
  if (existingAnswers && existingAnswers._candidato) {
    AppState.candidateMeta = existingAnswers._candidato;
  } else if (candidate.respuestas && candidate.respuestas._candidato) {
    AppState.candidateMeta = candidate.respuestas._candidato;
  }

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

  // Iniciar temporizador sincronizado con el servidor
  let startTimeToUse = null;
  if (typeof remainingSeconds === 'number') {
    startTimeToUse = Date.now() - ((ExamTimer.TOTAL_DURATION_SECONDS - remainingSeconds) * 1000);
  } else {
    startTimeToUse = (existingAnswers && existingAnswers._exam_start_time)
      || (candidate.respuestas && candidate.respuestas._exam_start_time)
      || null;
  }
  ExamTimer.init(candidate.cedula, startTimeToUse);

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

  const nombres = DOM.candidateNombres ? DOM.candidateNombres.value.trim() : '';
  const apellidos = DOM.candidateApellidos ? DOM.candidateApellidos.value.trim() : '';
  const cedula = DOM.candidateCedula ? sanitizeCedula(DOM.candidateCedula.value) : '';
  const email = DOM.candidateEmail ? DOM.candidateEmail.value.trim() : '';
  const birthDate = DOM.candidateBirthDate ? DOM.candidateBirthDate.value.trim() : '';

  if (!nombres || nombres.length < 2) {
    showToast('Validación', 'Por favor ingrese sus nombres completos.', 'warning');
    if (DOM.candidateNombres) DOM.candidateNombres.focus();
    return;
  }

  if (!apellidos || apellidos.length < 2) {
    showToast('Validación', 'Por favor ingrese sus apellidos completos.', 'warning');
    if (DOM.candidateApellidos) DOM.candidateApellidos.focus();
    return;
  }

  if (!cedula || cedula.length < 6) {
    showToast('Validación', 'La cédula debe contener al menos 6 dígitos numéricos sin puntos ni espacios.', 'warning');
    if (DOM.candidateCedula) DOM.candidateCedula.focus();
    return;
  }

  // Validación de Correo Electrónico
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    showToast('Validación', 'Por favor ingrese un correo electrónico válido.', 'warning');
    if (DOM.candidateEmail) DOM.candidateEmail.focus();
    return;
  }

  // Validación de Fecha de Nacimiento
  if (!birthDate) {
    showToast('Validación', 'Por favor seleccione su fecha de nacimiento.', 'warning');
    if (DOM.candidateBirthDate) DOM.candidateBirthDate.focus();
    return;
  }

  if (!DOM.acceptSupervisionCheck || !DOM.acceptSupervisionCheck.checked) {
    const box = document.getElementById('securityWarningBox');
    if (box) {
      box.classList.remove('shake-attention');
      void box.offsetWidth;
      box.classList.add('shake-attention');
      box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    showToast(
      'Casilla Obligatoria Requerida',
      'Debe marcar la casilla confirmando que leyó las normas y prohibiciones (incluyendo la prohibición estricta de clic derecho y cambio de pestaña) para poder comenzar la prueba.',
      'warning'
    );
    if (DOM.acceptSupervisionCheck) DOM.acceptSupervisionCheck.focus();
    return;
  }

  const fullName = `${nombres} ${apellidos}`;
  const candidateInfo = {
    nombres,
    apellidos,
    cedula,
    correo: email,
    fecha_nacimiento: birthDate,
    terminos_aceptados: true,
    fecha_aceptacion_terminos: new Date().toISOString()
  };
  AppState.candidateMeta = candidateInfo;

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

  // 2. Consultar el estado en el backend seguro /api/candidate
  showToast('Verificando', 'Validando identidad y estado de evaluación...', 'info');

  try {
    const serverCheck = await DatabaseService.candidateAction('check-or-start', {
      cedula,
      nombre: fullName,
      meta: candidateInfo
    });

    if (serverCheck) {
      if (serverCheck.status === 'BLOQUEADO') {
        sessionStorage.setItem('LP_BLOCKED_CEDULA', serverCheck.cedula);
        sessionStorage.setItem('LP_BLOCKED_REASON', serverCheck.motivo);
        sessionStorage.setItem('LP_BLOCKED_NAME', serverCheck.nombre);
        sessionStorage.setItem('LP_BLOCKED_TIMESTAMP', serverCheck.fecha);
        renderBlockedView(serverCheck);
        return;
      }

      if (serverCheck.status === 'FINALIZADO') {
        showToast('Prueba Ya Presentada', 'Usted ya completó y envió esta evaluación anteriormente.', 'warning');
        renderFinishedView(serverCheck);
        return;
      }

      if (serverCheck.status === 'EN_CURSO') {
        if (serverCheck.resuming) {
          showToast('Reanudando', 'Continuando examen en progreso...', 'info');
        }
        startExamView({
          nombre: serverCheck.nombre || fullName,
          cedula: serverCheck.cedula || cedula
        }, serverCheck.respuestas || {}, serverCheck.remainingSeconds);
        return;
      }
    }

    // Fallback local si la API estuviera desconectada
    const existing = await DatabaseService.getByCedula(cedula);

    if (existing) {
      if (existing.estado === 'BLOQUEADO') {
        renderBlockedView(existing);
        return;
      }
      if (existing.estado === 'FINALIZADO') {
        showToast('Prueba Ya Presentada', 'Usted ya completó y envió esta evaluación anteriormente.', 'warning');
        renderFinishedView(existing);
        return;
      }
      if (existing.estado === 'EN_CURSO') {
        startExamView(existing, existing.respuestas || {});
        return;
      }
    }

    const newRecord = {
      nombre: fullName,
      cedula: cedula,
      estado: 'EN_CURSO',
      motivo_bloqueo: null,
      respuestas: { _candidato: candidateInfo }
    };
    const saved = await DatabaseService.insertCandidate(newRecord);
    startExamView(saved || newRecord);

  } catch (err) {
    console.error('Error al procesar inicio de candidato:', err);
    showToast('Error', 'No se pudo conectar con el sistema de evaluación. Intente nuevamente.', 'error');
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
    const serverSubmit = await DatabaseService.candidateAction('submit', {
      cedula: candidateCedula,
      answers: currentAnswers
    });

    if (!serverSubmit) {
      await DatabaseService.updateCandidate(candidateCedula, {
        estado: 'FINALIZADO',
        respuestas: currentAnswers
      });
    }

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

    const candidateMeta = (item.respuestas && item.respuestas._candidato) ? item.respuestas._candidato : {};
    const email = candidateMeta.correo || '';
    const birth = candidateMeta.fecha_nacimiento || '';

    const gradingData = (item.respuestas && item.respuestas._calificacion) ? item.respuestas._calificacion : null;
    let scorePillHtml = '';
    if (gradingData && typeof gradingData.porcentaje === 'number') {
      const pct = gradingData.porcentaje;
      const pillClass = pct >= 75 ? 'high' : (pct >= 50 ? 'mid' : 'low');
      scorePillHtml = `<div style="margin-top:6px;"><span class="score-pill-table ${pillClass}">⭐ Calificación: ${pct}% (${gradingData.puntos}/38)</span></div>`;
    }

    const isResetEligible = item.estado === 'BLOQUEADO' || item.estado === 'EN_CURSO';

    return `
      <tr data-cedula="${item.cedula}">
        <td>${formatDate(item.fecha)}</td>
        <td>
          <div class="candidate-cell">
            <span class="candidate-cell-name">${escapeHtml(item.nombre)}</span>
            <span class="candidate-cell-cedula">C.C. <strong>${escapeHtml(item.cedula)}</strong></span>
            ${email ? `<span class="candidate-cell-sub">✉️ ${escapeHtml(email)}</span>` : ''}
            ${birth ? `<span class="candidate-cell-sub">🎂 F. Nac: ${escapeHtml(birth)}</span>` : ''}
          </div>
        </td>
        <td><strong>${escapeHtml(item.cedula)}</strong></td>
        <td>
          ${statusBadge}
          ${scorePillHtml}
        </td>
        <td>
          ${item.motivo_bloqueo
            ? `<span class="reason-tag">${escapeHtml(item.motivo_bloqueo)}</span>`
            : `<span class="text-muted text-xs">Sin incidencias</span>`
          }
        </td>
        <td class="text-right">
          <div class="table-actions">
            <button type="button" class="btn btn-secondary btn-sm btn-view-responses" data-cedula="${item.cedula}" title="Ver respuestas y calificar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <span>Ver / Calificar</span>
            </button>
            ${isResetEligible ? `
              <button type="button" class="btn btn-secondary btn-sm btn-reset-candidate" data-cedula="${item.cedula}" data-name="${escapeHtml(item.nombre)}" data-mode="unlock" title="Desbloquear y permitir presentar de nuevo">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2.5 2v6h6M21.5 22v-6h-6"/><path d="M22 11.5A10 10 0 0 0 3.2 7.2M2 12.5a10 10 0 0 0 18.8 4.3"/></svg>
                <span>Desbloquear</span>
              </button>
            ` : ''}
            <button type="button" class="btn btn-sm btn-delete-candidate" data-cedula="${item.cedula}" data-name="${escapeHtml(item.nombre)}" data-mode="delete" title="Eliminar este registro de candidato">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              <span>Eliminar</span>
            </button>
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

  document.querySelectorAll('.btn-reset-candidate, .btn-delete-candidate').forEach(btn => {
    btn.addEventListener('click', () => {
      const cedula = btn.getAttribute('data-cedula');
      const name = btn.getAttribute('data-name');
      const mode = btn.getAttribute('data-mode') || 'delete';
      openConfirmResetModal(cedula, name, mode);
    });
  });
}

// ==============================================================================
// 12. SISTEMA CONFIDENCIAL DE REVISIÓN Y SOLUCIONARIO (SOLO PARA PAOLA)
// Las respuestas oficiales y criterios se consultan en tiempo real a /api/grade
// protegiéndolos de cualquier candidato que inspeccione el código.
// ==============================================================================
async function openResponsesModal(cedula) {
  const candidate = AppState.adminData.find(c => c.cedula === cedula);
  if (!candidate) return;

  AppState.currentGradingCedula = cedula;

  const candidateMeta = (candidate.respuestas && candidate.respuestas._candidato) ? candidate.respuestas._candidato : {};
  const email = candidateMeta.correo || 'No registrado';
  const birthDate = candidateMeta.fecha_nacimiento || 'No registrada';

  DOM.modalCandidateNameTitle.textContent = candidate.nombre;
  DOM.modalCandidateMetaInfo.innerHTML = `
    <strong>C.C.:</strong> ${escapeHtml(candidate.cedula)} &nbsp;|&nbsp; 
    <strong>Correo:</strong> ${escapeHtml(email)} &nbsp;|&nbsp; 
    <strong>F. Nacimiento:</strong> ${escapeHtml(birthDate)} &nbsp;|&nbsp; 
    <strong>Estado:</strong> ${escapeHtml(candidate.estado)} &nbsp;|&nbsp; 
    <strong>Fecha:</strong> ${formatDate(candidate.fecha)}
  `;

  DOM.modalResponsesContent.innerHTML = `
    <div class="text-center py-12 text-muted">
      <div style="font-size:1.6rem; margin-bottom: 0.5rem;">🔒 Cargando Solucionario Oficial y Evaluación...</div>
      <p>Consultando de forma segura con el servidor confidencial de LOZADA &amp; PARTNERS SAS...</p>
    </div>
  `;
  DOM.responsesModal.classList.remove('hidden');

  const answers = candidate.respuestas || {};
  const savedGrades = (answers._calificacion && answers._calificacion.items) ? { ...answers._calificacion.items } : null;

  try {
    const data = await DatabaseService.getOrSaveGrade(cedula, answers, savedGrades, false);
    const evaluacion = data.evaluacion || {};
    const solucionario = data.solucionario || {};
    AppState.adminAnswerKey = solucionario;

    const activeGrades = savedGrades || (data.calificacion && data.calificacion.items) || {};

    if (DOM.labelToggleAnswerKey) {
      DOM.labelToggleAnswerKey.textContent = AppState.showAnswerKeyInModal
        ? 'Ocultar Solucionario Guía'
        : 'Mostrar Solucionario Guía';
    }

    const sections = {};
    Object.keys(EXAM_QUESTIONS_MAP).forEach(qKey => {
      const meta = EXAM_QUESTIONS_MAP[qKey];
      if (!sections[meta.section]) {
        sections[meta.section] = [];
      }
      const evalInfo = evaluacion[qKey] || {};
      sections[meta.section].push({
        key: qKey,
        title: meta.title,
        answer: answers[qKey] || '',
        guide: evalInfo.guide || solucionario[qKey] || '',
        grade: activeGrades[qKey] !== undefined ? activeGrades[qKey] : evalInfo.score,
        reason: evalInfo.reason || ''
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
        const g = item.grade;
        html += `
          <div class="response-item-row" data-qkey="${item.key}">
            <div class="response-q-title">${escapeHtml(item.title)}</div>
            <div class="response-q-answer ${hasAnswer ? '' : 'empty'}">
              ${hasAnswer ? escapeHtml(item.answer) : '[Sin respuesta registrada por el candidato]'}
            </div>
            <div class="answer-key-guide-box ${AppState.showAnswerKeyInModal ? '' : 'hidden'}">
              <strong>💡 Respuesta Esperada (Solucionario Oficial Confidencial):</strong>
              ${escapeHtml(item.guide)}
            </div>
            <div class="question-grade-controls" data-qkey="${item.key}">
              <span class="question-grade-label">Calificar pregunta:</span>
              <button type="button" class="btn-grade-opt grade-correct ${g === 1 ? 'active' : ''}" data-qkey="${item.key}" data-score="1">✅ Correcta (1.0)</button>
              <button type="button" class="btn-grade-opt grade-partial ${g === 0.5 ? 'active' : ''}" data-qkey="${item.key}" data-score="0.5">⚠️ Parcial (0.5)</button>
              <button type="button" class="btn-grade-opt grade-wrong ${g === 0 ? 'active' : ''}" data-qkey="${item.key}" data-score="0">❌ Incorrecta (0)</button>
              ${item.reason ? `<span class="auto-grade-tag">🤖 Sugerido: ${g} pts · <em>${escapeHtml(item.reason)}</em></span>` : ''}
            </div>
          </div>
        `;
      });

      html += `</div>`;
    });

    DOM.modalResponsesContent.innerHTML = html;

    DOM.modalResponsesContent.querySelectorAll('.btn-grade-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        const qKey = btn.getAttribute('data-qkey');
        const scoreVal = parseFloat(btn.getAttribute('data-score'));
        const parent = btn.closest('.question-grade-controls');

        if (btn.classList.contains('active')) {
          btn.classList.remove('active');
          delete activeGrades[qKey];
        } else {
          parent.querySelectorAll('.btn-grade-opt').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          activeGrades[qKey] = scoreVal;
        }

        updateModalGradingSummary(activeGrades);
      });
    });

    DOM.responsesModal._currentGrades = activeGrades;
    updateModalGradingSummary(activeGrades);
  } catch (err) {
    console.error('Error al consultar /api/grade:', err);
    DOM.modalResponsesContent.innerHTML = `
      <div class="text-center py-10 text-danger">
        <p><strong>Error de autenticación o comunicación segura:</strong> ${escapeHtml(err.message)}</p>
        <p class="text-xs text-muted mt-2">Asegúrese de haber iniciado sesión como administradora autorizada.</p>
      </div>
    `;
  }
}

async function autoGradeCurrentCandidate() {
  const cedula = AppState.currentGradingCedula;
  if (!cedula) return;
  await openResponsesModal(cedula);
  showToast('Auto-Calificación Actualizada', 'Respuestas reevaluadas con el solucionario confidencial.', 'info');
}

function updateModalGradingSummary(gradesMap) {
  if (!DOM.liveGradingScore) return;
  const keys = Object.keys(gradesMap || {});
  if (keys.length === 0) {
    DOM.liveGradingScore.textContent = 'Sin calificar (0 / 38)';
    return;
  }
  const totalPoints = keys.reduce((acc, k) => acc + (Number(gradesMap[k]) || 0), 0);
  const percentage = Math.round((totalPoints / TOTAL_QUESTIONS_COUNT) * 100);
  DOM.liveGradingScore.textContent = `${percentage}% (${totalPoints} / ${TOTAL_QUESTIONS_COUNT} pts · ${keys.length} evaluadas)`;
}

async function saveCandidateGrading() {
  const cedula = AppState.currentGradingCedula;
  if (!cedula) return;

  const candidate = AppState.adminData.find(c => c.cedula === cedula);
  if (!candidate) return;

  const gradesMap = DOM.responsesModal._currentGrades || {};
  const keys = Object.keys(gradesMap);
  const totalPoints = keys.reduce((acc, k) => acc + (Number(gradesMap[k]) || 0), 0);
  const percentage = Math.round((totalPoints / TOTAL_QUESTIONS_COUNT) * 100);

  try {
    if (DOM.btnSaveGrading) {
      DOM.btnSaveGrading.disabled = true;
      DOM.btnSaveGrading.textContent = 'Guardando en servidor...';
    }

    const res = await DatabaseService.getOrSaveGrade(cedula, candidate.respuestas, gradesMap, true);
    if (res && res.calificacion) {
      candidate.respuestas = {
        ...(candidate.respuestas || {}),
        _calificacion: res.calificacion
      };
    }
    renderAdminDashboard();
    showToast('Calificación Guardada', `Se guardó el puntaje de ${percentage}% (${totalPoints}/38) para ${candidate.nombre}.`, 'success');
  } catch (err) {
    console.error('Error al guardar calificación segura:', err);
    showToast('Error', `No se pudo guardar la calificación: ${err.message}`, 'error');
  } finally {
    if (DOM.btnSaveGrading) {
      DOM.btnSaveGrading.disabled = false;
      DOM.btnSaveGrading.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        <span>Guardar Calificación</span>
      `;
    }
  }
}

function openConfirmResetModal(cedula, name, mode = 'delete') {
  candidateToReset = { cedula, name, mode };
  DOM.resetTargetName.textContent = name;
  DOM.resetTargetCedula.textContent = cedula;

  if (mode === 'unlock') {
    if (DOM.confirmModalTitle) DOM.confirmModalTitle.textContent = '¿Desbloquear y Reiniciar Candidato?';
    if (DOM.confirmModalSubtitle) DOM.confirmModalSubtitle.textContent = 'Se restablecerá el registro actual para permitir que el candidato vuelva a presentar la evaluación desde cero.';
    if (DOM.btnConfirmReset) DOM.btnConfirmReset.textContent = 'Sí, Desbloquear y Reiniciar';
  } else {
    if (DOM.confirmModalTitle) DOM.confirmModalTitle.textContent = '¿Eliminar Registro de Candidato?';
    if (DOM.confirmModalSubtitle) DOM.confirmModalSubtitle.textContent = 'Esta acción eliminará permanentemente este registro de prueba de la base de datos de Recursos Humanos.';
    if (DOM.btnConfirmReset) DOM.btnConfirmReset.textContent = 'Sí, Eliminar Registro';
  }

  DOM.confirmResetModal.classList.remove('hidden');
}

async function executeCandidateReset() {
  if (!candidateToReset) return;

  const { cedula, name, mode } = candidateToReset;
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

    if (mode === 'unlock') {
      showToast('Candidato Desbloqueado', `Se ha restablecido el registro de ${name} (${cedula}). Ya puede volver a ingresar.`, 'success');
    } else {
      showToast('Registro Eliminado', `Se eliminó correctamente el registro de ${name} (${cedula}).`, 'success');
    }

    DOM.confirmResetModal.classList.add('hidden');
    candidateToReset = null;
    loadAdminData();
  } catch (err) {
    console.error('Error al eliminar/resetear candidato:', err);
    showToast('Error', 'No fue posible eliminar el registro.', 'error');
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
// 14. INICIALIZADOR GENERAL Y AUTENTICACIÓN ADMIN (PAOLA)
// ==============================================================================
let adminRefreshInterval = null;

function openAdminPanel() {
  console.log('🔑 Acceso concedido al Panel de Recursos Humanos para Paola.');
  hideAllViews();
  if (DOM.viewAdmin) {
    DOM.viewAdmin.classList.remove('hidden');
  }

  loadAdminData();

  if (!adminRefreshInterval) {
    adminRefreshInterval = setInterval(loadAdminData, 15000);
  }
}

function closeAdminPanel() {
  if (adminRefreshInterval) {
    clearInterval(adminRefreshInterval);
    adminRefreshInterval = null;
  }
  sessionStorage.removeItem('LP_ADMIN_AUTH');

  // Limpiar parámetro de URL si existía (?admin=...)
  if (window.location.search.includes('admin=')) {
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }

  hideAllViews();
  if (DOM.viewIdentification) {
    DOM.viewIdentification.classList.remove('hidden');
  }
  showToast('Sesión Cerrada', 'Ha salido del Panel de Recursos Humanos.', 'info');
}

function initAdminLoginModal() {
  if (DOM.btnOpenAdminLogin) {
    DOM.btnOpenAdminLogin.addEventListener('click', () => {
      if (DOM.adminLoginError) DOM.adminLoginError.classList.add('hidden');
      if (DOM.adminUsernameInput) DOM.adminUsernameInput.value = '';
      if (DOM.adminPasswordInput) DOM.adminPasswordInput.value = '';
      if (DOM.adminLoginModal) {
        DOM.adminLoginModal.classList.remove('hidden');
        setTimeout(() => {
          if (DOM.adminUsernameInput) DOM.adminUsernameInput.focus();
        }, 150);
      }
    });
  }

  // Atajo de teclado discreto para Paola: Ctrl + Shift + A
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      if (DOM.btnOpenAdminLogin) DOM.btnOpenAdminLogin.click();
    }
  });

  const closeLogin = () => {
    if (DOM.adminLoginModal) DOM.adminLoginModal.classList.add('hidden');
    if (DOM.adminLoginError) DOM.adminLoginError.classList.add('hidden');
  };

  if (DOM.btnCloseAdminLogin) DOM.btnCloseAdminLogin.addEventListener('click', closeLogin);
  if (DOM.btnCancelAdminLogin) DOM.btnCancelAdminLogin.addEventListener('click', closeLogin);

  if (DOM.adminLoginForm) {
    DOM.adminLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const usr = DOM.adminUsernameInput ? DOM.adminUsernameInput.value.trim().toLowerCase() : '';
      const pwd = DOM.adminPasswordInput ? DOM.adminPasswordInput.value.trim() : '';

      if (!usr || !pwd) {
        if (DOM.adminLoginError) {
          const errSpan = DOM.adminLoginError.querySelector('span');
          if (errSpan) errSpan.textContent = 'Por favor ingrese su usuario y contraseña.';
          DOM.adminLoginError.classList.remove('hidden');
        }
        return;
      }

      const submitBtn = DOM.adminLoginForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verificando...';
      }

      try {
        const res = await fetch('/api/admin-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: usr, password: pwd })
        });
        const data = await res.json();

        if (res.ok && data.success && data.token) {
          sessionStorage.setItem('LP_ADMIN_AUTH', 'true');
          sessionStorage.setItem('LP_ADMIN_TOKEN', data.token);
          closeLogin();
          showToast('Bienvenida Paola', 'Acceso seguro al Panel de Recursos Humanos.', 'success');
          openAdminPanel();
        } else {
          // Fallback para desarrollo local si la API aún no está levantada
          if (res.status === 404 && (usr === 'paola' || usr === 'admin') && (pwd.toLowerCase() === 'paola2026' || pwd.toLowerCase() === 'paola')) {
            sessionStorage.setItem('LP_ADMIN_AUTH', 'true');
            closeLogin();
            showToast('Bienvenida Paola', 'Acceso local al Panel de Recursos Humanos.', 'success');
            openAdminPanel();
            return;
          }
          if (DOM.adminLoginError) {
            const errSpan = DOM.adminLoginError.querySelector('span');
            if (errSpan) errSpan.textContent = data.error || 'Credenciales inválidas. Acceso restringido.';
            DOM.adminLoginError.classList.remove('hidden');
          }
          if (DOM.adminPasswordInput) {
            DOM.adminPasswordInput.focus();
            DOM.adminPasswordInput.select();
          }
        }
      } catch (err) {
        console.error('Error al autenticar administrador:', err);
        if ((usr === 'paola' || usr === 'admin') && (pwd.toLowerCase() === 'paola2026' || pwd.toLowerCase() === 'paola')) {
          sessionStorage.setItem('LP_ADMIN_AUTH', 'true');
          closeLogin();
          openAdminPanel();
        } else {
          if (DOM.adminLoginError) DOM.adminLoginError.classList.remove('hidden');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Ingresar al Panel';
        }
      }
    });
  }

  if (DOM.btnAdminLogout) {
    DOM.btnAdminLogout.addEventListener('click', closeAdminPanel);
  }
}

function initApp() {
  // 1. Inicializar Supabase
  initSupabase();

  // 2. Inicializar listeners del panel de administración
  if (DOM.btnRefreshAdminTable) {
    DOM.btnRefreshAdminTable.addEventListener('click', loadAdminData);
  }

  if (DOM.adminSearchInput) {
    DOM.adminSearchInput.addEventListener('input', (e) => {
      AppState.adminSearchQuery = e.target.value.trim();
      renderAdminDashboard();
    });
  }

  if (DOM.filterPills) {
    DOM.filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        DOM.filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        AppState.adminFilter = pill.getAttribute('data-filter');
        renderAdminDashboard();
      });
    });
  }

  // Modales de Admin
  if (DOM.btnCloseResponsesModal) {
    DOM.btnCloseResponsesModal.addEventListener('click', () => DOM.responsesModal.classList.add('hidden'));
  }
  if (DOM.btnDoneViewingResponses) {
    DOM.btnDoneViewingResponses.addEventListener('click', () => DOM.responsesModal.classList.add('hidden'));
  }
  if (DOM.btnExportResponses) {
    DOM.btnExportResponses.addEventListener('click', () => window.print());
  }
  if (DOM.btnAutoGradeCandidate) {
    DOM.btnAutoGradeCandidate.addEventListener('click', autoGradeCurrentCandidate);
  }
  if (DOM.btnToggleAnswerKey) {
    DOM.btnToggleAnswerKey.addEventListener('click', () => {
      AppState.showAnswerKeyInModal = !AppState.showAnswerKeyInModal;
      if (DOM.labelToggleAnswerKey) {
        DOM.labelToggleAnswerKey.textContent = AppState.showAnswerKeyInModal
          ? 'Ocultar Solucionario Guía'
          : 'Mostrar Solucionario Guía';
      }
      document.querySelectorAll('.answer-key-guide-box').forEach(box => {
        if (AppState.showAnswerKeyInModal) {
          box.classList.remove('hidden');
        } else {
          box.classList.add('hidden');
        }
      });
    });
  }
  if (DOM.btnSaveGrading) {
    DOM.btnSaveGrading.addEventListener('click', saveCandidateGrading);
  }

  // Botones de activar/silenciar audio en videos corporativos
  document.querySelectorAll('.btn-video-sound').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-video-target');
      const videoEl = document.getElementById(targetId);
      if (!videoEl) return;
      videoEl.muted = !videoEl.muted;
      const label = btn.querySelector('.sound-label');
      if (label) {
        label.textContent = videoEl.muted ? 'Activar Audio' : 'Silenciar Audio';
      }
    });
  });

  if (DOM.btnCancelReset) {
    DOM.btnCancelReset.addEventListener('click', () => {
      DOM.confirmResetModal.classList.add('hidden');
      candidateToReset = null;
    });
  }
  if (DOM.btnConfirmReset) {
    DOM.btnConfirmReset.addEventListener('click', executeCandidateReset);
  }

  initAdminLoginModal();

  // 3. Comprobar si accede directamente por URL (?admin=paola2026) o ya tenía sesión activa
  const urlParams = new URLSearchParams(window.location.search);
  const isAdminUrl = urlParams.get('admin') === 'paola2026';
  const isAdminSession = sessionStorage.getItem('LP_ADMIN_AUTH') === 'true';

  if (isAdminUrl || isAdminSession) {
    sessionStorage.setItem('LP_ADMIN_AUTH', 'true');
    openAdminPanel();
    return;
  }

  // 4. Vista Candidato: Comprobar bloqueo previo en sesión
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

  // 5. Iniciar en Vista de Identificación
  hideAllViews();
  if (DOM.viewIdentification) {
    DOM.viewIdentification.classList.remove('hidden');
  }

  // Listeners de Login Candidato
  if (DOM.candidateLoginForm) {
    DOM.candidateLoginForm.addEventListener('submit', handleCandidateLogin);
  }

  // Listener para la casilla que se tacha / se marca (Aceptación de Normas)
  if (DOM.acceptSupervisionCheck) {
    DOM.acceptSupervisionCheck.addEventListener('change', (e) => {
      const box = document.getElementById('securityWarningBox');
      if (box) {
        if (e.target.checked) {
          box.classList.add('is-accepted');
          box.classList.remove('shake-attention');
        } else {
          box.classList.remove('is-accepted');
        }
      }
    });
  }

  // Bloqueo global de clic derecho en la plataforma (Antifraude)
  document.addEventListener('contextmenu', (e) => {
    // Si el examen está en curso, AntiFraudSystem ya lo maneja y anula la prueba de inmediato
    if (AppState.isExamActive) return;
    // Si Paola está autenticada y visualizando el panel de administración, permitimos clic normal
    if (sessionStorage.getItem('LP_ADMIN_AUTH') === 'true' && DOM.viewAdmin && !DOM.viewAdmin.classList.contains('hidden')) {
      return;
    }
    // En las vistas de postulantes (registro, instrucciones o finalizado)
    e.preventDefault();
    showToast(
      'Acción Prohibida',
      'El uso de clic derecho está estrictamente prohibido en esta plataforma por motivos de seguridad antifraude.',
      'warning'
    );
  });

  // Bloqueo de teclas de inspección de código para postulantes
  document.addEventListener('keydown', (e) => {
    if (AppState.isExamActive) return;
    if (sessionStorage.getItem('LP_ADMIN_AUTH') === 'true' && DOM.viewAdmin && !DOM.viewAdmin.classList.contains('hidden')) {
      return;
    }

    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    const key = (e.key || '').toUpperCase();

    // Atajo secreto de Paola (Ctrl + Shift + A) permitido
    if (e.ctrlKey && e.shiftKey && key === 'A') return;

    if (e.key === 'F12' || (isCtrlOrCmd && e.shiftKey && (key === 'I' || key === 'J' || key === 'C')) || (isCtrlOrCmd && key === 'U')) {
      e.preventDefault();
      showToast('Seguridad', 'Las herramientas de inspección de código están deshabilitadas en esta plataforma.', 'warning');
    }
  });

  // Formatear cédula en tiempo real para solo permitir dígitos
  if (DOM.candidateCedula) {
    DOM.candidateCedula.addEventListener('input', (e) => {
      e.target.value = sanitizeCedula(e.target.value);
    });
  }

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
