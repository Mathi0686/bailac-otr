export interface OtrRecord {
  id: string;
  cliente: string;
  fechaIngreso: string;
  remitoIngreso: string;
  marca: string;
  medida: string;
  serie: string;
  solped: string;
  disenioRecauchaje: string;
  disenioNeumatico: string;
  tipo: string;
  cantLote: string;
  nroInterno: string;
  nCotizacion: string;
  trabajoRealizar: string;
  estado: string; // 'ENTREGADO' | 'PLANTA' | 'BAJA'
  fechaComprometida: string;
  fechaTT: string;
  controlEntrega: string;
  remitoSalida: string;
  fechaRetiro: string;
  precio: number;
  precioFormatted: string;
  oc: string;
  factura: string;
  fechaFactura: string;
  hess: string;
  // Calculated metric fields
  diasProceso: number | null;
  diasRetiro: number | null;
  diasAtraso: number | null;
  periodoYear: number | null;
  periodoMonth: string | null;
}

export interface OperationsKPIs {
  diasPromedioProceso: number;
  diasPromedioRetiro: number;
  diasPromedioAtraso: number;
  enProceso: number;
  totalOperaciones: number;
}

export interface ManagementKPIs {
  facturacionTotal: number;
  totalNeumaticos: number;
  totalTrabajos: number;
  entregados: number;
  pendientes: number;
  bajas: number;
}

export interface FilterState {
  cliente: string;
  marca: string;
  estado: string;
  trabajo: string;
  periodo: string; // 'all' | '2026' | '2025' | '2024' etc.
  search: string;
}
