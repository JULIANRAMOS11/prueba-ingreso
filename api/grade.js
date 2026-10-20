// ==============================================================================
// LOZADA & PARTNERS SAS - SERVICIO CONFIDENCIAL DE CALIFICACIÓN Y SOLUCIONARIO
// Endpoint: /api/grade
// Este archivo corre 100% en el servidor Vercel. Las respuestas oficiales NUNCA
// viajan al navegador del candidato.
// ==============================================================================
const { verifyAdminToken, querySupabaseAdmin } = require('./_utils');

// Solucionario Técnico Oficial (CONFIDENCIAL)
const SECRET_ANSWER_KEY = {
  // Sección 1: Liquidación de Nómina
  q1_1: 'Valor hora ordinaria: Base 240h = $1.800.000 / 240 = $7.500 | Base 230h (Ley 2101) = $1.800.000 / 230 = $7.826,09.',
  q1_2: '10 Horas Extras Diurnas (+25%): Base 240h: $7.500 × 1.25 × 10 = $93.750 | Base 230h: $7.826,09 × 1.25 × 10 = $97.826.',
  q1_3: '5 Horas Extras Nocturnas (+75%): Base 240h: $7.500 × 1.75 × 5 = $65.625 | Base 230h: $7.826,09 × 1.75 × 5 = $68.478.',
  q1_4: 'Total Devengado: Salario $1.800.000 + Auxilio Transporte $162.000 + HED + HEN = $2.121.375 (Base 240h) o $2.128.304 (Base 230h).',
  q1_5: 'IBC Seguridad Social: Total devengado menos Auxilio de Transporte = $1.959.375 (Base 240h) o $1.966.304 (Base 230h).',
  q1_6: 'Deducciones Trabajador: 4% Salud ($78.375) + 4% Pensión ($78.375) = Total $156.750 (Base 240h) o $157.304 (Base 230h).',
  q1_7: 'Neto a Pagar: Total Devengado - Deducciones = $1.964.625 (Base 240h) o $1.971.000 (Base 230h).',

  // Sección 2: Planilla PILA
  q2_1: 'IBC Seguridad Social: $1.959.375 (o $1.966.304). El auxilio de transporte NO hace parte del IBC.',
  q2_2: 'Salud: Trabajador 4% ($78.375). Empleador 0% (Exonerado del 8.5% por Art. 114-1 E.T. al devengar menos de 10 SMMLV).',
  q2_3: 'Pensión (16% total): Trabajador 4% ($78.375) + Empleador 12% ($235.125) = Total Pensión $313.500.',
  q2_4: 'ARL Riesgo I (0.522% a cargo 100% del empleador): $1.959.375 × 0.522% = $10.228 (redondeado a $10.200 o $10.300 en PILA).',
  q2_5: 'Parafiscales: Caja de Compensación 4% ($78.375). Exonerado de SENA (2%) e ICBF (3%) por Art. 114-1 E.T. (< 10 SMMLV).',
  q2_6: 'Total Planilla PILA (Salud 4% + Pensión 16% + ARL 0.522% + CCF 4% = 24.522% del IBC): Aprox. $480.478.',

  // Sección 3: Salario Integral y Topes
  q3_1: 'Factor Prestacional (30%): $18.000.000 × 30% = $5.400.000 (Factor salarial 70% = $12.600.000).',
  q3_2: 'IBC Salario Integral (70% del total): $18.000.000 × 70% = $12.600.000.',
  q3_3: 'Aportes sobre IBC ($12.600.000): Salud (12.5%: Emp 8.5% + Trab 4%, sin exoneración >10 SMMLV), Pensión (16%: Emp 12% + Trab 4%), FSP (1.2% a 1.4%), ARL (0.522%), Parafiscales 9% sobre el 70%.',
  q3_4: 'Prima y Cesantías NO se pagan por separado (ya están incluidas en el 30% prestacional). Vacaciones SÍ se pagan en dinero o descanso.',
  q3_5: 'El tope máximo de cotización al Sistema de Seguridad Social en Colombia es de 25 SMMLV (Ley 100 de 1993 / Ley 797 de 2003).',
  q3_6: 'El IBC aplicable está limitado al tope de 25 SMMLV vigentes (aprox. $32.500.000 - $35.587.500 según el año del SMMLV).',
  q3_7: 'Aportes de Salud (12.5%), Pensión (16% + FSP 2%), ARL y Parafiscales liquidados sobre el IBC máximo topado en 25 SMMLV.',

  // Sección 4: Salariales y No Salariales
  q4_1: 'Pagos salariales: Salario básico = $3.000.000.',
  q4_2: 'Pagos no salariales: Bonificación no salarial ($2.000.000) + Auxilio de rodamiento ($800.000) + Auxilio de alimentación ($400.000) = $3.200.000.',
  q4_3: 'Ley 1393 de 2010 (Tope 40%): Total remuneración = $6.200.000. El 40% es $2.480.000. Exceso no salarial = $3.200.000 - $2.480.000 = $720.000. IBC = $3.000.000 + $720.000 = $3.720.000.',
  q4_4: 'Condiciones (Art. 128 CST): Que no retribuya directamente el servicio personal, que sea ocasional o por mera liberalidad, o que exista pacto expreso de desalarización en otrosí.',

  // Sección 5: Retención en la fuente
  q5_1: 'Es el recaudo anticipado a título del impuesto sobre la renta que el empleador descuenta mensualmente de los pagos laborales gravables (Art. 383 E.T.).',
  q5_2: 'Ingresos no constitutivos de renta ni ganancia ocasional (Aportes obligatorios a Salud 4%, Pensión 4% y Fondo de Solidaridad Pensional).',
  q5_3: 'Beneficios: Intereses de vivienda (hasta 100 UVT/mes), Medicina prepagada (hasta 16 UVT/mes), Dependientes económicos (10% hasta 32 UVT/mes), Aportes AFC/FPV y el 25% de renta exenta laboral.',
  q5_4: 'Límite conjunto del 40% de los ingresos netos, sin exceder 1.340 UVT anuales (Ley 2277 de 2022).',

  // Sección 6: Cumplimiento UGPP
  q6_1: 'Riesgo alto de evasión/elusión por desalarización artificial masiva (66.7% no salarial) y violación del límite del 40% de la Ley 1393 de 2010.',
  q6_2: 'Principio de primacía de la realidad sobre las formas (Art. 53 C.P. y Art. 127/128 CST): habitualidad, periodicidad, causalidad con metas y aplicación del tope del 40%.',
  q6_3: 'Liquidación oficial de aforo/inexactitud, reliquidación retroactiva de aportes (hasta 5 años), intereses moratorios a tasa de usura y sanciones del 35% al 100%+.',
  q6_4: 'Aplicar el tope del 40% en nómina, documentar acuerdos del Art. 128 CST, acreditar que los pagos no retribuyen el servicio y realizar auditorías preventivas PILA vs Contabilidad.',

  // Sección 7: Legislación Laboral
  q7_1: 'Es el monto de ingresos salariales mensuales (más el exceso del 40% de pagos no salariales) sobre el cual se aplican los porcentajes de seguridad social.',
  q7_2: '4% para Salud y 4% para Pensión (Total 8% a cargo del trabajador; más 1% a 2% de FSP si devenga 4 SMMLV o más).',
  q7_3: '35% sobre el valor de la hora ordinaria (Art. 168 CST, jornada de 9:00 p.m. a 6:00 a.m.).',
  q7_4: '75% sobre el valor de la hora ordinaria en proporción a las horas trabajadas (Art. 179 CST).',
  q7_5: 'La EPS (Entidad Promotora de Salud) reconoce el pago del día 3 al día 180 en enfermedad general (los primeros 2 días los asume el empleador).',
  q7_6: 'Trabajadores que devenguen hasta dos (2) Salarios Mínimos Mensuales Legales Vigentes (2 SMMLV) y requieran transporte para su desplazamiento.'
};

