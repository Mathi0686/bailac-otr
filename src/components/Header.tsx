import React from 'react';
import { RefreshCw, Tv, Code2, LogOut, HardHat, Clock, Minimize2, Settings } from 'lucide-react';

interface HeaderProps {
  activeTab: 'operaciones' | 'gestion';
  onTabChange: (tab: 'operaciones' | 'gestion') => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  secondsUntilAutoRefresh: number;
  tvMode: boolean;
  onToggleTvMode: () => void;
  onOpenAppsScriptModal: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  totalRecordsCount: number;
  lastUpdated: Date;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onRefresh,
  isRefreshing,
  secondsUntilAutoRefresh,
  tvMode,
  onToggleTvMode,
  onOpenAppsScriptModal,
  onOpenSettings,
  onLogout,
  totalRecordsCount,
  lastUpdated,
}) => {
  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Dedicated Ultra-Clean TV Mode Header
  if (tvMode) {
    return (
      <header className="sticky top-0 z-40 bg-slate-950 border-b border-slate-800 text-white shadow-xl">
        <div className="max-w-[1920px] mx-auto px-6 py-3.5 flex items-center justify-between gap-6">
          {/* Logo Corporativo Bailac OTR */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-600/30">
              <HardHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xl font-black tracking-tight text-white">
                  BAILAC <span className="text-orange-500 font-extrabold">OTR</span>
                </span>
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  Minería
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  Modo TV de Planta
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Monitoreo Continuo en Tiempo Real · Auto-actualización cada 15 min
              </p>
            </div>
          </div>

          {/* Único Botón: Salir de Modo TV */}
          <div className="flex items-center gap-4">
            {/* Auto refresh subtle countdown badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Sincronización:</span>
              <span className="font-mono font-bold text-amber-300">{formatTimer(secondsUntilAutoRefresh)}</span>
            </div>

            <button
              onClick={onToggleTvMode}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
              title="Volver al modo normal con todos los filtros y controles"
            >
              <Minimize2 className="w-4 h-4" />
              <span>Salir de Modo TV</span>
            </button>
          </div>
        </div>
      </header>
    );
  }

  // Standard Header Mode
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-sm font-extrabold">
            <HardHat className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight text-white whitespace-nowrap">
                BAILAC <span className="text-orange-500 font-bold">OTR</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Minería
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
              Monitoreo Planta & Gestión
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Tabs (Operaciones vs Gestión) */}
        <nav className="flex items-center gap-1.5 p-1 bg-slate-950/70 border border-slate-800 rounded-xl shrink-0">
          <button
            onClick={() => onTabChange('operaciones')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'operaciones'
                ? 'bg-orange-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Vista 1: Operaciones
          </button>
          <button
            onClick={() => onTabChange('gestion')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'gestion'
                ? 'bg-orange-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Vista 2: Gestión
          </button>
        </nav>

        {/* Zone 3: Actions & Auto-refresh Telemetry */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Auto-Refresh Timer indicator (15 min timer for TV) */}
          <div
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300 whitespace-nowrap"
            title="Auto-actualización automática de TV en segundo plano cada 15 minutos"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[11px] text-slate-400">Auto:</span>
            <span className="font-mono font-bold text-amber-300">{formatTimer(secondsUntilAutoRefresh)}</span>
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 rounded-lg transition-all disabled:opacity-50 whitespace-nowrap"
            title="Sincronizar datos ahora"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-orange-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          {/* TV Mode Toggle */}
          <button
            onClick={onToggleTvMode}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all hover:text-white whitespace-nowrap shadow-sm"
            title="Activar Modo TV de Planta (oculta filtros y botones innecesarios)"
          >
            <Tv className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span className="hidden md:inline">Modo TV</span>
          </button>

          {/* Configuración (Ajustes de Conexión y Planilla) */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all whitespace-nowrap shadow-sm hover:border-orange-500/50"
            title="Abrir Panel de Configuración (Conexión Google Sheets y Apps Script)"
          >
            <Settings className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span className="hidden sm:inline">Configuración</span>
          </button>

          {/* Apps Script Code Modal */}
          <button
            onClick={onOpenAppsScriptModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all whitespace-nowrap"
            title="Ver código Apps Script Code.gs y configurar URL"
          >
            <Code2 className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span className="hidden sm:inline">Code.gs</span>
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
