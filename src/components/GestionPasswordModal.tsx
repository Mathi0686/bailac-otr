import React, { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck, X } from 'lucide-react';

interface GestionPasswordModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export const GESTION_PASSWORD = 'Bailacfacturas+';

export const GestionPasswordModal: React.FC<GestionPasswordModalProps> = ({
  isOpen,
  onSuccess,
  onCancel,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(false);

    setTimeout(() => {
      if (password.trim() === GESTION_PASSWORD) {
        sessionStorage.setItem('bailac_gestion_auth', 'true');
        setPassword('');
        setError(false);
        setIsSubmitting(false);
        onSuccess();
      } else {
        setError(true);
        setErrorMessage('Contraseña de Gestión incorrecta. Acceso restringido al personal directivo.');
        setIsSubmitting(false);
      }
    }, 200);
  };

  const handleClose = () => {
    setPassword('');
    setError(false);
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Accent Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-slate-900" />

        <div className="p-6 sm:p-8">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Cancelar y volver a Operaciones"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3.5 mb-5">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">Acceso a Pestaña Gestión</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Gerencial
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Información financiera y facturación</p>
            </div>
          </div>

          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            Esta sección contiene métricas de facturación, precios y saldos pendientes. Ingrese la clave de seguridad gerencial para desbloquearla durante esta sesión.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Contraseña de Gestión
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(false);
                  }}
                  placeholder="Ingrese contraseña gerencial..."
                  className={`w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border rounded-xl font-mono transition-all focus:outline-none focus:ring-2 ${
                    error
                      ? 'border-red-500 focus:ring-red-200 bg-red-50/50'
                      : 'border-slate-300 focus:border-slate-900 focus:ring-slate-200'
                  }`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Volver a Operaciones
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !password.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Desbloquear</span>
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Bailac Argentina SRL · Versión v2.0</span>
          <span className="flex items-center gap-1 font-mono text-[10px]">
            <Lock className="w-3 h-3 text-slate-400" /> Clave Requerida
          </span>
        </div>
      </div>
    </div>
  );
};
