import React, { useState } from 'react';
import {
  X,
  Clock,
  Truck,
  AlertTriangle,
  Layers,
  CheckCircle2,
  Receipt,
  DollarSign,
  TrendingUp,
  Percent,
  Calculator,
  ShieldAlert,
  Calendar,
  Filter,
  Info,
  Check,
} from 'lucide-react';

interface KpiFormulasModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KpiFormulasModal: React.FC<KpiFormulasModalProps> = ({ isOpen, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<'operaciones' | 'gestion' | 'reglas'>('operaciones');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Top Accent Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-slate-900 shrink-0" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-md shrink-0">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Glosario de Fórmulas y Métricas (KPIs)
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase tracking-wider">
                  Bailac v2.0
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Criterios matemáticos, condiciones de exclusión estricta y lógica de negocio
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Cerrar glosario"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="bg-slate-100 px-6 py-2.5 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveCategory('operaciones')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeCategory === 'operaciones'
                ? 'bg-orange-500 text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>KPIs Operaciones (Taller)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('gestion')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeCategory === 'gestion'
                ? 'bg-orange-500 text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>KPIs Gestión (Facturación)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('reglas')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeCategory === 'reglas'
                ? 'bg-orange-500 text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Reglas Estrictas & Filtros</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* CATEGORY 1: OPERACIONES */}
          {activeCategory === 'operaciones' && (
            <div className="space-y-4">
              {/* Card 1: Días Promedio Proceso */}
              <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">1. Días Promedio Proceso</h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Tiempo neto de intervención técnica en planta
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-50 text-orange-700 border border-orange-200">
                    Días Calendario
                  </span>
                </div>

                <div className="bg-slate-900 text-white p-3 rounded-lg font-mono text-xs mb-3 flex items-center justify-between">
                  <span>Días = FECHA_TT − FIT</span>
                  <span className="text-[10px] text-orange-400 font-sans font-semibold">Promedio ponderado</span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-slate-800 shrink-0">• Definición:</span>
                    <span>
                      Diferencia en días entre la Fecha de Término de Trabajo (<strong>FECHA_TT</strong>) y la Fecha de Inicio de Trabajo (<strong>FIT</strong>).
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-red-700 bg-red-50/70 p-2 rounded-lg border border-red-200">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                    <div>
                      <strong className="font-bold">Filtro Estricto Aplicado:</strong> Si la columna <strong>FIT</strong> está vacía o no es una fecha válida, el registro queda <strong>estrictamente excluido</strong> del cálculo (no se reemplaza con FECHA_INGRESO). También requiere FECHA_TT válida.
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Días Promedio Retiro */}
              <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">2. Días Promedio Retiro</h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Permanencia total desde el inicio del trabajo hasta la entrega física
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    Días Logísticos
                  </span>
                </div>

                <div className="bg-slate-900 text-white p-3 rounded-lg font-mono text-xs mb-3 flex items-center justify-between">
                  <span>Días = FECHA_RETIRO − FIT</span>
                  <span className="text-[10px] text-blue-400 font-sans font-semibold">Promedio ponderado</span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-slate-800 shrink-0">• Definición:</span>
                    <span>
                      Diferencia en días entre la fecha en que el neumático es retirado de planta (<strong>FECHA_RETIRO</strong>) y la fecha de inicio de trabajo (<strong>FIT</strong>).
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-red-700 bg-red-50/70 p-2 rounded-lg border border-red-200">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                    <div>
                      <strong className="font-bold">Filtro Estricto Aplicado:</strong> Requiere obligatoriamente contar con <strong>FECHA_RETIRO</strong> y <strong>FIT</strong>. Si falta cualquiera de las dos, el registro queda <strong>completamente excluido</strong> del cálculo.
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Días Promedio Atraso */}
              <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-sm shrink-0">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">3. Días Promedio Atraso</h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Desvío respecto a la fecha acordada con la faena
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    Desvío SLA
                  </span>
                </div>

                <div className="bg-slate-900 text-white p-3 rounded-lg font-mono text-xs mb-3 flex items-center justify-between">
                  <span>Días Atraso = Máx(0, FECHA_TT − FECHA_COMPROMETIDA)</span>
                  <span className="text-[10px] text-amber-400 font-sans font-semibold">Solo demoras positivas</span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <p>
                    Si el neumático aún continúa en planta (sin FTT), se calcula comparando la fecha de hoy contra la <strong>FECHA_COMPROMETIDA</strong>. Si el trabajo se completó a tiempo, el atraso es 0.
                  </p>
                </div>
              </div>

              {/* Card 4: En Proceso, Terminados, Entregados, Scrap */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-1">
                    4. En Proceso (Planta)
                  </span>
                  <p className="text-xs text-slate-600">
                    Total de unidades con <strong>ESTADO = PLANTA</strong> y trabajo productivo activo (excluye Scrap). Incluye tooltip flotante interactivo con detalle de serie y fecha de ingreso.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-1">
                    5. Terminados y Entregados
                  </span>
                  <p className="text-xs text-slate-600">
                    <strong>Terminados:</strong> Unidades con estado TERMINADO o ENTREGADO, o con fecha de término.  
                    <strong>Entregados:</strong> Unidades con estado ENTREGADO o con remito/fecha de retiro.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-1">
                    6. Scrap / Rechazo Operacional
                  </span>
                  <p className="text-xs text-slate-600">
                    Unidades dadas de baja técnica por daño no reparable.  
                    <strong>Tasa Scrap (%):</strong> (Unidades Scrap / Total Ingresados) × 100.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-1">
                    7. Total Ingresados
                  </span>
                  <p className="text-xs text-slate-600">
                    Conteo total de neumáticos registrados que cumplen los filtros operativos activos (Año, Cliente, Marca y Trabajo).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* CATEGORY 2: GESTIÓN */}
          {activeCategory === 'gestion' && (
            <div className="space-y-4">
              {/* Card 1: Total Facturado */}
              <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white shadow-xs">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">1. Total Facturado</h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Monto total de servicios con factura fiscal emitida
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    USD / ARS ($)
                  </span>
                </div>

                <div className="bg-slate-900 text-white p-3 rounded-lg font-mono text-xs mb-3 flex items-center justify-between">
                  <span>Total Facturado = ∑ PRECIO (donde FACTURA ≠ vacía)</span>
                  <span className="text-[10px] text-emerald-400 font-sans font-semibold">Facturación cerrada</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Suma el importe de todos los neumáticos que ya cuentan con número de factura registrado en la planilla para el período seleccionado.
                </p>
              </div>

              {/* Card 2: Pendiente de Facturar ($) */}
              <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white shadow-xs">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-sm shrink-0">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">2. Pendiente de Facturar ($)</h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Valor económico de neumáticos entregados o listos sin factura
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    Por Cobrar ($)
                  </span>
                </div>

                <div className="bg-slate-900 text-white p-3 rounded-lg font-mono text-xs mb-3 flex items-center justify-between">
                  <span>Pendiente = ∑ PRECIO (Neumáticos listos sin FACTURA)</span>
                  <span className="text-[10px] text-amber-400 font-sans font-semibold">Cobro pendiente</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Calcula la sumatoria de tarifas de aquellas unidades que ya cumplieron los requisitos para ser facturadas según el acuerdo comercial con cada faena minera.
                </p>
              </div>

              {/* Card 3: Reglas Específicas por Cliente en Pendientes de Facturación */}
              <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-amber-50/40 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Reglas Específicas de Validación por Cliente:
                  </h4>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-white border border-amber-200 text-slate-700">
                    <strong className="text-amber-900 font-bold block mb-0.5">
                      • Minera Andina del Sol / Veladero:
                    </strong>
                    <span>
                      Requiere obligatoriamente <strong>HES (Hoja de Entrada de Servicios)</strong> y <strong>Fecha de Retiro</strong> registrada. Si falta la HES o la fecha de retiro, la unidad no se considera apta para facturar.
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-amber-200 text-slate-700">
                    <strong className="text-amber-900 font-bold block mb-0.5">
                      • Cerro Vanguardia:
                    </strong>
                    <span>
                      Requiere obligatoriamente <strong>Fecha de Retiro</strong> registrada.
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-amber-200 text-slate-700">
                    <strong className="text-amber-900 font-bold block mb-0.5">
                      • Demás Clientes (Yamana, Minera Santa Cruz, etc.):
                    </strong>
                    <span>
                      Se consideran pendientes aquellas unidades que están en estado <strong>ENTREGADO</strong> o <strong>TERMINADO</strong> (o con remito/fecha de salida) y que aún no tengan factura.
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 4: Ticket Promedio y Efectividad de Cobro */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Ticket Promedio
                    </span>
                  </div>
                  <div className="bg-slate-900 text-white p-2 rounded text-[11px] font-mono mb-2">
                    Total Facturado / Cantidad Facturados
                  </div>
                  <p className="text-xs text-slate-600">
                    Promedio facturado por cada neumático con servicio liquidado.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Percent className="w-4 h-4 text-orange-600" />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Efectividad de Cobro (%)
                    </span>
                  </div>
                  <div className="bg-slate-900 text-white p-2 rounded text-[11px] font-mono mb-2">
                    [Facturado / (Facturado + Pendiente)] × 100
                  </div>
                  <p className="text-xs text-slate-600">
                    Porcentaje del valor potencial entregado que ya ha sido facturado.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* CATEGORY 3: REGLAS ESTRICTAS */}
          {activeCategory === 'reglas' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-600" />
                  <span>Filtro por Año: Año Actual por Defecto (2026)</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Para evitar mezclar datos históricos con la operación corriente de planta, el sistema preselecciona automáticamente el <strong>año actual (2026)</strong>. Se ha retirado el botón indiscriminado de "Todos" para asegurar que los cálculos reflejen el ejercicio activo.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-red-200 bg-red-50/50">
                <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  <span>Regla de Exclusión Estricta para Días Promedio</span>
                </h4>
                <ul className="text-xs text-slate-700 space-y-2 list-disc list-inside">
                  <li>
                    <strong>Días Proceso:</strong> Si el registro carece de <strong>FIT</strong> o <strong>FECHA_TT</strong>, queda <strong>100% excluido</strong> del numerador y del denominador del promedio. No se utiliza la fecha de ingreso como estimación.
                  </li>
                  <li>
                    <strong>Días Retiro:</strong> Si falta <strong>FECHA_RETIRO</strong> o <strong>FIT</strong>, el registro es <strong>100% excluido</strong> del cálculo.
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50">
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-blue-600" />
                  <span>Filtro de Año Dedicado en Pendientes de Facturación</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  La tabla de <em>Neumáticos Pendientes de Facturación</em> incluye su propio selector de año (por defecto sincronizado con el año 2026). Esto evita que más de 700 unidades históricas acumuladas desde el año 2012 saturen la vista operativa y administrativa.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Versión v2.0 · Fórmulas Oficiales Bailac OTR</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all shadow-sm"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
