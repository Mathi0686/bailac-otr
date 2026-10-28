import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Link2, Database, RefreshCw, AlertCircle, FileCode } from 'lucide-react';

interface AppsScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUrl: string;
  onSaveUrl: (url: string) => void;
  onResetDefault: () => void;
  onRefreshData: () => void;
  isCustomUrlActive: boolean;
}

export const AppsScriptModal: React.FC<AppsScriptModalProps> = ({
  isOpen,
  onClose,
  currentUrl,
  onSaveUrl,
  onResetDefault,
  onRefreshData,
  isCustomUrlActive,
}) => {
  const [copied, setCopied] = useState(false);
  const [urlInput, setUrlInput] = useState(currentUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const codeSnippet = `/**
 * ============================================================================
 * BAILAC OTR v2.0 - GOOGLE APPS SCRIPT BACKEND (Code.gs) - LECTURA Y ESCRITURA
 * ============================================================================
 */

function doGet(e) {
  try {
    const output = getOtrDataJson();
    return ContentService.createTextOutput(JSON.stringify(output))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message || error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No se recibieron datos en la petición POST.");
    }

    var payload = JSON.parse(e.postData.contents);
    var action = payload.action || "update";
    var data = payload.data || payload.record || {};

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheets()[0];
    var values = sheet.getDataRange().getValues();
    if (!values || values.length === 0) {
      throw new Error("La hoja de cálculo no contiene encabezados.");
    }

    var headers = values[0].map(function(h) { return normalizeHeader(h); });

    // 1. ALTA DE NUEVO REGISTRO
    if (action === "create") {
      var newRow = headers.map(function(key) {
        return key && data[key] !== undefined ? data[key] : "";
      });
      sheet.appendRow(newRow);
      var newRowNum = sheet.getLastRow();
      return jsonResponse({
        success: true,
        action: "create",
        id: "row-" + newRowNum,
        rowNumber: newRowNum
      });
    }

    // Localizar fila objetivo por rowNumber ("row-X") o por SERIE + CLIENTE
    var targetRow = findTargetRow(values, headers, payload, data);
    if (!targetRow || targetRow < 2) {
      throw new Error("No se encontró el registro en Google Sheets para actualizar.");
    }

    // 2. ELIMINAR REGISTRO
    if (action === "delete") {
      sheet.deleteRow(targetRow);
      return jsonResponse({
        success: true,
        action: "delete",
        deletedRow: targetRow
      });
    }

    // 3. CARGA RÁPIDA DE FACTURA
    if (action === "update_invoice") {
      var facIdx = headers.indexOf("FACTURA");
      var fechaFacIdx = headers.indexOf("FECHA_FACTURA");
      if (facIdx === -1) {
        throw new Error("No se encontró la columna FACTURA en la hoja.");
      }
      sheet.getRange(targetRow, facIdx + 1).setValue(payload.factura || data.FACTURA || "");
      if (fechaFacIdx !== -1 && (payload.fechaFactura || data.FECHA_FACTURA)) {
        sheet.getRange(targetRow, fechaFacIdx + 1).setValue(payload.fechaFactura || data.FECHA_FACTURA);
      }
      return jsonResponse({
        success: true,
        action: "update_invoice",
        id: "row-" + targetRow,
        rowNumber: targetRow
      });
    }

    // 4. EDICIÓN COMPLETA DE REGISTRO EXISTENTE
    var currentRowValues = sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0];
    var updatedRow = headers.map(function(key, colIdx) {
      if (key && data[key] !== undefined) {
        return data[key];
      }
      return currentRowValues[colIdx];
    });
    sheet.getRange(targetRow, 1, 1, headers.length).setValues([updatedRow]);

    return jsonResponse({
      success: true,
      action: "update",
      id: "row-" + targetRow,
      rowNumber: targetRow
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.message || error.toString()
    });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function findTargetRow(values, headers, payload, data) {
  var rowNum = Number(payload.rowNumber);
  var serieIdx = headers.indexOf("SERIE");
  var clienteIdx = headers.indexOf("CLIENTE");
  var targetSerie = String(payload.serie || data.SERIE || "").trim().toUpperCase();

  // Verificar primero la fila directa si coincide la serie (o si no tenía serie)
  if (rowNum >= 2 && rowNum <= values.length) {
    if (!targetSerie || serieIdx === -1) return rowNum;
    var rowSerie = String(values[rowNum - 1][serieIdx] || "").trim().toUpperCase();
    if (rowSerie === targetSerie || !rowSerie) return rowNum;
  }

  // Búsqueda de respaldo por SERIE (+ CLIENTE)
  if (targetSerie && serieIdx !== -1) {
    var targetCliente = String(payload.cliente || data.CLIENTE || "").trim().toUpperCase();
    for (var i = values.length - 1; i >= 1; i--) {
      var s = String(values[i][serieIdx] || "").trim().toUpperCase();
      if (s === targetSerie) {
        if (!targetCliente || clienteIdx === -1) return i + 1;
        var c = String(values[i][clienteIdx] || "").trim().toUpperCase();
        if (c === targetCliente) return i + 1;
      }
    }
  }

  return rowNum >= 2 && rowNum <= values.length ? rowNum : null;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOtrDataJson() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets()[0];
  const values = sheet.getDataRange().getValues();

  if (!values || values.length <= 1) {
    return { success: true, count: 0, data: [] };
  }

  const rawHeaders = values[0];
  const headers = rawHeaders.map(function(h) {
    return normalizeHeader(h);
  });

  const records = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var hasContent = row.some(function(c) { return c !== "" && c !== null; });
    if (!hasContent) continue;

    var record = { id: "row-" + (i + 1) };
    for (var j = 0; j < headers.length; j++) {
      var key = headers[j];
      if (!key) continue;
      var cellVal = row[j];
      if (cellVal instanceof Date) {
        var m = cellVal.getMonth() + 1;
        var d = cellVal.getDate();
        var y = cellVal.getFullYear();
        record[key] = m + "/" + d + "/" + y;
      } else {
        record[key] = cellVal !== null && cellVal !== undefined ? String(cellVal).trim() : "";
      }
    }
    records.push(record);
  }

  return {
    success: true,
    sheetName: sheet.getName(),
    count: records.length,
    data: records,
    timestamp: new Date().toISOString()
  };
}

function normalizeHeader(header) {
  if (!header) return "";
  var str = String(header).trim().toUpperCase();
  if (str.indexOf("CLIENTE") !== -1) return "CLIENTE";
  if (str.indexOf("ENVIO") !== -1 || str.indexOf("ENVÍO") !== -1) return "ENVIO";
  if (str.indexOf("FECHA") !== -1 && str.indexOf("INGRESO") !== -1) return "FECHA_INGRESO";
  if (str.indexOf("REMITO") !== -1 && str.indexOf("INGRESO") !== -1) return "REMITO_INGRESO";
  if (str.indexOf("MARCA") !== -1) return "MARCA";
  if (str.indexOf("MEDIDA") !== -1) return "MEDIDA";
  if (str.indexOf("SERIE") !== -1) return "SERIE";
  if (str.indexOf("SOLPED") !== -1) return "SOLPED";
  if (str.indexOf("RECAUCHAJE") !== -1) return "DISENIO_RECAUCHAJE";
  if (str.indexOf("NEUMATICO") !== -1) return "DISENIO_NEUMATICO";
  if (str.indexOf("TIPO") !== -1) return "TIPO";
  if (str.indexOf("LOTE") !== -1) return "CANT_LOTE";
  if (str.indexOf("INTERNO") !== -1) return "NRO_INTERNO";
  if (str.indexOf("COTIZACION") !== -1 && str.indexOf("LINK") === -1) return "N_COTIZACION";
  if (str === "FIT" || str === "F.I.T." || (str.indexOf("FECHA") !== -1 && str.indexOf("INICIO") !== -1)) return "FIT";
  if (str.indexOf("TRABAJO") !== -1) return "TRABAJO_A_REALIZAR";
  if (str.indexOf("ESTADO") !== -1) return "ESTADO";
  if (str.indexOf("COMPROMETIDA") !== -1) return "FECHA_COMPROMETIDA";
  if (str.indexOf("TT") !== -1) return "FECHA_TT";
  if (str.indexOf("CONTROL") !== -1) return "CONTROL_ENTREGA";
  if (str.indexOf("REMITO") !== -1 && str.indexOf("SALIDA") !== -1 && str.indexOf("LINK") === -1) return "REMITO_SALIDA";
  if (str.indexOf("RETIRO") !== -1) return "FECHA_RETIRO";
  if (str.indexOf("PRECIO") !== -1) return "PRECIO";
  if ((str.indexOf("O.") !== -1 || str.indexOf("OC") !== -1) && str.indexOf("LINK") === -1) return "OC";
  if (str.indexOf("FECHA") !== -1 && str.indexOf("FACTURA") !== -1) return "FECHA_FACTURA";
  if (str.indexOf("FACTURA") !== -1 && str.indexOf("LINK") === -1) return "FACTURA";
  if (str.indexOf("HES") !== -1) return "HESS";
  if (str.indexOf("LINK") !== -1 && str.indexOf("FACTURA") !== -1) return "LINK_FACTURA";
  if (str.indexOf("LINK") !== -1 && str.indexOf("OC") !== -1) return "LINK_OC";
  if (str.indexOf("LINK") !== -1 && str.indexOf("COT") !== -1) return "LINK_COTIZACION";
  if (str.indexOf("LINK") !== -1 && str.indexOf("REMITO") !== -1) return "LINK_REMITO";
  return str.replace(/[^A-Z0-9_]/g, "_");
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestConnection = async () => {
    if (!urlInput.trim()) {
      setTestResult({ success: false, message: 'Ingrese una URL válida de Apps Script' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch(urlInput.trim());
      const data = await res.json();
      const count = Array.isArray(data) ? data.length : (data.data?.length || 0);

      if (count >= 0) {
        setTestResult({
          success: true,
          message: `Conexión exitosa. Se leyeron ${count} registros desde Google Sheets.`,
        });
        onSaveUrl(urlInput.trim());
        onRefreshData();
      } else {
        setTestResult({
          success: false,
          message: 'La URL respondió pero no tiene la estructura de datos esperada.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Fallo de conexión (${err.message}). Asegúrese de haber desplegado con acceso: "Cualquier usuario" (Anyone).`,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Google Apps Script & Conexión Sheets</h3>
              <p className="text-xs text-slate-400">Código backend Code.gs e integración en vivo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          {/* Status Box */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-orange-500 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">Origen de Datos Actual:</span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      isCustomUrlActive
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isCustomUrlActive ? 'Google Apps Script en Vivo' : 'Base Local Consolidada Bailac (400+ registros)'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isCustomUrlActive
                    ? 'Sincronizando periódicamente con tu hoja de cálculo en Google Sheets.'
                    : 'Operando con el dataset real unificado provisto en el prompt. Puedes vincular tu propia hoja en cualquier momento.'}
                </p>
              </div>
            </div>

            {isCustomUrlActive && (
              <button
                type="button"
                onClick={() => {
                  onResetDefault();
                  setUrlInput('');
                  setTestResult(null);
                }}
                className="text-xs font-medium text-slate-600 hover:text-red-600 underline whitespace-nowrap"
              >
                Volver a base local
              </button>
            )}
          </div>

          {/* Connect Live URL Section */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-orange-500" />
              <span>Conectar URL de Aplicación Web (Apps Script)</span>
            </h4>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !urlInput.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded-lg flex items-center justify-center gap-2 transition-all shrink-0"
              >
                {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Probar y Guardar</span>
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 text-xs rounded-lg border flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {testResult.success ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900">Guía de Despliegue en 4 Pasos:</h4>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600 pl-1">
              <li>
                Abre tu archivo de <strong>Google Sheets</strong> con la base unificada de neumáticos.
              </li>
              <li>
                Ve a <strong>Extensiones → Apps Script</strong> y pega el código backend que figura abajo.
              </li>
              <li>
                Haz clic en el botón azul superior <strong>Implementar → Nueva implementación</strong>.
              </li>
              <li>
                Selecciona tipo <strong>"Aplicación web"</strong>, pon Ejecutar como <strong>"Yo"</strong> y Quién tiene acceso <strong>"Cualquier usuario" (Anyone)</strong>. Copia la URL generada y pégala arriba.
              </li>
            </ol>
          </div>

          {/* Code.gs Codebox */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Código Code.gs</span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '¡Copiado al portapapeles!' : 'Copiar Código'}</span>
              </button>
            </div>

            <pre className="p-4 bg-slate-900 text-slate-200 rounded-xl text-xs font-mono overflow-x-auto max-h-60 border border-slate-800 leading-relaxed">
              {codeSnippet}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>También puedes encontrar el archivo completo en <code className="font-mono text-slate-700 bg-slate-200 px-1 py-0.5 rounded">/Code.gs</code></span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
