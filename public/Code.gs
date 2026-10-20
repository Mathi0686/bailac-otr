/**
 * ============================================================================
 * BAILAC OTR - GOOGLE APPS SCRIPT BACKEND (Code.gs)
 * ============================================================================
 * Servidor Web App para lectura ultra rápida de la planilla consolidada de
 * neumáticos OTR y entrega estructurada en formato JSON para la aplicación web.
 *
 * PLANILLA CONSOLIDADA DE ORIGEN:
 * https://docs.google.com/spreadsheets/d/1q_7uygfvQJW72jk2FLpOedNbo0KBnHpNn8-2B8PNCok/edit?usp=sharing
 *
 * INSTRUCCIONES DE DESPLIEGUE:
 * 1. En tu Google Sheets con la base de datos de neumáticos OTR:
 *    Menú superior -> Extensiones -> Apps Script.
 * 2. Borra el código existente y pega este archivo completo.
 * 3. Si tu pestaña tiene un nombre específico, configúralo en HOJA_NOMBRE abajo (por defecto toma la primera hoja).
 * 4. Haz clic en "Implementar" (arriba a la derecha) -> "Nueva implementación".
 * 5. Tipo: Selecciona "Aplicación web".
 * 6. Configuración:
 *    - Descripción: "Bailac OTR API v2 - Con Enlaces Digitales"
 *    - Ejecutar como: "Yo" (tu cuenta)
 *    - Quién tiene acceso: "Cualquier usuario" (Anyone) -> ¡Fundamental para permitir la lectura desde la app web!
 * 7. Copia la URL de la aplicación web generada (termina en /exec) y pégala en la Configuración de la app Bailac OTR.
 * ============================================================================
 */

// Nombre de la pestaña unificada. Si se deja vacío (""), leerá la primera hoja del archivo.
const HOJA_NOMBRE = ""; 

/**
 * Endpoint principal GET para la Web App
 */
function doGet(e) {
  try {
    const output = getOtrDataJson();
    return ContentService.createTextOutput(JSON.stringify(output))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    const errorOutput = {
      success: false,
      error: error.message || error.toString(),
      timestamp: new Date().toISOString()
    };
    return ContentService.createTextOutput(JSON.stringify(errorOutput))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Función ultra optimizada de lectura de la hoja de cálculo
 */
function getOtrDataJson() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet;
  
  if (HOJA_NOMBRE && HOJA_NOMBRE.trim() !== "") {
    sheet = ss.getSheetByName(HOJA_NOMBRE.trim());
  }
  if (!sheet) {
    sheet = ss.getSheets()[0]; // Toma la primera pestaña por defecto
  }

  // Lectura en bloque de una sola llamada (Ultra Rápido)
  const range = sheet.getDataRange();
  const values = range.getValues();

  if (!values || values.length <= 1) {
    return {
      success: true,
      count: 0,
      records: [],
      timestamp: new Date().toISOString()
    };
  }

  // Normalizar encabezados de la fila 1
  const rawHeaders = values[0];
  const headers = rawHeaders.map(function(h) {
    return normalizeHeader(h);
  });

  const records = [];

  // Mapear cada fila a un objeto JSON limpio
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    // Evitar filas totalmente vacías
    var hasContent = row.some(function(cell) {
      return cell !== "" && cell !== null && cell !== undefined;
    });
    if (!hasContent) continue;

    var record = {
      id: "row-" + (i + 1)
    };

    for (var j = 0; j < headers.length; j++) {
      var key = headers[j];
      if (!key) continue;
      var cellVal = row[j];

      // Formatear fechas a cadena estándar legible
      if (cellVal instanceof Date) {
        record[key] = formatDateString(cellVal);
      } else if (cellVal === null || cellVal === undefined) {
        record[key] = "";
      } else {
        record[key] = String(cellVal).trim();
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

/**
 * Normaliza nombres de columnas eliminando acentos, caracteres especiales y espacios.
 * Reconoce columnas estándar y nuevas columnas para enlaces de documentos digitales.
 */
function normalizeHeader(header) {
  if (!header) return "";
  var str = String(header).trim().toUpperCase();

  // 1. Columnas de Enlaces Digitales (deben evaluarse antes de las genéricas)
  if (str.indexOf("LINK") !== -1 || str.indexOf("URL") !== -1 || str.indexOf("ENLACE") !== -1) {
    if (str.indexOf("FAC") !== -1) return "LINK_FACTURA";
    if (str.indexOf("OC") !== -1 || str.indexOf("COMPRA") !== -1 || str.indexOf("ORDEN") !== -1) return "LINK_OC";
    if (str.indexOf("COT") !== -1) return "LINK_COTIZACION";
    if (str.indexOf("REM") !== -1 || str.indexOf("SALIDA") !== -1 || str.indexOf("ENTREGA") !== -1) return "LINK_REMITO";
  }

  // 2. Mapeos estándar de columnas operativas
  if (str.indexOf("CLIENTE") !== -1) return "CLIENTE";
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
  if (str.indexOf("INTERNO") !== -1 || str.indexOf("HOJA DE RUTA") !== -1) return "NRO_INTERNO";
  if (str.indexOf("COTIZACION") !== -1) return "N_COTIZACION";
  if (str.indexOf("TRABAJO") !== -1) return "TRABAJO_A_REALIZAR";
  if (str.indexOf("ESTADO") !== -1) return "ESTADO";
  if (str.indexOf("COMPROMETIDA") !== -1) return "FECHA_COMPROMETIDA";
  if (str.indexOf("TT") !== -1) return "FECHA_TT";
  if (str.indexOf("CONTROL") !== -1) return "CONTROL_ENTREGA";
  if (str.indexOf("REMITO") !== -1 && str.indexOf("SALIDA") !== -1) return "REMITO_SALIDA";
  if (str.indexOf("RETIRO") !== -1) return "FECHA_RETIRO";
  if (str.indexOf("PRECIO") !== -1) return "PRECIO";
  if (str.indexOf("O.") !== -1 || str.indexOf("OC") !== -1 || str.indexOf("O.C.") !== -1) return "OC";
  if (str.indexOf("FECHA") !== -1 && str.indexOf("FACTURA") !== -1) return "FECHA_FACTURA";
  if (str.indexOf("FACTURA") !== -1) return "FACTURA";
  if (str.indexOf("HESS") !== -1) return "HESS";

  // Reemplazo genérico para cualquier otra columna
  return str.replace(/[^A-Z0-9_]/g, "_");
}

/**
 * Formatea un objeto Date a M/D/YYYY
 */
function formatDateString(date) {
  var m = date.getMonth() + 1;
  var d = date.getDate();
  var y = date.getFullYear();
  return m + "/" + d + "/" + y;
}
