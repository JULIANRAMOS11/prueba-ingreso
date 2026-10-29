// ==============================================================================
// LOZADA & PARTNERS SAS - SERVICIO CONFIDENCIAL DE CALIFICACIÓN Y SOLUCIONARIO
// Endpoint: /api/grade
// Este archivo corre 100% en el servidor Vercel. Las respuestas oficiales NUNCA
// viajan al navegador del candidato.
// Vigencia Normativa Colombiana 2026:
// - SMMLV 2026: $1.750.905 | Auxilio de Transporte: $249.095 (2 SMMLV = $3.501.810)
// - Ley 2101 de 2021: Jornada 42h/sem -> Divisor 210h/mes (también valida 220h/230h/240h)
// - UVT 2026: $52.374 (Tope 1.340 UVT = $70.181.160 anuales)
// ==============================================================================
const { verifyAdminToken, querySupabaseAdmin } = require('./_utils');

// Solucionario Técnico Oficial sincronizado 100% con los casos de index.html (CONFIDENCIAL)
const SECRET_ANSWER_KEY = {
  // Sección 1: Liquidación de Nómina
  // Caso: Básico $3.500.000 | Comisiones $800.000 | 4 HED | 2 HEN | Aux. Transporte listado $249.095
  q1_1: 'Hora ordinaria ($3.500.000 / divisor): Base 210h (42h/sem Ley 2101 jul-2026) = $16.666,67 | Base 220h (44h) = $15.909,09 | Base 230h = $15.217,39 | Base 240h = $14.583,33.',
  q1_2: '4 Horas Extras Diurnas (+25%, factor 1,25): Base 210h = $83.333,33 ($20.833,33 c/u) | Base 220h = $79.545,45 | Base 230h = $76.086,96 | Base 240h = $72.916,67.',
  q1_3: '2 Horas Extras Nocturnas (+75%, factor 1,75): Base 210h = $58.333,33 ($29.166,67 c/u) | Base 220h = $55.681,82 | Base 230h = $53.260,87 | Base 240h = $51.041,67.',
  q1_4: 'Total Devengado: Criterio legal estricto (sin auxilio de transporte porque Salario + Comisiones = $4.300.000 supera 2 SMMLV [$3.501.810]): $4.441.667 (210h) | $4.435.227 (220h) | $4.423.958 (240h). Sumando auxilio del enunciado ($249.095): $4.690.762 (210h) | $4.684.322 (220h) | $4.673.053 (240h).',
  q1_5: 'IBC Seguridad Social (Salario $3.500.000 + Comisiones $800.000 + HED + HEN; excluye Auxilio de Transporte): Base 210h = $4.441.667 | Base 220h = $4.435.227 | Base 230h = $4.429.348 | Base 240h = $4.423.958.',
  q1_6: 'Descuentos Trabajador (4% Salud + 4% Pensión = 8% IBC; no aplica FSP porque IBC < 4 SMMLV [$7.003.620]): Base 210h: Salud $177.667 + Pensión $177.667 = Total $355.333 (Base 220h: $354.818 | Base 240h: $353.917).',
  q1_7: 'Neto a Pagar (Devengado - Deducciones): Sin auxilio (>2 SMMLV) = $4.086.333 (210h) / $4.080.409 (220h) / $4.070.042 (240h) | Con auxilio del caso = $4.335.428 (210h) / $4.329.504 (220h) / $4.319.137 (240h).',

  // Sección 2: Planilla PILA (basado en el trabajador de Sección 1)
  q2_1: 'IBC Seguridad Social en PILA: $4.441.667 (Base 210h, redondeado en PILA a $4.441.667 o $4.442.000) | $4.435.227 (220h) | $4.423.958 (240h). El auxilio de transporte jamás integra el IBC.',
  q2_2: 'Salud: Trabajador 4% = $177.667 (210h) / $177.409 (220h) / $176.958 (240h). Empleador 0% ($0) por exoneración del Art. 114-1 E.T. (< 10 SMMLV = $17.509.050). Sin exoneración empleador sería 8,5% ($377.542).',
  q2_3: 'Pensión (16% total): Empleador 12% ($533.000 en 210h | $532.227 en 220h | $530.875 en 240h) + Trabajador 4% ($177.667 en 210h) = Total Pensión $710.667 (210h) | $709.636 (220h) | $707.833 (240h).',
  q2_4: 'ARL Riesgo Clase I (0,522% a cargo 100% del empleador): Base 210h = $23.186 (PILA $23.200) | Base 220h = $23.152 | Base 240h = $23.093 (PILA $23.100).',
  q2_5: 'Parafiscales: Caja de Compensación (CCF 4%) = $177.667 (210h) / $177.409 (220h) / $176.958 (240h). SENA (2%) = $0 e ICBF (3%) = $0 por exoneración Art. 114-1 E.T. (< 10 SMMLV).',
  q2_6: 'Total Planilla PILA con exoneración Art. 114-1 (Salud 4% + Pensión 16% + ARL 0,522% + CCF 4% = 24,522% del IBC): Base 210h = $1.089.186 (PILA ~$1.089.300) | Base 220h = $1.087.606 | Base 240h = $1.084.843.',

  // Sección 3: Salario Integral ($25.000.000) y Topes ($42.000.000)
  q3_1: 'Factor Prestacional del Salario Integral ($25.000.000): Equivale al 30% del total = $7.500.000 (Factor salarial = 70% = $17.500.000; cumple mínimo legal 13 SMMLV 2026 = $22.761.765, Art. 132 CST).',
  q3_2: 'IBC Salario Integral (70% del salario integral según Ley 50/1990 Art. 18 y Ley 100/1993): $25.000.000 × 70% = $17.500.000.',
  q3_3: 'Descuentos del trabajador sobre IBC ($17.500.000): Salud 4% = $700.000 + Pensión 4% = $700.000 + FSP 1% (entre 4 y 16 SMMLV) = $175.000. Total trabajador = $1.575.000 (sin FSP: $1.400.000).',
  q3_4: 'Prima: NO (incluida en el 30% prestacional). Cesantías e intereses: NO (incluidas en el 30% prestacional). Recargos nocturnos/horas extras: Compensados en el factor prestacional del 30% y además por ser Director de Operaciones (cargo de dirección, confianza y manejo, Art. 162 CST) está excluido de horas extras.',
  q3_5: 'El tope máximo de cotización al Sistema de Seguridad Social Integral en Colombia es de 25 SMMLV (Art. 5 Ley 797 de 2003).',
  q3_6: 'En vigencia 2026 (SMMLV $1.750.905), el tope de 25 SMMLV es $43.772.625; como $42.000.000 es inferior al tope 2026, el IBC real es $42.000.000 (si era salario ordinario; si el candidato referencia 25 SMMLV 2025 [$35.587.500], aplica tope de $35.587.500).',
  q3_7: 'Aportes trabajador sobre IBC aplicable: En 2026 (IBC $42.000.000, >20 SMMLV -> FSP 2%): Salud 4% ($1.680.000) + Pensión 4% ($1.680.000) + FSP 2% ($840.000) = Total $4.200.000 (sobre tope 25 SMMLV 2026 [$43.772.625]: $1.750.905 + $1.750.905 + $875.453 = $4.377.263; sobre tope 2025 [$35.587.500]: $1.423.500 + $1.423.500 + $711.750 = $3.558.750).',

  // Sección 4: Pagos Salariales y No Salariales
  // Caso: Básico $4.200.000 | Bonif. cumplimiento $900.000 | Rodamiento $600.000 | Comisión comercial $700.000 | Bono bienestar no salarial $500.000
  q4_1: 'Constituyen salario (Art. 127 CST - retribuyen directamente el servicio/metas): Salario básico ($4.200.000) + Bonificación por cumplimiento ($900.000) + Comisión comercial ($700.000) = Total Salarial $5.800.000.',
  q4_2: 'NO constituyen salario (Art. 128 CST): Auxilio de rodamiento ($600.000, medio de transporte/trabajo) + Bono de bienestar no salarial ($500.000, mera liberalidad/pacto expreso) = Total No Salarial $1.100.000.',
  q4_3: 'IBC Seguridad Social (Art. 30 Ley 1393 de 2010): Total remuneración = $6.900.000. Límite 40% = $2.760.000. Como los pagos no salariales ($1.100.000 = 15,94%) NO superan el 40%, no hay exceso y el IBC es $5.800.000.',
  q4_4: 'Condiciones Art. 128 CST: 1) Que NO retribuya directamente el servicio individual del trabajador (herramienta de trabajo, mera liberalidad ocasional o beneficio extralegal), 2) Pacto expreso de desalarización por escrito (contrato u otrosí), 3) Respetar el límite del 40% para IBC (Ley 1393/2010).',

  // Sección 5: Retención en la Fuente (Salario $9.500.000 | AFC $700.000)
  q5_1: 'Mecanismo tributario de recaudo anticipado del impuesto sobre la renta que el empleador (agente retenedor) descuenta mensualmente de los pagos laborales gravables aplicando la tabla progresiva del Art. 383 E.T.',
  q5_2: '1) Ingresos no constitutivos de renta (aportes obligatorios Salud 4%, Pensión 4% y FSP 1%), 2) Deducciones Art. 387 E.T. (vivienda, medicina prepagada, dependientes), 3) Rentas exentas (aportes AFC/FPV como los $700.000 y el 25% de renta exenta laboral Art. 206 num. 10 E.T.).',
  q5_3: 'Beneficios tributarios: Aportes voluntarios a cuentas AFC o FPV (hasta 30% ingreso / 3.800 UVT año), intereses de vivienda (hasta 100 UVT/mes), medicina prepagada (hasta 16 UVT/mes) y dependientes económicos (10% hasta 32 UVT/mes).',
  q5_4: 'Límite global del 40% del ingreso neto (ingresos brutos menos INCRNGO), sin exceder 1.340 UVT anuales (~111,67 UVT/mes; en 2026 con UVT $52.374 equivale a $70.181.160 anuales) según Art. 336 y 388 E.T. (Ley 2277 de 2022).',

  // Sección 6: Cumplimiento UGPP (Salario $4.000.000 | Bono no salarial $2.800.000)
  q6_1: 'Incumplimiento del Art. 30 Ley 1393 de 2010 e inexactitud en PILA: Total devengado = $6.800.000; el bono ($2.800.000) equivale al 41,18%, superando el límite del 40% ($2.720.000) en $80.000 (IBC mínimo legal = $4.080.000), además del riesgo de recaracterización total ($6.800.000) por desalarización artificial.',
  q6_2: 'Principio de primacía de la realidad sobre las formas (Art. 53 C.P., Art. 127/128 CST y Acuerdo 1035 de 2015 UGPP): evalúa si retribuye directa o indirectamente el servicio/metas, habitualidad, periodicidad, soporte documental del pacto expreso y cumplimiento del tope del 40%.',
  q6_3: 'Requerimiento para declarar y/o corregir, Liquidación Oficial con reliquidación retroactiva de aportes (hasta 5 años), intereses moratorios a tasa tributaria/usura y sanciones por inexactitud del 35% al 60% (hasta 100%-200% según etapa).',
  q6_4: 'Parametrizar en nómina el control automático del tope del 40% (sumando los $80.000 de exceso al IBC), documentar acuerdos expresos del Art. 128 CST sin condicionamiento a desempeño individual y ejecutar auditorías preventivas Nómina vs. Contabilidad vs. PILA.',

  // Sección 7: Legislación Laboral
  q7_1: 'Es la base monetaria mensual conformada por los pagos salariales (más el exceso del 40% de pagos no salariales, Ley 1393/2010), entre 1 y 25 SMMLV, sobre la cual se liquidan los aportes a Salud, Pensión, ARL y Parafiscales.',
  q7_2: '4% para Salud y 4% para Pensión (total 8% a cargo del trabajador; adicionalmente entre 1% y 2% al Fondo de Solidaridad Pensional cuando el IBC es igual o superior a 4 SMMLV).',
  q7_3: '35% sobre el valor de la hora ordinaria diurna (Art. 168 CST; jornada nocturna desde las 7:00 p.m. hasta las 6:00 a.m. bajo la Reforma Laboral vigente en 2026 / antes 9:00 p.m. a 6:00 a.m.).',
  q7_4: '90% sobre el valor de la hora ordinaria vigente desde julio de 2026 por gradualidad de la Reforma Laboral (80% jul-2025, 90% jul-2026, 100% jul-2027), o 75% histórico del Art. 179 CST.',
  q7_5: 'La EPS (Entidad Promotora de Salud) paga las incapacidades de origen común del día 3 al día 180 (66,67% del día 3 al 90 y 50% del día 91 al 180, garantizando mínimo 1 SMMLV diario; los días 1 y 2 los asume el empleador).',
  q7_6: 'Trabajadores cuya remuneración mensual ordinaria sea de hasta dos (2) SMMLV ($3.501.810 en 2026), que residan a distancia que requiera transporte para acudir al trabajo y cuando el empleador no suministre el transporte.'
};

