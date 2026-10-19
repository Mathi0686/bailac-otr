import { OtrRecord, OperationsKPIs, ManagementKPIs, FilterState } from '../types';
import { RAW_CSV_DATA } from '../data/rawCsvData';

// Parse monetary values like " $  6,629.42 " or "$ 2,250.00" or "-"
export function parsePrice(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (str === '-' || str.toLowerCase() === 'baja' || str.toLowerCase() === 'atencion comercial' || str === '') {
    return 0;
  }
  // Remove $, spaces, and commas
  const cleaned = str.replace(/[$\s,]/g, '');
  const num = parseFloat(cleaned);
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

// Parse dates in format M/D/YYYY or D/M/YYYY or YYYY-MM-DD
export function parseDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  const clean = String(dateStr).trim();
  if (!clean || clean.toLowerCase() === 'sinfecha' || clean.toLowerCase() === 'baja' || clean === '-') {
    return null;
  }
  
  // Format M/D/YYYY or MM/DD/YYYY
  const parts = clean.split('/');
  if (parts.length === 3) {
    const month = parseInt(parts[0], 10) - 1;
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
      // Basic sanity check for year
      const fullYear = year < 100 ? 2000 + year : year;
      const d = new Date(fullYear, month, day);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Fallback to standard Date parse
  const parsed = new Date(clean);
  return isNaN(parsed.getTime()) ? null : parsed;
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

    const precio = parsePrice(rawPrecio);

    // Calculate dates
    const dIngreso = parseDate(fechaIngreso);
    const dTT = parseDate(fechaTT);
    const dComprometida = parseDate(fechaComprometida);
    const dRetiro = parseDate(fechaRetiro);

    // Días de Proceso: fechaIngreso to fechaTT (or referenceDate if still in PLANTA)
    let diasProceso: number | null = null;
    if (dIngreso) {
      if (dTT) {
        diasProceso = Math.max(0, differenceInDays(dIngreso, dTT) ?? 0);
      } else if (estado === 'PLANTA') {
        diasProceso = Math.max(0, differenceInDays(dIngreso, referenceDate) ?? 0);
      }
    }

    // Días de Retiro: fechaTT to fechaRetiro
    let diasRetiro: number | null = null;
    if (dTT && dRetiro) {
      const diff = differenceInDays(dTT, dRetiro);
      if (diff !== null && diff >= 0 && diff < 365) {
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
    const baseDate = dIngreso || dTT || parseDate(fechaFactura);
    if (baseDate) {
      periodoYear = baseDate.getFullYear();
      periodoMonth = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}`;
    }

    records.push({
      id: `otr-${i}-${serie || nroInterno || Math.random().toString(36).substring(2, 7)}`,
      cliente: cliente.trim(),
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
    if (filters.periodo && filters.periodo !== 'ALL') {
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
  const dTT = parseDate(input.fechaTT);
  const dComprometida = parseDate(input.fechaComprometida);
  const dRetiro = parseDate(input.fechaRetiro);
  const estado = (input.estado || 'PLANTA').toUpperCase();

  let diasProceso: number | null = null;
  if (dIngreso) {
    if (dTT) {
      diasProceso = Math.max(0, differenceInDays(dIngreso, dTT) ?? 0);
    } else if (estado === 'PLANTA') {
      diasProceso = Math.max(0, differenceInDays(dIngreso, referenceDate) ?? 0);
    }
  }

  let diasRetiro: number | null = null;
  if (dTT && dRetiro) {
    const diff = differenceInDays(dTT, dRetiro);
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
  const baseDate = dIngreso || dTT || parseDate(input.fechaFactura);
  if (baseDate) {
    periodoYear = baseDate.getFullYear();
    periodoMonth = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}`;
  }

  return {
    id: input.id || `otr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    cliente: (input.cliente || 'CLIENTE').trim(),
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
    diasProceso,
    diasRetiro,
    diasAtraso,
    periodoYear,
    periodoMonth,
  };
}

const STORAGE_KEY = 'bailac_otr_records_v1';

export function saveStoredRecords(records: OtrRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving records to localStorage', e);
  }
}

export function loadStoredRecords(): OtrRecord[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
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
    const dIngreso = parseDate(item.FECHA_INGRESO || item.fechaIngreso);
    const dTT = parseDate(item.FECHA_TT || item.fechaTT);
    const dComprometida = parseDate(item.FECHA_COMPROMETIDA || item.fechaComprometida);
    const dRetiro = parseDate(item.FECHA_RETIRO || item.fechaRetiro);
    const estado = (item.ESTADO || item.estado || 'ENTREGADO').toUpperCase();

    const diasProceso = dIngreso && dTT ? differenceInDays(dIngreso, dTT) : null;
    const diasRetiro = dTT && dRetiro ? differenceInDays(dTT, dRetiro) : null;
    const diasAtraso = dComprometida && dTT ? Math.max(0, differenceInDays(dComprometida, dTT) || 0) : null;

    let periodoYear: number | null = null;
    let periodoMonth: string | null = null;
    const baseDate = dIngreso || dTT;
    if (baseDate) {
      periodoYear = baseDate.getFullYear();
      periodoMonth = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}`;
    }

    return {
      id: item.id || `otr-as-${idx}-${item.SERIE || item.serie || idx}`,
      cliente: item.CLIENTE || item.cliente || 'CLIENTE',
      fechaIngreso: item.FECHA_INGRESO || item.fechaIngreso || '',
      remitoIngreso: item.REMITO_INGRESO || item.remitoIngreso || '',
      marca: (item.MARCA || item.marca || 'S/M').toUpperCase(),
      medida: item.MEDIDA || item.medida || '',
      serie: item.SERIE || item.serie || '',
      solped: item.SOLPED || item.solped || '',
      disenioRecauchaje: item.DISENIO_RECAUCHAJE || item.disenioRecauchaje || '',
      disenioNeumatico: item.DISENIO_NEUMATICO || item.disenioNeumatico || '',
      tipo: item.TIPO || item.tipo || '',
      cantLote: item.CANT_LOTE || item.cantLote || '',
      nroInterno: item.NRO_INTERNO || item.nroInterno || item['HOJA DE RUTA-NRO INTERNO'] || '',
      nCotizacion: item.N_COTIZACION || item.nCotizacion || '',
      trabajoRealizar: item.TRABAJO_A_REALIZAR || item.trabajoRealizar || 'REPARACION',
      estado: estado.includes('PLANTA') ? 'PLANTA' : estado.includes('BAJA') ? 'BAJA' : 'ENTREGADO',
      fechaComprometida: item.FECHA_COMPROMETIDA || item.fechaComprometida || '',
      fechaTT: item.FECHA_TT || item.fechaTT || '',
      controlEntrega: item.CONTROL_ENTREGA || item.controlEntrega || '',
      remitoSalida: item.REMITO_SALIDA || item.remitoSalida || '',
      fechaRetiro: item.FECHA_RETIRO || item.fechaRetiro || '',
      precio,
      precioFormatted: formatCurrency(precio),
      oc: item.OC || item.oc || '',
      factura: item.FACTURA || item.factura || '',
      fechaFactura: item.FECHA_FACTURA || item.fechaFactura || '',
      hess: item.HESS || item.hess || '',
      diasProceso,
      diasRetiro,
      diasAtraso,
      periodoYear,
      periodoMonth,
    };
  });
}

