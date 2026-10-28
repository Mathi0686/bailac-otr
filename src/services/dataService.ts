import * as XLSX from 'xlsx';
import { OtrRecord, OperationsKPIs, ManagementKPIs, FilterState } from '../types';
import { RAW_CSV_DATA } from '../data/rawCsvData';

export const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzttyY3RlmjL_cQIqT66grj6g-I1wu7giK8VYoOg23kh4xy_DcIEVajLBip8wnbpaHH/exec';

export const DEFAULT_SPREADSHEET_URL =
  'https://docs.google.com/spreadsheets/d/1q_7uygfvQJW72jk2FLpOedNbo0KBnHpNn8-2B8PNCok/edit?usp=sharing';

// Parse monetary values like "$ 6.629,42", "$ 2,250.00", " $ 10.549,00 ", "$ 472.00", or "-"
export function parsePrice(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (!str || str === '-' || str.toLowerCase() === 'baja' || str.toLowerCase() === 'atencion comercial') {
    return 0;
  }
  
  // Clean currency symbols, spaces, non-numeric except . and , and -
  let clean = str.replace(/[^0-9.,-]/g, '');
  if (!clean) return 0;
  
  const hasDot = clean.includes('.');
  const hasComma = clean.includes(',');
  
  if (hasDot && hasComma) {
    if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
      // Argentine/EU format: 6.629,42 -> 6629.42
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 6,629.42 -> 6629.42
      clean = clean.replace(/,/g, '');
    }
  } else if (hasComma) {
    const parts = clean.split(',');
    if (parts[parts.length - 1].length <= 2) {
      // Decimal comma: 6629,42 -> 6629.42
      clean = parts[0] + '.' + parts[1];
    } else {
      // Thousands comma: 6,629 -> 6629
      clean = clean.replace(/,/g, '');
    }
  } else if (hasDot) {
    const parts = clean.split('.');
    if (parts.length > 2) {
      clean = clean.replace(/\./g, '');
    } else if (parts[parts.length - 1].length === 3 && parts[0].length <= 3) {
      // E.g. "6.629" -> 6629
      clean = clean.replace(/\./g, '');
    }
  }
  
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Parse dates in format DD/MM/YYYY or M/D/YYYY or YYYY-MM-DD
export function parseDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  const clean = String(dateStr).trim();
  if (!clean || clean.toLowerCase() === 'sinfecha' || clean.toLowerCase() === 'baja' || clean === '-') {
    return null;
  }

  // Format DD/MM/YYYY or M/D/YYYY
  const slashParts = clean.split('/');
  if (slashParts.length === 3) {
    let p1 = parseInt(slashParts[0], 10);
    let p2 = parseInt(slashParts[1], 10);
    let year = parseInt(slashParts[2], 10);
    if (!isNaN(p1) && !isNaN(p2) && !isNaN(year)) {
      const fullYear = year < 100 ? 2000 + year : year;
      let day = p1;
      let month = p2 - 1;
      // In Argentina / Latin America standard is DD/MM/YYYY
      // If p2 > 12 -> it was MM/DD/YYYY, swap them
      if (p2 > 12) {
        day = p2;
        month = p1 - 1;
      }
      const d = new Date(fullYear, month, day);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Format YYYY-MM-DD
  const dashParts = clean.split('-');
  if (dashParts.length === 3) {
    if (dashParts[0].length === 4) {
      const year = parseInt(dashParts[0], 10);
      const month = parseInt(dashParts[1], 10) - 1;
      const day = parseInt(dashParts[2].slice(0, 2), 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    } else {
      let p1 = parseInt(dashParts[0], 10);
      let p2 = parseInt(dashParts[1], 10);
      let year = parseInt(dashParts[2], 10);
      if (!isNaN(p1) && !isNaN(p2) && !isNaN(year)) {
        const fullYear = year < 100 ? 2000 + year : year;
        let day = p1;
        let month = p2 - 1;
        if (p2 > 12) {
          day = p2;
          month = p1 - 1;
        }
        const d = new Date(fullYear, month, day);
        if (!isNaN(d.getTime())) return d;
      }
    }
  }

  // Fallback to standard Date parse
  const parsed = new Date(clean);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Formateador Global Homogéneo de Fechas en formato DD/MM/AAAA (ej. 24/10/2026)
export function formatDateDisplay(dateVal: string | undefined | null): string {
  if (!dateVal) return '-';
  const clean = String(dateVal).trim();
  if (!clean || clean === '-' || clean.toLowerCase() === 'sinfecha' || clean.toLowerCase() === 'baja') {
    return '-';
  }

  const d = parseDate(clean);
  if (!d || isNaN(d.getTime())) {
    return clean;
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function differenceInDays(d1: Date | null, d2: Date | null): number | null {
  if (!d1 || !d2) return null;
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffTime = d2.getTime() - d1.getTime();
  const days = Math.round(diffTime / msPerDay);
  return days;
}

// Parse CSV lines handling quoted fields with commas
function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

export function parseRawCsvToRecords(csvText: string): OtrRecord[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length <= 1) return [];

  // Parse header
  const headers = parseCsvLine(lines[0]).map(h => h.trim().toUpperCase());

  // Reference date in case item is still in process (local time October 2026)
  const referenceDate = new Date(2026, 9, 19);

  const records: OtrRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    if (row.length < 5) continue;

    const getValue = (colName: string): string => {
      const idx = headers.indexOf(colName);
      if (idx !== -1 && idx < row.length) {
        return row[idx].replace(/^"|"$/g, '').trim();
      }
      return '';
    };

    const cliente = getValue('CLIENTE') || 'CLIENTE NO DEFINIDO';
    const fechaIngreso = getValue('FECHA_INGRESO') || getValue('FECHA INGRESO');
    const remitoIngreso = getValue('REMITO_INGRESO') || getValue('REMITO INGRESO');
    const envioRaw = getValue('ENVIO') || getValue('LOTE_ENVIO') || getValue('REMITO_ENVIO') || '';
    const envio = envioRaw.trim();
    const marca = getValue('MARCA') || 'S/M';
    const medida = getValue('MEDIDA') || '';
    const serie = getValue('SERIE') || '';
    const solped = getValue('SOLPED') || '';
    const disenioRecauchaje = getValue('DISENIO_RECAUCHAJE') || getValue('DISEÑO RECAUCHAJE');
    const disenioNeumatico = getValue('DISENIO_NEUMATICO') || getValue('DISEÑO NEUMATICO');
    const tipo = getValue('TIPO') || '';
    const cantLote = getValue('CANT_LOTE') || getValue('CANT. LOTE');
    const nroInterno = getValue('NRO_INTERNO') || getValue('HOJA DE RUTA-NRO INTERNO') || '';
    const nCotizacion = getValue('N_COTIZACION') || getValue('N° COTIZACION') || '';
    const fit = getValue('FIT') || getValue('F.I.T.') || getValue('FECHA_INICIO') || getValue('FECHA INICIO') || '';
    const trabajoRealizar = getValue('TRABAJO_A_REALIZAR') || getValue('TRABAJO A REALIZAR') || 'REPARACION';
    const estadoRaw = getValue('ESTADO') || '';
    
    // Normalise Estado
    let estado = estadoRaw.toUpperCase();
    if (estado.includes('ENTREG')) estado = 'ENTREGADO';
    else if (estado.includes('PLANTA')) estado = 'PLANTA';
    else if (estado.includes('BAJA')) estado = 'BAJA';
    else if (!estado) estado = 'ENTREGADO';

    const fechaComprometida = getValue('FECHA_COMPROMETIDA') || getValue('FECHA COMPROMETIDA');
    const fechaTT = getValue('FECHA_TT') || getValue('FECHA TT');
    const controlEntrega = getValue('CONTROL_ENTREGA') || getValue('CONTROL ENTREGA');
    const remitoSalida = getValue('REMITO_SALIDA') || getValue('REMITO SALIDA');
    const fechaRetiro = getValue('FECHA_RETIRO') || getValue('FECHA RETIRO');
    const rawPrecio = getValue('PRECIO');
    const oc = getValue('OC') || getValue('O. C.');
    const factura = getValue('FACTURA') || '';
    const fechaFactura = getValue('FECHA_FACTURA') || getValue('FECHA FACTURA');
    const hess = getValue('HESS') || '';

    // Document links
    const linkFactura = getValue('LINK_FACTURA') || getValue('LINK FACTURA') || getValue('LINK_FAC') || '';
    const linkOc = getValue('LINK_OC') || getValue('LINK OC') || getValue('LINK_ORDEN_COMPRA') || '';
    const linkCotizacion = getValue('LINK_COTIZACION') || getValue('LINK COTIZACION') || getValue('LINK_COT') || '';
    const linkRemito = getValue('LINK_REMITO') || getValue('LINK REMITO') || getValue('LINK_REMITO_SALIDA') || '';

    const precio = parsePrice(rawPrecio);

    // Calculate dates
    const dIngreso = parseDate(fechaIngreso);
    // Filtro estricto: Si FIT está vacío, EXCLUYE el registro del cálculo (no usar FECHA_INGRESO)
    const dFIT = parseDate(fit);
    const dTT = parseDate(fechaTT); // FTT (Fecha Término de Trabajo)
    const dComprometida = parseDate(fechaComprometida);
    const dRetiro = parseDate(fechaRetiro);

    // KPI "Días Promedio Proceso": FECHA_TT vs FIT
    // Filtro estricto: Si FIT está vacío o falta FECHA_TT, EXCLUYE el registro del cálculo (null)
    let diasProceso: number | null = null;
    if (dFIT && dTT) {
      const diff = differenceInDays(dFIT, dTT);
      if (diff !== null && diff >= 0) {
        diasProceso = diff;
      }
    }

    // KPI "Días Promedio Retiro": FECHA_RETIRO vs FIT
    // Filtro estricto: EXCLUYE registros si falta FECHA_RETIRO o FIT (null)
    let diasRetiro: number | null = null;
    if (dFIT && dRetiro) {
      const diff = differenceInDays(dFIT, dRetiro);
      if (diff !== null && diff >= 0) {
        diasRetiro = diff;
      }
    }

    // Días de Atraso: fechaTT (or referenceDate) vs fechaComprometida
    let diasAtraso: number | null = null;
    if (dComprometida) {
      const endPoint = dTT || (estado === 'PLANTA' ? referenceDate : null);
      if (endPoint) {
        const diff = differenceInDays(dComprometida, endPoint);
        diasAtraso = diff !== null && diff > 0 ? diff : 0;
      }
    }

    // Period year & month
    let periodoYear: number | null = null;
    let periodoMonth: string | null = null;
    const baseDate = dIngreso || dFIT || dTT || parseDate(fechaFactura);
    if (baseDate) {
      periodoYear = baseDate.getFullYear();
      periodoMonth = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}`;
    }

    records.push({
      id: `otr-${i}-${serie || nroInterno || Math.random().toString(36).substring(2, 7)}`,
      cliente: cliente.trim(),
      envio,
      fechaIngreso,
      remitoIngreso,
      marca: marca.trim().toUpperCase(),
      medida,
      serie,
      solped,
      disenioRecauchaje,
      disenioNeumatico,
      tipo,
      cantLote,
      nroInterno,
      nCotizacion,
      fit: fit.trim(),
      trabajoRealizar: trabajoRealizar.trim(),
      estado,
      fechaComprometida,
      fechaTT,
      controlEntrega,
      remitoSalida,
      fechaRetiro,
      precio,
      precioFormatted: formatCurrency(precio),
      oc,
      factura,
      fechaFactura,
      hess,
      linkFactura,
      linkOc,
      linkCotizacion,
      linkRemito,
      diasProceso,
      diasRetiro,
      diasAtraso,
      periodoYear,
      periodoMonth,
    });
  }

  return records;
}

// Compute Operations KPIs based on current filtered dataset
export function calculateOperationsKPIs(records: OtrRecord[]): OperationsKPIs {
  const procesoRecords = records.filter(r => r.diasProceso !== null && r.diasProceso >= 0);
  const avgProceso = procesoRecords.length > 0
    ? Math.round(procesoRecords.reduce((acc, r) => acc + (r.diasProceso || 0), 0) / procesoRecords.length)
    : 0;

  const retiroRecords = records.filter(r => r.diasRetiro !== null && r.diasRetiro >= 0);
  const avgRetiro = retiroRecords.length > 0
    ? Math.round(retiroRecords.reduce((acc, r) => acc + (r.diasRetiro || 0), 0) / retiroRecords.length)
    : 0;

  const atrasoRecords = records.filter(r => r.diasAtraso !== null);
  const avgAtraso = atrasoRecords.length > 0
    ? Math.round(atrasoRecords.reduce((acc, r) => acc + (r.diasAtraso || 0), 0) / atrasoRecords.length)
    : 0;

  const enProceso = records.filter(r => r.estado === 'PLANTA').length;

  return {
    diasPromedioProceso: avgProceso,
    diasPromedioRetiro: avgRetiro,
    diasPromedioAtraso: avgAtraso,
    enProceso,
    totalOperaciones: records.length,
  };
}

// Compute Management KPIs based on current filtered dataset
export function calculateManagementKPIs(records: OtrRecord[]): ManagementKPIs {
  const facturacionTotal = records.reduce((acc, r) => acc + r.precio, 0);
  const totalNeumaticos = records.length;
  // Distinct or total works performed
  const totalTrabajos = records.filter(r => r.trabajoRealizar && r.estado !== 'BAJA').length;
  const entregados = records.filter(r => r.estado === 'ENTREGADO').length;
  const pendientes = records.filter(r => r.estado === 'PLANTA').length;
  const bajas = records.filter(r => r.estado === 'BAJA').length;

  return {
    facturacionTotal,
    totalNeumaticos,
    totalTrabajos,
    entregados,
    pendientes,
    bajas,
  };
}

// Filter records helper
export function filterRecords(records: OtrRecord[], filters: FilterState): OtrRecord[] {
  return records.filter(r => {
    if (filters.cliente && filters.cliente !== 'ALL' && r.cliente !== filters.cliente) {
      return false;
    }
    if (filters.marca && filters.marca !== 'ALL' && r.marca !== filters.marca) {
      return false;
    }
    if (filters.estado && filters.estado !== 'ALL' && r.estado !== filters.estado) {
      return false;
    }
    if (filters.trabajo && filters.trabajo !== 'ALL') {
      const match = r.trabajoRealizar.toUpperCase().includes(filters.trabajo.toUpperCase());
      if (!match) return false;
    }

    // Multi-select year filter support (periodos / selectedYears)
    const activeYears = filters.periodos || filters.selectedYears;
    if (activeYears && activeYears.length > 0 && !activeYears.includes('ALL')) {
      const recordYear = r.periodoYear?.toString();
      if (!recordYear || !activeYears.includes(recordYear)) {
        return false;
      }
    } else if (filters.periodo && filters.periodo !== 'ALL') {
      if (r.periodoYear?.toString() !== filters.periodo) {
        return false;
      }
    }

    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      const matchSearch =
        r.serie.toLowerCase().includes(q) ||
        r.cliente.toLowerCase().includes(q) ||
        r.marca.toLowerCase().includes(q) ||
        r.medida.toLowerCase().includes(q) ||
        r.nroInterno.toLowerCase().includes(q) ||
        r.remitoIngreso.toLowerCase().includes(q) ||
        r.remitoSalida.toLowerCase().includes(q) ||
        r.solped.toLowerCase().includes(q) ||
        r.oc.toLowerCase().includes(q) ||
        r.trabajoRealizar.toLowerCase().includes(q) ||
        r.factura.toLowerCase().includes(q);
      if (!matchSearch) return false;
    }
    return true;
  });
}

// Recalculate metrics for an individual created or modified record
export function recalculateRecordMetrics(input: Partial<OtrRecord>): OtrRecord {
  const referenceDate = new Date(2026, 9, 19);

  const rawPrecio = input.precio ?? input.precioFormatted ?? 0;
  const precio = parsePrice(rawPrecio);

  const dIngreso = parseDate(input.fechaIngreso);
  // Filtro estricto: Si FIT está vacío, EXCLUYE el registro del cálculo (no usar FECHA_INGRESO)
  const dFIT = parseDate(input.fit);
  const dTT = parseDate(input.fechaTT);
  const dComprometida = parseDate(input.fechaComprometida);
  const dRetiro = parseDate(input.fechaRetiro);
  const estado = (input.estado || 'PLANTA').toUpperCase();

  // KPI "Días Promedio Proceso": FECHA_TT vs FIT
  // Filtro estricto: Si FIT está vacío o falta FECHA_TT, EXCLUYE el registro del cálculo (null)
  let diasProceso: number | null = null;
  if (dFIT && dTT) {
    const diff = differenceInDays(dFIT, dTT);
    if (diff !== null && diff >= 0) {
      diasProceso = diff;
    }
  }

  // KPI "Días Promedio Retiro": FECHA_RETIRO vs FIT
  // Filtro estricto: EXCLUYE registros si falta FECHA_RETIRO o FIT (null)
  let diasRetiro: number | null = null;
  if (dFIT && dRetiro) {
    const diff = differenceInDays(dFIT, dRetiro);
    if (diff !== null && diff >= 0) {
      diasRetiro = diff;
    }
  }

  let diasAtraso: number | null = null;
  if (dComprometida) {
    const endPoint = dTT || (estado === 'PLANTA' ? referenceDate : null);
    if (endPoint) {
      const diff = differenceInDays(dComprometida, endPoint);
      diasAtraso = diff !== null && diff > 0 ? diff : 0;
    }
  }

  let periodoYear: number | null = null;
  let periodoMonth: string | null = null;
  const baseDate = dIngreso || dFIT || dTT || parseDate(input.fechaFactura);
  if (baseDate) {
    periodoYear = baseDate.getFullYear();
    periodoMonth = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}`;
  }

  return {
    id: input.id || `otr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    cliente: (input.cliente || 'CLIENTE').trim(),
    envio: (input.envio || '').trim(),
    fechaIngreso: input.fechaIngreso || '',
    remitoIngreso: input.remitoIngreso || '',
    marca: (input.marca || 'S/M').trim().toUpperCase(),
    medida: input.medida || '',
    serie: input.serie || '',
    solped: input.solped || '',
    disenioRecauchaje: input.disenioRecauchaje || '',
    disenioNeumatico: input.disenioNeumatico || '',
    tipo: input.tipo || '',
    cantLote: input.cantLote || '',
    nroInterno: input.nroInterno || '',
    nCotizacion: input.nCotizacion || '',
    fit: (input.fit || '').trim(),
    trabajoRealizar: (input.trabajoRealizar || 'REPARACION').trim(),
    estado: estado.includes('PLANTA') ? 'PLANTA' : estado.includes('BAJA') ? 'BAJA' : 'ENTREGADO',
    fechaComprometida: input.fechaComprometida || '',
    fechaTT: input.fechaTT || '',
    controlEntrega: input.controlEntrega || '',
    remitoSalida: input.remitoSalida || '',
    fechaRetiro: input.fechaRetiro || '',
    precio,
    precioFormatted: formatCurrency(precio),
    oc: input.oc || '',
    factura: input.factura || '',
    fechaFactura: input.fechaFactura || '',
    hess: input.hess || '',
    linkFactura: input.linkFactura || '',
    linkOc: input.linkOc || '',
    linkCotizacion: input.linkCotizacion || '',
    linkRemito: input.linkRemito || '',
    diasProceso,
    diasRetiro,
    diasAtraso,
    periodoYear,
    periodoMonth,
  };
}

const STORAGE_KEY = 'bailac_otr_records_v2_2';

export function saveStoredRecords(records: OtrRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving records to localStorage', e);
  }
}

export function loadStoredRecords(): OtrRecord[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('bailac_otr_records_v2');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Re-run strict metric calculation on all records loaded from storage
      return parsed.map((item) => recalculateRecordMetrics(item));
    }
  } catch (e) {
    console.error('Error loading stored records', e);
  }
  return null;
}

// Fetch from Google Apps Script Web App
export async function fetchFromAppsScript(webAppUrl: string): Promise<OtrRecord[]> {
  const url = webAppUrl.trim();
  if (!url) throw new Error('URL de Google Apps Script no configurada');

  const response = await fetch(url, {
    method: 'GET',
    mode: 'cors',
  });

  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
  }

  const json = await response.json();
  
  // Apps script doGet can return { success: true, data: [...] } or direct array [...]
  const rawList = Array.isArray(json) ? json : (json.data || json.records || []);

  if (!Array.isArray(rawList) || rawList.length === 0) {
    throw new Error('La respuesta de Apps Script no contiene registros');
  }

  // Convert array of objects or arrays into OtrRecord[]
  return rawList.map((item: any, idx: number) => {
    const rawPrecio = item.PRECIO || item.precio || 0;
    const precio = parsePrice(rawPrecio);
    const fechaIngreso = (item.FECHA_INGRESO || item.fechaIngreso || '').trim();
    // FIT: exact value from Google Sheets (stays empty if empty in the sheet)
    const fit = (item.FIT !== undefined && item.FIT !== null ? String(item.FIT) : (item.fit || '')).trim();
    const remitoSalida = (item.REMITO_SALIDA || item.remitoSalida || '').trim();
    const fechaRetiro = (item.FECHA_RETIRO || item.fechaRetiro || '').trim();
    const dIngreso = parseDate(fechaIngreso);
    // Filtro estricto: Si FIT está vacío, EXCLUYE el registro del cálculo (no usar FECHA_INGRESO)
    const dFIT = parseDate(fit);
    const dTT = parseDate(item.FECHA_TT || item.fechaTT);
    const dComprometida = parseDate(item.FECHA_COMPROMETIDA || item.fechaComprometida);
    const dRetiro = parseDate(fechaRetiro);
    const estado = (item.ESTADO || item.estado || 'ENTREGADO').trim().toUpperCase();

    // KPI "Días Promedio Proceso": FECHA_TT vs FIT (Filtro estricto: requiere FIT y FECHA_TT)
    const diasProceso = dFIT && dTT && differenceInDays(dFIT, dTT) !== null && differenceInDays(dFIT, dTT)! >= 0
      ? differenceInDays(dFIT, dTT)
      : null;

    // KPI "Días Promedio Retiro": FECHA_RETIRO vs FIT (Filtro estricto: requiere FIT y FECHA_RETIRO)
    const diasRetiro = dFIT && dRetiro && differenceInDays(dFIT, dRetiro) !== null && differenceInDays(dFIT, dRetiro)! >= 0
      ? differenceInDays(dFIT, dRetiro)
      : null;

    const diasAtraso = dComprometida && dTT ? Math.max(0, differenceInDays(dComprometida, dTT) || 0) : null;

    let periodoYear: number | null = null;
    let periodoMonth: string | null = null;
    const baseDate = dIngreso || dFIT || dTT;
    if (baseDate) {
      periodoYear = baseDate.getFullYear();
      periodoMonth = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}`;
    }

    const remitoIngreso = (item.REMITO_INGRESO || item.remitoIngreso || '').trim();
    // ENVIO: exact value from Google Sheets (never synthesize E1..E4)
    const envio = (item.ENVIO !== undefined && item.ENVIO !== null ? String(item.ENVIO) : (item.envio || '')).trim();

    return {
      id: item.id || `otr-as-${idx}-${item.SERIE || item.serie || idx}`,
      cliente: (item.CLIENTE || item.cliente || 'CLIENTE').trim(),
      envio,
      fechaIngreso,
      remitoIngreso,
      marca: (item.MARCA || item.marca || 'S/M').toUpperCase().trim(),
      medida: (item.MEDIDA || item.medida || '').trim(),
      serie: (item.SERIE || item.serie || '').trim(),
      solped: (item.SOLPED || item.solped || '').trim(),
      disenioRecauchaje: (item.DISENIO_RECAUCHAJE || item.disenioRecauchaje || '').trim(),
      disenioNeumatico: (item.DISENIO_NEUMATICO || item.disenioNeumatico || '').trim(),
      tipo: (item.TIPO || item.tipo || '').trim(),
      cantLote: (item.CANT_LOTE || item.cantLote || '').trim(),
      nroInterno: (item.NRO_INTERNO || item.nroInterno || item['HOJA DE RUTA-NRO INTERNO'] || '').trim(),
      nCotizacion: (item.N_COTIZACION || item.nCotizacion || '').trim(),
      fit,
      trabajoRealizar: (item.TRABAJO_A_REALIZAR || item.trabajoRealizar || 'REPARACION').trim(),
      estado: estado.includes('PLANTA') ? 'PLANTA' : estado.includes('BAJA') ? 'BAJA' : 'ENTREGADO',
      fechaComprometida: (item.FECHA_COMPROMETIDA || item.fechaComprometida || '').trim(),
      fechaTT: (item.FECHA_TT || item.fechaTT || '').trim(),
      controlEntrega: (item.CONTROL_ENTREGA || item.controlEntrega || '').trim(),
      remitoSalida,
      fechaRetiro,
      precio,
      precioFormatted: formatCurrency(precio),
      oc: (item.OC || item.oc || item['O. C.'] || item['O.C.'] || '').trim(),
      factura: (item.FACTURA || item.factura || '').trim(),
      fechaFactura: (item.FECHA_FACTURA || item.fechaFactura || '').trim(),
      hess: (item.HESS || item.hess || item.HES || item.hes || '').trim(),
      linkFactura: (item.LINK_FACTURA || item.linkFactura || item.LINK_FAC || '').trim(),
      linkOc: (item.LINK_OC || item.linkOc || item.LINK_ORDEN_COMPRA || '').trim(),
      linkCotizacion: (item.LINK_COTIZACION || item.linkCotizacion || item.LINK_COT || '').trim(),
      linkRemito: (item.LINK_REMITO || item.linkRemito || item.LINK_REMITO_SALIDA || '').trim(),
      diasProceso,
      diasRetiro,
      diasAtraso,
      periodoYear,
      periodoMonth,
    };
  });
}

export type SyncMutationAction = 'create' | 'update' | 'update_invoice' | 'delete';

export interface SyncMutationResult {
  success: boolean;
  record: OtrRecord;
  rawResponse?: any;
}

function extractSheetRowNumber(id?: string): number | null {
  if (!id) return null;
  const rowMatch = id.match(/^row-(\d+)$/i);
  if (rowMatch) return parseInt(rowMatch[1], 10);
  const asMatch = id.match(/^otr-as-(\d+)-/i);
  if (asMatch) return parseInt(asMatch[1], 10) + 2;
  const csvMatch = id.match(/^otr-(\d+)-/i);
  if (csvMatch) {
    const num = parseInt(csvMatch[1], 10);
    // Avoid treating Date.now() timestamps as row numbers
    if (num > 0 && num < 500000) return num + 1;
  }
  return null;
}

function mapRecordToSheetColumns(record: OtrRecord): Record<string, string | number> {
  return {
    CLIENTE: record.cliente || '',
    ENVIO: record.envio || '',
    FECHA_INGRESO: record.fechaIngreso || '',
    REMITO_INGRESO: record.remitoIngreso || '',
    MARCA: record.marca || '',
    MEDIDA: record.medida || '',
    SERIE: record.serie || '',
    SOLPED: record.solped || '',
    DISENIO_RECAUCHAJE: record.disenioRecauchaje || '',
    DISENIO_NEUMATICO: record.disenioNeumatico || '',
    TIPO: record.tipo || '',
    CANT_LOTE: record.cantLote || '',
    NRO_INTERNO: record.nroInterno || '',
    N_COTIZACION: record.nCotizacion || '',
    FIT: record.fit || '',
    TRABAJO_A_REALIZAR: record.trabajoRealizar || '',
    ESTADO: record.estado || '',
    FECHA_COMPROMETIDA: record.fechaComprometida || '',
    FECHA_TT: record.fechaTT || '',
    CONTROL_ENTREGA: record.controlEntrega || '',
    REMITO_SALIDA: record.remitoSalida || '',
    FECHA_RETIRO: record.fechaRetiro || '',
    PRECIO: record.precio > 0 ? record.precio : '',
    OC: record.oc || '',
    FACTURA: record.factura || '',
    FECHA_FACTURA: record.fechaFactura || '',
    HESS: record.hess || '',
    LINK_FACTURA: record.linkFactura || '',
    LINK_OC: record.linkOc || '',
    LINK_COTIZACION: record.linkCotizacion || '',
    LINK_REMITO: record.linkRemito || '',
  };
}

function extractAppsScriptHtmlError(rawText: string): string | null {
  const trimmed = rawText.trim();
  if (!trimmed.startsWith('<!DOCTYPE') && !trimmed.toLowerCase().includes('<html')) {
    return null;
  }

  if (trimmed.includes('Script function not found: doPost')) {
    return 'Script function not found: doPost — El Web App desplegado en Google Apps Script aún no incluye la función de escritura doPost(e). Abra "Ver Code.gs" para copiar el código actualizado e implementar una nueva versión.';
  }

  const monoMatch = trimmed.match(/font-family:monospace[^>]*>([\s\S]*?)<\/div>/i);
  if (monoMatch && monoMatch[1]) {
    const clean = monoMatch[1].replace(/<[^>]+>/g, '').trim();
    if (clean) return clean;
  }

  const errClassMatch = trimmed.match(/class="errorMessage"[^>]*>([\s\S]*?)<\/div>/i);
  if (errClassMatch && errClassMatch[1]) {
    const clean = errClassMatch[1].replace(/<[^>]+>/g, '').trim();
    if (clean) return clean;
  }

  return 'Google Apps Script devolvió una página HTML de error en lugar de JSON válido. Verifique los permisos ("Cualquier usuario") y que la función doPost(e) esté publicada.';
}

/**
 * Envía una operación de creación, actualización, carga de factura o eliminación
 * hacia el Web App de Google Apps Script y verifica estrictamente la respuesta.
 */
export async function syncMutationToAppsScript(
  webAppUrl: string,
  action: SyncMutationAction,
  record: OtrRecord
): Promise<SyncMutationResult> {
  const url = (webAppUrl || '').trim();
  if (!url) {
    throw new Error(
      'No hay una URL activa de Google Apps Script configurada. Vincule el endpoint en el Panel de Configuración para guardar en Google Sheets.'
    );
  }

  const sheetData = mapRecordToSheetColumns(record);
  const rowNumber = extractSheetRowNumber(record.id);

  const payload = {
    action,
    id: record.id,
    rowId: record.id,
    rowNumber,
    serie: record.serie,
    cliente: record.cliente,
    factura: record.factura,
    fechaFactura: record.fechaFactura,
    data: sheetData,
    record: {
      ...record,
      ...sheetData,
    },
  };

  let response: Response;
  try {
    // Usamos text/plain;charset=utf-8 para enviar JSON a Google Apps Script sin bloqueo CORS preflight (OPTIONS)
    response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });
  } catch (networkErr: any) {
    throw new Error(
      `Fallo de red o conexión CORS (${networkErr?.message || 'Sin respuesta del servidor'}). Verifique su conexión a internet y que el Web App esté publicado con acceso para "Cualquier persona".`
    );
  }

  const rawText = await response.text();
  const htmlError = extractAppsScriptHtmlError(rawText);

  if (!response.ok) {
    throw new Error(
      htmlError || `Error HTTP ${response.status}: ${response.statusText || rawText.slice(0, 180)}`
    );
  }

  if (htmlError) {
    throw new Error(htmlError);
  }

  let json: any = null;
  try {
    json = JSON.parse(rawText);
  } catch {
    throw new Error(
      `La respuesta del servidor no es un JSON válido: ${rawText.slice(0, 180) || 'Respuesta vacía'}`
    );
  }

  if (
    !json ||
    json.success === false ||
    json.status === 'error' ||
    json.result === 'error' ||
    Boolean(json.error)
  ) {
    const serverMsg =
      json?.error ||
      json?.message ||
      'El script de Google Sheets informó un fallo al procesar el guardado.';
    throw new Error(String(serverMsg));
  }

  const syncedId =
    json.id || (json.rowNumber ? `row-${json.rowNumber}` : record.id);

  return {
    success: true,
    record: {
      ...record,
      id: String(syncedId),
    },
    rawResponse: json,
  };
}

