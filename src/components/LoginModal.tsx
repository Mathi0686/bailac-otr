import React, { useState } from 'react';
import { ShieldCheck, Lock, Eye, EyeOff, AlertCircle, ArrowRight, HardHat } from 'lucide-react';

interface LoginModalProps {
  onSuccess: () => void;
}

export const PASSWORD_SECRETA = 'bailac2026';

export const LoginModal: React.FC<LoginModalProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(false);

    setTimeout(() => {
      if (password.trim() === PASSWORD_SECRETA) {
        sessionStorage.setItem('bailac_auth', 'true');
        onSuccess();
      } else {
        setError(true);
        setErrorMessage('Contraseña incorrecta. Verifique con el administrador de planta.');
        setIsSubmitting(false);
      }
    }, 250);
  };

  const handleQuickFill = () => {
    setPassword(PASSWORD_SECRETA);
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Industrial Accent Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-slate-900" />

        <div className="p-8">
          {/* Header Brand */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-orange-500 shadow-md">
              <HardHat className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight text-slate-900">BAILAC</span>
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-100 text-orange-800">
                  OTR Mining
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Gestión & Monitoreo de Neumáticos Mineros</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Acceso Seguro al Sistema</h2>
            <p className="text-xs text-slate-500 mt-1">
              Ingrese la clave de seguridad corporativa autorizada para acceder al panel de Operaciones y Gestión.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Contraseña de Planta
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(false);
                  }}
                  placeholder="Ingrese contraseña de acceso..."
                  className={`w-full pl-10 pr-10 py-3 text-sm bg-slate-50 border rounded-xl font-mono transition-all focus:outline-none focus:ring-2 ${
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
              <div className="flex items-center gap-2 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !password.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-[0.99]"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Ingresar a Plataforma</span>
                  <ArrowRight className="w-4 h-4 text-orange-400" />
                </>
              )}
            </button>
          </form>

          {/* Quick-fill helper hint for convenience */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Clave por defecto:</span>
            </span>
            <button
              type="button"
              onClick={handleQuickFill}
              className="font-mono font-semibold text-slate-800 hover:text-orange-600 bg-slate-100 hover:bg-orange-50 px-2 py-1 rounded transition-colors"
              title="Haz clic para autocompletar"
            >
              bailac2026
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 px-8 py-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Bailac San Juan & Santa Cruz</span>
          <span>Soporte OTR 24/7</span>
        </div>
      </div>
    </div>
  );
};
