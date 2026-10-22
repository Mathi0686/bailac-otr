import React, { useState } from 'react';
import {
  X,
  Settings,
  ExternalLink,
  Check,
  Copy,
  RefreshCw,
  Database,
  FileSpreadsheet,
  Link2,
  AlertCircle,
  CheckCircle2,
  Code2,
  ShieldCheck,
  RotateCcw,
  Calculator,
  HelpCircle,
} from 'lucide-react';
import {
  DEFAULT_APPS_SCRIPT_URL,
  DEFAULT_SPREADSHEET_URL,
  fetchFromAppsScript,
} from '../services/dataService';
import { KpiFormulasModal } from './KpiFormulasModal';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUrl: string;
  onSaveUrl: (url: string) => void;
  onResetDefault: () => void;
  onRefreshData: () => void;
  isRefreshing: boolean;
  totalRecords: number;
  lastUpdated: Date;
  onOpenCodeModal: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  currentUrl,
  onSaveUrl,
  onResetDefault,
  onRefreshData,
  isRefreshing,
  totalRecords,
  lastUpdated,
  onOpenCodeModal,
}) => {
  const [urlInput, setUrlInput] = useState(currentUrl || DEFAULT_APPS_SCRIPT_URL);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    count?: number;
    latencyMs?: number;
  } | null>(null);
  const [copiedSheetUrl, setCopiedSheetUrl] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);

  // Sync urlInput when currentUrl prop changes
  React.useEffect(() => {
    setUrlInput(currentUrl || DEFAULT_APPS_SCRIPT_URL);
  }, [currentUrl, isOpen]);

  if (!isOpen) return null;

  const handleCopySheetLink = () => {
    navigator.clipboard.writeText(DEFAULT_SPREADSHEET_URL);
    setCopiedSheetUrl(true);
    setTimeout(() => setCopiedSheetUrl(false), 2000);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const start = performance.now();
    try {
      const targetUrl = urlInput.trim() || DEFAULT_APPS_SCRIPT_URL;
      const data = await fetchFromAppsScript(targetUrl);
      const latency = Math.round(performance.now() - start);
      setTestResult({
        success: true,
        message: `Conexión exitosa. Se descargaron ${data.length} registros en ${latency} ms.`,
        count: data.length,
        latencyMs: latency,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Error de conexión: ${err.message || 'Verifique la URL y permisos del Web App'}.`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const finalUrl = urlInput.trim();
    onSaveUrl(finalUrl);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleReset = () => {
    setUrlInput(DEFAULT_APPS_SCRIPT_URL);
    onResetDefault();
    setTestResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-slide-in">
          {/* Header */}
          <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-md">
                <Settings className="w-5 h-5 text-white animate-spin-slow" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Panel de Configuración OTR</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    Ajustes
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Parámetros de conexión con Google Sheets y Google Apps Script
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Cerrar panel de configuración"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Alert / Success Toast in Drawer */}
            {savedSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">Configuración guardada exitosamente en el sistema.</span>
              </div>
            )}

            {/* 1. Acceso Directo a la Planilla de Google Sheets */}
            <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                      Base de Datos Unificada en Google Sheets
                    </h3>
                    <p className="text-[11px] text-emerald-700">
                      Planilla consolidada de neumáticos OTR de minería
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-emerald-900/80 mb-4 leading-relaxed">
                Esta es la hoja de cálculo de origen donde se registran los movimientos, servicios,
                remitos, cotizaciones y enlaces digitales.
              </p>

              {/* Botón directo de apertura */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <a
                  href={DEFAULT_SPREADSHEET_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.99]"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Abrir Planilla en Google Sheets</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopySheetLink}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white hover:bg-emerald-100/60 border border-emerald-300 text-emerald-800 text-xs font-semibold transition-colors"
                  title="Copiar URL de la Planilla"
                >
                  {copiedSheetUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSheetUrl ? 'Copiado' : 'Copiar Link'}</span>
                </button>
              </div>

              <div className="mt-3 pt-3 border-t border-emerald-200/60">
                <span className="text-[10px] text-emerald-700 font-mono break-all line-clamp-1 select-all">
                  {DEFAULT_SPREADSHEET_URL}
                </span>
              </div>
            </div>

            {/* 2. Parámetros de Conexión Google Apps Script */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Endpoint de Google Apps Script (Web App)
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      URL del script desplegado que sirve el JSON
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {urlInput === DEFAULT_APPS_SCRIPT_URL ? 'URL Oficial' : 'Personalizada'}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1.5">
                  URL de Aplicación Web (termina en /exec)
                </label>
                <textarea
                  rows={2}
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full p-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none transition-all resize-none"
                />
              </div>

              {/* Botones de Acción de URL */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing || !urlInput.trim()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-orange-500 ${testing ? 'animate-spin' : ''}`} />
                  <span>{testing ? 'Comprobando...' : 'Probar Conexión'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Guardar URL</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors ml-auto"
                  title="Restablecer a la URL oficial por defecto"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Por Defecto</span>
                </button>
              </div>

              {/* Resultado del Test */}
              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-fade-in ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{testResult.message}</p>
                    {testResult.success && testResult.latencyMs && (
                      <p className="text-[11px] text-emerald-600 mt-0.5">
                        Latencia: {testResult.latencyMs} ms · Registros parseados: {testResult.count}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Estado de Datos y Sincronización */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-orange-500" />
                <span>Estado de Sincronización y Memoria</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] text-slate-500">Neumáticos en Memoria</span>
                  <p className="text-base font-extrabold text-slate-900 mt-0.5 font-mono">
                    {totalRecords} unidades
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] text-slate-500">Última Sincronización</span>
                  <p className="text-xs font-bold text-slate-800 mt-1 font-mono">
                    {lastUpdated.toLocaleTimeString('es-ES')}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">Auto-actualización de Planta:</span>
                <span className="text-xs font-bold font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                  Cada 15 minutos
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  onRefreshData();
                  setTestResult(null);
                }}
                disabled={isRefreshing}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Sincronizando...' : 'Sincronizar Datos Ahora'}</span>
              </button>
            </div>

            {/* 4. Glosario de Fórmulas y KPIs */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Calculator className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span>¿Cómo se calculan los KPIs?</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-200 text-orange-900 font-mono">
                      v2.0
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Glosario de fórmulas matemáticas, condiciones estrictas y reglas por cliente
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsKpiModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] shrink-0"
                title="Abrir ventana explicativa con todas las fórmulas de KPIs"
              >
                <HelpCircle className="w-3.5 h-3.5 text-orange-400" />
                <span>Glosario de Fórmulas</span>
              </button>
            </div>

            {/* 5. Acceso al Código Code.gs */}
            <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-800 text-orange-400 flex items-center justify-center shrink-0">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Código Google Apps Script (Code.gs)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Ver script backend completo e instrucciones paso a paso
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenCodeModal}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-orange-400 hover:text-orange-300 border border-slate-700 transition-colors shrink-0"
              >
                <span>Ver Code.gs</span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Bailac OTR · Sistema Seguro</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Modal Explicativo de Fórmulas de KPIs */}
      <KpiFormulasModal
        isOpen={isKpiModalOpen}
        onClose={() => setIsKpiModalOpen(false)}
      />
    </div>
  );
};
