/**
 * API para Alimentacion HCarmen v7.3
 * Backend: Google Apps Script + Google Sheets
 * - OCR Claude
 * - Facturas / ventas / gastos
 * - Proveedores con upsert real por ID, CIF o nombre normalizado
 * - Fusion de proveedores duplicados
 */

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const CLAUDE_API_KEY = 'xxxxxxx'; // pon tu key aqui
const TZ = 'Europe/Madrid';

const HEADERS_FACTURAS = [
  'Fecha', 'Proveedor', 'Tienda', 'Importe', 'Tipo', 'Notas', 'SyncID',
  'NumeroFactura', 'Usuario', 'ProveedorID', 'CreatedAt', 'EstadoFacturacion',
  'Contabiliza', 'FacturaRelacionadaId', 'AlbaranesRelacionados'
];

const HEADERS_VENTAS = [
  'Fecha', 'Tienda', 'Efectivo', 'Tarjeta', 'Total', 'Notas', 'SyncID',
  'Usuario', 'CreatedAt', 'PagosCaja'
];

const HEADERS_GASTOS = [
  'Fecha', 'Concepto', 'Tienda', 'Importe', 'Categoria', 'Notas', 'SyncID',
  'Usuario', 'CreatedAt'
];

const HEADERS_PROVEEDORES = [
  'ID', 'RazonSocial', 'CIF', 'Telefono', 'Email', 'Web', 'Direccion',
  'ContactoNombre', 'ContactoTel', 'ContactoEmail', 'IBAN', 'Notas',
  'ModoFacturacion', 'DiasMaxFactura', 'ToleranciaFactura'
];