// Export data to CSV
export function exportToCsv(records: OtrRecord[], filename = 'bailac_otr_export.csv') {
  const headers = [
    'CLIENTE', 'FECHA INGRESO', 'REMITO INGRESO', 'MARCA', 'MEDIDA', 'SERIE',
    'SOLPED', 'NRO INTERNO', 'TRABAJO', 'ESTADO', 'FECHA COMPROMETIDA', 'FECHA TT',
    'FECHA RETIRO', 'PRECIO USD', 'OC', 'FACTURA', 'DIAS PROCESO', 'DIAS ATRASO'
  ];

  const rows = records.map(r => [
    `"${r.cliente}"`,
    `"${r.fechaIngreso}"`,
    `"${r.remitoIngreso}"`,
    `"${r.marca}"`,
    `"${r.medida}"`,
    `"${r.serie}"`,
    `"${r.solped}"`,
    `"${r.nroInterno}"`,
    `"${r.trabajoRealizar}"`,
    `"${r.estado}"`,
    `"${r.fechaComprometida}"`,
    `"${r.fechaTT}"`,
    `"${r.fechaRetiro}"`,
    r.precio,
    `"${r.oc}"`,
    `"${r.factura}"`,
    r.diasProceso ?? '',
    r.diasAtraso ?? ''
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