function evaluateSingleAnswer(qKey, rawAnswer) {
  if (!rawAnswer || typeof rawAnswer !== 'string') {
    return { score: 0, reason: 'Sin respuesta registrada' };
  }

  const text = rawAnswer.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  if (text.length < 2) {
    return { score: 0, reason: 'Respuesta vacía o muy breve' };
  }

  const numClean = text.replace(/[\.\,\$\s]/g, '');

  switch (qKey) {
    case 'q1_1': {
      if (numClean.includes('7500') || numClean.includes('7826')) return { score: 1.0, reason: 'Cálculo exacto del valor hora ordinaria' };
      if (numClean.includes('240') || numClean.includes('230') || numClean.includes('1800000')) return { score: 0.5, reason: 'Base de horas o planteamiento correcto' };
      return { score: 0, reason: 'No coincide con $7.500 o $7.826' };
    }
    case 'q1_2': {
      if (numClean.includes('93750') || numClean.includes('97826')) return { score: 1.0, reason: 'Cálculo exacto de 10 HED (+25%)' };
      if (text.includes('25%') || text.includes('1.25') || numClean.includes('93') || numClean.includes('97')) return { score: 0.5, reason: 'Recargo del 25% o cálculo aproximado' };
      return { score: 0, reason: 'Valor de horas extras diurnas no coincide' };
    }
    case 'q1_3': {
      if (numClean.includes('65625') || numClean.includes('68478')) return { score: 1.0, reason: 'Cálculo exacto de 5 HEN (+75%)' };
      if (text.includes('75%') || text.includes('1.75') || numClean.includes('65') || numClean.includes('68')) return { score: 0.5, reason: 'Recargo del 75% o cálculo aproximado' };
      return { score: 0, reason: 'Valor de horas extras nocturnas no coincide' };
    }
    case 'q1_4': {
      if (numClean.includes('2121375') || numClean.includes('2128304') || numClean.includes('2121') || numClean.includes('2128')) return { score: 1.0, reason: 'Total devengado liquidado correctamente' };
      if (numClean.includes('162000') || text.includes('auxilio') || text.includes('devengado')) return { score: 0.5, reason: 'Incluye auxilio de transporte o suma parcial' };
      return { score: 0, reason: 'Total devengado incorrecto' };
    }
    case 'q1_5': {
      if (numClean.includes('1959375') || numClean.includes('1966304') || numClean.includes('1959') || numClean.includes('1966')) return { score: 1.0, reason: 'IBC liquidado sin auxilio de transporte' };
      if (text.includes('sin auxilio') || text.includes('resta') || text.includes('no incluye')) return { score: 0.5, reason: 'Identifica que el auxilio no hace parte del IBC' };
      return { score: 0, reason: 'IBC incorrecto' };
    }
    case 'q1_6': {
      if (numClean.includes('156750') || numClean.includes('157304') || (numClean.includes('78375') && text.includes('salud') && text.includes('pension'))) return { score: 1.0, reason: 'Deducciones de 4% Salud y 4% Pensión exactas' };
      if (text.includes('4%') || numClean.includes('78375') || numClean.includes('156')) return { score: 0.5, reason: 'Aplica el 4% o cálculo cercano' };
      return { score: 0, reason: 'Deducciones incorrectas' };
    }
    case 'q1_7': {
      if (numClean.includes('1964625') || numClean.includes('1971000') || numClean.includes('1964') || numClean.includes('1971')) return { score: 1.0, reason: 'Neto a pagar exacto' };
      if (text.includes('devengado') || text.includes('deducciones') || text.includes('neto')) return { score: 0.5, reason: 'Fórmula correcta pero cálculo aproximado' };
      return { score: 0, reason: 'Neto a pagar incorrecto' };
    }
    case 'q2_1': {
      if (numClean.includes('1959375') || numClean.includes('1966304') || numClean.includes('1959') || numClean.includes('1966')) return { score: 1.0, reason: 'IBC de PILA exacto' };
      if (text.includes('sin auxilio') || text.includes('no incluye')) return { score: 0.5, reason: 'Concepto de exclusión de auxilio de transporte' };
      return { score: 0, reason: 'IBC de PILA incorrecto' };
    }
    case 'q2_2': {
      const hasWorker = text.includes('4%') || numClean.includes('78375');
      const hasExon = text.includes('exonerad') || text.includes('0%') || text.includes('114-1') || text.includes('114');
      if (hasWorker && hasExon) return { score: 1.0, reason: '4% trabajador y empleador exonerado por Art. 114-1' };
      if (hasWorker || hasExon) return { score: 0.5, reason: 'Menciona aporte de trabajador o exoneración patronal' };
      return { score: 0, reason: 'No menciona la exoneración del Art. 114-1' };
    }
    case 'q2_3': {
      const hasTotal = text.includes('16%') || numClean.includes('313500');
      const hasParts = (text.includes('12%') || numClean.includes('235125')) && (text.includes('4%') || numClean.includes('78375'));
      if (hasTotal || hasParts) return { score: 1.0, reason: 'Pensión 16% total (12% empleador + 4% trabajador)' };
      if (text.includes('12%') || text.includes('16%') || text.includes('4%')) return { score: 0.5, reason: 'Porcentajes de pensión parciales' };
      return { score: 0, reason: 'Aportes de pensión incorrectos' };
    }
    case 'q2_4': {
      if (text.includes('0.522') || text.includes('0,522') || numClean.includes('10228') || numClean.includes('10200') || numClean.includes('10300')) return { score: 1.0, reason: 'Tarifa ARL Riesgo I 0.522% exacta a cargo empleador' };
      if (text.includes('arl') || text.includes('riesgo 1') || text.includes('riesgo i') || text.includes('empleador')) return { score: 0.5, reason: 'Identifica que está a cargo del empleador' };
      return { score: 0, reason: 'Tarifa o valor de ARL no coincide' };
    }
    case 'q2_5': {
      const hasCcf = text.includes('caja') || text.includes('compensacion') || (text.includes('4%') && numClean.includes('78375'));
      const hasExon = text.includes('exonerad') || text.includes('sena') || text.includes('icbf');
      if (hasCcf && hasExon) return { score: 1.0, reason: 'Caja 4% y exoneración SENA / ICBF por Art. 114-1' };
      if (hasCcf || hasExon) return { score: 0.5, reason: 'Identifica aportes de parafiscales parciales' };
      return { score: 0, reason: 'No distingue aportes y exoneraciones parafiscales' };
    }
    case 'q2_6': {
      if (numClean.includes('480478') || numClean.includes('480') || text.includes('24.522%') || text.includes('24.5%')) return { score: 1.0, reason: 'Total Planilla PILA exacto' };
      if (text.includes('total') || text.includes('pila') || numClean.includes('48')) return { score: 0.5, reason: 'Cálculo de PILA aproximado' };
      return { score: 0, reason: 'Total PILA no coincide' };
    }
    case 'q3_1': {
      if (text.includes('30%') && (numClean.includes('5400000') || numClean.includes('5400') || numClean.includes('70%') || numClean.includes('12600000'))) return { score: 1.0, reason: 'Factor prestacional 30% ($5.400.000) exacto' };
      if (text.includes('30%') || numClean.includes('5400000')) return { score: 0.5, reason: 'Reconoce el 30% prestacional' };
      return { score: 0, reason: 'Factor prestacional incorrecto' };
    }
    case 'q3_2': {
      if (text.includes('70%') && (numClean.includes('12600000') || numClean.includes('12600'))) return { score: 1.0, reason: 'IBC 70% ($12.600.000) exacto' };
      if (text.includes('70%') || numClean.includes('12600000')) return { score: 0.5, reason: 'Reconoce la base del 70%' };
      return { score: 0, reason: 'IBC de salario integral incorrecto' };
    }
    case 'q3_3': {
      let matches = 0;
      if (text.includes('salud') || text.includes('12.5')) matches++;
      if (text.includes('pension') || text.includes('16')) matches++;
      if (text.includes('fsp') || text.includes('solidaridad')) matches++;
      if (text.includes('arl') || text.includes('parafiscales')) matches++;
      if (matches >= 3) return { score: 1.0, reason: 'Liquidación completa de seguridad social sobre el 70%' };
      if (matches >= 1) return { score: 0.5, reason: 'Identifica aportes de seguridad social de salario integral' };
      return { score: 0, reason: 'Aportes de salario integral incorrectos' };
    }
    case 'q3_4': {
      const hasPrimaCesantias = text.includes('no') || text.includes('incluid') || text.includes('prestacional');
      const hasVacaciones = text.includes('vacaciones') || text.includes('recargo') || text.includes('extras');
      if (hasPrimaCesantias && hasVacaciones) return { score: 1.0, reason: 'Explica que prima/cesantías están incluidas y vacaciones sí' };
      if (hasPrimaCesantias || hasVacaciones) return { score: 0.5, reason: 'Explica parcialmente el tratamiento prestacional' };
      return { score: 0, reason: 'Tratamiento de prestaciones incorrecto' };
    }
    case 'q3_5': {
      if (text.includes('25') && (text.includes('smmlv') || text.includes('salarios') || text.includes('minimos') || text.includes('tope'))) return { score: 1.0, reason: 'Tope legal de 25 SMMLV identificado' };
      if (text.includes('25') || text.includes('tope') || text.includes('smmlv')) return { score: 0.5, reason: 'Menciona el concepto de tope o 25 salarios' };
      return { score: 0, reason: 'No menciona los 25 SMMLV de tope' };
    }
    case 'q3_6': {
      if (text.includes('25') || text.includes('tope') || numClean.includes('32500000') || numClean.includes('35587500') || numClean.includes('28000000')) return { score: 1.0, reason: 'Aplica el tope de 25 SMMLV sobre el salario de 40M' };
      if (text.includes('limite') || text.includes('tope') || text.includes('maximo')) return { score: 0.5, reason: 'Identifica que opera un límite' };
      return { score: 0, reason: 'No aplica el tope de 25 SMMLV' };
    }
    case 'q3_7': {
      if (text.includes('tope') || text.includes('25') || text.includes('salud') || text.includes('pension') || text.includes('fsp')) return { score: 1.0, reason: 'Calcula aportes aplicando el límite legal' };
      return { score: 0.5, reason: 'Menciona aportes sobre el salario tope' };
    }
    case 'q4_1': {
      if (numClean.includes('3000000') || numClean.includes('3000') || text.includes('sueldo') || text.includes('basico')) return { score: 1.0, reason: 'Salario básico de $3.000.000 identificado' };
      return { score: 0.5, reason: 'Concepto salarial identificado' };
    }
    case 'q4_2': {
      if (numClean.includes('3200000') || (text.includes('bonificacion') && text.includes('rodamiento') && text.includes('alimentacion'))) return { score: 1.0, reason: 'Identifica los 3 conceptos no salariales ($3.200.000)' };
      if (text.includes('bonificacion') || text.includes('rodamiento') || text.includes('alimentacion')) return { score: 0.5, reason: 'Identifica parte de los pagos no salariales' };
      return { score: 0, reason: 'Pagos no salariales no identificados' };
    }
    case 'q4_3': {
      const has40 = text.includes('40%') || text.includes('40 por');
      const hasValues = numClean.includes('2480000') || numClean.includes('720000') || numClean.includes('3720000') || numClean.includes('720') || numClean.includes('3720');
      if (has40 && hasValues) return { score: 1.0, reason: 'Aplica la regla del 40% (Ley 1393) con exceso al IBC' };
      if (has40 || hasValues || text.includes('1393')) return { score: 0.5, reason: 'Aplica la regla del 40% parcialmente' };
      return { score: 0, reason: 'No aplica la regla del 40% de la Ley 1393' };
    }
    case 'q4_4': {
      let matches = 0;
      if (text.includes('128') || text.includes('cst')) matches++;
      if (text.includes('liberalidad') || text.includes('ocasional')) matches++;
      if (text.includes('no retribu') || text.includes('directa')) matches++;
      if (text.includes('pacto') || text.includes('acuerdo') || text.includes('escrito')) matches++;
      if (matches >= 2) return { score: 1.0, reason: 'Condiciones del Art. 128 CST explicadas claramente' };
      if (matches >= 1) return { score: 0.5, reason: 'Menciona algunas condiciones de desalarización' };
      return { score: 0, reason: 'No explica las condiciones legales del Art. 128 CST' };
    }
    case 'q5_1': {
      if ((text.includes('anticipo') || text.includes('mecanismo') || text.includes('recaudo')) && (text.includes('renta') || text.includes('impuesto') || text.includes('salarios'))) return { score: 1.0, reason: 'Definición correcta de retención en la fuente por salarios' };
      if (text.includes('impuesto') || text.includes('retencion') || text.includes('descuento')) return { score: 0.5, reason: 'Concepto general de retención' };
      return { score: 0, reason: 'Definición imprecisa' };
    }
    case 'q5_2': {
      let matches = 0;
      if (text.includes('salud') || text.includes('pension')) matches++;
      if (text.includes('fsp') || text.includes('solidaridad')) matches++;
      if (text.includes('incrngo') || text.includes('no constitutivo')) matches++;
      if (matches >= 2) return { score: 1.0, reason: 'Identifica aportes obligatorios como ingresos no constitutivos' };
      if (matches >= 1) return { score: 0.5, reason: 'Menciona deducciones básicas de seguridad social' };
      return { score: 0, reason: 'Conceptos de depuración incorrectos' };
    }
    case 'q5_3': {
      let matches = 0;
      if (text.includes('vivienda') || text.includes('hipotecario')) matches++;
      if (text.includes('dependiente') || text.includes('hijos')) matches++;
      if (text.includes('salud') || text.includes('prepagada')) matches++;
      if (text.includes('afc') || text.includes('fpv') || text.includes('voluntario')) matches++;
      if (text.includes('25%') || text.includes('exenta')) matches++;
      if (matches >= 2) return { score: 1.0, reason: 'Menciona dos o más beneficios tributarios y deducciones' };
      if (matches >= 1) return { score: 0.5, reason: 'Menciona un beneficio tributario' };
      return { score: 0, reason: 'Beneficios tributarios no identificados' };
    }
    case 'q5_4': {
      if (text.includes('40%') && (text.includes('1340') || text.includes('uvt') || text.includes('ley 2277'))) return { score: 1.0, reason: 'Límite del 40% y 1.340 UVT anuales exacto' };
      if (text.includes('40%') || text.includes('1340') || text.includes('uvt')) return { score: 0.5, reason: 'Menciona el límite del 40% o las UVT' };
      return { score: 0, reason: 'Límite máximo no coincide' };
    }
    case 'q6_1': {
      let matches = 0;
      if (text.includes('desalarizacion') || text.includes('evasion') || text.includes('elusion')) matches++;
      if (text.includes('40%') || text.includes('1393')) matches++;
      if (text.includes('sancion') || text.includes('omision') || text.includes('inexactitud')) matches++;
      if (matches >= 2) return { score: 1.0, reason: 'Identifica riesgo de desalarización y violación del límite del 40%' };
      if (matches >= 1) return { score: 0.5, reason: 'Identifica riesgo sancionatorio general' };
      return { score: 0, reason: 'Riesgo UGPP no identificado' };
    }
    case 'q6_2': {
      if (text.includes('primacia') || text.includes('realidad') || text.includes('habitual') || text.includes('frecuencia') || text.includes('retribu')) return { score: 1.0, reason: 'Criterio de realidad sobre las formas y habitualidad explicado' };
      if (text.includes('criterio') || text.includes('pago') || text.includes('laboral')) return { score: 0.5, reason: 'Concepto general de fiscalización' };
      return { score: 0, reason: 'No explica los criterios técnicos de la UGPP' };
    }
    case 'q6_3': {
      if (text.includes('sancion') || text.includes('interes') || text.includes('reliquidacion') || text.includes('inexactitud') || text.includes('cobro')) return { score: 1.0, reason: 'Sanciones, intereses moratorios y reliquidación explicadas' };
      if (text.includes('multa') || text.includes('pagar')) return { score: 0.5, reason: 'Menciona consecuencias económicas generales' };
      return { score: 0, reason: 'Consecuencias de la UGPP no identificadas' };
    }
    case 'q6_4': {
      if (text.includes('40%') || text.includes('1393') || text.includes('otrosi') || text.includes('pacto') || text.includes('auditoria') || text.includes('soporte')) return { score: 1.0, reason: 'Recomendaciones preventivas documentales y de límite del 40%' };
      if (text.includes('revisar') || text.includes('cumplir') || text.includes('ajustar')) return { score: 0.5, reason: 'Recomendaciones generales' };
      return { score: 0, reason: 'Recomendaciones no fundamentadas' };
    }
    case 'q7_1': {
      if ((text.includes('ingreso base') || text.includes('monto') || text.includes('base')) && (text.includes('cotizacion') || text.includes('seguridad social') || text.includes('salud') || text.includes('pension'))) return { score: 1.0, reason: 'Definición de IBC correcta' };
      if (text.includes('base') || text.includes('salario')) return { score: 0.5, reason: 'Definición básica de IBC' };
      return { score: 0, reason: 'Definición incorrecta de IBC' };
    }
    case 'q7_2': {
      if (text.includes('4%') && (text.includes('salud') || text.includes('pension') || text.includes('8%'))) return { score: 1.0, reason: 'Aportes 4% Salud y 4% Pensión (8% total) exactos' };
      if (text.includes('4%') || text.includes('8%')) return { score: 0.5, reason: 'Porcentajes aproximados' };
      return { score: 0, reason: 'Porcentajes de cotización del trabajador incorrectos' };
    }
    case 'q7_3': {
      if (text.includes('35%') || text.includes('35 por') || text.includes('0.35')) return { score: 1.0, reason: 'Recargo nocturno del 35% exacto' };
      return { score: 0, reason: 'Porcentaje de recargo nocturno incorrecto' };
    }
    case 'q7_4': {
      if (text.includes('75%') || text.includes('75 por') || text.includes('0.75')) return { score: 1.0, reason: 'Recargo dominical o festivo del 75% exacto' };
      return { score: 0, reason: 'Porcentaje de recargo dominical incorrecto' };
    }
    case 'q7_5': {
      if (text.includes('eps') || text.includes('entidad promotora')) return { score: 1.0, reason: 'EPS paga incapacidades del día 3 al 180' };
      if (text.includes('empleador') && (text.includes('primeros') || text.includes('2 dias'))) return { score: 0.5, reason: 'Menciona que los 2 primeros días son del empleador' };
      return { score: 0, reason: 'Entidad responsable incorrecta' };
    }
    case 'q7_6': {
      if (text.includes('2 smmlv') || text.includes('dos salarios') || text.includes('2 salarios') || text.includes('hasta 2')) return { score: 1.0, reason: 'Trabajadores hasta 2 SMMLV exacto' };
      if (text.includes('salario') || text.includes('minimo') || text.includes('transporte')) return { score: 0.5, reason: 'Menciona salario mínimo pero omite el tope de 2 SMMLV' };
      return { score: 0, reason: 'Requisito de auxilio de transporte incorrecto' };
    }
    default:
      return { score: 0.5, reason: 'Evaluación general' };
  }
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  // Solo Paola con token autorizado puede consultar o evaluar con el solucionario
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

    // Si no se proporcionaron notas manuales, ejecutar evaluación inteligente del solucionario
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
        guide: SECRET_ANSWER_KEY[qKey] // Solo se envía a Paola autenticada
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

    // Si solicitó guardar en Supabase con permisos de servicio
    if (save) {
      // 1. Obtener registro actual del candidato
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
      solucionario: SECRET_ANSWER_KEY // Entregado exclusivamente al navegador de Paola
    });
  } catch (err) {
    console.error('Error en /api/grade:', err);
    return res.status(500).json({ error: 'Error interno en el servicio de calificación.' });
  }
};