function doGet(e) {
  const params = e.parameter || {};

  if (params.action === 'getOcrResult' && params.tempId) {
    const key = 'ocr_' + params.tempId;
    const stored = PropertiesService.getScriptProperties().getProperty(key);
    if (stored) {
      PropertiesService.getScriptProperties().deleteProperty(key);
      return jsonResponse(JSON.parse(stored));
    }
    return jsonResponse({ pending: true });
  }

  if (params.method === 'post' && params.data) {
    try {
      const data = JSON.parse(decodeURIComponent(params.data));
      return procesarAccion(data);
    } catch (err) {
      return jsonResponse({ error: 'Error parseando datos: ' + err.toString() });
    }
  }

  try {
    let result;
    switch (params.action) {
      case 'getFacturas': result = getFacturas(); break;
      case 'getVentas': result = getVentas(); break;
      case 'getGastos': result = getGastos(); break;
      case 'getProveedores': result = getProveedores(); break;
      case 'getAll':
        result = {
          facturas: getFacturas(),
          ventas: getVentas(),
          gastos: getGastos(),
          proveedores: getProveedores()
        };
        break;
      case 'testApi': result = testApiClaude(); break;
      case 'getApiUsage': result = getApiUsage(params.mes); break;
      default: result = { error: 'Accion no valida: ' + params.action };
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function doPost(e) {
  try {
    const raw = e.postData ? e.postData.contents : '{}';
    const data = JSON.parse(raw);

    if (data.action === 'analizarFoto') {
      const resultado = analizarFotoConClaude(data.imagen);
      if (data.tempId) {
        PropertiesService.getScriptProperties().setProperty(
          'ocr_' + data.tempId,
          JSON.stringify(resultado)
        );
      }
      return jsonResponse(resultado);
    }

    return procesarAccion(data);
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function procesarAccion(data) {
  try {
    let result;
    switch (data.action) {
      case 'addFactura': result = addFactura(data.factura); break;
      case 'addVenta': result = addVenta(data.venta); break;
      case 'addGasto': result = addGasto(data.gasto); break;
      case 'deleteRegistro': result = deleteRegistro(data.tipo, data.syncId); break;
      case 'addLog': result = addLog(data.log); break;
      case 'saveProveedor': result = saveProveedor(data.proveedor, data.isEdit); break;
      case 'deleteProveedor': result = deleteProveedor(data.id); break;
      case 'mergeDuplicateProveedores': result = mergeDuplicateProveedores(); break;
      default: result = { error: 'Accion no valida: ' + data.action };
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function ss() {
  return SpreadsheetApp.openById(SHEET_ID);
}

function getOrCreateSheet(name, headers) {
  let sheet = ss().getSheetByName(name);
  if (!sheet) sheet = ss().insertSheet(name);
  ensureHeaders(sheet, headers);
  return sheet;
}

function ensureHeaders(sheet, headers) {
  if (!headers || !headers.length) return;
  const lastCol = Math.max(sheet.getLastColumn(), headers.length);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    return;
  }

  const current = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  let changed = false;
  for (let i = 0; i < headers.length; i++) {
    if (!current[i]) {
      current[i] = headers[i];
      changed = true;
    }
  }
  if (changed || sheet.getLastColumn() < headers.length) {
    sheet.getRange(1, 1, 1, headers.length).setValues([current.slice(0, headers.length)]);
  }
}

function formatFecha(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, TZ, 'yyyy-MM-dd');
  }
  return String(val);
}

function nowIso() {
  return new Date().toISOString();
}

function parseJsonArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try {
    const parsed = JSON.parse(String(v));
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return String(v).split(',').map(x => x.trim()).filter(Boolean);
  }
}

function stringifyArray(v) {
  if (!v) return '';
  if (Array.isArray(v)) return JSON.stringify(v);
  return String(v);
}

function normalizarTexto(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(s\.?l\.?u?\.?|s\.?l\.?|s\.?a\.?u?\.?|s\.?a\.?|c\.?b\.?|s\.?c\.?|s\.?l\.?l\.?)\b/g, '')
    .replace(/[.,;:/\\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizarCif(cif) {
  return String(cif || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function proveedoresEquivalentes(a, b) {
  if (!a || !b) return false;
  const cifA = normalizarCif(a.cif);
  const cifB = normalizarCif(b.cif);
  if (cifA && cifB) return cifA === cifB;

  const nombreA = normalizarTexto(a.razonSocial || a.proveedor || a.nombre);
  const nombreB = normalizarTexto(b.razonSocial || b.proveedor || b.nombre);
  return Boolean(nombreA && nombreA === nombreB);
}

function scoreProveedor(p) {
  const campos = [
    'razonSocial', 'cif', 'telefono', 'email', 'web', 'direccion',
    'contactoNombre', 'contactoTel', 'contactoEmail', 'iban', 'notas',
    'modoFacturacion', 'diasMaxFactura', 'toleranciaFactura'
  ];
  return campos.reduce((n, k) => n + (p && p[k] ? 1 : 0), 0);
}

function fusionarDatosProveedor(base, extra) {
  const out = Object.assign({}, base);
  [
    'razonSocial', 'cif', 'telefono', 'email', 'web', 'direccion',
    'contactoNombre', 'contactoTel', 'contactoEmail', 'iban', 'notas',
    'modoFacturacion', 'diasMaxFactura', 'toleranciaFactura'
  ].forEach(k => {
    if (!out[k] && extra && extra[k]) out[k] = extra[k];
  });
  return out;
}

function analizarFotoConClaude(imagenBase64) {
  if (!imagenBase64) return { error: 'No se recibio imagen' };

  try {
    const base64Data = imagenBase64.includes(',') ? imagenBase64.split(',')[1] : imagenBase64;
    const mediaType = imagenBase64.includes('png') ? 'image/png' : 'image/jpeg';

    const prompt =
      'Analiza esta imagen de un albaran, factura, ticket o gasto de una tienda de alimentacion española. ' +
      'Extrae SOLO estos datos en formato JSON sin texto adicional: ' +
      '{"proveedor":"nombre empresa que emite el documento o null","concepto":"concepto breve del gasto o documento","importe":numero_total_sin_simbolos,"tipo":"albaran o factura o ticket o gasto","fecha":"YYYY-MM-DD o null","numeroFactura":"numero o codigo identificador del documento o null"}. ' +
      'Si no puedes leer un dato ponlo null. Responde SOLO con el JSON.';

    const payload = {
      model: 'claude-opus-4-5',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
          { type: 'text', text: prompt }
        ]
      }]
    };

    const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const respData = JSON.parse(response.getContentText());
    if (respData.error) return { error: 'Error Claude: ' + respData.error.message };

    const texto = respData.content[0].text.trim().replace(/```json|```/g, '').trim();
    registrarUsoApi();
    return { success: true, datos: JSON.parse(texto) };
  } catch (err) {
    return { error: 'Error OCR: ' + err.toString() };
  }
}

function getFacturas() {
  const sheet = getOrCreateSheet('Facturas', HEADERS_FACTURAS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  return data.slice(1).filter(r => r[0] || r[6]).map(r => ({
    fecha: formatFecha(r[0]),
    proveedor: r[1] || '',
    tienda: r[2] || '',
    importe: r[3] || 0,
    tipo: r[4] || 'factura',
    notas: r[5] || '',
    syncId: r[6] || '',
    numeroFactura: r[7] || '',
    usuario: r[8] || '',
    proveedorId: r[9] || '',
    createdAt: r[10] || '',
    estadoFacturacion: r[11] || '',
    contabiliza: r[12],
    facturaRelacionadaId: r[13] || '',
    albaranesRelacionados: parseJsonArray(r[14])
  }));
}

function getVentas() {
  const sheet = getOrCreateSheet('Ventas', HEADERS_VENTAS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  return data.slice(1).filter(r => r[0] || r[6]).map(r => ({
    fecha: formatFecha(r[0]),
    tienda: r[1] || '',
    efectivo: r[2] || 0,
    tarjeta: r[3] || 0,
    total: r[4] || 0,
    notas: r[5] || '',
    syncId: r[6] || '',
    usuario: r[7] || '',
    createdAt: r[8] || '',
    pagosCaja: r[9] || 0
  }));
}

function getGastos() {
  const sheet = getOrCreateSheet('Gastos_Manual', HEADERS_GASTOS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  return data.slice(1).filter(r => r[0] || r[6]).map(r => ({
    fecha: formatFecha(r[0]),
    concepto: r[1] || '',
    tienda: r[2] || '',
    importe: r[3] || 0,
    categoria: r[4] || 'Otros',
    notas: r[5] || '',
    syncId: r[6] || '',
    usuario: r[7] || '',
    createdAt: r[8] || ''
  }));
}

function getProveedores() {
  const sheet = getOrCreateSheet('Proveedores', HEADERS_PROVEEDORES);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { proveedores: [] };

  const proveedores = data.slice(1).filter(r => r[0] || r[1]).map(r => ({
    id: r[0] || '',
    razonSocial: r[1] || '',
    cif: r[2] || '',
    telefono: r[3] || '',
    email: r[4] || '',
    web: r[5] || '',
    direccion: r[6] || '',
    contactoNombre: r[7] || '',
    contactoTel: r[8] || '',
    contactoEmail: r[9] || '',
    iban: r[10] || '',
    notas: r[11] || '',
    modoFacturacion: r[12] || 'revisar',
    diasMaxFactura: r[13] || '',
    toleranciaFactura: r[14] || '',
    syncId: r[0] || ''
  }));

  return { proveedores };
}

function addFactura(f) {
  if (!f || !f.fecha || !f.proveedor || !f.importe) return { error: 'Faltan campos' };

  const sheet = getOrCreateSheet('Facturas', HEADERS_FACTURAS);
  const syncId = f.syncId || Utilities.getUuid();
  const fila = [
    f.fecha,
    f.proveedor,
    f.tienda || '',
    f.importe,
    f.tipo || 'factura',
    f.notas || '',
    syncId,
    f.numeroFactura || '',
    f.usuario || '',
    f.proveedorId || '',
    f.createdAt || nowIso(),
    f.estadoFacturacion || '',
    f.contabiliza,
    f.facturaRelacionadaId || '',
    stringifyArray(f.albaranesRelacionados)
  ];

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][6]) === String(syncId)) {
      sheet.getRange(i + 1, 1, 1, HEADERS_FACTURAS.length).setValues([fila]);
      return { success: true, updated: true, syncId };
    }
  }

  sheet.appendRow(fila);
  return { success: true, syncId };
}

function addVenta(v) {
  if (!v || !v.fecha || !v.tienda) return { error: 'Faltan campos' };

  const sheet = getOrCreateSheet('Ventas', HEADERS_VENTAS);
  const syncId = v.syncId || Utilities.getUuid();
  const fila = [
    v.fecha,
    v.tienda || '',
    v.efectivo || 0,
    v.tarjeta || 0,
    v.total || 0,
    v.notas || '',
    syncId,
    v.usuario || '',
    v.createdAt || nowIso(),
    v.pagosCaja || 0
  ];

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][6]) === String(syncId)) {
      sheet.getRange(i + 1, 1, 1, HEADERS_VENTAS.length).setValues([fila]);
      return { success: true, updated: true, syncId };
    }
  }

  sheet.appendRow(fila);
  return { success: true, syncId };
}