function hasAnyNumber(numClean, patterns) {
  return patterns.some(p => numClean.includes(p));
}

function evaluateSingleAnswer(qKey, rawAnswer) {
  if (!rawAnswer || typeof rawAnswer !== 'string') {
    return { score: 0, reason: 'Sin respuesta registrada' };
  }

  const text = rawAnswer.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (text.length < 2) {
    return { score: 0, reason: 'Respuesta vacía o muy breve' };
  }

  const numClean = text.replace(/[\.\,\$\s]/g, '');

  switch (qKey) {
    // -------------------------------------------------------------------------
    // SECCIÓN 1: LIQUIDACIÓN DE NÓMINA ($3.500.000 + $800.000 + 4 HED + 2 HEN)
    // -------------------------------------------------------------------------
    case 'q1_1': {
      if (hasAnyNumber(numClean, ['16666', '16667', '15909', '15217', '14583'])) {
        return { score: 1.0, reason: 'Cálculo exacto del valor de la hora ordinaria' };
      }
      if (hasAnyNumber(numClean, ['3500000']) && hasAnyNumber(numClean, ['210', '220', '230', '240'])) {
        return { score: 0.5, reason: 'Fórmula planteada correctamente ($3.500.000 / horas mes)' };
      }
      return { score: 0, reason: 'No coincide con el valor de hora ordinaria ($16.667 en 210h / $15.909 en 220h / $14.583 en 240h)' };
    }

    case 'q1_2': {
      if (hasAnyNumber(numClean, ['83333', '79545', '76086', '76087', '72916', '72917'])) {
        return { score: 1.0, reason: 'Cálculo exacto de 4 HED (+25%)' };
      }
      if (text.includes('25%') || text.includes('1.25') || text.includes('1,25') || hasAnyNumber(numClean, ['20833', '19886', '18229'])) {
        return { score: 0.5, reason: 'Identifica factor 1,25 (+25%) o valor unitario de HED' };
      }
      return { score: 0, reason: 'Valor de 4 horas extras diurnas no coincide' };
    }

    case 'q1_3': {
      if (hasAnyNumber(numClean, ['58333', '55681', '55682', '53260', '53261', '51041', '51042'])) {
        return { score: 1.0, reason: 'Cálculo exacto de 2 HEN (+75%)' };
      }
      if (text.includes('75%') || text.includes('1.75') || text.includes('1,75') || hasAnyNumber(numClean, ['29166', '29167', '27840', '25520'])) {
        return { score: 0.5, reason: 'Identifica factor 1,75 (+75%) o valor unitario de HEN' };
      }
      return { score: 0, reason: 'Valor de 2 horas extras nocturnas no coincide' };
    }

    case 'q1_4': {
      // Acepta tanto sin auxilio (>2 SMMLV: $4.441.667) como sumando el auxilio del enunciado ($4.690.762)
      if (hasAnyNumber(numClean, [
        '444166', '443522', '442934', '442395',
        '469076', '468432', '467844', '467305'
      ])) {
        return { score: 1.0, reason: 'Total devengado liquidado correctamente' };
      }
      if (hasAnyNumber(numClean, ['4300000', '4441', '4690', '4684', '4673'])) {
        return { score: 0.5, reason: 'Suma parcial cercana al total devengado' };
      }
      return { score: 0, reason: 'Total devengado incorrecto' };
    }

    case 'q1_5': {
      if (hasAnyNumber(numClean, ['444166', '4442000', '443522', '4436000', '442934', '442395', '4424000'])) {
        return { score: 1.0, reason: 'IBC exacto (incluye básico, comisiones y extras; excluye auxilio)' };
      }
      if (hasAnyNumber(numClean, ['4300000']) || text.includes('sin auxilio') || text.includes('no incluye auxilio') || text.includes('excluye')) {
        return { score: 0.5, reason: 'Identifica exclusión del auxilio de transporte pero IBC incompleto' };
      }
      return { score: 0, reason: 'IBC incorrecto' };
    }

    case 'q1_6': {
      if (hasAnyNumber(numClean, ['35533', '355400', '35481', '355000', '35434', '35391', '354000']) ||
          (hasAnyNumber(numClean, ['17766', '177700', '17740', '17717', '17695']) && text.includes('salud') && text.includes('pension'))) {
        return { score: 1.0, reason: 'Descuentos del trabajador (4% Salud y 4% Pensión) exactos' };
      }
      if (text.includes('4%') || hasAnyNumber(numClean, ['17766', '17740', '17695', '172000', '344000'])) {
        return { score: 0.5, reason: 'Aplica porcentaje del 4% con base parcial' };
      }
      return { score: 0, reason: 'Descuentos de salud y pensión incorrectos' };
    }

    case 'q1_7': {
      if (hasAnyNumber(numClean, [
        '408633', '408626', '408040', '407500', '407004',
        '433542', '433536', '432950', '432409', '431913'
      ])) {
        return { score: 1.0, reason: 'Neto a pagar exacto' };
      }
      if (hasAnyNumber(numClean, ['4086', '4080', '4070', '4335', '4329', '4319'])) {
        return { score: 0.5, reason: 'Neto a pagar aproximado' };
      }
      return { score: 0, reason: 'Neto a pagar incorrecto' };
    }

    // -------------------------------------------------------------------------
    // SECCIÓN 2: APORTES A SEGURIDAD SOCIAL (PLANILLA PILA)
    // -------------------------------------------------------------------------
    case 'q2_1': {
      if (hasAnyNumber(numClean, ['444166', '4442000', '443522', '4436000', '442934', '442395', '4424000'])) {
        return { score: 1.0, reason: 'IBC para PILA exacto' };
      }
      if (text.includes('sin auxilio') || text.includes('no incluye') || hasAnyNumber(numClean, ['4300000'])) {
        return { score: 0.5, reason: 'Excluye auxilio de transporte pero monto parcial' };
      }
      return { score: 0, reason: 'IBC de PILA incorrecto' };
    }

    case 'q2_2': {
      const hasWorker = text.includes('4%') || hasAnyNumber(numClean, ['17766', '177700', '17740', '17717', '17695']);
      const hasExon = text.includes('exonerad') || text.includes('0%') || text.includes('114-1') || text.includes('114') || text.includes('no aporta');
      if (hasWorker && hasExon) {
        return { score: 1.0, reason: '4% trabajador y empleador exonerado (0%) por Art. 114-1 E.T.' };
      }
      if (hasWorker || hasExon || text.includes('8.5%') || text.includes('8,5%')) {
        return { score: 0.5, reason: 'Calcula salud pero omite detallar exoneración Art. 114-1 E.T. o cuota trabajador' };
      }
      return { score: 0, reason: 'Aportes de salud en PILA incorrectos' };
    }

    case 'q2_3': {
      const hasTotal = hasAnyNumber(numClean, ['71066', '710700', '70963', '709700', '70869', '70783', '707900']);
      const hasParts = (text.includes('12%') || hasAnyNumber(numClean, ['533000', '53222', '53152', '53087'])) &&
                       (text.includes('4%') || hasAnyNumber(numClean, ['17766', '17740', '17717', '17695']));
      if (hasTotal || hasParts) {
        return { score: 1.0, reason: 'Pensión 16% correcta (12% empleador + 4% trabajador)' };
      }
      if (text.includes('12%') || text.includes('16%') || text.includes('4%')) {
        return { score: 0.5, reason: 'Porcentajes correctos de pensión con cálculo parcial' };
      }
      return { score: 0, reason: 'Aportes de pensión incorrectos' };
    }

    case 'q2_4': {
      if (hasAnyNumber(numClean, ['23185', '23186', '23200', '23151', '23152', '23121', '23093', '23100'])) {
        return { score: 1.0, reason: 'ARL Riesgo I (0,522%) liquidada exactamente' };
      }
      if (text.includes('0.522') || text.includes('0,522') || text.includes('empleador')) {
        return { score: 0.5, reason: 'Identifica tarifa 0,522% a cargo del empleador con monto diferente' };
      }
      return { score: 0, reason: 'Valor de ARL Riesgo I no coincide' };
    }

    case 'q2_5': {
      const hasCcf = hasAnyNumber(numClean, ['17766', '177700', '17740', '17717', '17695']) || (text.includes('4%') && (text.includes('caja') || text.includes('ccf')));
      const hasExon = text.includes('exonerad') || text.includes('114-1') || text.includes('0%') || (text.includes('no') && (text.includes('sena') || text.includes('icbf')));
      if (hasCcf && hasExon) {
        return { score: 1.0, reason: 'CCF 4% liquidada y exoneración de SENA/ICBF por Art. 114-1 E.T.' };
      }
      if (hasCcf || hasExon || (text.includes('4%') && text.includes('2%') && text.includes('3%'))) {
        return { score: 0.5, reason: 'Parafiscales parciales (falta aplicar o especificar exoneración Art. 114-1)' };
      }
      return { score: 0, reason: 'Liquidación de parafiscales incorrecta' };
    }

    case 'q2_6': {
      if (hasAnyNumber(numClean, ['10891', '10892', '10893', '10876', '10878', '10861', '10848', '10850']) ||
          text.includes('24.522%') || text.includes('24,522%')) {
        return { score: 1.0, reason: 'Gran total Planilla PILA exacto (con exoneración Art. 114-1)' };
      }
      if (hasAnyNumber(numClean, ['16888', '16863', '16841', '16820']) || text.includes('38.022%') || hasAnyNumber(numClean, ['1089', '1087', '1084'])) {
        return { score: 0.5, reason: 'Total PILA calculado sin exoneración o con redondeo aproximado' };
      }
      return { score: 0, reason: 'Valor total de planilla PILA no coincide' };
    }

    // -------------------------------------------------------------------------
    // SECCIÓN 3: SALARIO INTEGRAL ($25.000.000) Y TOPES ($42.000.000)
    // -------------------------------------------------------------------------
    case 'q3_1': {
      if (text.includes('30%') && hasAnyNumber(numClean, ['7500000', '7500'])) {
        return { score: 1.0, reason: 'Factor prestacional 30% ($7.500.000) exacto' };
      }
      if (text.includes('30%') || hasAnyNumber(numClean, ['7500000'])) {
        return { score: 0.5, reason: 'Identifica parcialmente el 30% o el valor de $7.500.000' };
      }
      return { score: 0, reason: 'Factor prestacional incorrecto (debe ser 30% = $7.500.000)' };
    }

    case 'q3_2': {
      if (hasAnyNumber(numClean, ['17500000']) || (text.includes('70%') && hasAnyNumber(numClean, ['17500']))) {
        return { score: 1.0, reason: 'IBC del 70% ($17.500.000) exacto' };
      }
      if (text.includes('70%')) {
        return { score: 0.5, reason: 'Identifica la regla del 70% sin el monto exacto' };
      }
      return { score: 0, reason: 'IBC de salario integral incorrecto (70% = $17.500.000)' };
    }

    case 'q3_3': {
      const has700 = hasAnyNumber(numClean, ['700000']);
      const hasFspOrTotal = hasAnyNumber(numClean, ['175000', '1575000', '1400000']) || text.includes('fsp') || text.includes('solidaridad') || text.includes('1%');
      if (has700 && hasFspOrTotal) {
        return { score: 1.0, reason: 'Salud $700.000 (4%), Pensión $700.000 (4%) y FSP $175.000 (1%)' };
      }
      if (has700 || (text.includes('4%') && hasFspOrTotal)) {
        return { score: 0.5, reason: 'Calcula parcialmente descuentos sobre el IBC de $17.500.000' };
      }
      return { score: 0, reason: 'Aportes del trabajador en salario integral incorrectos' };
    }

    case 'q3_4': {
      const deniesPrimaCes = (text.includes('no') || text.includes('incluid') || text.includes('compensad')) &&
                             (text.includes('prima') || text.includes('cesantia') || text.includes('prestacional'));
      const addressesNocturno = text.includes('recargo') || text.includes('nocturn') || text.includes('direccion') || text.includes('confianza') || text.includes('manejo') || text.includes('162');
      if (deniesPrimaCes && addressesNocturno) {
        return { score: 1.0, reason: 'Justifica correctamente Prima, Cesantías y Recargos nocturnos' };
      }
      if (deniesPrimaCes || addressesNocturno) {
        return { score: 0.5, reason: 'Justificación parcial de los tres conceptos solicitados' };
      }
      return { score: 0, reason: 'Tratamiento legal de prestaciones en salario integral incorrecto' };
    }

    case 'q3_5': {
      if (text.includes('25') && (text.includes('smmlv') || text.includes('smlmv') || text.includes('salario') || text.includes('minimo'))) {
        return { score: 1.0, reason: 'Tope máximo legal de 25 SMMLV identificado' };
      }
      if (text.includes('25')) {
        return { score: 0.5, reason: 'Menciona 25 pero sin especificar SMMLV' };
      }
      return { score: 0, reason: 'No identifica el tope legal de 25 SMMLV' };
    }

    case 'q3_6': {
      if (hasAnyNumber(numClean, ['42000000', '43772625', '35587500']) && (text.includes('25') || text.includes('tope') || hasAnyNumber(numClean, ['43772', '35587', '42000000']))) {
        return { score: 1.0, reason: 'Determina correctamente el IBC frente al tope de 25 SMMLV' };
      }
      if (text.includes('25') || text.includes('tope')) {
        return { score: 0.5, reason: 'Reconoce el límite de 25 SMMLV sin precisar el valor del IBC' };
      }
      return { score: 0, reason: 'Cálculo del IBC con tope máximo incorrecto' };
    }

    case 'q3_7': {
      // Valida cálculo sobre $42.000.000 (2026 < 25 SMMLV), sobre tope 2026 ($43.772.625) o sobre tope 2025 ($35.587.500)
      if (hasAnyNumber(numClean, [
        '1680000', '840000', '4200000', '3360000',
        '1750905', '87545', '437726',
        '1423500', '711750', '3558750'
      ])) {
        return { score: 1.0, reason: 'Liquidación exacta de Salud (4%), Pensión (4%) y FSP (2%)' };
      }
      if (text.includes('4%') && (text.includes('2%') || text.includes('fsp') || text.includes('solidaridad'))) {
        return { score: 0.5, reason: 'Identifica porcentajes (4% salud, 4% pensión, 2% FSP) sin valores exactos' };
      }
      return { score: 0, reason: 'Aportes sobre el tope máximo incorrectos' };
    }

    // -------------------------------------------------------------------------
    // SECCIÓN 4: PAGOS SALARIALES Y NO SALARIALES ($5.800.000 vs $1.100.000)
    // -------------------------------------------------------------------------
    case 'q4_1': {
      const hasBasic = text.includes('basico') || hasAnyNumber(numClean, ['4200000']);
      const hasComision = text.includes('comision') || hasAnyNumber(numClean, ['700000']);
      const hasBonifCumpl = text.includes('cumplimiento') || hasAnyNumber(numClean, ['900000']);
      if (hasAnyNumber(numClean, ['5800000']) || (hasBasic && hasComision && hasBonifCumpl)) {
        return { score: 1.0, reason: 'Identifica los 3 pagos salariales (Básico + Cumplimiento + Comisión = $5.800.000)' };
      }
      if ((hasBasic && hasComision) || hasAnyNumber(numClean, ['4900000'])) {
        return { score: 0.5, reason: 'Identifica básico y comisión, pero omite bonificación por cumplimiento ($900.000)' };
      }
      return { score: 0, reason: 'Pagos salariales incorrectamente clasificados' };
    }

    case 'q4_2': {
      const hasRodamiento = text.includes('rodamiento') || hasAnyNumber(numClean, ['600000']);
      const hasBienestar = text.includes('bienestar') || hasAnyNumber(numClean, ['500000']);
      if (hasAnyNumber(numClean, ['1100000']) || (hasRodamiento && hasBienestar && !text.includes('comision'))) {
        return { score: 1.0, reason: 'Identifica Auxilio de rodamiento ($600.000) y Bono de bienestar ($500.000) = $1.100.000' };
      }
      if (hasRodamiento || hasBienestar || hasAnyNumber(numClean, ['2000000'])) {
        return { score: 0.5, reason: 'Clasificación parcial de conceptos no salariales' };
      }
      return { score: 0, reason: 'Pagos no salariales no identificados' };
    }

    case 'q4_3': {
      const has58M = hasAnyNumber(numClean, ['5800000']);
      const checks40 = text.includes('40%') || text.includes('1393') || hasAnyNumber(numClean, ['2760000', '6900000']) || text.includes('no supera') || text.includes('no excede');
      if (has58M && checks40) {
        return { score: 1.0, reason: 'IBC $5.800.000 verificando correctamente que $1.100.000 no supera el 40% ($2.760.000)' };
      }
      if (has58M || checks40 || hasAnyNumber(numClean, ['4900000'])) {
        return { score: 0.5, reason: 'Aplica parcialmente el análisis del límite del 40% (Ley 1393 de 2010)' };
      }
      return { score: 0, reason: 'Cálculo del IBC bajo Ley 1393 incorrecto' };
    }

    case 'q4_4': {
      let matches = 0;
      if (text.includes('128') || text.includes('cst')) matches++;
      if (text.includes('liberalidad') || text.includes('ocasional') || text.includes('habitual')) matches++;
      if (text.includes('no retribu') || text.includes('servicio') || text.includes('herramienta') || text.includes('funciones')) matches++;
      if (text.includes('pacto') || text.includes('acuerdo') || text.includes('expreso') || text.includes('escrito') || text.includes('otrosi')) matches++;
      if (matches >= 2) return { score: 1.0, reason: 'Explica las condiciones legales del Art. 128 CST con claridad' };
      if (matches >= 1) return { score: 0.5, reason: 'Menciona condiciones parciales de desalarización' };
      return { score: 0, reason: 'No fundamenta las condiciones del Art. 128 CST' };
    }

    // -------------------------------------------------------------------------
    // SECCIÓN 5: RETENCIÓN EN LA FUENTE
    // -------------------------------------------------------------------------
    case 'q5_1': {
      if ((text.includes('anticipad') || text.includes('recaudo') || text.includes('mecanismo')) &&
          (text.includes('renta') || text.includes('impuesto') || text.includes('383'))) {
        return { score: 1.0, reason: 'Definición tributaria precisa de retención en la fuente por salarios' };
      }
      if (text.includes('impuesto') || text.includes('renta') || text.includes('descuento')) {
        return { score: 0.5, reason: 'Noción general de retención en la fuente' };
      }
      return { score: 0, reason: 'Definición imprecisa' };
    }

    case 'q5_2': {
      let matches = 0;
      if (text.includes('salud') || text.includes('pension') || text.includes('no constitutivo') || text.includes('incrngo')) matches++;
      if (text.includes('deduccion') || text.includes('dependiente') || text.includes('vivienda') || text.includes('prepagada')) matches++;
      if (text.includes('exenta') || text.includes('25%') || text.includes('afc')) matches++;
      if (matches >= 2) return { score: 1.0, reason: 'Identifica INCRNGO, deducciones imputables y rentas exentas (AFC / 25%)' };
      if (matches >= 1) return { score: 0.5, reason: 'Menciona solo parte de los conceptos depurables' };
      return { score: 0, reason: 'Conceptos de depuración de base gravable incorrectos' };
    }

    case 'q5_3': {
      let matches = 0;
      if (text.includes('vivienda') || text.includes('hipotecario') || text.includes('leasing')) matches++;
      if (text.includes('dependiente') || text.includes('hijo')) matches++;
      if (text.includes('prepagada') || text.includes('seguro de salud')) matches++;
      if (text.includes('afc') || text.includes('fpv') || text.includes('voluntario')) matches++;
      if (text.includes('25%') || text.includes('exenta')) matches++;
      if (matches >= 2) return { score: 1.0, reason: 'Menciona al menos dos beneficios tributarios válidos' };
      if (matches >= 1) return { score: 0.5, reason: 'Menciona solo un beneficio tributario' };
      return { score: 0, reason: 'Beneficios tributarios no identificados' };
    }

    case 'q5_4': {
      if (text.includes('40%') && (numClean.includes('1340') || text.includes('uvt') || text.includes('2277'))) {
        return { score: 1.0, reason: 'Límite del 40% del ingreso neto y tope de 1.340 UVT anuales exacto' };
      }
      if (text.includes('40%') || numClean.includes('1340')) {
        return { score: 0.5, reason: 'Identifica parcialmente el 40% o las 1.340 UVT' };
      }
      return { score: 0, reason: 'Límite de deducciones y rentas exentas incorrecto' };
    }

    // -------------------------------------------------------------------------
    // SECCIÓN 6: CUMPLIMIENTO UGPP ($4.000.000 + $2.800.000 = $6.800.000)
    // -------------------------------------------------------------------------
    case 'q6_1': {
      const mentions40 = text.includes('40%') || text.includes('1393') || hasAnyNumber(numClean, ['80000', '2720000', '4080000']) || text.includes('41');
      const mentionsRisk = text.includes('evasion') || text.includes('elusion') || text.includes('inexactitud') || text.includes('desalarizacion') || text.includes('exceso') || text.includes('supera');
      if (mentions40 && mentionsRisk) {
        return { score: 1.0, reason: 'Identifica exceso sobre el 40% (Ley 1393: $80.000 de exceso / 41,18%) y riesgo de inexactitud' };
      }
      if (mentions40 || mentionsRisk) {
        return { score: 0.5, reason: 'Identifica riesgo general ante UGPP sin precisar la regla del 40%' };
      }
      return { score: 0, reason: 'Riesgo UGPP no identificado' };
    }

    case 'q6_2': {
      if (text.includes('realidad') || text.includes('habitual') || text.includes('retribu') || text.includes('periodicidad') || text.includes('128') || text.includes('pacto')) {
        return { score: 1.0, reason: 'Explica criterios de realidad sobre las formas, habitualidad, no retribución y pacto expreso' };
      }
      if (text.includes('contrato') || text.includes('soporte') || text.includes('40%')) {
        return { score: 0.5, reason: 'Menciona criterios formales básicos' };
      }
      return { score: 0, reason: 'Criterios técnicos de fiscalización UGPP no explicados' };
    }

    case 'q6_3': {
      let matches = 0;
      if (text.includes('sancion') || text.includes('multa') || text.includes('35%') || text.includes('60%')) matches++;
      if (text.includes('interes') || text.includes('mora')) matches++;
      if (text.includes('reliquidacion') || text.includes('retroactiv') || text.includes('inexactitud') || text.includes('liquidacion oficial')) matches++;
      if (matches >= 2) return { score: 1.0, reason: 'Detalla reliquidación de aportes, intereses moratorios y sanciones por inexactitud' };
      if (matches >= 1) return { score: 0.5, reason: 'Menciona consecuencias sancionatorias parciales' };
      return { score: 0, reason: 'Consecuencias de fiscalización UGPP no identificadas' };
    }

    case 'q6_4': {
      if (text.includes('40%') || text.includes('1393') || text.includes('otrosi') || text.includes('pacto') || text.includes('auditoria') || text.includes('pila')) {
        return { score: 1.0, reason: 'Recomendaciones técnicas sólidas (control 40%, pactos Art. 128 y auditoría PILA)' };
      }
      if (text.includes('revisar') || text.includes('ajustar') || text.includes('politica')) {
        return { score: 0.5, reason: 'Recomendaciones generales preventivas' };
      }
      return { score: 0, reason: 'Recomendaciones sin sustento normativo' };
    }

    // -------------------------------------------------------------------------
    // SECCIÓN 7: LEGISLACIÓN LABORAL
    // -------------------------------------------------------------------------
    case 'q7_1': {
      if ((text.includes('base') || text.includes('monto') || text.includes('ingreso')) &&
          (text.includes('cotizacion') || text.includes('seguridad social') || text.includes('aportes') || text.includes('salud') || text.includes('pension'))) {
        return { score: 1.0, reason: 'Definición correcta del Ingreso Base de Cotización (IBC)' };
      }
      if (text.includes('salario') || text.includes('base')) {
        return { score: 0.5, reason: 'Definición parcial de IBC' };
      }
      return { score: 0, reason: 'Definición incorrecta de IBC' };
    }

    case 'q7_2': {
      if (text.includes('4%') && (text.includes('salud') || text.includes('pension') || text.includes('8%'))) {
        return { score: 1.0, reason: '4% Salud y 4% Pensión (8% total a cargo del trabajador)' };
      }
      if (text.includes('4%') || text.includes('8%')) {
        return { score: 0.5, reason: 'Indica porcentaje sin desagregar Salud y Pensión' };
      }
      return { score: 0, reason: 'Porcentajes de aporte del trabajador incorrectos' };
    }

    case 'q7_3': {
      if (text.includes('35%') || text.includes('35 por') || text.includes('0.35') || text.includes('0,35')) {
        return { score: 1.0, reason: 'Recargo nocturno del 35% exacto' };
      }
      return { score: 0, reason: 'Porcentaje de recargo nocturno incorrecto (es 35%)' };
    }

    case 'q7_4': {
      // Acepta 90% (vigente desde julio 2026), gradualidad 80%/100% Reforma Laboral, o 75% clásico Art. 179 CST
      if (text.includes('90%') || text.includes('80%') || text.includes('75%') || text.includes('100%') ||
          text.includes('90 por') || text.includes('80 por') || text.includes('75 por')) {
        return { score: 1.0, reason: 'Porcentaje legal de recargo dominical/festivo identificado' };
      }
      return { score: 0, reason: 'Porcentaje de recargo dominical/festivo incorrecto' };
    }

    case 'q7_5': {
      if (text.includes('eps') || text.includes('entidad promotora')) {
        return { score: 1.0, reason: 'La EPS asume el pago del día 3 al día 180 en origen común' };
      }
      if (text.includes('arl') || (text.includes('empleador') && text.includes('2'))) {
        return { score: 0.5, reason: 'Menciona ARL (origen laboral) o primeros 2 días del empleador, pero omite EPS' };
      }
      return { score: 0, reason: 'Entidad responsable incorrecta (es la EPS)' };
    }

    case 'q7_6': {
      if (text.includes('2 smmlv') || text.includes('2 smlmv') || text.includes('dos salarios') || text.includes('2 salarios') || text.includes('hasta 2') || hasAnyNumber(numClean, ['3501810'])) {
        return { score: 1.0, reason: 'Trabajadores que devenguen hasta 2 SMMLV exacto' };
      }
      if (text.includes('minimo') || text.includes('smmlv') || text.includes('desplaz')) {
        return { score: 0.5, reason: 'Menciona salario mínimo o desplazamiento, pero omite el tope de 2 SMMLV' };
      }
      return { score: 0, reason: 'Requisitos legales del auxilio de transporte incorrectos' };
    }

    default:
      return { score: 0, reason: 'Pregunta no reconocida' };
  }
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  if (!verifyAdminToken(req)) {
    return res.status(401).json({
      error: 'Acceso confidencial restringido. Se requiere autenticación de Recursos Humanos.'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no soportado. Utilice POST.' });
  }

  try {
    const { cedula, answers = {}, customGrades = null, save = false } = req.body || {};

    if (!cedula) {
      return res.status(400).json({ error: 'Cédula es requerida.' });
    }

    const totalQuestions = Object.keys(SECRET_ANSWER_KEY).length; // 38
    const evaluationResults = {};
    const finalGrades = customGrades && typeof customGrades === 'object' ? { ...customGrades } : {};

    Object.keys(SECRET_ANSWER_KEY).forEach(qKey => {
      const rawAns = answers[qKey] || '';
      const autoRes = evaluateSingleAnswer(qKey, rawAns);

      if (finalGrades[qKey] === undefined) {
        finalGrades[qKey] = autoRes.score;
      }

      evaluationResults[qKey] = {
        score: finalGrades[qKey],
        autoScore: autoRes.score,
        reason: autoRes.reason,
        guide: SECRET_ANSWER_KEY[qKey]
      };
    });

    const evaluatedKeys = Object.keys(finalGrades);
    const totalPoints = evaluatedKeys.reduce((acc, k) => acc + (Number(finalGrades[k]) || 0), 0);
    const percentage = Math.round((totalPoints / totalQuestions) * 100);

    const calificacionData = {
      puntos: totalPoints,
      porcentaje: percentage,
      evaluadas: evaluatedKeys.length,
      fecha_calificacion: new Date().toISOString(),
      items: finalGrades
    };

    if (save) {
      const existing = await querySupabaseAdmin(`pruebas_nomina?cedula=eq.${encodeURIComponent(cedula)}&select=respuestas`);
      const currentAnswers = (existing && existing[0] && existing[0].respuestas) || {};
      currentAnswers._calificacion = calificacionData;

      await querySupabaseAdmin(`pruebas_nomina?cedula=eq.${encodeURIComponent(cedula)}`, {
        method: 'PATCH',
        body: { respuestas: currentAnswers }
      });
    }

    return res.status(200).json({
      success: true,
      calificacion: calificacionData,
      evaluacion: evaluationResults,
      solucionario: SECRET_ANSWER_KEY
    });
  } catch (err) {
    console.error('Error en /api/grade:', err);
    return res.status(500).json({ error: 'Error interno en el servicio de calificación.' });
  }
};
