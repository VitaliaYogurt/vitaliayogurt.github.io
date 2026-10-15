/**
 * Vitalia — pedidos
 * Pega este archivo en Extensiones → Apps Script de tu hoja de Google.
 * Déjalo vacío para que el correo llegue a la cuenta que publica el script.
 */
var CORREO_DESTINO = "";

var HEADERS = [
  "Registrado",
  "Nombre",
  "Celular",
  "Sabor",
  "Cajitas",
  "Frascos",
  "Fecha de entrega",
  "Hora",
  "Dirección",
  "Latitud",
  "Longitud",
  "Google Maps",
  "Comentarios",
  "Subtotal",
  "Envío",
  "Total",
  "Correo"
];

function doGet() {
  return ContentService.createTextOutput("Vitalia: el registro de pedidos está activo.");
}

function doPost(e) {
  try {
    var data = readOrder_(e);
    var row = appendOrder_(data);
    var emailed = sendEmail_(data);
    getSheet_().getRange(row, HEADERS.length).setValue(emailed ? "enviado" : "no enviado");
    return json_({ ok: true, email: emailed });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function readOrder_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("Pedido vacío");
  }
  var data = JSON.parse(e.postData.contents);
  if (!data || typeof data !== "object") throw new Error("Pedido inválido");
  return data;
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Pedidos");
  if (sheet) return sheet;
  var first = ss.getSheets()[0];
  if (first.getLastRow() === 0) {
    first.setName("Pedidos");
    return first;
  }
  return ss.insertSheet("Pedidos");
}

function appendOrder_(data) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.setSpreadsheetTimeZone("America/Panama");
    var sheet = getSheet_();
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      var header = sheet.getRange(1, 1, 1, HEADERS.length);
      header.setFontWeight("bold");
      header.setBackground("#FF4D6D");
      header.setFontColor("#1C1220");
      sheet.setFrozenRows(1);
    }
    var maps = mapsFormula_(data.maps);
    sheet.appendRow([
      Utilities.formatDate(new Date(), "America/Panama", "yyyy-MM-dd HH:mm:ss"),
      text_(data.nombre),
      text_(data.celular),
      text_(data.sabor),
      num_(data.paquetes),
      num_(data.frascos),
      text_(data.fecha),
      text_(data.hora),
      text_(data.direccion),
      data.latitud === null || data.latitud === undefined || data.latitud === "" ? "" : Number(data.latitud),
      data.longitud === null || data.longitud === undefined || data.longitud === "" ? "" : Number(data.longitud),
      maps,
      text_(data.comentarios),
      num_(data.subtotal),
      num_(data.envio),
      num_(data.total),
      ""
    ]);
    return sheet.getLastRow();
  } finally {
    lock.releaseLock();
  }
}

function sendEmail_(data) {
  try {
    var to = CORREO_DESTINO || Session.getEffectiveUser().getEmail();
    var subject = ("Nuevo pedido Vitalia · " + (data.nombre || "sin nombre")).slice(0, 90);
    var body = [
      "Tienes un pedido nuevo.",
      "",
      "Nombre: " + (data.nombre || ""),
      "Celular: " + (data.celular || ""),
      "Sabor: " + (data.sabor || ""),
      "Cantidad: " + (data.paquetes || "") + " cajitas (" + (data.frascos || "") + " frascos)",
      "Entrega: " + (data.fecha || "") + ", " + (data.hora || ""),
      "Dirección: " + (data.direccion || ""),
      "Mapa: " + (data.maps || "sin mapa"),
      "Comentarios: " + (data.comentarios || "—"),
      "",
      "Yogur: $" + data.subtotal,
      "Envío: " + (Number(data.envio) === 0 ? "gratis" : "$" + data.envio),
      "Total: $" + data.total
    ].join("\n");
    MailApp.sendEmail(to, subject, body);
    return true;
  } catch (err) {
    return false;
  }
}

function mapsFormula_(url) {
  if (!url || String(url).indexOf("https://www.google.com/maps?q=") !== 0) return "";
  if (String(url).indexOf('"') !== -1) return "";
  return '=HYPERLINK("' + url + '","Ver mapa")';
}

function text_(value) {
  if (value === null || value === undefined) return "";
  var s = String(value);
  if (/^[=+\-@]/.test(s)) return "'" + s;
  return s;
}

function num_(value) {
  var n = Number(value);
  return isFinite(n) ? n : "";
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