function addGasto(g) {
  if (!g || !g.fecha || !g.concepto || !g.importe) return { error: 'Faltan campos' };

  const sheet = getOrCreateSheet('Gastos_Manual', HEADERS_GASTOS);
  const syncId = g.syncId || Utilities.getUuid();
  const fila = [
    g.fecha,
    g.concepto,
    g.tienda || '',
    g.importe,
    g.categoria || 'Otros',
    g.notas || '',
    syncId,
    g.usuario || '',
    g.createdAt || nowIso()
  ];

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][6]) === String(syncId)) {
      sheet.getRange(i + 1, 1, 1, HEADERS_GASTOS.length).setValues([fila]);
      return { success: true, updated: true, syncId };
    }
  }

  sheet.appendRow(fila);
  return { success: true, syncId };
}

function proveedorRow(p, existingId) {
  const id = existingId || p.id || Utilities.getUuid();
  return [
    id,
    p.razonSocial || '',
    p.cif || '',
    p.telefono || '',
    p.email || '',
    p.web || '',
    p.direccion || '',
    p.contactoNombre || '',
    p.contactoTel || '',
    p.contactoEmail || '',
    p.iban || '',
    p.notas || '',
    p.modoFacturacion || 'revisar',
    p.diasMaxFactura || '',
    p.toleranciaFactura || ''
  ];
}

