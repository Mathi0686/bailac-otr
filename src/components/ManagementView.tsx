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
} from 'lucide-react';
import { OtrRecord, FilterState } from '../types';
import { calculateManagementKPIs, filterRecords, formatCurrency, exportToCsv } from '../services/dataService';

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
  const [periodoFilter, setPeriodoFilter] = useState('ALL');
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
      periodo: periodoFilter,
      search: searchTerm,
    }),
    [clienteFilter, marcaFilter, periodoFilter, searchTerm]
  );

  const filteredRecords = useMemo(() => filterRecords(records, filters), [records, filters]);
  const kpis = useMemo(() => calculateManagementKPIs(filteredRecords), [filteredRecords]);

  // Chart Canvas Refs
  const chartFacturacionPeriodoRef = useRef<HTMLCanvasElement | null>(null);
  const chartFacturacionMarcaRef = useRef<HTMLCanvasElement | null>(null);
  const chartFacturacionClienteRef = useRef<HTMLCanvasElement | null>(null);
  const chartNeumaticosEstadoRef = useRef<HTMLCanvasElement | null>(null);

  const chartFacturacionPeriodoInst = useRef<ChartJS | null>(null);
  const chartFacturacionMarcaInst = useRef<ChartJS | null>(null);
  const chartFacturacionClienteInst = useRef<ChartJS | null>(null);
  const chartNeumaticosEstadoInst = useRef<ChartJS | null>(null);

  // Aggregation 1: Facturación por Período
  const periodoChartData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRecords.forEach((r) => {
      if (r.precio > 0) {
        const yearKey = r.periodoYear ? r.periodoYear.toString() : 'Otros';
        map[yearKey] = (map[yearKey] || 0) + r.precio;
      }
    });

    const labels = Object.keys(map).sort();
    const data = labels.map((k) => Math.round(map[k]));
    return { labels, data };
  }, [filteredRecords]);

  // Aggregation 2: Facturación por Marca
  const marcaChartData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRecords.forEach((r) => {
      if (r.precio > 0) {
        const key = r.marca || 'S/M';
        map[key] = (map[key] || 0) + r.precio;
      }
    });

    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(([k]) => k);
    const data = sorted.map(([, v]) => Math.round(v));
    const colors = ['#0F172A', '#F97316', '#EAB308', '#0F766E', '#64748B', '#94A3B8'];

    return { labels, data, colors: colors.slice(0, labels.length) };
  }, [filteredRecords]);

  // Aggregation 3: Facturación por Cliente
  const clienteChartData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRecords.forEach((r) => {
      if (r.precio > 0 && r.cliente) {
        map[r.cliente] = (map[r.cliente] || 0) + r.precio;
      }
    });

    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const labels = sorted.map(([k]) => k);
    const data = sorted.map(([, v]) => Math.round(v));
    return { labels, data };
  }, [filteredRecords]);

  // Aggregation 4: Neumáticos por Estado
  const estadoChartData = useMemo(() => {
    return {
      labels: ['Entregados', 'Pendientes (Planta)', 'Baja'],
      data: [kpis.entregados, kpis.pendientes, kpis.bajas],
      colors: ['#0F766E', '#F97316', '#EF4444'],
    };
  }, [kpis]);

  // Initialize and update Chart.js instances
  useEffect(() => {
    // 1. Facturación por Período
    if (chartFacturacionPeriodoRef.current) {
      chartFacturacionPeriodoInst.current?.destroy();
      chartFacturacionPeriodoInst.current = new ChartJS(chartFacturacionPeriodoRef.current, {
        type: 'bar',
        data: {
          labels: periodoChartData.labels,
          datasets: [
            {
              label: 'Facturación USD',
              data: periodoChartData.data,
              backgroundColor: '#0F172A',
              borderRadius: 6,
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
                label: (ctx) => ` ${formatCurrency(Number(ctx.parsed.y ?? 0))}`,
              },
            },
          },
          scales: {
            y: {
              ticks: {
                callback: (val) => `$${Number(val) / 1000}k`,
                font: { family: 'Plus Jakarta Sans', size: 10 },
              },
              grid: { color: '#f1f5f9' },
            },
            x: {
              grid: { display: false },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 11, weight: 'bold' } },
            },
          },
        },
      });
    }

    // 2. Facturación por Marca (Donut)
    if (chartFacturacionMarcaRef.current) {
      chartFacturacionMarcaInst.current?.destroy();
      chartFacturacionMarcaInst.current = new ChartJS(chartFacturacionMarcaRef.current, {
        type: 'doughnut',
        data: {
          labels: marcaChartData.labels,
          datasets: [
            {
              data: marcaChartData.data,
              backgroundColor: marcaChartData.colors,
              borderWidth: 2,
              borderColor: '#ffffff',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '66%',
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
                label: (ctx) => ` ${ctx.label}: ${formatCurrency(Number(ctx.raw))}`,
              },
            },
          },
        },
      });
    }

    // 3. Facturación por Cliente (Horizontal Bar)
    if (chartFacturacionClienteRef.current) {
      chartFacturacionClienteInst.current?.destroy();
      chartFacturacionClienteInst.current = new ChartJS(chartFacturacionClienteRef.current, {
        type: 'bar',
        data: {
          labels: clienteChartData.labels,
          datasets: [
            {
              label: 'Facturación USD',
              data: clienteChartData.data,
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
              ticks: {
                callback: (val) => `$${Number(val) / 1000}k`,
                font: { family: 'Plus Jakarta Sans', size: 10 },
              },
              grid: { color: '#f1f5f9' },
            },
            y: {
              grid: { display: false },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 11, weight: 'bold' } },
            },
          },
        },
      });
    }

    // 4. Neumáticos por Estado (Donut)
    if (chartNeumaticosEstadoRef.current) {
      chartNeumaticosEstadoInst.current?.destroy();
      chartNeumaticosEstadoInst.current = new ChartJS(chartNeumaticosEstadoRef.current, {
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
          cutout: '66%',
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
                label: (ctx) => ` ${ctx.label}: ${ctx.raw} unidades`,
              },
            },
          },
        },
      });
    }

    return () => {
      chartFacturacionPeriodoInst.current?.destroy();
      chartFacturacionMarcaInst.current?.destroy();
      chartFacturacionClienteInst.current?.destroy();
      chartNeumaticosEstadoInst.current?.destroy();
    };
  }, [periodoChartData, marcaChartData, clienteChartData, estadoChartData]);

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

            {/* Periodo Dropdown */}
            <select
              value={periodoFilter}
              onChange={(e) => setPeriodoFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">Todos los Periodos</option>
              {periodosList.map((p) => (
                <option key={p} value={p}>
                  Año {p}
                </option>
              ))}
            </select>

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
            {(periodoFilter !== 'ALL' || clienteFilter !== 'ALL' || marcaFilter !== 'ALL' || searchTerm) && (
              <button
                onClick={() => {
                  setPeriodoFilter('ALL');
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

      {/* 4 Gráficos de Gestión (Chart.js) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gráfico 1: Facturación por Período */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-slate-900" />
              <span>Facturación por Período (Evolución)</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">USD</span>
          </div>
          <div className="relative h-64 w-full">
            <canvas ref={chartFacturacionPeriodoRef} />
          </div>
        </div>

        {/* Gráfico 2: Facturación por Marca */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-orange-500" />
              <span>Facturación por Marca</span>
            </h3>
            <span className="text-[11px] text-slate-400">Distribución</span>
          </div>
          <div className="relative h-64 w-full">
            <canvas ref={chartFacturacionMarcaRef} />
          </div>
        </div>

        {/* Gráfico 3: Facturación por Cliente */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-orange-500" />
              <span>Facturación por Cliente</span>
            </h3>
            <span className="text-[11px] text-slate-400">Top Facturación</span>
          </div>
          <div className="relative h-64 w-full">
            <canvas ref={chartFacturacionClienteRef} />
          </div>
        </div>

        {/* Gráfico 4: Neumáticos por Estado */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              <span>Neumáticos por Estado</span>
            </h3>
            <span className="text-[11px] text-slate-400">{filteredRecords.length} unid.</span>
          </div>
          <div className="relative h-64 w-full">
            <canvas ref={chartNeumaticosEstadoRef} />
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