/**
 * Exporta un envío seleccionado a formato Excel (.xlsx)
 * con las 7 columnas exactas: MARCA, MEDIDA, SERIE, SOLPED, HES, PRECIO, O. C.
 * Resiliente a columna ENVIO vacía y a conjuntos de datos vacíos.
 */
export function exportEnvioToExcel(records: OtrRecord[], envioLote: string, customFilename?: string): boolean {
  const safeRecords = Array.isArray(records) ? records : [];
  const isAll = !envioLote || envioLote === 'ALL' || envioLote === 'TODOS';
  const isSinLote = envioLote === '__SIN_LOTE__' || envioLote === 'SIN_LOTE' || envioLote === 'VACIO';

  const filtered = safeRecords.filter(r => {
    if (!r) return false;
    if (isAll) return true;
    const rawVal = (r.envio || '').trim();
    if (isSinLote) {
      return !rawVal || rawVal === '—' || rawVal === '-';
    }
    return rawVal.toUpperCase() === envioLote.trim().toUpperCase();
  });

  const columns = ['MARCA', 'MEDIDA', 'SERIE', 'SOLPED', 'HES', 'PRECIO', 'O. C.'];

  // Map rows - ensure headers are always emitted even if 0 rows match
  const exportRows = filtered.length > 0
    ? filtered.map(r => ({
        'MARCA': r.marca || '',
        'MEDIDA': r.medida || '',
        'SERIE': r.serie || '',
        'SOLPED': r.solped || '',
        'HES': r.hess || '',
        'PRECIO': r.precio ? r.precio : (r.precioFormatted || 0),
        'O. C.': r.oc || '',
      }))
    : [{
        'MARCA': '',
        'MEDIDA': '',
        'SERIE': '',
        'SOLPED': '',
        'HES': '',
        'PRECIO': '',
        'O. C.': '',
      }];

  const worksheet = XLSX.utils.json_to_sheet(exportRows, { header: columns });

  // Column widths for professional rendering
  worksheet['!cols'] = [
    { wch: 18 }, // MARCA
    { wch: 16 }, // MEDIDA
    { wch: 18 }, // SERIE
    { wch: 16 }, // SOLPED
    { wch: 14 }, // HES
    { wch: 16 }, // PRECIO
    { wch: 16 }, // O. C.
  ];

  const workbook = XLSX.utils.book_new();
  let cleanSheetName = 'Envios';
  if (isAll) cleanSheetName = 'Todos_Envios';
  else if (isSinLote) cleanSheetName = 'Sin_Lote';
  else cleanSheetName = `Envio_${envioLote.replace(/[^A-Za-z0-9]/g, '_')}`;

  XLSX.utils.book_append_sheet(workbook, worksheet, cleanSheetName.substring(0, 31));

  const dateStr = new Date().toISOString().slice(0, 10);
  let safeFileName = customFilename;
  if (!safeFileName) {
    if (isAll) {
      safeFileName = `Bailac_Envios_Consolidado_${dateStr}.xlsx`;
    } else if (isSinLote) {
      safeFileName = `Bailac_Envios_SinLote_${dateStr}.xlsx`;
    } else {
      const cleanTag = envioLote.replace(/[^A-Za-z0-9_-]/g, '_');
      safeFileName = `Bailac_Envio_${cleanTag}_${dateStr}.xlsx`;
    }
  }

  try {
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', safeFileName);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch {
        // ignore cleanup errors
      }
    }, 200);
    return true;
  } catch (blobErr) {
    console.warn('Fallback a XLSX.writeFile:', blobErr);
    try {
      XLSX.writeFile(workbook, safeFileName);
      return true;
    } catch (writeErr) {
      console.error('Error fatal al exportar Excel:', writeErr);
      throw writeErr;
    }
  }
}