function proveedorFromRow(r) {
  return {
    id: r[0] || '',
    razonSocial: r[1] || '',
    cif: r[2] || '',
    telefono: r[3] || '',
    email: r[4] || '',
    web: r[5] || '',
    direccion: r[6] || '',
    contactoNombre: r[7] || '',
    contactoTel: r[8] || '',
    contactoEmail: r[9] || '',
    iban: r[10] || '',
    notas: r[11] || '',
    modoFacturacion: r[12] || 'revisar',
    diasMaxFactura: r[13] || '',
    toleranciaFactura: r[14] || ''
  };
}

function saveProveedor(p, isEdit) {
  if (!p || !p.razonSocial) return { error: 'Falta razonSocial' };

  const sheet = getOrCreateSheet('Proveedores', HEADERS_PROVEEDORES);
  const data = sheet.getDataRange().getValues();

  let rowIndex = -1;
  let existing = null;

  if (p.id) {
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(p.id)) {
        rowIndex = i + 1;
        existing = proveedorFromRow(data[i]);
        break;
      }
    }
  }

  if (rowIndex === -1) {
    for (let i = 1; i < data.length; i++) {
      const candidate = proveedorFromRow(data[i]);
      if (proveedoresEquivalentes(candidate, p)) {
        rowIndex = i + 1;
        existing = candidate;
        break;
      }
    }
  }

  if (rowIndex !== -1 && existing) {
    const merged = fusionarDatosProveedor(existing, p);
    const row = proveedorRow(merged, existing.id);
    sheet.getRange(rowIndex, 1, 1, HEADERS_PROVEEDORES.length).setValues([row]);
    return {
      success: true,
      updated: true,
      mergedDuplicate: existing.id !== p.id,
      id: existing.id
    };
  }

  const newId = p.id || Utilities.getUuid();
  sheet.appendRow(proveedorRow(p, newId));
  return { success: true, id: newId };
}

function deleteProveedor(id) {
  if (!id) return { error: 'Falta el id' };

  const sheet = getOrCreateSheet('Proveedores', HEADERS_PROVEEDORES);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }

  return { success: true, notFound: true };
}

function mergeDuplicateProveedores() {
  const sheetProv = getOrCreateSheet('Proveedores', HEADERS_PROVEEDORES);
  const dataProv = sheetProv.getDataRange().getValues();

  if (dataProv.length <= 2) {
    return { success: true, merged: 0, deleted: 0, updatedDocs: 0 };
  }

  const groups = [];
  const used = {};

  for (let i = 1; i < dataProv.length; i++) {
    if (used[i]) continue;

    const p = proveedorFromRow(dataProv[i]);
    if (!p.id || !p.razonSocial) continue;

    const group = [{ row: i + 1, proveedor: p }];

    for (let j = i + 1; j < dataProv.length; j++) {
      if (used[j]) continue;
      const q = proveedorFromRow(dataProv[j]);
      if (!q.id || !q.razonSocial) continue;

      if (proveedoresEquivalentes(p, q)) {
        group.push({ row: j + 1, proveedor: q });
        used[j] = true;
      }
    }

    if (group.length > 1) groups.push(group);
  }

  const idMap = {};
  let mergedCount = 0;

  groups.forEach(group => {
    group.sort((a, b) => {
      const scoreDiff = scoreProveedor(b.proveedor) - scoreProveedor(a.proveedor);
      if (scoreDiff !== 0) return scoreDiff;
      return String(a.proveedor.id).localeCompare(String(b.proveedor.id));
    });

    let canonical = group[0].proveedor;
    for (let i = 1; i < group.length; i++) {
      canonical = fusionarDatosProveedor(canonical, group[i].proveedor);
      idMap[group[i].proveedor.id] = group[0].proveedor.id;
      mergedCount++;
    }

    sheetProv.getRange(group[0].row, 1, 1, HEADERS_PROVEEDORES.length)
      .setValues([proveedorRow(canonical, group[0].proveedor.id)]);
  });

  const updatedDocs = reasignarDocumentosProveedorDuplicado(idMap);
  const deleted = borrarFilasProveedorDuplicadas(sheetProv, groups);

  return {
    success: true,
    merged: mergedCount,
    deleted,
    updatedDocs,
    idMap
  };
}

