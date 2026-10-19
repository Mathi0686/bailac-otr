import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-xl border text-xs transition-all animate-slide-up ${
            toast.type === 'success'
              ? 'bg-slate-900 border-slate-800 text-white'
              : toast.type === 'error'
              ? 'bg-red-950 border-red-800 text-red-100'
              : 'bg-slate-900 border-slate-800 text-slate-100'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />}
          <div className="flex-1">
            <p className="font-semibold text-white">{toast.title}</p>
            {toast.description && <p className="text-[11px] text-slate-300 mt-0.5">{toast.description}</p>}
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