// Export data to CSV (legacy fallback)
export function exportToCsv(records: OtrRecord[], filename = 'bailac_otr_export.csv') {
  const headers = [
    'CLIENTE', 'ENVIO', 'FECHA INGRESO', 'REMITO INGRESO', 'MARCA', 'MEDIDA', 'SERIE',
    'SOLPED', 'NRO INTERNO', 'FIT', 'TRABAJO', 'ESTADO', 'FECHA COMPROMETIDA', 'FECHA TT',
    'FECHA RETIRO', 'PRECIO USD', 'OC', 'FACTURA', 'DIAS PROCESO', 'DIAS ATRASO',
    'LINK FACTURA', 'LINK OC', 'LINK COTIZACION', 'LINK REMITO'
  ];

  const rows = records.map(r => [
    `"${r.cliente}"`,
    `"${r.envio || ''}"`,
    `"${formatDateDisplay(r.fechaIngreso)}"`,
    `"${r.remitoIngreso}"`,
    `"${r.marca}"`,
    `"${r.medida}"`,
    `"${r.serie}"`,
    `"${r.solped}"`,
    `"${r.nroInterno}"`,
    `"${formatDateDisplay(r.fit)}"`,
    `"${r.trabajoRealizar}"`,
    `"${r.estado}"`,
    `"${formatDateDisplay(r.fechaComprometida)}"`,
    `"${formatDateDisplay(r.fechaTT)}"`,
    `"${formatDateDisplay(r.fechaRetiro)}"`,
    r.precio,
    `"${r.oc}"`,
    `"${r.factura}"`,
    r.diasProceso ?? '',
    r.diasAtraso ?? '',
    `"${r.linkFactura || ''}"`,
    `"${r.linkOc || ''}"`,
    `"${r.linkCotizacion || ''}"`,
    `"${r.linkRemito || ''}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