function borrarFilasProveedorDuplicadas(sheet, groups) {
  const rows = [];
  groups.forEach(group => {
    group.slice(1).forEach(item => rows.push(item.row));
  });

  rows.sort((a, b) => b - a);
  rows.forEach(row => sheet.deleteRow(row));
  return rows.length;
}

function reasignarDocumentosProveedorDuplicado(idMap) {
  const sheet = getOrCreateSheet('Facturas', HEADERS_FACTURAS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return 0;

  const proveedores = getProveedores().proveedores;
  let updated = 0;

  for (let i = 1; i < data.length; i++) {
    let changed = false;
    const row = data[i];

    const proveedorNombre = row[1] || '';
    let proveedorId = row[9] || '';

    if (proveedorId && idMap[proveedorId]) {
      proveedorId = idMap[proveedorId];
      changed = true;
    }

    if (!proveedorId && proveedorNombre) {
      const match = proveedores.find(p =>
        normalizarTexto(p.razonSocial) === normalizarTexto(proveedorNombre)
      );
      if (match) {
        proveedorId = match.id;
        changed = true;
      }
    }

    if (changed) {
      const prov = proveedores.find(p => p.id === proveedorId);
      row[9] = proveedorId;
      if (prov) row[1] = prov.razonSocial;
      sheet.getRange(i + 1, 1, 1, HEADERS_FACTURAS.length).setValues([row.slice(0, HEADERS_FACTURAS.length)]);
      updated++;
    }
  }

  return updated;
}

function deleteRegistro(tipo, syncId) {
  if (!tipo || !syncId) return { error: 'Faltan parametros' };

  const hojas = {
    factura: 'Facturas',
    venta: 'Ventas',
    gasto: 'Gastos_Manual'
  };

  const sheetName = hojas[tipo];
  if (!sheetName) return { error: 'Tipo no valido' };

  const sheet = ss().getSheetByName(sheetName);
  if (!sheet) return { error: 'Hoja no encontrada' };

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][6]) === String(syncId)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }

  return { success: true, notFound: true };
}

function addLog(log) {
  try {
    let sheet = ss().getSheetByName('Log');
    if (!sheet) {
      sheet = ss().insertSheet('Log');
      sheet.appendRow(['Fecha', 'Usuario', 'UsuarioID', 'Accion', 'Detalle', 'Tienda']);
    }

    sheet.appendRow([
      log.fecha || nowIso(),
      log.usuario || '',
      log.usuarioId || '',
      log.accion || '',
      log.detalle || '',
      log.tienda || ''
    ]);

    return { success: true };
  } catch (err) {
    return { error: err.toString() };
  }
}

function testApiClaude() {
  try {
    const payload = {
      model: 'claude-opus-4-5',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Di OK' }]
    };

    const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const data = JSON.parse(response.getContentText());
    if (data.error) return { ok: false, error: data.error.message };
    return { ok: true, modelo: data.model };
  } catch (err) {
    return { ok: false, error: err.toString() };
  }
}

function registrarUsoApi() {
  try {
    let sheet = ss().getSheetByName('API_Usage');
    if (!sheet) {
      sheet = ss().insertSheet('API_Usage');
      sheet.appendRow(['Mes', 'Llamadas']);
    }

    const mesKey = Utilities.formatDate(new Date(), TZ, 'yyyy-MM');
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === mesKey) {
        sheet.getRange(i + 1, 2).setValue((Number(data[i][1]) || 0) + 1);
        return;
      }
    }

    sheet.appendRow([mesKey, 1]);
  } catch (err) {
    Logger.log('Error registrando uso API: ' + err);
  }
}

function getApiUsage(mes) {
  try {
    const sheet = ss().getSheetByName('API_Usage');
    if (!sheet) return { llamadas: 0 };

    const mesKey = mes || Utilities.formatDate(new Date(), TZ, 'yyyy-MM');
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === mesKey) {
        return { llamadas: data[i][1] || 0, mes: mesKey };
      }
    }

    return { llamadas: 0, mes: mesKey };
  } catch (err) {
    return { error: err.toString() };
  }
}
