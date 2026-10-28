import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarController,
  DoughnutController,
  Filler,
} from 'chart.js';
import {
  DollarSign,
  Package,
  Wrench,
  CheckCircle2,
  Clock,
  Filter,
  Download,
  Search,
  Building2,
  Briefcase,
  PlusCircle,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  Check,
  Eye,
  AlertCircle,
  Calendar,
  X,
  Loader2,
} from 'lucide-react';
import { OtrRecord, FilterState } from '../types';
import {
  calculateManagementKPIs,
  filterRecords,
  formatCurrency,
  exportToCsv,
  formatDateDisplay,
  parseDate,
} from '../services/dataService';
import { ExportEnvioModal } from './ExportEnvioModal';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  LineController,
  ArcElement,
  BarController,
  DoughnutController,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ManagementViewProps {
  records: OtrRecord[];
  onSelectRecord: (record: OtrRecord) => void;
  onOpenCreateRecord?: () => void;
  onSaveRecord?: (record: OtrRecord, action?: 'create' | 'update' | 'update_invoice') => Promise<boolean>;
  tvMode: boolean;
}

export const ManagementView: React.FC<ManagementViewProps> = ({
  records,
  onSelectRecord,
  onOpenCreateRecord,
  onSaveRecord,
  tvMode,
}) => {
  // Current calendar year (e.g. 2026)
  const currentCalendarYear = useMemo(() => new Date().getFullYear().toString(), []);

  // Period options extracted from records
  const periodosList = useMemo(() => {
    const years = new Set<string>();
    records.forEach((r) => {
      if (r.periodoYear) years.add(r.periodoYear.toString());
    });
    return Array.from(years).sort().reverse();
  }, [records]);

  // Default year: current calendar year if present in records, otherwise latest available
  const defaultYear = useMemo(() => {
    if (periodosList.includes(currentCalendarYear)) return currentCalendarYear;
    return periodosList[0] || currentCalendarYear;
  }, [periodosList, currentCalendarYear]);

  // Filters: default selected year is the current calendar year (no "Todos")
  const [selectedYears, setSelectedYears] = useState<string[]>([currentCalendarYear]);

  // Synchronize if periodosList updates and selectedYears is empty
  useEffect(() => {
    if (periodosList.length > 0 && selectedYears.length === 0) {
      setSelectedYears([defaultYear]);
    }
  }, [periodosList, defaultYear, selectedYears.length]);

  const [clienteFilter, setClienteFilter] = useState('ALL');
  const [marcaFilter, setMarcaFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExportEnvioOpen, setIsExportEnvioOpen] = useState<boolean>(false);

  // Quick invoice inputs for pending module
  const [invoiceInputs, setInvoiceInputs] = useState<Record<string, string>>({});
  const [savingInvoiceId, setSavingInvoiceId] = useState<string | null>(null);

  // Dedicated year filter & search for Pendientes de Facturación module
  const [pendientesYearFilter, setPendientesYearFilter] = useState<string>('SYNC');
  const [pendientesSearchTerm, setPendientesSearchTerm] = useState<string>('');

  // Effective years for pending invoices
  const activePendientesYears = useMemo(() => {
    if (pendientesYearFilter === 'SYNC') {
      return selectedYears.length > 0 ? selectedYears : [currentCalendarYear];
    }
    return [pendientesYearFilter];
  }, [pendientesYearFilter, selectedYears, currentCalendarYear]);

  // Tooltip state for KPI 5: Pendientes
  const [showPendientesTooltip, setShowPendientesTooltip] = useState(false);
  const pendientesTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handlePendientesMouseEnter = () => {
    if (pendientesTooltipTimeoutRef.current) {
      clearTimeout(pendientesTooltipTimeoutRef.current);
    }
    setShowPendientesTooltip(true);
  };

  const handlePendientesMouseLeave = () => {
    pendientesTooltipTimeoutRef.current = setTimeout(() => {
      setShowPendientesTooltip(false);
    }, 200);
  };

  const clientesList = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => r.cliente && set.add(r.cliente));
    return Array.from(set).sort();
  }, [records]);

  const marcasList = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => r.marca && set.add(r.marca));
    return Array.from(set).sort();
  }, [records]);

  // Filtered records
  const filters: FilterState = useMemo(
    () => ({
      cliente: clienteFilter,
      marca: marcaFilter,
      estado: 'ALL',
      trabajo: 'ALL',
      periodo: selectedYears.length === 1 ? selectedYears[0] : 'ALL',
      periodos: selectedYears.length > 0 ? selectedYears : undefined,
      selectedYears: selectedYears.length > 0 ? selectedYears : undefined,
      search: searchTerm,
    }),
    [clienteFilter, marcaFilter, selectedYears, searchTerm]
  );

  const filteredRecords = useMemo(() => filterRecords(records, filters), [records, filters]);
  const kpis = useMemo(() => calculateManagementKPIs(filteredRecords), [filteredRecords]);
  const pendientesRecords = useMemo(() => {
    return filteredRecords.filter((r) => r.estado === 'PLANTA');
  }, [filteredRecords]);

  // Chart Canvas Refs (Rediseño Gerencial)
  const chartEvolucionFacturacionRef = useRef<HTMLCanvasElement | null>(null);
  const chartTopClientesRef = useRef<HTMLCanvasElement | null>(null);
  const chartFacturacionMarcaRef = useRef<HTMLCanvasElement | null>(null);

  const chartEvolucionFacturacionInst = useRef<ChartJS | null>(null);
  const chartTopClientesInst = useRef<ChartJS | null>(null);
  const chartFacturacionMarcaInst = useRef<ChartJS | null>(null);

  // Month labels for 12 months
  const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const MONTH_FULL = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Helper to extract month index (0 to 11) from record
  const getRecordMonthIndex = (r: OtrRecord): number | null => {
    if (r.periodoMonth) {
      const parts = r.periodoMonth.split('-');
      if (parts.length === 2) {
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(m) && m >= 0 && m <= 11) return m;
      }
    }
    const dStr = r.fechaFactura || r.fechaTT || r.fechaIngreso;
    if (dStr) {
      const parts = dStr.includes('/') ? dStr.split('/') : dStr.split('-');
      if (parts.length === 3) {
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(m) && m >= 0 && m <= 11) return m;
      }
    }
    return null;
  };

  // 1. Data for Gráfico Principal Superior: "Evolución Mensual de Facturación ($ USD/ARS)"
  const evolucionFacturacionData = useMemo(() => {
    const allYears = Array.from(
      new Set(records.map((r) => r.periodoYear).filter(Boolean) as number[])
    ).sort((a, b) => b - a);

    const activeYear = allYears[0] || 2026;
    const targetYears = selectedYears.length > 0
      ? allYears.filter((y) => selectedYears.includes(y.toString()))
      : allYears;

    const currentYear = targetYears.includes(activeYear) ? activeYear : (targetYears[0] || activeYear);

    const yearMaps: Record<number, number[]> = {};
    targetYears.forEach((y) => {
      yearMaps[y] = new Array(12).fill(0);
    });

    records.forEach((r) => {
      if (r.precio <= 0) return;
      if (clienteFilter !== 'ALL' && r.cliente !== clienteFilter) return;
      if (marcaFilter !== 'ALL' && r.marca !== marcaFilter) return;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const match =
          r.cliente.toLowerCase().includes(q) ||
          r.nCotizacion.toLowerCase().includes(q) ||
          r.oc.toLowerCase().includes(q) ||
          r.factura.toLowerCase().includes(q) ||
          r.serie.toLowerCase().includes(q);
        if (!match) return;
      }

      const y = r.periodoYear;
      if (y && yearMaps[y]) {
        const m = getRecordMonthIndex(r);
        if (m !== null) {
          yearMaps[y][m] += r.precio;
        }
      }
    });

    const datasets = targetYears.map((y, idx) => {
      const isCurrent = y === currentYear;
      if (isCurrent) {
        return {
          label: `${y} (Año Actual)`,
          data: yearMaps[y].map((v) => Math.round(v)),
          borderColor: '#F97316',
          backgroundColor: 'rgba(249, 115, 22, 0.08)',
          borderWidth: 3.5,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointBackgroundColor: '#F97316',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
          fill: true,
          tension: 0.35,
          order: 1,
        };
      } else {
        const grayPalette = ['#64748B', '#94A3B8', '#CBD5E1'];
        const grayColor = grayPalette[idx % grayPalette.length];
        return {
          label: `${y} (YoY)`,
          data: yearMaps[y].map((v) => Math.round(v)),
          borderColor: grayColor,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 3.5,
          pointHoverRadius: 6,
          pointBackgroundColor: grayColor,
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 1.5,
          fill: false,
          tension: 0.35,
          order: 2 + idx,
        };
      }
    });

    return { labels: MONTH_LABELS, datasets, currentYear };
  }, [records, selectedYears, clienteFilter, marcaFilter, searchTerm]);

  // 2. Data for Gráfico Inferior 1: "Top Clientes por Facturación" (Barras horizontales descendentes)
  const topClientesChartData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRecords.forEach((r) => {
      if (r.precio > 0 && r.cliente) {
        map[r.cliente] = (map[r.cliente] || 0) + r.precio;
      }
    });

    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const labels = sorted.map(([k]) => k);
    const data = sorted.map(([, v]) => Math.round(v));
    return { labels, data };
  }, [filteredRecords]);

  // 3. Data for Gráfico Inferior 2: "Facturación por Marca" (Barras reemplazando la dona)
  const facturacionMarcaChartData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRecords.forEach((r) => {
      if (r.precio > 0) {
        const key = r.marca || 'S/M';
        map[key] = (map[key] || 0) + r.precio;
      }
    });

    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const labels = sorted.map(([k]) => k);
    const data = sorted.map(([, v]) => Math.round(v));
    const colors = ['#0F172A', '#1E293B', '#334155', '#475569', '#64748B', '#0F766E', '#F97316', '#EAB308'];
    return { labels, data, colors: colors.slice(0, labels.length) };
  }, [filteredRecords]);

  // Initialize and update Chart.js instances
  useEffect(() => {
    // 1. Gráfico Superior: Evolución Mensual de Facturación ($ USD/ARS) - Line Chart
    if (chartEvolucionFacturacionRef.current) {
      chartEvolucionFacturacionInst.current?.destroy();
      chartEvolucionFacturacionInst.current = new ChartJS(chartEvolucionFacturacionRef.current, {
        type: 'line',
        data: {
          labels: evolucionFacturacionData.labels,
          datasets: evolucionFacturacionData.datasets,
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: {
            legend: {
              position: 'top',
              align: 'end',
              labels: {
                boxWidth: 12,
                boxHeight: 3,
                usePointStyle: false,
                font: { family: 'Plus Jakarta Sans', size: 11, weight: 'bold' },
                padding: 14,
              },
            },
            tooltip: {
              callbacks: {
                title: (items) => {
                  const idx = items[0]?.dataIndex ?? 0;
                  return `${MONTH_FULL[idx] || ''} - Facturación Registrada`;
                },
                label: (ctx) => {
                  const idx = ctx.dataIndex;
                  const dataArr = (ctx.dataset.data as number[]) || [];
                  const individualVal = Number(ctx.parsed.y ?? 0);
                  const ytdVal = dataArr.slice(0, idx + 1).reduce((acc, v) => acc + (v || 0), 0);
                  return ` ${ctx.dataset.label}: ${formatCurrency(individualVal)} | Acumulado YTD: ${formatCurrency(ytdVal)}`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: { color: '#f1f5f9' },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 11, weight: 'bold' } },
            },
            y: {
              beginAtZero: true,
              grid: { color: '#f1f5f9' },
              ticks: {
                callback: (val) => `$${(Number(val) / 1000).toLocaleString()}k`,
                font: { family: 'Plus Jakarta Sans', size: 10 },
              },
              title: {
                display: true,
                text: 'Facturación ($)',
                font: { family: 'Plus Jakarta Sans', size: 11, weight: 'bold' },
                color: '#64748B',
              },
            },
          },
        },
      });
    }

    // 2. Gráfico Inferior 1: Top Clientes por Facturación (Horizontal Bar descendente)
    if (chartTopClientesRef.current) {
      chartTopClientesInst.current?.destroy();
      chartTopClientesInst.current = new ChartJS(chartTopClientesRef.current, {
        type: 'bar',
        data: {
          labels: topClientesChartData.labels,
          datasets: [
            {
              label: 'Facturación Total',
              data: topClientesChartData.data,
              backgroundColor: '#F97316',
              borderRadius: 6,
              barThickness: 16,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${formatCurrency(Number(ctx.parsed.x ?? 0))}`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: '#f1f5f9' },
              ticks: {
                callback: (val) => `$${(Number(val) / 1000).toLocaleString()}k`,
                font: { family: 'Plus Jakarta Sans', size: 10 },
              },
              title: { display: true, text: 'Total Facturado ($)', font: { size: 10 } },
            },
            y: {
              grid: { display: false },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 11, weight: 'bold' } },
            },
          },
        },
      });
    }

    // 3. Gráfico Inferior 2: Facturación por Marca (Barras reemplazando dona)
    if (chartFacturacionMarcaRef.current) {
      chartFacturacionMarcaInst.current?.destroy();
      chartFacturacionMarcaInst.current = new ChartJS(chartFacturacionMarcaRef.current, {
        type: 'bar',
        data: {
          labels: facturacionMarcaChartData.labels,
          datasets: [
            {
              label: 'Facturación por Marca',
              data: facturacionMarcaChartData.data,
              backgroundColor: '#0F172A',
              borderRadius: 6,
              barThickness: 20,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${formatCurrency(Number(ctx.parsed.y ?? 0))}`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 11, weight: 'bold' } },
            },
            y: {
              beginAtZero: true,
              grid: { color: '#f1f5f9' },
              ticks: {
                callback: (val) => `$${(Number(val) / 1000).toLocaleString()}k`,
                font: { family: 'Plus Jakarta Sans', size: 10 },
              },
              title: { display: true, text: 'Facturación ($)', font: { size: 10 } },
            },
          },
        },
      });
    }

    return () => {
      chartEvolucionFacturacionInst.current?.destroy();
      chartTopClientesInst.current?.destroy();
      chartFacturacionMarcaInst.current?.destroy();
    };
  }, [evolucionFacturacionData, topClientesChartData, facturacionMarcaChartData]);

  // Summary breakdown by Client for executive review
  const clientBreakdown = useMemo(() => {
    const map: Record<
      string,
      { count: number; totalBilled: number; delivered: number; inPlant: number }
    > = {};

    filteredRecords.forEach((r) => {
      const c = r.cliente || 'Otros';
      if (!map[c]) {
        map[c] = { count: 0, totalBilled: 0, delivered: 0, inPlant: 0 };
      }
      map[c].count += 1;
      map[c].totalBilled += r.precio;
      if (r.estado === 'ENTREGADO') map[c].delivered += 1;
      if (r.estado === 'PLANTA') map[c].inPlant += 1;
    });

    return Object.entries(map)
      .map(([cliente, stats]) => ({
        cliente,
        ...stats,
        avgTicket: stats.count > 0 ? stats.totalBilled / stats.count : 0,
        fulfillmentRate: stats.count > 0 ? Math.round((stats.delivered / stats.count) * 100) : 0,
      }))
      .sort((a, b) => b.totalBilled - a.totalBilled);
  }, [filteredRecords]);

  // Módulo de Neumáticos Pendientes de Facturación con filtro por año y reglas por cliente
  const pendientesFacturacion = useMemo(() => {
    return records
      .filter((r) => {
        // 0. Filtro por Año: evita cargar cientos de pendientes históricos sin facturar de años anteriores
        const recordYear = r.periodoYear?.toString();
        if (
          activePendientesYears.length > 0 &&
          (!recordYear || !activePendientesYears.includes(recordYear))
        ) {
          return false;
        }

        // Un neumático se considera facturado si tiene cargado el campo FACTURA
        const fac = (r.factura || '').trim();
        if (fac !== '' && fac !== '-') return false;

        // Búsqueda opcional en el módulo de pendientes
        if (pendientesSearchTerm) {
          const q = pendientesSearchTerm.toLowerCase().trim();
          const matches =
            r.serie.toLowerCase().includes(q) ||
            r.cliente.toLowerCase().includes(q) ||
            (r.hess && r.hess.toLowerCase().includes(q)) ||
            (r.solped && r.solped.toLowerCase().includes(q)) ||
            (r.oc && r.oc.toLowerCase().includes(q)) ||
            (r.medida && r.medida.toLowerCase().includes(q));
          if (!matches) return false;
        }

        const cli = (r.cliente || '').toUpperCase();
        const hasRetiro = Boolean((r.fechaRetiro || '').trim());
        const hasHes = Boolean((r.hess || '').trim());

        // 1. Cliente VELADERO: Se incluye únicamente si tiene cargado HES Y FECHA RETIRO
        if (cli.includes('VELADERO')) {
          return hasHes && hasRetiro;
        }
        // 2. Cliente CERRO VANGUARDIA: Se incluye únicamente si tiene cargada FECHA RETIRO
        else if (cli.includes('CERRO VANGUARDIA') || cli.includes('VANGUARDIA')) {
          return hasRetiro;
        }
        // 3. Demás Clientes: Regla estándar (sin factura asignada y entregados / terminados en taller)
        else {
          return r.estado === 'ENTREGADO' || hasRetiro || Boolean((r.fechaTT || '').trim());
        }
      })
      .sort((a, b) => {
        const timeA = parseDate(a.fechaRetiro || a.fechaIngreso)?.getTime() ?? 0;
        const timeB = parseDate(b.fechaRetiro || b.fechaIngreso)?.getTime() ?? 0;
        return timeB - timeA;
      });
  }, [records, activePendientesYears, pendientesSearchTerm]);

  // Manejador de guardado rápido de factura con verificación en Google Sheets
  const handleSaveInvoice = async (r: OtrRecord) => {
    if (savingInvoiceId) return;
    const val = (invoiceInputs[r.id] || '').trim();
    if (!val) return;

    setSavingInvoiceId(r.id);
    try {
      const today = new Date();
      const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
      const updatedRecord: OtrRecord = {
        ...r,
        factura: val,
        fechaFactura: r.fechaFactura && r.fechaFactura.trim() ? r.fechaFactura : todayStr,
      };
      if (onSaveRecord) {
        const ok = await onSaveRecord(updatedRecord, 'update_invoice');
        if (ok) {
          setInvoiceInputs((prev) => {
            const copy = { ...prev };
            delete copy[r.id];
            return copy;
          });
        }
      }
    } finally {
      setSavingInvoiceId(null);
    }
  };

  return (
    <div className={`space-y-6 ${tvMode ? 'tv-active' : ''}`}>
      {/* Management Filters Bar (Hidden in TV Mode for clean professional TV view) */}
      {!tvMode && (
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider shrink-0 mr-1">
              <Filter className="w-3.5 h-3.5 text-orange-500" />
              <span>Filtros Gerenciales:</span>
            </span>

            {/* Filtro de Años (Sin opción "Todos", Año Actual por defecto) */}
            <div className="flex items-center gap-1.5 flex-wrap p-1 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] font-bold text-slate-500 uppercase px-1.5">Año:</span>
              {periodosList.map((p) => {
                const isSelected = selectedYears.includes(p);
                const isCurrent = p === currentCalendarYear;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setSelectedYears((prev) => {
                        if (prev.includes(p)) {
                          // Prevent unselecting all (keep at least one year active)
                          const next = prev.filter((y) => y !== p);
                          return next.length > 0 ? next : [p];
                        } else {
                          return [...prev, p];
                        }
                      });
                    }}
                    className={`px-2.5 py-1 text-xs font-bold font-mono rounded-md transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-xs ring-1 ring-orange-500'
                        : 'text-slate-700 bg-white hover:bg-slate-100 border border-slate-200/80'
                    }`}
                    title={`Filtrar por año ${p}${isCurrent ? ' (Año Actual)' : ''}`}
                  >
                    <span>{p}</span>
                    {isCurrent && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                          isSelected ? 'bg-orange-500/30 text-orange-300' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Actual
                      </span>
                    )}
                    {isSelected && <span className="text-orange-400 font-bold">✓</span>}
                  </button>
                );
              })}
            </div>

            {/* Cliente Dropdown */}
            <select
              value={clienteFilter}
              onChange={(e) => setClienteFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">Todos los Clientes ({clientesList.length})</option>
              {clientesList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Marca Dropdown */}
            <select
              value={marcaFilter}
              onChange={(e) => setMarcaFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">Todas las Marcas ({marcasList.length})</option>
              {marcasList.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {/* Search Term */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar cotización, OC, factura..."
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Clear and Export */}
          <div className="flex items-center gap-2">
            {((selectedYears.length !== 1 || selectedYears[0] !== defaultYear) ||
              clienteFilter !== 'ALL' ||
              marcaFilter !== 'ALL' ||
              searchTerm) && (
              <button
                onClick={() => {
                  setSelectedYears([defaultYear]);
                  setClienteFilter('ALL');
                  setMarcaFilter('ALL');
                  setSearchTerm('');
                }}
                className="text-xs font-medium text-slate-500 hover:text-slate-900 px-2 py-1"
              >
                Restablecer
              </button>
            )}

            {onOpenCreateRecord && (
              <button
                onClick={onOpenCreateRecord}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded-lg shadow-sm transition-all whitespace-nowrap"
                title="Registrar un nuevo neumático en la base"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Nuevo Registro</span>
              </button>
            )}

            <button
              onClick={() => setIsExportEnvioOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg transition-colors whitespace-nowrap shadow-xs"
              title="Exportar lote de envío a Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline font-bold">Exportar Envío</span>
            </button>
          </div>
        </div>
      )}

      {/* 5 KPIs Superiores Modo Gestión con Fórmulas Explicativas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Facturación Total */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Facturación ($)
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`font-mono font-extrabold text-slate-900 ${tvMode ? 'text-2xl' : 'text-xl'}`}>
                {formatCurrency(kpis.facturacionTotal)}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Calculado: Suma del campo PRECIO de registros filtrados</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Neumáticos */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Neumáticos
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`font-mono font-extrabold text-slate-900 ${tvMode ? 'text-4xl' : 'text-3xl'}`}>
                {kpis.totalNeumaticos}
              </span>
              <span className="text-xs font-semibold text-slate-500">unid.</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Calculado: Total unidades registradas en el período</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Trabajos */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Trabajos
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`font-mono font-extrabold text-slate-900 ${tvMode ? 'text-4xl' : 'text-3xl'}`}>
                {kpis.totalTrabajos}
              </span>
              <span className="text-xs font-semibold text-slate-500">servicios</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Calculado: Total servicios (Reparación / Recauchaje / L4-L5)</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <Wrench className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Entregados */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Entregados
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`font-mono font-extrabold text-emerald-600 ${tvMode ? 'text-4xl' : 'text-3xl'}`}>
                {kpis.entregados}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                ({Math.round((kpis.entregados / Math.max(1, kpis.totalNeumaticos)) * 100)}%)
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Calculado: Neumáticos con estado ENTREGADO o retiro cliente</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 5: Pendientes (con Tooltip Interactivo al pasar el cursor) */}
        <div
          className="relative p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-amber-400 hover:shadow-md transition-all group"
          onMouseEnter={handlePendientesMouseEnter}
          onMouseLeave={handlePendientesMouseLeave}
          onClick={() => setShowPendientesTooltip((prev) => !prev)}
          title="Pasa el mouse o haz clic para ver la lista de neumáticos pendientes"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Pendientes
              </span>
              <span className="text-[9px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold border border-amber-200 flex items-center gap-0.5 shadow-2xs">
                <Eye className="w-2.5 h-2.5 text-amber-600" /> Hover
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`font-mono font-extrabold text-amber-600 ${tvMode ? 'text-4xl' : 'text-3xl'}`}>
                {kpis.pendientes}
              </span>
              <span className="text-xs font-semibold text-slate-500">en taller</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Calculado: Unidades en taller o pendientes de facturación/retiro</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
            <Clock className="w-6 h-6" />
          </div>

          {/* Tooltip Emergente al pasar el mouse */}
          {showPendientesTooltip && (
            <div
              className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 p-4 z-50 animate-fadeIn cursor-default text-left"
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={handlePendientesMouseEnter}
              onMouseLeave={handlePendientesMouseLeave}
            >
              {/* Top Accent line */}
              <div className="absolute top-0 left-4 right-4 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 rounded-t-full" />

              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white tracking-wide">
                      Neumáticos Pendientes en Taller
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Unidades activas con estado PLANTA
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                  {pendientesRecords.length} unid.
                </span>
              </div>

              {/* List of items */}
              <div className="mt-2.5 max-h-72 overflow-y-auto space-y-2 pr-1 text-xs">
                {pendientesRecords.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    No hay neumáticos pendientes en este período.
                  </div>
                ) : (
                  pendientesRecords.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => {
                        setShowPendientesTooltip(false);
                        onSelectRecord(r);
                      }}
                      className="p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700/70 hover:border-amber-500/70 cursor-pointer transition-all group/item shadow-2xs"
                      title="Haz clic para ver la ficha completa"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Serie:</span>
                          <span className="font-mono font-bold text-amber-300 text-xs truncate group-hover/item:text-orange-400">
                            {r.serie || 'S/N'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-300 font-mono shrink-0 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-700/60">
                          <Calendar className="w-2.5 h-2.5 text-amber-400" />
                          <span>{formatDateDisplay(r.fechaIngreso) || '—'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-1 text-[11px]">
                        <div className="truncate">
                          <span className="text-slate-400 text-[10px]">Cliente: </span>
                          <span className="font-bold text-white">{r.cliente}</span>
                        </div>
                        {r.precio > 0 && (
                          <span className="text-orange-400 font-mono text-[10px] font-bold shrink-0">
                            {r.precioFormatted || formatCurrency(r.precio)}
                          </span>
                        )}
                      </div>

                      {r.trabajoRealizar && (
                        <div className="text-[10px] text-slate-400 mt-1 truncate">
                          <span>Trabajo: </span>
                          <span className="text-slate-300 font-medium">{r.trabajoRealizar}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Tooltip Footer */}
              <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                <span>Haz clic en una fila para ver el detalle</span>
                <span className="font-mono text-amber-400 font-semibold">{pendientesRecords.length} en taller</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN DE GRÁFICOS REDISEÑADA PARA GERENCIA */}
      <div className="space-y-6">
        {/* Gráfico Principal Superior (Ocupa todo el ancho): Evolución Mensual de Facturación ($ USD/ARS) */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col w-full">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-600" />
                <span>Evolución Mensual de Facturación ($ USD/ARS)</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Monto facturado mes a mes (Ene - Dic) con análisis comparativo de crecimiento YoY (Línea naranja {evolucionFacturacionData.currentYear} vs. años anteriores)
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-50 text-orange-700 border border-orange-200">
                <span className="w-3 h-1 bg-orange-500 rounded-full inline-block"></span>
                <span>Año {evolucionFacturacionData.currentYear} (Activo)</span>
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 border border-slate-200">
                <span className="w-3 h-0.5 border-t border-dashed border-slate-400 inline-block"></span>
                <span>Años Anteriores (YoY)</span>
              </span>
            </div>
          </div>
          <div className="relative h-64 sm:h-72 w-full">
            <canvas ref={chartEvolucionFacturacionRef} />
          </div>
        </div>

        {/* Gráficos Inferiores (2 Columnas Ocupando el Ancho Inferior) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. "Top Clientes por Facturación" (Barras horizontales descendentes) */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-orange-500" />
                <span>Top Clientes por Facturación</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">Ranking Descendente</span>
            </div>
            <div className="relative h-64 sm:h-72 w-full">
              <canvas ref={chartTopClientesRef} />
            </div>
          </div>

          {/* 2. "Facturación por Marca" (Gráfico de barras de distribución por marca, reemplazando la dona) */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-900" />
                <span>Facturación por Marca</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">Distribución por Fabricante</span>
            </div>
            <div className="relative h-64 sm:h-72 w-full">
              <canvas ref={chartFacturacionMarcaRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Módulo: Neumáticos Pendientes de Facturación */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Neumáticos Pendientes de Facturación
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {pendientesFacturacion.length} listos
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  Año: {activePendientesYears.join(', ')}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Criterios: Veladero (HES + Fecha Retiro), Cerro Vanguardia (Fecha Retiro), Demás (Entregados/Terminados).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filtro por Año dedicado para Pendientes de Facturación */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1 text-xs">
              <Calendar className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span className="text-slate-400 text-[11px] font-medium">Filtrar Año:</span>
              <select
                value={pendientesYearFilter}
                onChange={(e) => setPendientesYearFilter(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer text-xs pr-1"
                title="Filtrar pendientes por año específico para omitir históricos sin facturar"
              >
                <option value="SYNC" className="bg-slate-900 text-white">
                  Sincronizado con Pantalla ({selectedYears.join(', ')})
                </option>
                {periodosList.map((y) => (
                  <option key={y} value={y} className="bg-slate-900 text-white">
                    Año {y}{y === currentCalendarYear ? ' (Actual)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Buscador rápido de pendientes */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={pendientesSearchTerm}
                onChange={(e) => setPendientesSearchTerm(e.target.value)}
                placeholder="Buscar serie, cliente..."
                className="bg-slate-800/90 border border-slate-700 text-white placeholder-slate-400 text-xs rounded-lg pl-8 pr-7 py-1 focus:outline-none focus:ring-1 focus:ring-orange-500 w-44"
              />
              {pendientesSearchTerm && (
                <button
                  type="button"
                  onClick={() => setPendientesSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3.5 whitespace-nowrap">Cliente</th>
                <th className="py-3 px-3 whitespace-nowrap">Envío</th>
                <th className="py-3 px-3 whitespace-nowrap">Serie</th>
                <th className="py-3 px-3 whitespace-nowrap">Medida</th>
                <th className="py-3 px-3 whitespace-nowrap">Trabajo</th>
                <th className="py-3 px-3 whitespace-nowrap">SOLPED</th>
                <th className="py-3 px-3 whitespace-nowrap">HES</th>
                <th className="py-3 px-3 whitespace-nowrap">O. C.</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">F. Retiro</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Tarifa ($)</th>
                <th className="py-3 px-3 whitespace-nowrap min-w-[200px]">Cargar N° Factura</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendientesFacturacion.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                      <p className="text-xs font-semibold text-slate-700">
                        Excelente: No hay neumáticos pendientes de facturación para el año {activePendientesYears.join(', ')}.
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-md">
                        {pendientesSearchTerm
                          ? `No se encontraron resultados para la búsqueda "${pendientesSearchTerm}".`
                          : 'Todos los neumáticos que cumplen criterios de despacho y validación administrativa ya cuentan con factura registrada en el año seleccionado.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pendientesFacturacion.map((r) => {
                  const currentInput = invoiceInputs[r.id] ?? '';
                  const isSaving = savingInvoiceId === r.id;

                  return (
                    <tr key={r.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="py-2.5 px-3.5 font-bold text-slate-900 whitespace-nowrap">
                        {r.cliente}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {r.envio || '—'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {r.serie || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {r.medida || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap">
                        {r.trabajoRealizar}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {r.solped || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 font-semibold whitespace-nowrap">
                        {r.hess ? (
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {r.hess}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {r.oc || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-center text-slate-800 font-semibold whitespace-nowrap">
                        {formatDateDisplay(r.fechaRetiro) || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-right font-bold text-orange-600 whitespace-nowrap">
                        {r.precioFormatted || formatCurrency(r.precio)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={currentInput}
                            disabled={isSaving}
                            onChange={(e) =>
                              setInvoiceInputs((prev) => ({
                                ...prev,
                                [r.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !savingInvoiceId && currentInput.trim()) {
                                e.preventDefault();
                                handleSaveInvoice(r);
                              }
                            }}
                            placeholder="Ej. B-00124..."
                            className="w-32 px-2 py-1 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveInvoice(r)}
                            disabled={!currentInput.trim() || Boolean(savingInvoiceId)}
                            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-all whitespace-nowrap"
                            title="Guardar factura en Google Sheets"
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                <span>Guardando en Google Sheets...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3 h-3 shrink-0" />
                                <span>Guardar</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => onSelectRecord(r)}
                          className="p-1 rounded hover:bg-orange-100 text-slate-500 hover:text-orange-600 transition-colors"
                          title="Abrir ficha completa del neumático"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla Resumen Gerencial por Cliente */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Consolidado Comercial por Cliente</h3>
            <p className="text-xs text-slate-400">Desglose de facturación, cumplimiento y unidades en planta</p>
          </div>
          <span className="text-xs font-mono font-bold text-orange-400">
            Total General: {formatCurrency(kpis.facturacionTotal)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Cliente Minero</th>
                <th className="py-3 px-3 text-right">Neumáticos</th>
                <th className="py-3 px-3 text-right">Facturación Total</th>
                <th className="py-3 px-3 text-right">Ticket Promedio</th>
                <th className="py-3 px-3 text-right">Entregados</th>
                <th className="py-3 px-3 text-right">En Planta</th>
                <th className="py-3 px-4 text-center">Cumplimiento (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clientBreakdown.map((row) => (
                <tr key={row.cliente} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 font-bold text-slate-900">{row.cliente}</td>
                  <td className="py-2.5 px-3 font-mono text-right text-slate-700 font-medium">
                    {row.count}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-right text-emerald-700">
                    {formatCurrency(row.totalBilled)}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-right text-slate-600">
                    {formatCurrency(row.avgTicket)}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-right text-slate-800">{row.delivered}</td>
                  <td className="py-2.5 px-3 font-mono text-right text-orange-600 font-semibold">
                    {row.inPlant}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full transition-all"
                          style={{ width: `${row.fulfillmentRate}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] font-bold text-slate-700 w-8 text-right">
                        {row.fulfillmentRate}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Exportación por Lote de Envío a Excel (.xlsx) */}
      <ExportEnvioModal
        isOpen={isExportEnvioOpen}
        onClose={() => setIsExportEnvioOpen(false)}
        records={filteredRecords}
      />
    </div>
  );
};
