import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, X, FileCode, RefreshCw, Database } from 'lucide-react';

export interface SyncFeedbackState {
  isOpen: boolean;
  type: 'success' | 'error';
  actionLabel?: string;
  recordSummary?: string;
  errorDetail?: string;
  onAcknowledge?: () => void;
}

interface SyncFeedbackModalProps {
  feedback: SyncFeedbackState;
  onClose: () => void;
  onOpenCodeModal?: () => void;
}

export const SyncFeedbackModal: React.FC<SyncFeedbackModalProps> = ({
  feedback,
  onClose,
  onOpenCodeModal,
}) => {
  useEffect(() => {
    if (!feedback.isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || (e.key === 'Enter' && feedback.type === 'success')) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [feedback.isOpen, feedback.type, onClose]);

  if (!feedback.isOpen) return null;

  const isSuccess = feedback.type === 'success';
  const isMissingDoPost =
    !isSuccess &&
    Boolean(
      feedback.errorDetail &&
        (feedback.errorDetail.toLowerCase().includes('dopost') ||
          feedback.errorDetail.toLowerCase().includes('script function not found'))
    );

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-md bg-white rounded-2xl shadow-2xl border overflow-hidden transform transition-all ${
          isSuccess ? 'border-emerald-200' : 'border-red-300'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Status Accent Bar */}
        <div
          className={`h-2 w-full ${
            isSuccess
              ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600'
              : 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700'
          }`}
        />

        {/* Header */}
        <div
          className={`px-6 pt-6 pb-4 flex items-start justify-between gap-3 ${
            isSuccess ? 'bg-emerald-50/40' : 'bg-red-50/70'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                isSuccess
                  ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                  : 'bg-red-600 text-white shadow-red-600/25'
              }`}
            >
              {isSuccess ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>

            <div>
              <span
                className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded mb-1 ${
                  isSuccess
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}
              >
                {isSuccess ? 'Sincronización Verificada' : 'Alerta de Sincronización'}
              </span>
              <h3
                className={`text-base font-extrabold leading-snug ${
                  isSuccess ? 'text-slate-900' : 'text-red-950'
                }`}
              >
                {isSuccess ? 'Operación Confirmada' : 'Fallo de Guardado en la Nube'}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors"
            title="Cerrar notificación"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Primary Mandatory Confirmation / Warning Message */}
          <div
            className={`p-4 rounded-xl border text-sm font-bold leading-relaxed ${
              isSuccess
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : 'bg-red-50 border-red-300 text-red-900'
            }`}
          >
            {isSuccess
              ? '¡Cambios guardados y sincronizados correctamente en Google Sheets!'
              : 'Error al sincronizar con Google Sheets. Los cambios no se guardaron. Por favor, intente nuevamente'}
          </div>

          {/* Operation Summary */}
          {feedback.recordSummary && (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <Database className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0 flex-1">
                {feedback.actionLabel && (
                  <span className="font-bold text-slate-900 mr-1.5">{feedback.actionLabel}:</span>
                )}
                <span className="font-mono text-slate-600 break-words">{feedback.recordSummary}</span>
              </div>
            </div>
          )}

          {/* Error Detail Box */}
          {!isSuccess && feedback.errorDetail && (
            <div className="space-y-2">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-red-800">
                Detalle del error reportado:
              </span>
              <div className="p-3 rounded-xl bg-red-950 text-red-100 font-mono text-xs leading-relaxed break-words border border-red-800 max-h-36 overflow-y-auto">
                {feedback.errorDetail}
              </div>
            </div>
          )}

          {isSuccess && (
            <p className="text-xs text-slate-500 leading-relaxed">
              Al cerrar esta confirmación, la tabla local y los indicadores se actualizarán automáticamente con los nuevos datos sincronizados.
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2.5">
          {isMissingDoPost && onOpenCodeModal && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCodeModal();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 transition-colors mr-auto"
            >
              <FileCode className="w-3.5 h-3.5 text-orange-600" />
              <span>Ver Code.gs (doPost)</span>
            </button>
          )}

          <button
            type="button"
            autoFocus
            onClick={onClose}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold text-white shadow-md transition-all active:scale-[0.98] ${
              isSuccess
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
            }`}
          >
            {isSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Aceptar y Actualizar Vista</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Entendido, Reintentar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
