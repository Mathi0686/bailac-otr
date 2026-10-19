import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarController,
  DoughnutController,
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
} from 'lucide-react';
import { OtrRecord, FilterState } from '../types';
import { calculateOperationsKPIs, filterRecords, exportToCsv } from '../services/dataService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  BarController,
  DoughnutController,
  Title,
  Tooltip,
  Legend
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
  // Filters
  const [periodoFilter, setPeriodoFilter] = useState('ALL');
  const [clienteFilter, setClienteFilter] = useState('ALL');
  const [marcaFilter, setMarcaFilter] = useState('ALL');
  const [estadoFilter, setEstadoFilter] = useState('ALL');
  const [trabajoFilter, setTrabajoFilter] = useState('ALL');
  const [tableSearchTerm, setTableSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = tvMode ? 10 : 15;

  // Available year periods extracted from records
  const periodosList = useMemo(() => {
    const years = new Set<string>();
    records.forEach((r) => {
      if (r.periodoYear) years.add(r.periodoYear.toString());
    });
    return Array.from(years).sort().reverse();
  }, [records]);

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
      periodo: periodoFilter,
      search: tableSearchTerm,
    }),
    [clienteFilter, marcaFilter, estadoFilter, trabajoFilter, periodoFilter, tableSearchTerm]
  );

  const filteredRecords = useMemo(() => filterRecords(records, filters), [records, filters]);
  const kpis = useMemo(() => calculateOperationsKPIs(filteredRecords), [filteredRecords]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [clienteFilter, marcaFilter, estadoFilter, trabajoFilter, periodoFilter, tableSearchTerm]);

  // Chart Canvas Refs
  const chartProcesoTrabajoRef = useRef<HTMLCanvasElement | null>(null);
  const chartProcesoClienteRef = useRef<HTMLCanvasElement | null>(null);
  const chartEstadoRef = useRef<HTMLCanvasElement | null>(null);

  const chartProcesoTrabajoInstance = useRef<ChartJS | null>(null);
  const chartProcesoClienteInstance = useRef<ChartJS | null>(null);
  const chartEstadoInstance = useRef<ChartJS | null>(null);

  // Aggregations for Chart 1: Días Promedio Proceso por Trabajo
  const trabajoChartData = useMemo(() => {
    const map: Record<string, { totalDays: number; count: number }> = {};
    filteredRecords.forEach((r) => {
      if (r.diasProceso !== null && r.diasProceso >= 0) {
        let key = 'REPARACIÓN';
        const t = r.trabajoRealizar.toUpperCase();
        if (t.includes('RECUPERADO L5')) key = 'RECUPERADO L5';
        else if (t.includes('RECUPERADO L4')) key = 'RECUPERADO L4';
        else if (t.includes('RECAUCHAJE') || t.includes('RECAPADO')) key = 'RECAUCHAJE/RECAPADO';
        else if (t.includes('REPAR')) key = 'REPARACIÓN';
        else if (t.includes('BAJA')) key = 'BAJA / RECHAZO';
        else key = r.trabajoRealizar.substring(0, 18);

        if (!map[key]) map[key] = { totalDays: 0, count: 0 };
        map[key].totalDays += r.diasProceso;
        map[key].count += 1;
      }
    });

    const labels = Object.keys(map).slice(0, 6);
    const data = labels.map((k) => Math.round(map[k].totalDays / map[k].count));
    return { labels, data };
  }, [filteredRecords]);

  // Aggregations for Chart 2: Días Promedio Proceso por Cliente
  const clienteChartData = useMemo(() => {
    const map: Record<string, { totalDays: number; count: number }> = {};
    filteredRecords.forEach((r) => {
      if (r.diasProceso !== null && r.diasProceso >= 0 && r.cliente) {
        const key = r.cliente;
        if (!map[key]) map[key] = { totalDays: 0, count: 0 };
        map[key].totalDays += r.diasProceso;
        map[key].count += 1;
      }
    });

    const sortedKeys = Object.keys(map)
      .sort((a, b) => map[b].count - map[a].count)
      .slice(0, 6);

    const labels = sortedKeys;
    const data = labels.map((k) => Math.round(map[k].totalDays / map[k].count));
    return { labels, data };
  }, [filteredRecords]);

  // Aggregations for Chart 3: Estado Actual de los Trabajos (Donut)
  const estadoChartData = useMemo(() => {
    const counts: Record<string, number> = {
      ENTREGADO: 0,
      PLANTA: 0,
      BAJA: 0,
    };
    filteredRecords.forEach((r) => {
      const e = r.estado.toUpperCase();
      if (e === 'PLANTA') counts.PLANTA++;
      else if (e === 'BAJA') counts.BAJA++;
      else counts.ENTREGADO++;
    });

    return {
      labels: ['Entregado', 'En Planta (Proceso)', 'Baja Operacional'],
      data: [counts.ENTREGADO, counts.PLANTA, counts.BAJA],
      colors: ['#0F766E', '#F97316', '#EF4444'],
    };
  }, [filteredRecords]);

  // Initialize and update Chart.js instances
  useEffect(() => {
    if (chartProcesoTrabajoRef.current) {
      if (chartProcesoTrabajoInstance.current) {
        chartProcesoTrabajoInstance.current.destroy();
      }
      chartProcesoTrabajoInstance.current = new ChartJS(chartProcesoTrabajoRef.current, {
        type: 'bar',
        data: {
          labels: trabajoChartData.labels,
          datasets: [
            {
              label: 'Días Promedio',
              data: trabajoChartData.data,
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
                label: (ctx) => ` ${ctx.parsed.x} días de proceso`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: '#f1f5f9' },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 10 } },
              title: { display: true, text: 'Días', font: { size: 10 } },
            },
            y: {
              grid: { display: false },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 11, weight: 'bold' } },
            },
          },
        },
      });
    }

    if (chartProcesoClienteRef.current) {
      if (chartProcesoClienteInstance.current) {
        chartProcesoClienteInstance.current.destroy();
      }
      chartProcesoClienteInstance.current = new ChartJS(chartProcesoClienteRef.current, {
        type: 'bar',
        data: {
          labels: clienteChartData.labels,
          datasets: [
            {
              label: 'Días Promedio',
              data: clienteChartData.data,
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
                label: (ctx) => ` ${ctx.parsed.x} días promedio`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: '#f1f5f9' },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 10 } },
            },
            y: {
              grid: { display: false },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 11, weight: 'bold' } },
            },
          },
        },
      });
    }

    if (chartEstadoRef.current) {
      if (chartEstadoInstance.current) {
        chartEstadoInstance.current.destroy();
      }
      chartEstadoInstance.current = new ChartJS(chartEstadoRef.current, {
        type: 'doughnut',
        data: {
          labels: estadoChartData.labels,
          datasets: [
            {
              data: estadoChartData.data,
              backgroundColor: estadoChartData.colors,
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
                padding: 12,
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

    return () => {
      chartProcesoTrabajoInstance.current?.destroy();
      chartProcesoClienteInstance.current?.destroy();
      chartEstadoInstance.current?.destroy();
    };
  }, [trabajoChartData, clienteChartData, estadoChartData]);

  // Pagination for high density table
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

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

            {/* Filtro de Tiempo en Años */}
            <div className="flex items-center gap-1">
              <select
                value={periodoFilter}
                onChange={(e) => setPeriodoFilter(e.target.value)}
                className="text-xs font-semibold px-3 py-1.5 bg-orange-50/70 border border-orange-200 rounded-lg text-orange-950 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
              >
                <option value="ALL">Todos los Años ({periodosList.length})</option>
                {periodosList.map((p) => (
                  <option key={p} value={p}>
                    Año {p}
                  </option>
                ))}
              </select>
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
            {(periodoFilter !== 'ALL' ||
              clienteFilter !== 'ALL' ||
              marcaFilter !== 'ALL' ||
              estadoFilter !== 'ALL' ||
              trabajoFilter !== 'ALL' ||
              tableSearchTerm) && (
              <button
                onClick={() => {
                  setPeriodoFilter('ALL');
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
              onClick={() => exportToCsv(filteredRecords, 'bailac_operaciones_export.csv')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors whitespace-nowrap"
              title="Exportar registros filtrados a CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* 4 KPIs Superiores */}
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
            <p className="text-[11px] text-slate-400 mt-1">Ingreso a Taller TT</p>
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
            <p className="text-[11px] text-slate-400 mt-1">Término a Despacho Cliente</p>
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
            <p className="text-[11px] text-slate-400 mt-1">Contra fecha comprometida</p>
          </div>
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              kpis.diasPromedioAtraso > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: En Proceso */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              En Proceso (Planta)
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`font-mono font-extrabold text-orange-600 ${tvMode ? 'text-4xl' : 'text-3xl'}`}>
                {kpis.enProceso}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                / {kpis.totalOperaciones} total
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Unidades activas en taller</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3 Gráficos Operativos (Chart.js) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1: Días Promedio Proceso por Trabajo Realizado */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <span>Días Proceso por Trabajo Realizado</span>
            </h3>
            <span className="text-[11px] text-slate-400">Promedio</span>
          </div>
          <div className="relative h-64 w-full">
            <canvas ref={chartProcesoTrabajoRef} />
          </div>
        </div>

        {/* Gráfico 2: Días Promedio Proceso por Cliente */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-900" />
              <span>Días Proceso por Cliente</span>
            </h3>
            <span className="text-[11px] text-slate-400">Top Clientes</span>
          </div>
          <div className="relative h-64 w-full">
            <canvas ref={chartProcesoClienteRef} />
          </div>
        </div>

        {/* Gráfico 3: Estado Actual de los Trabajos (Dona) */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-orange-500" />
              <span>Estado Actual de los Trabajos</span>
            </h3>
            <span className="text-[11px] text-slate-400">{filteredRecords.length} unid.</span>
          </div>
          <div className="relative h-64 w-full">
            <canvas ref={chartEstadoRef} />
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
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-orange-600/30 text-orange-400 border border-orange-500/30">
                {filteredRecords.length} neumáticos
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Haz clic en cualquier fila para ver el detalle, modificar datos o historial completo
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
                <th className="py-3 px-3 whitespace-nowrap">Serie</th>
                <th className="py-3 px-3 whitespace-nowrap">Marca</th>
                <th className="py-3 px-3 whitespace-nowrap">Medida</th>
                <th className="py-3 px-3 whitespace-nowrap">Trabajo Realizado</th>
                <th className="py-3 px-3 whitespace-nowrap">Estado</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Días Proc.</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Días Ret.</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Días Atr.</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">F. Ingreso</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">F. TT</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
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
                    <td className="py-2.5 px-3 font-mono text-center text-slate-500 whitespace-nowrap">
                      {r.fechaIngreso || '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-center text-slate-800 font-semibold whitespace-nowrap">
                      {r.fechaTT || '—'}
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
    </div>
  );
};
