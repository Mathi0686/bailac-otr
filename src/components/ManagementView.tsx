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
} from 'lucide-react';
import { OtrRecord, FilterState } from '../types';
import { calculateManagementKPIs, filterRecords, formatCurrency, exportToCsv } from '../services/dataService';

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
  tvMode: boolean;
}

export const ManagementView: React.FC<ManagementViewProps> = ({
  records,
  onSelectRecord,
  onOpenCreateRecord,
  tvMode,
}) => {
  // Filters
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [clienteFilter, setClienteFilter] = useState('ALL');
  const [marcaFilter, setMarcaFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Period options extracted from records
  const periodosList = useMemo(() => {
    const years = new Set<string>();
    records.forEach((r) => {
      if (r.periodoYear) years.add(r.periodoYear.toString());
    });
    return Array.from(years).sort().reverse();
  }, [records]);

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
                label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(Number(ctx.parsed.y ?? 0))}`,
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

            {/* Filtro Multi-Selección de Años */}
            <div className="flex items-center gap-1.5 flex-wrap p-1 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] font-bold text-slate-500 uppercase px-1.5">Años:</span>
              <button
                type="button"
                onClick={() => setSelectedYears([])}
                className={`px-2 py-0.5 text-xs font-bold rounded-md transition-all ${
                  selectedYears.length === 0
                    ? 'bg-orange-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                Todos
              </button>
              {periodosList.map((p) => {
                const isSelected = selectedYears.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setSelectedYears((prev) =>
                        prev.includes(p) ? prev.filter((y) => y !== p) : [...prev, p]
                      );
                    }}
                    className={`px-2 py-0.5 text-xs font-bold font-mono rounded-md transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-xs ring-1 ring-orange-500'
                        : 'text-slate-700 bg-white hover:bg-slate-100 border border-slate-200/80'
                    }`}
                    title={`Filtrar por año ${p} (haz clic para alternar)`}
                  >
                    {p}
                    {isSelected && <span className="ml-1 text-orange-400 font-bold">✓</span>}
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
            {(selectedYears.length > 0 || clienteFilter !== 'ALL' || marcaFilter !== 'ALL' || searchTerm) && (
              <button
                onClick={() => {
                  setSelectedYears([]);
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
              onClick={() => exportToCsv(filteredRecords, 'bailac_gestion_export.csv')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors whitespace-nowrap"
              title="Exportar datos financieros y gerenciales"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* 5 KPIs Superiores Modo Gestión */}
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
            <p className="text-[11px] text-slate-400 mt-1">Suma Columna PRECIO</p>
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
            <p className="text-[11px] text-slate-400 mt-1">Total registrados</p>
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
            <p className="text-[11px] text-slate-400 mt-1">Reparación / Recauchaje</p>
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
            <p className="text-[11px] text-slate-400 mt-1">Completados y retirados</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 5: Pendientes */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pendientes
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`font-mono font-extrabold text-amber-600 ${tvMode ? 'text-4xl' : 'text-3xl'}`}>
                {kpis.pendientes}
              </span>
              <span className="text-xs font-semibold text-slate-500">en taller</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Por facturar / retirar</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
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
    </div>
  );
};
