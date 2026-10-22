import React, { useState, useMemo, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  X,
  Check,
  Layers,
  AlertCircle,
  HelpCircle,
  PackageOpen,
} from 'lucide-react';
import { OtrRecord } from '../types';
import { exportEnvioToExcel } from '../services/dataService';

interface ExportEnvioModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: OtrRecord[];
}

export const ExportEnvioModal: React.FC<ExportEnvioModalProps> = ({
  isOpen,
  onClose,
  records = [],
}) => {
  const safeRecords = useMemo(() => (Array.isArray(records) ? records : []), [records]);

  // Analyze records: extract assigned shipment codes vs unassigned/empty
  const { assignedLotes, unassignedCount, unassignedClientsPreview, unassignedClientsCount } = useMemo(() => {
    const map = new Map<string, { count: number; clients: Set<string> }>();
    const unassignedClients = new Set<string>();
    let unassigned = 0;

    safeRecords.forEach((r) => {
      const rawEnvio = (r.envio || '').trim();
      const isUnassigned = !rawEnvio || rawEnvio === '—' || rawEnvio === '-' || rawEnvio.toUpperCase() === 'SIN ENVIO';

      if (isUnassigned) {
        unassigned++;
        if (r.cliente) unassignedClients.add(r.cliente);
      } else {
        const code = rawEnvio.toUpperCase();
        if (!map.has(code)) {
          map.set(code, { count: 0, clients: new Set() });
        }
        const data = map.get(code)!;
        data.count++;
        if (r.cliente) data.clients.add(r.cliente);
      }
    });

    const lotes = Array.from(map.entries()).map(([code, meta]) => ({
      code,
      count: meta.count,
      clientsCount: meta.clients.size,
      clientsPreview: Array.from(meta.clients).slice(0, 2).join(', '),
    }));

    lotes.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

    return {
      assignedLotes: lotes,
      unassignedCount: unassigned,
      unassignedClientsPreview: Array.from(unassignedClients).slice(0, 2).join(', '),
      unassignedClientsCount: unassignedClients.size,
    };
  }, [safeRecords]);

  // Selected option: 'ALL', '__SIN_LOTE__', or specific lote code like 'E1'
  const [selectedEnvio, setSelectedEnvio] = useState<string>('ALL');
  const [exportError, setExportError] = useState<string | null>(null);

  // Sync selection whenever modal opens or records change
  useEffect(() => {
    if (isOpen) {
      setExportError(null);
      // If currently selected is not available, choose safe default
      if (selectedEnvio !== 'ALL' && selectedEnvio !== '__SIN_LOTE__') {
        const exists = assignedLotes.some((l) => l.code === selectedEnvio);
        if (!exists) {
          if (assignedLotes.length > 0) {
            setSelectedEnvio(assignedLotes[0].code);
          } else if (unassignedCount > 0) {
            setSelectedEnvio('__SIN_LOTE__');
          } else {
            setSelectedEnvio('ALL');
          }
        }
      } else if (selectedEnvio === '__SIN_LOTE__' && unassignedCount === 0) {
        setSelectedEnvio(assignedLotes.length > 0 ? assignedLotes[0].code : 'ALL');
      }
    }
  }, [isOpen, assignedLotes, unassignedCount]);

  // Metadata of current selection (declared unconditionally before early return)
  const currentSelectionMeta = useMemo(() => {
    if (selectedEnvio === 'ALL') {
      return {
        total: safeRecords.length,
        label: 'Todos los Envíos Consolidados',
      };
    }
    if (selectedEnvio === '__SIN_LOTE__') {
      return {
        total: unassignedCount,
        label: 'Sin Lote Asignado (Columna Envío Vacía)',
      };
    }
    const match = assignedLotes.find((e) => e.code === selectedEnvio);
    return {
      total: match ? match.count : 0,
      label: `Lote de Envío ${selectedEnvio}`,
    };
  }, [selectedEnvio, assignedLotes, unassignedCount, safeRecords]);

  if (!isOpen) return null;

  const handleExport = () => {
    try {
      setExportError(null);
      const success = exportEnvioToExcel(safeRecords, selectedEnvio);
      if (success) {
        onClose();
      }
    } catch (err: any) {
      console.error('Error al exportar lote de envío:', err);
      setExportError(err?.message || 'Error inesperado al generar el archivo Excel.');
    }
  };

  const isAllEnvioEmpty = safeRecords.length > 0 && assignedLotes.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Accent Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-emerald-600 via-teal-500 to-slate-900" />

        <div className="p-6">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3.5 mb-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Exportar Lote de Envío a Excel (.xlsx)</h3>
              <p className="text-xs text-slate-500">
                Seleccione el lote para generar la planilla normalizada para despacho
              </p>
            </div>
          </div>

          {/* Column Notice */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Columnas exactas incluidas en el archivo:</span>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[11px] font-mono text-slate-700 font-semibold mt-1">
              {['MARCA', 'MEDIDA', 'SERIE', 'SOLPED', 'HES', 'PRECIO', 'O. C.'].map((col) => (
                <span key={col} className="px-2 py-0.5 bg-white border border-slate-300 rounded shadow-2xs">
                  {col}
                </span>
              ))}
            </div>
          </div>

          {/* Informative notice if ENVIO column is currently empty */}
          {isAllEnvioEmpty && (
            <div className="p-3 mb-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Columna ENVIO sin datos asignados</p>
                <p className="text-amber-700 text-[11px] mt-0.5">
                  Los registros actuales no poseen códigos de lote (E1, E2...). Puede exportar todos los
                  neumáticos directamente o el grupo sin lote asignado.
                </p>
              </div>
            </div>
          )}

          {/* Error message banner if export failed */}
          {exportError && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{exportError}</span>
            </div>
          )}

          {/* Envio Selection List */}
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Lote o Grupo a Exportar:
            </label>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
              {/* Option 1: All records consolidated */}
              <button
                type="button"
                onClick={() => setSelectedEnvio('ALL')}
                className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                  selectedEnvio === 'ALL'
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs ${
                      selectedEnvio === 'ALL' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Todos los Registros / Envíos</div>
                    <div className="text-[11px] text-slate-500">Consolidado general de toda la base activa</div>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                  {safeRecords.length} unid.
                </span>
              </button>

              {/* Option 2: Unassigned records (when column ENVIO is empty) */}
              {unassignedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedEnvio('__SIN_LOTE__')}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                    selectedEnvio === '__SIN_LOTE__'
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs ${
                        selectedEnvio === '__SIN_LOTE__'
                          ? 'bg-amber-600 text-white'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      <PackageOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>Sin Lote de Envío Asignado</span>
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/80 px-1.5 py-0.2 rounded">
                          ENVIO Vacío
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[220px]">
                        {unassignedClientsPreview
                          ? `${unassignedClientsPreview} ${
                              unassignedClientsCount > 2 ? `(+${unassignedClientsCount - 2})` : ''
                            }`
                          : 'Neumáticos pendientes de asignación de lote'}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                      selectedEnvio === '__SIN_LOTE__'
                        ? 'text-amber-800 bg-amber-200/80'
                        : 'text-amber-800 bg-amber-50 border border-amber-200'
                    }`}
                  >
                    {unassignedCount} unid.
                  </span>
                </button>
              )}

              {/* Individual Envio Codes (E1, E2, etc.) */}
              {assignedLotes.map((opt) => {
                const isSelected = selectedEnvio === opt.code;
                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => setSelectedEnvio(opt.code)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center font-mono font-bold text-xs ${
                          isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {opt.code}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Envío {opt.code}</div>
                        {opt.clientsPreview && (
                          <div className="text-[11px] text-slate-500 truncate max-w-[220px]">
                            {opt.clientsPreview} {opt.clientsCount > 2 ? `(+${opt.clientsCount - 2})` : ''}
                          </div>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        isSelected
                          ? 'text-emerald-700 bg-emerald-100/70'
                          : 'text-slate-600 bg-slate-100'
                      }`}
                    >
                      {opt.count} neumáticos
                    </span>
                  </button>
                );
              })}

              {/* Empty state if records length is 0 */}
              {safeRecords.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400">
                  No hay registros disponibles para exportar con los filtros seleccionados.
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={safeRecords.length === 0}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-md transition-all ${
                safeRecords.length === 0
                  ? 'bg-slate-300 cursor-not-allowed opacity-70'
                  : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99]'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Descargar Excel ({currentSelectionMeta.total})</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Formato oficial XLSX compatible con Excel y Google Sheets</span>
          <span className="font-semibold text-slate-600">BAILAC ARGENTINA SRL</span>
        </div>
      </div>
    </div>
  );
};
