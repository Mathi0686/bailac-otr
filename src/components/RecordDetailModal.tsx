import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Truck,
  DollarSign,
  Clock,
  Edit3,
  Save,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  FileText,
  Receipt,
  FileCheck,
  ExternalLink,
  Link2,
  Paperclip,
} from 'lucide-react';
import { OtrRecord } from '../types';
import { recalculateRecordMetrics, formatCurrency } from '../services/dataService';
import {
  PRESET_CLIENTES,
  PRESET_MARCAS,
  PRESET_MEDIDAS,
  PRESET_TRABAJOS,
  PRESET_ESTADOS,
  PRESET_TIPOS,
  PRESET_DISENIOS_NEUMATICO,
  PRESET_DISENIOS_RECAUCHAJE,
  PRESET_CONTROLES_ENTREGA,
} from '../data/formPresets';

interface RecordDetailModalProps {
  record: OtrRecord | null;
  isOpen: boolean;
  isCreateMode?: boolean;
  onClose: () => void;
  onSave: (record: OtrRecord) => void;
  onDelete?: (id: string) => void;
}

export const RecordDetailModal: React.FC<RecordDetailModalProps> = ({
  record,
  isOpen,
  isCreateMode = false,
  onClose,
  onSave,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(isCreateMode);
  const [formData, setFormData] = useState<Partial<OtrRecord>>({});
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

  // Sync state when record or mode changes
  useEffect(() => {
    if (isCreateMode) {
      setIsEditing(true);
      const today = new Date();
      const todayStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
      setFormData({
        cliente: 'CERRO VANGUARDIA',
        marca: 'BRIDGESTONE',
        medida: '45/65R45',
        serie: '',
        solped: '',
        disenioRecauchaje: '',
        disenioNeumatico: 'VSDL',
        tipo: 'L5',
        cantLote: '1/1',
        nroInterno: '',
        nCotizacion: '',
        trabajoRealizar: 'REPARACION',
        estado: 'PLANTA',
        fechaIngreso: todayStr,
        remitoIngreso: '',
        fechaComprometida: '',
        fechaTT: '',
        controlEntrega: 'EN PROCESO',
        remitoSalida: '',
        fechaRetiro: '',
        precio: 0,
        precioFormatted: '$ 0.00',
        oc: '',
        factura: '',
        fechaFactura: '',
        hess: '',
        linkFactura: '',
        linkOc: '',
        linkCotizacion: '',
        linkRemito: '',
      });
    } else if (record) {
      setIsEditing(false);
      setFormData({ ...record });
    }
    setConfirmDelete(false);
  }, [record, isCreateMode, isOpen]);

  if (!isOpen) return null;

  const handleFieldChange = (field: keyof OtrRecord, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const getTodayString = () => {
    const today = new Date();
    return `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cliente || !formData.cliente.trim()) {
      alert('Por favor seleccione o ingrese el nombre del Cliente.');
      return;
    }
    const computed = recalculateRecordMetrics({
      ...formData,
      id: isCreateMode ? undefined : record?.id,
    });
    onSave(computed);
    setIsEditing(false);
    onClose();
  };

  const handleDelete = () => {
    if (record?.id && onDelete) {
      onDelete(record.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[94vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Datalists for instant autocomplete & speed */}
        <datalist id="presets-clientes">
          {PRESET_CLIENTES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        <datalist id="presets-marcas">
          {PRESET_MARCAS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>

        <datalist id="presets-medidas">
          {PRESET_MEDIDAS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>

        <datalist id="presets-trabajos">
          {PRESET_TRABAJOS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>

        <datalist id="presets-tipos">
          {PRESET_TIPOS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>

        <datalist id="presets-disenios-neumatico">
          {PRESET_DISENIOS_NEUMATICO.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>

        <datalist id="presets-disenios-recauchaje">
          {PRESET_DISENIOS_RECAUCHAJE.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>

        <datalist id="presets-controles-entrega">
          {PRESET_CONTROLES_ENTREGA.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-extrabold text-sm">
              OTR
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {isCreateMode
                    ? 'Agregar Nuevo Neumático OTR'
                    : isEditing
                    ? `Modificar: ${formData.serie || formData.nroInterno || 'Registro'}`
                    : formData.serie || formData.nroInterno || 'Detalle de Neumático'}
                </h3>
                {!isCreateMode && !isEditing && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      formData.estado === 'ENTREGADO'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : formData.estado === 'PLANTA'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-red-500/20 text-red-300'
                    }`}
                  >
                    {formData.estado}
                  </span>
                )}
                {isEditing && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    Modo Edición Rápida con Opciones
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {formData.cliente} · {formData.marca} {formData.medida ? `· ${formData.medida}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isCreateMode && !isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modificar Datos</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Form / View Body */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
          {/* Quick Metrics Bar (Only in View Mode) */}
          {!isEditing && record && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-medium text-slate-500">Días Proceso</span>
                <p className="text-lg font-extrabold text-slate-900 font-mono mt-0.5">
                  {record.diasProceso !== null ? `${record.diasProceso} d` : '—'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-medium text-slate-500">Días Retiro</span>
                <p className="text-lg font-extrabold text-slate-900 font-mono mt-0.5">
                  {record.diasRetiro !== null ? `${record.diasRetiro} d` : '—'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-medium text-slate-500">Días Atraso</span>
                <p
                  className={`text-lg font-extrabold font-mono mt-0.5 ${
                    record.diasAtraso && record.diasAtraso > 0 ? 'text-red-600' : 'text-slate-900'
                  }`}
                >
                  {record.diasAtraso !== null ? `${record.diasAtraso} d` : '0 d'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-medium text-slate-500">Precio / Tarifa</span>
                <p className="text-lg font-extrabold text-orange-600 font-mono mt-0.5">
                  {record.precioFormatted || '$ 0.00'}
                </p>
              </div>
            </div>
          )}

          {/* Section 1: Especificaciones de Neumático */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-orange-500" />
                <span>1. Especificaciones de Neumático (Opciones Predefinidas)</span>
              </h4>
              {isEditing && (
                <span className="text-[10px] text-slate-500">
                  Tip: Selecciona de la lista o escribe directamente
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
              {/* Cliente with Presets */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Cliente Minero *
                </label>
                {isEditing ? (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      required
                      list="presets-clientes"
                      value={formData.cliente || ''}
                      onChange={(e) => handleFieldChange('cliente', e.target.value)}
                      placeholder="Seleccionar o escribir cliente..."
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                    {/* Quick Cliente shortcuts */}
                    <div className="flex flex-wrap gap-1">
                      {['CERRO VANGUARDIA', 'VELADERO', 'NEUMATICOS PIOLI'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleFieldChange('cliente', c)}
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 hover:bg-orange-100 hover:text-orange-800 text-slate-700 transition-colors"
                        >
                          {c.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="font-semibold text-slate-900 text-xs">{formData.cliente || '—'}</p>
                )}
              </div>

              {/* Marca with Presets */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Marca *</label>
                {isEditing ? (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      required
                      list="presets-marcas"
                      value={formData.marca || ''}
                      onChange={(e) => handleFieldChange('marca', e.target.value.toUpperCase())}
                      placeholder="Seleccionar o escribir marca..."
                      className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                    {/* Quick Marca shortcuts */}
                    <div className="flex flex-wrap gap-1">
                      {['BRIDGESTONE', 'MICHELIN', 'GOOD YEAR'].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleFieldChange('marca', m)}
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 hover:bg-orange-100 hover:text-orange-800 text-slate-700 transition-colors"
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="font-semibold text-slate-900 text-xs">{formData.marca || '—'}</p>
                )}
              </div>

              {/* Medida with Presets */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Medida OTR *
                </label>
                {isEditing ? (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      list="presets-medidas"
                      value={formData.medida || ''}
                      onChange={(e) => handleFieldChange('medida', e.target.value)}
                      placeholder="Seleccionar medida (ej. 45/65R45)..."
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                    {/* Quick Medida shortcuts */}
                    <div className="flex flex-wrap gap-1">
                      {['45/65R45', '46/90R57', '27.00R49', '18.00R25'].map((med) => (
                        <button
                          key={med}
                          type="button"
                          onClick={() => handleFieldChange('medida', med)}
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-200 hover:bg-orange-100 hover:text-orange-800 text-slate-700 transition-colors"
                        >
                          {med}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="font-mono font-semibold text-slate-900 text-xs">{formData.medida || '—'}</p>
                )}
              </div>

              {/* Serie */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Número de Serie
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.serie || ''}
                    onChange={(e) => handleFieldChange('serie', e.target.value.toUpperCase())}
                    placeholder="Ej. S3RLC0166..."
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                ) : (
                  <p className="font-mono font-semibold text-slate-900 text-xs">{formData.serie || '—'}</p>
                )}
              </div>

              {/* Nro Interno */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Hoja de Ruta / Nro Interno
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.nroInterno || ''}
                    onChange={(e) => handleFieldChange('nroInterno', e.target.value)}
                    placeholder="Ej. 837, B.ARG-837..."
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                ) : (
                  <p className="font-mono font-semibold text-slate-900 text-xs">{formData.nroInterno || '—'}</p>
                )}
              </div>

              {/* Tipo / Clasificación with Presets */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Tipo / Clasificación OTR
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    list="presets-tipos"
                    value={formData.tipo || ''}
                    onChange={(e) => handleFieldChange('tipo', e.target.value.toUpperCase())}
                    placeholder="Seleccionar (ej. L5, E4, L5S)..."
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                ) : (
                  <p className="font-mono text-slate-900 text-xs">{formData.tipo || '—'}</p>
                )}
              </div>

              {/* Diseño Neumático with Presets */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Diseño Neumático
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    list="presets-disenios-neumatico"
                    value={formData.disenioNeumatico || ''}
                    onChange={(e) => handleFieldChange('disenioNeumatico', e.target.value.toUpperCase())}
                    placeholder="Seleccionar (ej. VSDL, XMINE, VREV)..."
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                ) : (
                  <p className="text-slate-800 text-xs">{formData.disenioNeumatico || '—'}</p>
                )}
              </div>

              {/* Diseño Recauchaje with Presets */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Diseño Recauchaje
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    list="presets-disenios-recauchaje"
                    value={formData.disenioRecauchaje || ''}
                    onChange={(e) => handleFieldChange('disenioRecauchaje', e.target.value)}
                    placeholder="Seleccionar (ej. L-5S, LISO)..."
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                ) : (
                  <p className="text-slate-800 text-xs">{formData.disenioRecauchaje || '—'}</p>
                )}
              </div>

              {/* Cant Lote */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Cant. Lote</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.cantLote || ''}
                    onChange={(e) => handleFieldChange('cantLote', e.target.value)}
                    placeholder="Ej. 1/22, 1/1..."
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                ) : (
                  <p className="text-slate-800 text-xs">{formData.cantLote || '—'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Operaciones & Taller TT */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-orange-500" />
                <span>2. Trabajo a Realizar y Cronograma de Taller</span>
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
              {/* Trabajo a Realizar with Presets & Quick Chips */}
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Trabajo a Realizar *
                </label>
                {isEditing ? (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      required
                      list="presets-trabajos"
                      value={formData.trabajoRealizar || ''}
                      onChange={(e) => handleFieldChange('trabajoRealizar', e.target.value)}
                      placeholder="Seleccionar o escribir servicio..."
                      className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                    {/* Quick Trabajo shortcuts */}
                    <div className="flex flex-wrap gap-1">
                      {['REPARACION', 'RECUPERADO L5', 'RECUPERADO L4', 'RECAUCHAJE', 'BAJA'].map((tr) => (
                        <button
                          key={tr}
                          type="button"
                          onClick={() => handleFieldChange('trabajoRealizar', tr)}
                          className={`text-[9px] font-semibold px-2 py-0.5 rounded transition-colors ${
                            formData.trabajoRealizar === tr
                              ? 'bg-orange-600 text-white'
                              : 'bg-slate-200 hover:bg-orange-100 hover:text-orange-800 text-slate-700'
                          }`}
                        >
                          {tr}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="font-bold text-slate-900 text-xs">{formData.trabajoRealizar || '—'}</p>
                )}
              </div>

              {/* Estado with Predefined Select */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Estado OTR *</label>
                {isEditing ? (
                  <select
                    value={formData.estado || 'PLANTA'}
                    onChange={(e) => handleFieldChange('estado', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  >
                    {PRESET_ESTADOS.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="font-bold text-slate-900 text-xs">{formData.estado || '—'}</p>
                )}
              </div>

              {/* Control Entrega with Presets */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Control Entrega
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    list="presets-controles-entrega"
                    value={formData.controlEntrega || ''}
                    onChange={(e) => handleFieldChange('controlEntrega', e.target.value)}
                    placeholder="Seleccionar (CUMPLIDO, PENDIENTE)..."
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                ) : (
                  <p className="text-slate-800 text-xs">{formData.controlEntrega || '—'}</p>
                )}
              </div>

              {/* Fecha Ingreso with quick "Hoy" button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">
                    Fecha Ingreso (M/D/YYYY)
                  </label>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => handleFieldChange('fechaIngreso', getTodayString())}
                      className="text-[9px] font-semibold text-orange-600 hover:text-orange-800"
                    >
                      Hoy
                    </button>
                  )}
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.fechaIngreso || ''}
                    onChange={(e) => handleFieldChange('fechaIngreso', e.target.value)}
                    placeholder="Ej. 2/3/2026"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                ) : (
                  <p className="font-mono text-slate-800 text-xs">{formData.fechaIngreso || '—'}</p>
                )}
              </div>

              {/* Remito Ingreso */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Remito Ingreso
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.remitoIngreso || ''}
                    onChange={(e) => handleFieldChange('remitoIngreso', e.target.value)}
                    placeholder="Ej. 25251..."
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                ) : (
                  <p className="font-mono text-slate-800 text-xs">{formData.remitoIngreso || '—'}</p>
                )}
              </div>

              {/* Fecha Comprometida */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Fecha Comprometida
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.fechaComprometida || ''}
                    onChange={(e) => handleFieldChange('fechaComprometida', e.target.value)}
                    placeholder="Ej. 6/16/2026"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                ) : (
                  <p className="font-mono text-slate-800 text-xs">{formData.fechaComprometida || '—'}</p>
                )}
              </div>

              {/* Fecha TT (Término Taller) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">
                    Fecha TT (Término Taller)
                  </label>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => handleFieldChange('fechaTT', getTodayString())}
                      className="text-[9px] font-semibold text-orange-600 hover:text-orange-800"
                    >
                      Hoy
                    </button>
                  )}
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.fechaTT || ''}
                    onChange={(e) => handleFieldChange('fechaTT', e.target.value)}
                    placeholder="M/D/YYYY (vacío si está en planta)"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                ) : (
                  <p className="font-mono font-semibold text-slate-900 text-xs">{formData.fechaTT || 'En proceso'}</p>
                )}
              </div>

              {/* Remito Salida */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Remito Salida
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.remitoSalida || ''}
                    onChange={(e) => handleFieldChange('remitoSalida', e.target.value)}
                    placeholder="Ej. 2826..."
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                ) : (
                  <p className="font-mono text-slate-800 text-xs">{formData.remitoSalida || '—'}</p>
                )}
              </div>

              {/* Fecha Retiro */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">
                    Fecha Retiro (Despacho)
                  </label>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => handleFieldChange('fechaRetiro', getTodayString())}
                      className="text-[9px] font-semibold text-orange-600 hover:text-orange-800"
                    >
                      Hoy
                    </button>
                  )}
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.fechaRetiro || ''}
                    onChange={(e) => handleFieldChange('fechaRetiro', e.target.value)}
                    placeholder="Ej. 5/28/2026"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                ) : (
                  <p className="font-mono text-slate-800 text-xs">{formData.fechaRetiro || '—'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Gestión Comercial & Facturación */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-orange-500" />
              <span>3. Gestión Comercial, Precios y Facturación</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
              {/* Precio USD */}
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Precio / Tarifa USD ($)
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.precio ?? ''}
                    onChange={(e) => handleFieldChange('precio', e.target.value)}
                    placeholder="Ej. 6629.42, 2250..."
                    className="w-full px-2.5 py-1.5 text-xs font-mono font-bold text-orange-600 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                ) : (
                  <p className="font-mono font-bold text-orange-600 text-sm">{formData.precioFormatted || '$ 0.00'}</p>
                )}
              </div>

              {/* N Cotizacion */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  N° Cotización
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.nCotizacion || ''}
                    onChange={(e) => handleFieldChange('nCotizacion', e.target.value)}
                    placeholder="Ej. B.ARG-837"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                ) : (
                  <p className="font-mono font-semibold text-slate-900 text-xs">{formData.nCotizacion || '—'}</p>
                )}
              </div>

              {/* OC */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Orden de Compra (OC)
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.oc || ''}
                    onChange={(e) => handleFieldChange('oc', e.target.value)}
                    placeholder="Ej. 4502627132"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                ) : (
                  <p className="font-mono text-slate-800 text-xs">{formData.oc || '—'}</p>
                )}
              </div>

              {/* Factura */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  N° Factura
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.factura || ''}
                    onChange={(e) => handleFieldChange('factura', e.target.value)}
                    placeholder="Ej. 665, 738, 4..."
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                ) : (
                  <p className="font-mono font-semibold text-slate-900 text-xs">{formData.factura || 'Pendiente'}</p>
                )}
              </div>

              {/* Fecha Factura */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">
                    Fecha Factura
                  </label>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => handleFieldChange('fechaFactura', getTodayString())}
                      className="text-[9px] font-semibold text-orange-600 hover:text-orange-800"
                    >
                      Hoy
                    </button>
                  )}
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.fechaFactura || ''}
                    onChange={(e) => handleFieldChange('fechaFactura', e.target.value)}
                    placeholder="Ej. 6/7/2026"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                ) : (
                  <p className="font-mono text-slate-800 text-xs">{formData.fechaFactura || '—'}</p>
                )}
              </div>

              {/* SOLPED */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">SOLPED</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.solped || ''}
                    onChange={(e) => handleFieldChange('solped', e.target.value)}
                    placeholder="Ej. 13191472"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                ) : (
                  <p className="font-mono text-slate-800 text-xs">{formData.solped || '—'}</p>
                )}
              </div>

              {/* HESS */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">HESS</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.hess || ''}
                    onChange={(e) => handleFieldChange('hess', e.target.value)}
                    placeholder="Ej. 5003751579"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                ) : (
                  <p className="font-mono text-slate-800 text-xs">{formData.hess || '—'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Documentación Digital y Enlaces Directos */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Link2 className="w-3.5 h-3.5 text-orange-500" />
              <span>4. Documentación Digital y Enlaces (Drive / ERP / Cloud)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
              {/* Link Factura */}
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-orange-500" />
                    <span>Link Factura Digital</span>
                  </label>
                  {formData.linkFactura && formData.linkFactura.trim() && (
                    <a
                      href={formData.linkFactura}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 hover:text-orange-800 bg-orange-50 px-2 py-0.5 rounded transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Abrir</span>
                    </a>
                  )}
                </div>
                {isEditing ? (
                  <input
                    type="url"
                    value={formData.linkFactura || ''}
                    onChange={(e) => handleFieldChange('linkFactura', e.target.value)}
                    placeholder="https://drive.google.com/... o enlace de factura"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                ) : (
                  formData.linkFactura && formData.linkFactura.trim() ? (
                    <a
                      href={formData.linkFactura}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-orange-600 hover:underline font-mono truncate block"
                    >
                      {formData.linkFactura}
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Sin enlace cargado</span>
                  )
                )}
              </div>

              {/* Link Orden de Compra (OC) */}
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-blue-500" />
                    <span>Link Orden de Compra (O. C.)</span>
                  </label>
                  {formData.linkOc && formData.linkOc.trim() && (
                    <a
                      href={formData.linkOc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Abrir</span>
                    </a>
                  )}
                </div>
                {isEditing ? (
                  <input
                    type="url"
                    value={formData.linkOc || ''}
                    onChange={(e) => handleFieldChange('linkOc', e.target.value)}
                    placeholder="https://drive.google.com/... o enlace de OC"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                ) : (
                  formData.linkOc && formData.linkOc.trim() ? (
                    <a
                      href={formData.linkOc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline font-mono truncate block"
                    >
                      {formData.linkOc}
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Sin enlace cargado</span>
                  )
                )}
              </div>

              {/* Link Cotización */}
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Link Cotización</span>
                  </label>
                  {formData.linkCotizacion && formData.linkCotizacion.trim() && (
                    <a
                      href={formData.linkCotizacion}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Abrir</span>
                    </a>
                  )}
                </div>
                {isEditing ? (
                  <input
                    type="url"
                    value={formData.linkCotizacion || ''}
                    onChange={(e) => handleFieldChange('linkCotizacion', e.target.value)}
                    placeholder="https://drive.google.com/... o enlace de cotización"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                ) : (
                  formData.linkCotizacion && formData.linkCotizacion.trim() ? (
                    <a
                      href={formData.linkCotizacion}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-600 hover:underline font-mono truncate block"
                    >
                      {formData.linkCotizacion}
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Sin enlace cargado</span>
                  )
                )}
              </div>

              {/* Link Remito */}
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-purple-500" />
                    <span>Link Remito Salida / Entrega</span>
                  </label>
                  {formData.linkRemito && formData.linkRemito.trim() && (
                    <a
                      href={formData.linkRemito}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 hover:text-purple-800 bg-purple-50 px-2 py-0.5 rounded transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Abrir</span>
                    </a>
                  )}
                </div>
                {isEditing ? (
                  <input
                    type="url"
                    value={formData.linkRemito || ''}
                    onChange={(e) => handleFieldChange('linkRemito', e.target.value)}
                    placeholder="https://drive.google.com/... o enlace de remito"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                ) : (
                  formData.linkRemito && formData.linkRemito.trim() ? (
                    <a
                      href={formData.linkRemito}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-600 hover:underline font-mono truncate block"
                    >
                      {formData.linkRemito}
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Sin enlace cargado</span>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons in Edit Mode */}
          {isEditing && (
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200">
              {!isCreateMode && onDelete && (
                <div>
                  {confirmDelete ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-red-600 font-bold">¿Confirmas eliminar?</span>
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="px-2.5 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-md"
                      >
                        Sí, eliminar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 py-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar registro</span>
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    if (isCreateMode) {
                      onClose();
                    } else {
                      setIsEditing(false);
                      if (record) setFormData({ ...record });
                    }
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded-lg shadow-md transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isCreateMode ? 'Guardar Nuevo Neumático' : 'Guardar Modificaciones'}</span>
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Footer in View Mode */}
        {!isEditing && (
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-slate-400">ID de Sistema: {record?.id}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Modificar
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
