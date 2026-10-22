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
  Clock,
  Truck,
  AlertTriangle,
  Layers,
  Filter,
  Download,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  PlusCircle,
  Calendar,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { OtrRecord, FilterState } from '../types';
import { calculateOperationsKPIs, filterRecords, exportToCsv, formatDateDisplay, parseDate } from '../services/dataService';
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

interface OperationsViewProps {
  records: OtrRecord[];
  onSelectRecord: (record: OtrRecord) => void;
  onOpenCreateRecord: () => void;
  tvMode: boolean;
}

export const OperationsView: React.FC<OperationsViewProps> = ({
  records,
  onSelectRecord,
  onOpenCreateRecord,
  tvMode,
}) => {
  // Current calendar year (e.g. 2026)
  const currentCalendarYear = useMemo(() => new Date().getFullYear().toString(), []);

  // Available year periods extracted from records
  const periodosList = useMemo(() => {
    const years = new Set<string>();
    records.forEach((r) => {
      if (r.periodoYear) years.add(r.periodoYear.toString());
    });
    return Array.from(years).sort().reverse();
  }, [records]);

  // Default year: current calendar year if present in records, otherwise latest available year
  const defaultYear = useMemo(() => {
    if (periodosList.includes(currentCalendarYear)) return currentCalendarYear;
    return periodosList[0] || currentCalendarYear;
  }, [periodosList, currentCalendarYear]);

  // Filters: default selected year is the current calendar year (no "Todos")
  const [selectedYears, setSelectedYears] = useState<string[]>([currentCalendarYear]);

  // Synchronize if periodosList updates and selectedYears is empty or needs fallback
  useEffect(() => {
    if (periodosList.length > 0 && selectedYears.length === 0) {
      setSelectedYears([defaultYear]);
    }
  }, [periodosList, defaultYear, selectedYears.length]);

  const [clienteFilter, setClienteFilter] = useState('ALL');
  const [marcaFilter, setMarcaFilter] = useState('ALL');
  const [estadoFilter, setEstadoFilter] = useState('ALL');
  const [trabajoFilter, setTrabajoFilter] = useState('ALL');
  const [tableSearchTerm, setTableSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = tvMode ? 10 : 15;
  const [isExportEnvioOpen, setIsExportEnvioOpen] = useState(false);
  const [showEnProcesoTooltip, setShowEnProcesoTooltip] = useState(false);
  const enProcesoTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleEnProcesoMouseEnter = () => {
    if (enProcesoTooltipTimeoutRef.current) {
      clearTimeout(enProcesoTooltipTimeoutRef.current);
    }
    setShowEnProcesoTooltip(true);
  };

  const handleEnProcesoMouseLeave = () => {
    enProcesoTooltipTimeoutRef.current = setTimeout(() => {
      setShowEnProcesoTooltip(false);
    }, 200);
  };

  // Available filter options extracted from dataset
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

  const trabajosList = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.trabajoRealizar) {
        if (r.trabajoRealizar.toUpperCase().includes('REPAR')) set.add('REPARACION');
        else if (r.trabajoRealizar.toUpperCase().includes('RECUPERADO')) set.add('RECUPERADO');
        else if (r.trabajoRealizar.toUpperCase().includes('RECAUCH')) set.add('RECAUCHAJE');
        else if (r.trabajoRealizar.toUpperCase().includes('RECAP')) set.add('RECAPADO');
        else if (r.trabajoRealizar.toUpperCase().includes('BAJA')) set.add('BAJA');
        else set.add(r.trabajoRealizar);
      }
    });
    return Array.from(set).sort();
  }, [records]);

  // Filtered records
  const filters: FilterState = useMemo(
    () => ({
      cliente: clienteFilter,
      marca: marcaFilter,
      estado: estadoFilter,
      trabajo: trabajoFilter,
      periodo: selectedYears.length === 1 ? selectedYears[0] : 'ALL',
      periodos: selectedYears.length > 0 ? selectedYears : undefined,
      selectedYears: selectedYears.length > 0 ? selectedYears : undefined,
      search: tableSearchTerm,
    }),
    [clienteFilter, marcaFilter, estadoFilter, trabajoFilter, selectedYears, tableSearchTerm]
  );

  const filteredRecords = useMemo(() => filterRecords(records, filters), [records, filters]);
  const kpis = useMemo(() => calculateOperationsKPIs(filteredRecords), [filteredRecords]);
  const enProcesoRecords = useMemo(() => {
    return filteredRecords.filter((r) => r.estado === 'PLANTA');
  }, [filteredRecords]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [clienteFilter, marcaFilter, estadoFilter, trabajoFilter, selectedYears, tableSearchTerm]);

  // Chart Canvas Refs (Rediseño TV de Planta)
  const chartEvolucionMensualRef = useRef<HTMLCanvasElement | null>(null);
  const chartTiemposTrabajoRef = useRef<HTMLCanvasElement | null>(null);
  const chartEstadoActivoRef = useRef<HTMLCanvasElement | null>(null);
  const chartUnidadesPlantaClienteRef = useRef<HTMLCanvasElement | null>(null);

  const chartEvolucionMensualInstance = useRef<ChartJS | null>(null);
  const chartTiemposTrabajoInstance = useRef<ChartJS | null>(null);
  const chartEstadoActivoInstance = useRef<ChartJS | null>(null);
  const chartUnidadesPlantaClienteInstance = useRef<ChartJS | null>(null);

  // Month labels for 12 months
  const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const MONTH_FULL = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Helper to get month index (0 to 11) from record
  const getRecordMonthIndex = (r: OtrRecord): number | null => {
    if (r.periodoMonth) {
      const parts = r.periodoMonth.split('-');
      if (parts.length === 2) {
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(m) && m >= 0 && m <= 11) return m;
      }
    }
    const dStr = r.fechaIngreso || r.fechaTT || r.fechaFactura;
    if (dStr) {
      const parts = dStr.includes('/') ? dStr.split('/') : dStr.split('-');
      if (parts.length === 3) {
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(m) && m >= 0 && m <= 11) return m;
      }
    }
    return null;
  };

  // 1. Data for Gráfico Principal Superior: "Evolución Mensual de Trabajos (Ene - Dic)"
  const evolucionMensualData = useMemo(() => {
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
      if (clienteFilter !== 'ALL' && r.cliente !== clienteFilter) return;
      if (marcaFilter !== 'ALL' && r.marca !== marcaFilter) return;
      if (estadoFilter !== 'ALL' && r.estado !== estadoFilter) return;
      if (trabajoFilter !== 'ALL' && !r.trabajoRealizar.toUpperCase().includes(trabajoFilter.toUpperCase())) return;
      if (tableSearchTerm) {
        const q = tableSearchTerm.toLowerCase();
        const match =
          r.serie.toLowerCase().includes(q) ||
          r.nroInterno.toLowerCase().includes(q) ||
          r.cliente.toLowerCase().includes(q) ||
          r.remitoIngreso.toLowerCase().includes(q);
        if (!match) return;
      }

      const y = r.periodoYear;
      if (y && yearMaps[y]) {
        const m = getRecordMonthIndex(r);
        if (m !== null) {
          yearMaps[y][m]++;
        }
      }
    });

    const datasets = targetYears.map((y, idx) => {
      const isCurrent = y === currentYear;
      if (isCurrent) {
        return {
          label: `${y} (Año Actual)`,
          data: yearMaps[y],
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
          label: `${y}`,
          data: yearMaps[y],
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
  }, [records, selectedYears, clienteFilter, marcaFilter, estadoFilter, trabajoFilter, tableSearchTerm]);

  // 2. Data for Gráfico Inferior 1: "Tiempos Promedio por Tipo de Trabajo" (Barras horizontales: Reparación, Recauchaje, L4/L5)
  const tiemposTrabajoChartData = useMemo(() => {
    const map: Record<string, { totalDays: number; count: number }> = {
      'Reparación': { totalDays: 0, count: 0 },
      'Recauchaje': { totalDays: 0, count: 0 },
      'Recuperado L4': { totalDays: 0, count: 0 },
      'Recuperado L5': { totalDays: 0, count: 0 },
    };

    filteredRecords.forEach((r) => {
      if (r.diasProceso !== null && r.diasProceso >= 0) {
        const t = (r.trabajoRealizar || '').toUpperCase();
        if (t.includes('L5')) {
          map['Recuperado L5'].totalDays += r.diasProceso;
          map['Recuperado L5'].count++;
        } else if (t.includes('L4')) {
          map['Recuperado L4'].totalDays += r.diasProceso;
          map['Recuperado L4'].count++;
        } else if (t.includes('RECAUCH') || t.includes('RECAP')) {
          map['Recauchaje'].totalDays += r.diasProceso;
          map['Recauchaje'].count++;
        } else if (t.includes('REPAR')) {
          map['Reparación'].totalDays += r.diasProceso;
          map['Reparación'].count++;
        }
      }
    });

    const labels = Object.keys(map).filter((k) => map[k].count > 0);
    const data = labels.map((k) => Math.round(map[k].totalDays / Math.max(1, map[k].count)));
    return { labels, data };
  }, [filteredRecords]);

  // 3. Data for Gráfico Inferior 2: "Estado de Trabajos Activos" (Distribución En Planta, Entregados, Bajas)
  const estadoTrabajosActivosData = useMemo(() => {
    const counts = { PLANTA: 0, ENTREGADO: 0, BAJA: 0 };
    filteredRecords.forEach((r) => {
      const e = (r.estado || '').toUpperCase();
      if (e === 'PLANTA') counts.PLANTA++;
      else if (e === 'BAJA') counts.BAJA++;
      else counts.ENTREGADO++;
    });
    return {
      labels: ['En Planta (Proceso)', 'Entregados', 'Bajas Operacionales'],
      data: [counts.PLANTA, counts.ENTREGADO, counts.BAJA],
      colors: ['#F97316', '#0F766E', '#EF4444'],
      counts,
    };
  }, [filteredRecords]);

  // 4. Data for Gráfico Inferior 3: "Unidades en Planta por Cliente / Faena" (Barras horizontales ordenadas por volumen)
  const unidadesPlantaPorClienteData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRecords.forEach((r) => {
      const e = (r.estado || '').toUpperCase();
      if (e === 'PLANTA' && r.cliente) {
        map[r.cliente] = (map[r.cliente] || 0) + 1;
      }
    });

    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 7);
    const labels = sorted.map(([k]) => k);
    const data = sorted.map(([, v]) => v);
    return {
      labels,
      data,
      totalEnPlanta: Object.values(map).reduce((a, b) => a + b, 0),
    };
  }, [filteredRecords]);

  // Initialize and update Chart.js instances
  useEffect(() => {
    // 1. Gráfico Superior: Evolución Mensual de Trabajos (Line Chart)
    if (chartEvolucionMensualRef.current) {
      chartEvolucionMensualInstance.current?.destroy();
      chartEvolucionMensualInstance.current = new ChartJS(chartEvolucionMensualRef.current, {
        type: 'line',
        data: {
          labels: evolucionMensualData.labels,
          datasets: evolucionMensualData.datasets,
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
                  return `${MONTH_FULL[idx] || ''} - Trabajos Procesados`;
                },
                label: (ctx) => {
                  const idx = ctx.dataIndex;
                  const dataArr = (ctx.dataset.data as number[]) || [];
                  const individualVal = ctx.parsed.y;
                  const ytdVal = dataArr.slice(0, idx + 1).reduce((acc, v) => acc + (v || 0), 0);
                  return ` ${ctx.dataset.label}: ${individualVal} uds | Acumulado YTD: ${ytdVal} uds`;
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
                precision: 0,
                font: { family: 'Plus Jakarta Sans', size: 10 },
              },
              title: {
                display: true,
                text: 'Cantidad de Trabajos',
                font: { family: 'Plus Jakarta Sans', size: 11, weight: 'bold' },
                color: '#64748B',
              },
            },
          },
        },
      });
    }

    // 2. Gráfico Inferior 1: Tiempos Promedio por Tipo de Trabajo (Horizontal Bar)
    if (chartTiemposTrabajoRef.current) {
      chartTiemposTrabajoInstance.current?.destroy();
      chartTiemposTrabajoInstance.current = new ChartJS(chartTiemposTrabajoRef.current, {
        type: 'bar',
        data: {
          labels: tiemposTrabajoChartData.labels,
          datasets: [
            {
              label: 'Días Promedio',
              data: tiemposTrabajoChartData.data,
              backgroundColor: '#F97316',
              borderRadius: 6,
              barThickness: 18,
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
                label: (ctx) => ` ${ctx.parsed.x} días promedio de proceso`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: '#f1f5f9' },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 10 } },
              title: { display: true, text: 'Días de Proceso', font: { size: 10 } },
            },
            y: {
              grid: { display: false },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 11, weight: 'bold' } },
            },
          },
        },
      });
    }

    // 3. Gráfico Inferior 2: Estado de Trabajos Activos (Doughnut)
    if (chartEstadoActivoRef.current) {
      chartEstadoActivoInstance.current?.destroy();
      chartEstadoActivoInstance.current = new ChartJS(chartEstadoActivoRef.current, {
        type: 'doughnut',
        data: {
          labels: estadoTrabajosActivosData.labels,
          datasets: [
            {
              data: estadoTrabajosActivosData.data,
              backgroundColor: estadoTrabajosActivosData.colors,
              borderWidth: 2,
              borderColor: '#ffffff',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 10,
                padding: 10,
                font: { family: 'Plus Jakarta Sans', size: 11 },
              },
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${ctx.parsed} neumáticos`,
              },
            },
          },
        },
      });
    }

    // 4. Gráfico Inferior 3: Unidades en Planta por Cliente / Faena (Horizontal Bar)
    if (chartUnidadesPlantaClienteRef.current) {
      chartUnidadesPlantaClienteInstance.current?.destroy();
      chartUnidadesPlantaClienteInstance.current = new ChartJS(chartUnidadesPlantaClienteRef.current, {
        type: 'bar',
        data: {
          labels: unidadesPlantaPorClienteData.labels,
          datasets: [
            {
              label: 'Unidades en Planta',
              data: unidadesPlantaPorClienteData.data,
              backgroundColor: '#0F172A',
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
                label: (ctx) => ` ${ctx.parsed.x} neumáticos en planta`,
              },
            },
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: '#f1f5f9' },
              ticks: { precision: 0, font: { family: 'Plus Jakarta Sans', size: 10 } },
              title: { display: true, text: 'Unidades en Taller', font: { size: 10 } },
            },
            y: {
              grid: { display: false },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 11, weight: 'bold' } },
            },
          },
        },
      });
    }

    return () => {
      chartEvolucionMensualInstance.current?.destroy();
      chartTiemposTrabajoInstance.current?.destroy();
      chartEstadoActivoInstance.current?.destroy();
      chartUnidadesPlantaClienteInstance.current?.destroy();
    };
  }, [evolucionMensualData, tiemposTrabajoChartData, estadoTrabajosActivosData, unidadesPlantaPorClienteData]);

  // Ordenar la tabla operativa de monitoreo por Fecha de Ingreso con los más recientes primero
  const sortedMonitoringRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      const timeA = parseDate(a.fechaIngreso)?.getTime() ?? 0;
      const timeB = parseDate(b.fechaIngreso)?.getTime() ?? 0;
      if (timeB !== timeA) {
        return timeB - timeA; // Descendente: más recientes primero
      }
      return (b.serie || b.id).localeCompare(a.serie || a.id);
    });
  }, [filteredRecords]);

  // Pagination for high density table
  const totalPages = Math.max(1, Math.ceil(sortedMonitoringRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedMonitoringRecords.slice(start, start + pageSize);
  }, [sortedMonitoringRecords, currentPage, pageSize]);

  return (
    <div className={`space-y-6 ${tvMode ? 'tv-active' : ''}`}>
      {/* Filters Bar with Year Filter (Hidden in TV Mode for clean TV presentation) */}
      {!tvMode && (
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider shrink-0 mr-1">
              <Filter className="w-3.5 h-3.5 text-orange-500" />
              <span>Filtros Operativos:</span>
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

            {/* Estado Dropdown */}
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="PLANTA">EN PLANTA (Proceso)</option>
              <option value="ENTREGADO">ENTREGADO</option>
              <option value="BAJA">BAJA</option>
            </select>

            {/* Trabajo Dropdown */}
            <select
              value={trabajoFilter}
              onChange={(e) => setTrabajoFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">Todos los Trabajos</option>
              {trabajosList.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Action Controls: Add Record & Export */}
          <div className="flex items-center gap-2">
            {((selectedYears.length !== 1 || selectedYears[0] !== defaultYear) ||
              clienteFilter !== 'ALL' ||
              marcaFilter !== 'ALL' ||
              estadoFilter !== 'ALL' ||
              trabajoFilter !== 'ALL' ||
              tableSearchTerm) && (
              <button
                onClick={() => {
                  setSelectedYears([defaultYear]);
                  setClienteFilter('ALL');
                  setMarcaFilter('ALL');
                  setEstadoFilter('ALL');
                  setTrabajoFilter('ALL');
                  setTableSearchTerm('');
                }}
                className="text-xs font-medium text-slate-500 hover:text-slate-900 px-2 py-1"
              >
                Restablecer
              </button>
            )}

            <button
              onClick={onOpenCreateRecord}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded-lg shadow-sm transition-all whitespace-nowrap"
              title="Registrar un nuevo neumático en la base"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Nuevo Registro</span>
            </button>

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

      {/* 4 KPIs Superiores con Fórmulas Explicativas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Días Promedio Proceso */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Días Promedio Proceso
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`font-mono font-extrabold text-slate-900 ${tvMode ? 'text-4xl' : 'text-3xl'}`}>
                {kpis.diasPromedioProceso}
              </span>
              <span className="text-xs font-semibold text-slate-500">días</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Calculado: FECHA_TT vs FIT (Filtro estricto: requiere FIT)</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Días Promedio Retiro */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Días Promedio Retiro
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`font-mono font-extrabold text-slate-900 ${tvMode ? 'text-4xl' : 'text-3xl'}`}>
                {kpis.diasPromedioRetiro}
              </span>
              <span className="text-xs font-semibold text-slate-500">días</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Calculado: FECHA_RETIRO vs FIT (Filtro estricto: requiere ambos)</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Días Promedio Atraso */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Días Promedio Atraso
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`font-mono font-extrabold ${tvMode ? 'text-4xl' : 'text-3xl'} ${
                  kpis.diasPromedioAtraso > 0 ? 'text-red-600' : 'text-emerald-600'
                }`}
              >
                {kpis.diasPromedioAtraso}
              </span>
              <span className="text-xs font-semibold text-slate-500">días</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Calculado: Fecha Comprometida vs FTT / Término</p>
          </div>
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              kpis.diasPromedioAtraso > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: En Proceso (con Tooltip Interactivo al pasar el cursor) */}
        <div
          className="relative p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-amber-400 hover:shadow-md transition-all group"
          onMouseEnter={handleEnProcesoMouseEnter}
          onMouseLeave={handleEnProcesoMouseLeave}
          onClick={() => setShowEnProcesoTooltip((prev) => !prev)}
          title="Pasa el mouse o haz clic para ver la lista de neumáticos en proceso"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                En Proceso (Planta)
              </span>
              <span className="text-[9px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold border border-amber-200 flex items-center gap-0.5 shadow-2xs">
                <Eye className="w-2.5 h-2.5 text-amber-600" /> Hover
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`font-mono font-extrabold text-orange-600 ${tvMode ? 'text-4xl' : 'text-3xl'}`}>
                {kpis.enProceso}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                / {kpis.totalOperaciones} total
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Calculado: Total unidades activas con estado PLANTA</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
            <Layers className="w-6 h-6" />
          </div>

          {/* Tooltip Emergente al pasar el mouse */}
          {showEnProcesoTooltip && (
            <div
              className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 p-4 z-50 animate-fadeIn cursor-default text-left"
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={handleEnProcesoMouseEnter}
              onMouseLeave={handleEnProcesoMouseLeave}
            >
              {/* Top Accent line */}
              <div className="absolute top-0 left-4 right-4 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 rounded-t-full" />

              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white tracking-wide">
                      Neumáticos en Proceso (Planta)
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Unidades activas pendientes de finalización
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                  {enProcesoRecords.length} unid.
                </span>
              </div>

              {/* List of items */}
              <div className="mt-2.5 max-h-72 overflow-y-auto space-y-2 pr-1 text-xs">
                {enProcesoRecords.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    No hay neumáticos con estado PLANTA actualmente.
                  </div>
                ) : (
                  enProcesoRecords.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => {
                        setShowEnProcesoTooltip(false);
                        onSelectRecord(r);
                      }}
                      className="p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700/70 hover:border-orange-500/70 cursor-pointer transition-all group/item shadow-2xs"
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
                          <Calendar className="w-2.5 h-2.5 text-orange-400" />
                          <span>{formatDateDisplay(r.fechaIngreso) || '—'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-1 text-[11px]">
                        <div className="truncate">
                          <span className="text-slate-400 text-[10px]">Cliente: </span>
                          <span className="font-bold text-white">{r.cliente}</span>
                        </div>
                        {r.medida && (
                          <span className="text-slate-400 font-mono text-[10px] shrink-0">
                            {r.medida}
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
                <span className="font-mono text-amber-400 font-semibold">{enProcesoRecords.length} en planta</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN DE GRÁFICOS OPERATIVOS (REDISEÑO PARA TV DE PLANTA) */}
      <div className="space-y-5">
        {/* Gráfico Principal Superior (Ocupa todo el ancho): Evolución Mensual de Trabajos (Ene - Dic) */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col w-full">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                <span>Evolución Mensual de Trabajos (Ene - Dic)</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Comparativa año a año de neumáticos y trabajos procesados por mes (Línea naranja {evolucionMensualData.currentYear} vs. años anteriores)
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-50 text-orange-700 border border-orange-200">
                <span className="w-3 h-1 bg-orange-500 rounded-full inline-block"></span>
                <span>Año {evolucionMensualData.currentYear} (Activo)</span>
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 border border-slate-200">
                <span className="w-3 h-0.5 border-t border-dashed border-slate-400 inline-block"></span>
                <span>Años Anteriores</span>
              </span>
            </div>
          </div>
          <div className="relative h-64 sm:h-72 w-full">
            <canvas ref={chartEvolucionMensualRef} />
          </div>
        </div>

        {/* Gráficos Inferiores (3 Columnas Amplias y Legibles) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* 1. "Tiempos Promedio por Tipo de Trabajo" (Barras horizontales: Reparación, Recauchaje, L4/L5) */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <span>Tiempos Promedio por Tipo de Trabajo</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">Días Proceso</span>
            </div>
            <div className="relative h-60 w-full">
              <canvas ref={chartTiemposTrabajoRef} />
            </div>
          </div>

          {/* 2. "Estado de Trabajos Activos" (Visualizador claro de distribución entre En Planta, Entregados y Bajas) */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-500" />
                <span>Estado de Trabajos Activos</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">{filteredRecords.length} unid.</span>
            </div>
            <div className="relative h-60 w-full">
              <canvas ref={chartEstadoActivoRef} />
            </div>
          </div>

          {/* 3. "Unidades en Planta por Cliente / Faena" (Barras horizontales ordenadas por volumen) */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-slate-900" />
                <span>Unidades en Planta por Cliente / Faena</span>
              </h3>
              <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                {unidadesPlantaPorClienteData.totalEnPlanta} en taller
              </span>
            </div>
            <div className="relative h-60 w-full">
              <canvas ref={chartUnidadesPlantaClienteRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla Operativa Detallada CON BUSCADOR INCORPORADO */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Header Bar de la Tabla con Buscador Dedicado */}
        <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Tabla Operativa de Monitoreo</h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-orange-600/30 text-orange-400 border border-orange-500/30 flex items-center gap-1">
                <span>{sortedMonitoringRecords.length} neumáticos</span>
                <span className="text-slate-400">·</span>
                <span className="text-amber-300 font-semibold">Más recientes primero</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Haz clic en cualquier fila para ver el detalle, modificar datos o abrir documentos adjuntos
            </p>
          </div>

          {/* Buscador Dedicado de la Tabla Operativa (Oculto en Modo TV para máxima limpieza visual) */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!tvMode && (
              <div className="relative flex-1 sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={tableSearchTerm}
                  onChange={(e) => setTableSearchTerm(e.target.value)}
                  placeholder="Buscar por Serie, Cliente, Remito, Interno..."
                  className="w-full text-xs pl-9 pr-8 py-2 bg-slate-800 text-white placeholder-slate-400 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {tableSearchTerm && (
                  <button
                    onClick={() => setTableSearchTerm('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Pagination controls */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 transition-colors"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-slate-300 px-1">
                {currentPage}/{totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 transition-colors"
                title="Página siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Data Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3.5 whitespace-nowrap">Cliente</th>
                <th className="py-3 px-3 whitespace-nowrap">Envío</th>
                <th className="py-3 px-3 whitespace-nowrap">Serie</th>
                <th className="py-3 px-3 whitespace-nowrap">Marca</th>
                <th className="py-3 px-3 whitespace-nowrap">Medida</th>
                <th className="py-3 px-3 whitespace-nowrap">Trabajo Realizado</th>
                <th className="py-3 px-3 whitespace-nowrap">Estado</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Días Proc.</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Días Ret.</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Días Atr.</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">FIT</th>
                <th className="py-3 px-3 text-center whitespace-nowrap bg-orange-50 text-orange-950 font-bold border-x border-orange-200" title="Ordenado: Más recientes primero">
                  <div className="flex items-center justify-center gap-1">
                    <span>F. Ingreso</span>
                    <span className="text-[10px] text-orange-600 font-extrabold">↓</span>
                  </div>
                </th>
                <th className="py-3 px-3 text-center whitespace-nowrap">F. TT</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Docs</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-400">
                    No se encontraron neumáticos con los criterios de búsqueda actuales.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => onSelectRecord(r)}
                    className="hover:bg-orange-50/40 cursor-pointer transition-colors group"
                  >
                    <td className="py-2.5 px-3.5 font-semibold text-slate-900 whitespace-nowrap">
                      {r.cliente}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {r.envio || '—'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap group-hover:text-orange-600 transition-colors">
                      {r.serie || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-semibold whitespace-nowrap">
                      {r.marca}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {r.medida || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap font-medium">
                      {r.trabajoRealizar}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.estado === 'ENTREGADO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.estado === 'PLANTA'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {r.estado}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right text-slate-900 font-bold whitespace-nowrap">
                      {r.diasProceso !== null ? `${r.diasProceso} d` : '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right text-slate-700 whitespace-nowrap">
                      {r.diasRetiro !== null ? `${r.diasRetiro} d` : '—'}
                    </td>
                    <td
                      className={`py-2.5 px-3 font-mono text-right font-bold whitespace-nowrap ${
                        r.diasAtraso && r.diasAtraso > 0 ? 'text-red-600' : 'text-slate-600'
                      }`}
                    >
                      {r.diasAtraso !== null ? `${r.diasAtraso} d` : '0 d'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-center text-slate-700 whitespace-nowrap font-semibold">
                      {formatDateDisplay(r.fit) || '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-center text-slate-500 whitespace-nowrap">
                      {formatDateDisplay(r.fechaIngreso) || '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-center text-slate-800 font-semibold whitespace-nowrap">
                      {formatDateDisplay(r.fechaTT) || '—'}
                    </td>
                    {/* Document Links Column */}
                    <td
                      className="py-2.5 px-3 text-center whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {r.linkFactura ? (
                          <a
                            href={r.linkFactura}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-100 text-orange-800 hover:bg-orange-200 transition-colors shadow-2xs"
                            title="Abrir Factura Digital"
                          >
                            FAC
                          </a>
                        ) : null}
                        {r.linkOc ? (
                          <a
                            href={r.linkOc}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors shadow-2xs"
                            title="Abrir Orden de Compra (OC)"
                          >
                            OC
                          </a>
                        ) : null}
                        {r.linkCotizacion ? (
                          <a
                            href={r.linkCotizacion}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors shadow-2xs"
                            title="Abrir Cotización"
                          >
                            COT
                          </a>
                        ) : null}
                        {r.linkRemito ? (
                          <a
                            href={r.linkRemito}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors shadow-2xs"
                            title="Abrir Remito"
                          >
                            REM
                          </a>
                        ) : null}
                        {!r.linkFactura && !r.linkOc && !r.linkCotizacion && !r.linkRemito && (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRecord(r);
                        }}
                        className="p-1 rounded hover:bg-orange-100 text-slate-500 hover:text-orange-600 transition-colors"
                        title="Ver y Modificar Registro"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
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
