// =====================================================================
// SSMA ENTREGA DOCS — Backend Google Apps Script
// =====================================================================

const SHEETS = {
  ENTREGAS: 'ENTREGAS',
  USUARIOS: 'USUARIOS',
  TIPOS: 'TIPOS_DOCUMENTO',
  ENTREGADORES: 'ENTREGADORES'
};

const PROP_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1fg4QMONZwsqGcqR6D87-_KupaUYhLAHmjror_FSdsjo';
const PROP_DRIVE_ID   = 'https://drive.google.com/drive/folders/15_QkwXvl2kwreI0OiJIOfRS-9I60V1k4';
const VERSION = '1.0.0';

// ── Helpers ───────────────────────────────────────────────────────────

function response(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function ok(data) { return response({ ok: true, data }); }
function err(msg) { return response({ ok: false, error: msg }); }

function _sheetsUrl() {
  if (PROP_SHEETS_URL.startsWith('https://')) return PROP_SHEETS_URL;
  return PropertiesService.getScriptProperties().getProperty(PROP_SHEETS_URL) || '';
}

function _driveFolderId() {
  if (PROP_DRIVE_ID.startsWith('https://')) {
    const m = PROP_DRIVE_ID.match(/folders\/([a-zA-Z0-9_-]+)/);
    return m ? m[1] : null;
  }
  return PropertiesService.getScriptProperties().getProperty(PROP_DRIVE_ID) || null;
}

function getSS() {
  const url = _sheetsUrl();
  if (!url) throw new Error('NO_CONFIG');
  const m = url.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return SpreadsheetApp.openById(m[1]);
  return SpreadsheetApp.openByUrl(url);
}

function getSheet(name) {
  return getSS().getSheetByName(name);
}

function sheetData(sheet) {
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map(row =>
    Object.fromEntries(headers.map((h, i) => [h, row[i]]))
  );
}

function genId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'ED-';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function genHash(id, dni, fecha) {
  const raw = id + '|' + dni + '|' + fecha;
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return bytes.slice(0, 8).map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

function nowParts() {
  const now = new Date();
  const tz  = 'America/Lima';   // hora peruana (UTC-5) siempre
  return {
    fecha: Utilities.formatDate(now, tz, 'dd/MM/yyyy'),
    hora:  Utilities.formatDate(now, tz, 'hh:mm:ss a')
  };
}

function _getOrCreateFolder(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function subirPDF(base64, anio, mes, nombreReceptor, tipoDocumento, dniReceptor, id) {
  let rootFolder;
  const folderId = _driveFolderId();
  if (folderId) {
    try { rootFolder = DriveApp.getFolderById(folderId); } catch(e) { rootFolder = null; }
  }
  if (!rootFolder) {
    rootFolder = _getOrCreateFolder(DriveApp.getRootFolder(), 'SSMA_ENTREGA_DOCS');
  }

  // Estructura: SSMA_ENTREGA_DOCS / AÑO / MES / NOMBRE_RECEPTOR
  const folderAnio = _getOrCreateFolder(rootFolder, String(anio));
  const mesesES    = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
                      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mesPadded  = String(mes).padStart(2, '0');
  const mesLabel   = mesPadded + '_' + (mesesES[Number(mes)] || mes);
  const folderMes  = _getOrCreateFolder(folderAnio, mesLabel);

  // Normalizar nombre receptor para nombre de carpeta (sin caracteres especiales)
  const nombreCarpeta = String(nombreReceptor)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 _-]/g, '').trim().toUpperCase();
  const folderReceptor = _getOrCreateFolder(folderMes, nombreCarpeta);

  // Nombre del archivo: TIPO_DOCUMENTO_DNI_ID.pdf
  const tipoNorm = String(tipoDocumento)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]/g, '_').toUpperCase();
  const nombreArchivo = tipoNorm + '_' + dniReceptor + '_' + id + '.pdf';

  const blob = Utilities.newBlob(Utilities.base64Decode(base64), 'application/pdf', nombreArchivo);
  const file = folderReceptor.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

// ── doGet ─────────────────────────────────────────────────────────────

function doGet(e) {
  try {
    const p = e.parameter || {};
    const action = p.action || '';

    if (action === 'status') {
      const configured = !!_sheetsUrl();
      return ok({ version: VERSION, configured });
    }

    if (action === 'login') {
      return handleLogin(p.dni, p.pwd);
    }

    if (action === 'tipos') {
      return handleGetTipos();
    }

    if (action === 'entregadores') {
      return handleGetEntregadores();
    }

    if (action === 'mis-entregas') {
      return handleMisEntregas(p.dni);
    }

    if (action === 'todas-entregas') {
      return handleTodasEntregas(p);
    }

    if (action === 'verificar') {
      return handleVerificar(p.id);
    }

    if (action === 'usuarios') {
      return handleGetUsuarios();
    }

    if (action === 'cargos') {
      return handleGetCargos();
    }

    return err('Acción no reconocida');
  } catch (ex) {
    return err(ex.message);
  }
}

// ── doPost ────────────────────────────────────────────────────────────

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || '';

    if (action === 'config') {
      return handleConfig(data);
    }

    if (action === 'registrar-entrega') {
      return handleRegistrarEntrega(data);
    }

    if (action === 'add-tipo') {
      return handleAddTipo(data);
    }

    if (action === 'edit-tipo') {
      return handleEditTipo(data);
    }

    if (action === 'delete-tipo') {
      return handleDeleteTipo(data);
    }

    if (action === 'add-entregador') {
      return handleAddEntregador(data);
    }

    if (action === 'edit-entregador') {
      return handleEditEntregador(data);
    }

    if (action === 'auto-registro') {
      return handleAutoRegistro(data);
    }

    if (action === 'add-usuario') {
      return handleAddUsuario(data);
    }

    if (action === 'edit-usuario') {
      return handleEditUsuario(data);
    }

    return err('Acción no reconocida');
  } catch (ex) {
    return err(ex.message);
  }
}

// ── Handlers GET ──────────────────────────────────────────────────────

function handleLogin(dni, pwd) {
  if (!dni) return err('DNI requerido');
  const sheet = getSheet(SHEETS.USUARIOS);
  const rows  = sheetData(sheet);
  const user  = rows.find(r => String(r.DNI).trim() === String(dni).trim());

  if (!user) return err('DNI no encontrado');
  if (String(user.ACTIVO).toUpperCase() !== 'TRUE') return err('Usuario inactivo');

  const rol = String(user.ROL || '').toUpperCase();
  if (rol === 'ADMIN') {
    const pass    = String(user.PASSWORD || '').trim();
    const intento = String(pwd || '').trim();
    if (!pass) return err('Cuenta ADMIN sin contraseña configurada. Defínala en la hoja USUARIOS (columna PASSWORD).');
    if (!intento) return ok({ rol: 'ADMIN', needPwd: true });
    if (pass !== intento) return err('Contraseña incorrecta');
  }

  return ok({
    dni:     String(user.DNI).trim(),
    nombres: String(user.NOMBRES).trim(),
    apellidos: String(user.APELLIDOS).trim(),
    nombre:  (String(user.APELLIDOS) + ' ' + String(user.NOMBRES)).trim(),
    empresa: String(user.EMPRESA || '').trim(),
    cargo:   String(user.CARGO || '').trim(),
    area:    String(user.AREA || '').trim(),
    rol
  });
}

function handleGetTipos() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('ed_tipos');
  if (cached) return ok(JSON.parse(cached));

  const rows = sheetData(getSheet(SHEETS.TIPOS));
  const tipos = rows
    .filter(r => String(r.ACTIVO).toUpperCase() === 'TRUE')
    .map(r => ({ tipo: String(r.TIPO), descripcion: String(r.DESCRIPCION || '') }));

  cache.put('ed_tipos', JSON.stringify(tipos), 900);
  return ok(tipos);
}

function handleGetEntregadores() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('ed_entregadores');
  if (cached) return ok(JSON.parse(cached));

  const rows = sheetData(getSheet(SHEETS.ENTREGADORES));
  const lista = rows
    .filter(r => String(r.ACTIVO).toUpperCase() === 'TRUE')
    .map(r => ({
      dni:       String(r.DNI || '').trim(),
      apellidos: String(r.APELLIDOS || '').trim(),
      nombres:   String(r.NOMBRES || '').trim(),
      nombre:    (String(r.APELLIDOS) + ' ' + String(r.NOMBRES)).trim(),
      cargo:     String(r.CARGO || '').trim(),
      area:      String(r.AREA || '').trim()
    }));

  cache.put('ed_entregadores', JSON.stringify(lista), 600);
  return ok(lista);
}

function handleMisEntregas(dni) {
  if (!dni) return err('DNI requerido');
  const rows = sheetData(getSheet(SHEETS.ENTREGAS));
  const resultado = rows
    .filter(r => String(r.DNI_RECEPTOR).trim() === String(dni).trim())
    .map(r => ({
      id:               String(r.ID),
      fecha:            String(r.FECHA),
      hora:             String(r.HORA),
      tipoEntrega:      String(r.TIPO_ENTREGA),
      tipoDocumento:    String(r.TIPO_DOCUMENTO),
      descripcion:      String(r.DESCRIPCION),
      nombreEntregador: String(r.NOMBRE_ENTREGADOR),
      pdfUrl:           String(r.PDF_DRIVE_URL || ''),
      firmaReceptorB64: String(r.FIRMA_RECEPTOR_B64 || '')
    }))
    .reverse();
  return ok(resultado);
}

function handleTodasEntregas(p) {
  const rows = sheetData(getSheet(SHEETS.ENTREGAS));
  let resultado = rows.map(r => ({
    id:               String(r.ID),
    fecha:            String(r.FECHA),
    hora:             String(r.HORA),
    dniReceptor:      String(r.DNI_RECEPTOR),
    nombreReceptor:   String(r.NOMBRE_RECEPTOR),
    empresaReceptor:  String(r.EMPRESA_RECEPTOR),
    cargoReceptor:    String(r.CARGO_RECEPTOR),
    tipoEntrega:      String(r.TIPO_ENTREGA),
    tipoDocumento:    String(r.TIPO_DOCUMENTO),
    descripcion:      String(r.DESCRIPCION),
    nombreEntregador: String(r.NOMBRE_ENTREGADOR),
    geolocalizacion:  String(r.GEOLOCALIZACION || ''),
    pdfUrl:           String(r.PDF_DRIVE_URL || ''),
    hash:             String(r.HASH_VERIFICACION || ''),
    firmaReceptorB64: String(r.FIRMA_RECEPTOR_B64 || '')
  }));

  if (p.dni)  resultado = resultado.filter(r => r.dniReceptor.includes(p.dni));
  if (p.tipo) resultado = resultado.filter(r => r.tipoDocumento === p.tipo);
  if (p.desde) {
    const desde = new Date(p.desde);
    resultado = resultado.filter(r => {
      const parts = r.fecha.split('/');
      return new Date(parts[2], parts[1]-1, parts[0]) >= desde;
    });
  }
  if (p.hasta) {
    const hasta = new Date(p.hasta);
    resultado = resultado.filter(r => {
      const parts = r.fecha.split('/');
      return new Date(parts[2], parts[1]-1, parts[0]) <= hasta;
    });
  }

  return ok(resultado.reverse());
}

function handleVerificar(id) {
  if (!id) return err('ID requerido');
  const rows = sheetData(getSheet(SHEETS.ENTREGAS));
  const entrega = rows.find(r => String(r.ID) === String(id));
  if (!entrega) return err('Certificado no encontrado');
  return ok({
    id:               String(entrega.ID),
    fecha:            String(entrega.FECHA),
    hora:             String(entrega.HORA),
    nombreReceptor:   String(entrega.NOMBRE_RECEPTOR),
    dniReceptor:      String(entrega.DNI_RECEPTOR),
    cargoReceptor:    String(entrega.CARGO_RECEPTOR),
    empresaReceptor:  String(entrega.EMPRESA_RECEPTOR),
    tipoEntrega:      String(entrega.TIPO_ENTREGA),
    tipoDocumento:    String(entrega.TIPO_DOCUMENTO),
    descripcion:      String(entrega.DESCRIPCION),
    nombreEntregador: String(entrega.NOMBRE_ENTREGADOR),
    pdfUrl:           String(entrega.PDF_DRIVE_URL || ''),
    hash:             String(entrega.HASH_VERIFICACION || ''),
    firmaReceptorB64: String(entrega.FIRMA_RECEPTOR_B64 || ''),
    valido:           true
  });
}

function handleGetUsuarios() {
  const rows = sheetData(getSheet(SHEETS.USUARIOS));
  const result = rows.map(r => ({
    dni:       String(r.DNI || '').trim(),
    apellidos: String(r.APELLIDOS || '').trim(),
    nombres:   String(r.NOMBRES || '').trim(),
    empresa:   String(r.EMPRESA || '').trim(),
    cargo:     String(r.CARGO || '').trim(),
    area:      String(r.AREA || '').trim(),
    rol:       String(r.ROL || '').trim(),
    activo:    String(r.ACTIVO).toUpperCase() === 'TRUE'
  }));
  return ok(result);
}

// ── Handlers POST ─────────────────────────────────────────────────────

function handleConfig(data) {
  const props = PropertiesService.getScriptProperties();
  if (data.sheetsUrl) props.setProperty(PROP_SHEETS_URL, data.sheetsUrl);
  if (data.driveFolderId) props.setProperty(PROP_DRIVE_ID, data.driveFolderId);

  // Crear pestañas si no existen
  try {
    const ss = getSS();
    Object.values(SHEETS).forEach(name => {
      if (!ss.getSheetByName(name)) {
        ss.insertSheet(name);
      }
    });
    inicializarHeaders(ss);
  } catch(ex) {}

  return ok({ message: 'Configurado correctamente' });
}

function inicializarHeaders(ss) {
  const configs = [
    {
      name: SHEETS.ENTREGAS,
      headers: ['ID','FECHA','HORA','DNI_RECEPTOR','NOMBRE_RECEPTOR','EMPRESA_RECEPTOR',
                'CARGO_RECEPTOR','TIPO_ENTREGA','TIPO_DOCUMENTO','DESCRIPCION',
                'NOMBRE_ENTREGADOR','GEOLOCALIZACION','PDF_DRIVE_URL','HASH_VERIFICACION',
                'FIRMA_RECEPTOR_B64']
    },
    {
      name: SHEETS.USUARIOS,
      headers: ['DNI','APELLIDOS','NOMBRES','EMPRESA','CARGO','AREA','ROL','ACTIVO','PASSWORD','FECHA_REGISTRO']
    },
    {
      name: SHEETS.TIPOS,
      headers: ['TIPO','DESCRIPCION','ACTIVO']
    },
    {
      name: SHEETS.ENTREGADORES,
      headers: ['DNI','APELLIDOS','NOMBRES','CARGO','AREA','ACTIVO']
    }
  ];

  configs.forEach(cfg => {
    const sheet = ss.getSheetByName(cfg.name);
    if (!sheet) return;

    const currentHeaders = sheet.getLastColumn()
      ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      : [];

    const needsUpdate = currentHeaders.length !== cfg.headers.length
      || cfg.headers.some((h, i) => currentHeaders[i] !== h);

    if (needsUpdate) {
      sheet.getRange(1, 1, 1, cfg.headers.length).setValues([cfg.headers]);
      sheet.getRange(1, 1, 1, cfg.headers.length)
        .setBackground('#1e293b')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  });
}

function handleRegistrarEntrega(data) {
  const time = nowParts();
  const id   = genId();
  const hash = genHash(id, data.dniReceptor, time.fecha);

  // Subir PDF a Drive con estructura AÑO/MES/NOMBRE_RECEPTOR
  let pdfUrl = '';
  if (data.pdfBase64) {
    const now  = new Date();
    const anio = now.getFullYear();
    const mes  = now.getMonth() + 1;
    try {
      pdfUrl = subirPDF(
        data.pdfBase64,
        anio,
        mes,
        data.nombreReceptor,
        data.tipoDocumento,
        data.dniReceptor,
        id
      );
    } catch(ex) { pdfUrl = ''; }
  }

  const sheet = getSheet(SHEETS.ENTREGAS);
  const currentHeaders = sheet.getLastColumn()
    ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    : [];
  if (!currentHeaders.includes('FIRMA_RECEPTOR_B64')) {
    sheet.getRange(1, currentHeaders.length + 1).setValue('FIRMA_RECEPTOR_B64');
    sheet.getRange(1, 1, 1, currentHeaders.length + 1)
      .setBackground('#1e293b')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([
    id,
    time.fecha,
    time.hora,
    String(data.dniReceptor || '').trim(),
    String(data.nombreReceptor || '').trim(),
    String(data.empresaReceptor || '').trim(),
    String(data.cargoReceptor || '').trim(),
    String(data.tipoEntrega || '').trim(),
    String(data.tipoDocumento || '').trim(),
    String(data.descripcion || '').trim(),
    String(data.nombreEntregador || '').trim(),
    String(data.geolocalizacion || 'NO DISPONIBLE').trim(),
    pdfUrl,
    hash,
    String(data.firmaReceptorB64 || '').trim()
  ]);

  // Invalidar caché
  CacheService.getScriptCache().remove('ed_todas');

  return ok({ id, fecha: time.fecha, hora: time.hora, hash, pdfUrl });
}

function handleAddTipo(data) {
  if (!data.tipo) return err('Tipo requerido');
  const sheet = getSheet(SHEETS.TIPOS);
  sheet.appendRow([
    String(data.tipo).trim().toUpperCase(),
    String(data.descripcion || '').trim(),
    'TRUE'
  ]);
  CacheService.getScriptCache().remove('ed_tipos');
  return ok({ message: 'Tipo agregado' });
}

function handleEditTipo(data) {
  const sheet = getSheet(SHEETS.TIPOS);
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(data.tipoOriginal).trim()) {
      sheet.getRange(i + 1, 1, 1, 3).setValues([[
        String(data.tipo).trim().toUpperCase(),
        String(data.descripcion || '').trim(),
        String(data.activo).toUpperCase()
      ]]);
      break;
    }
  }
  CacheService.getScriptCache().remove('ed_tipos');
  return ok({ message: 'Tipo actualizado' });
}

function handleDeleteTipo(data) {
  const sheet = getSheet(SHEETS.TIPOS);
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(data.tipo).trim()) {
      sheet.getRange(i + 1, 3).setValue('FALSE');
      break;
    }
  }
  CacheService.getScriptCache().remove('ed_tipos');
  return ok({ message: 'Tipo desactivado' });
}

function handleAddEntregador(data) {
  if (!data.apellidos || !data.nombres) return err('Nombre requerido');
  const sheet = getSheet(SHEETS.ENTREGADORES);
  sheet.appendRow([
    String(data.dni || '').trim(),
    String(data.apellidos).trim().toUpperCase(),
    String(data.nombres).trim().toUpperCase(),
    String(data.cargo || '').trim().toUpperCase(),
    String(data.area || '').trim().toUpperCase(),
    'TRUE'
  ]);
  CacheService.getScriptCache().remove('ed_entregadores');
  return ok({ message: 'Entregador agregado' });
}

function handleEditEntregador(data) {
  const sheet = getSheet(SHEETS.ENTREGADORES);
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(data.dniOriginal).trim() ||
        (String(rows[i][1]).trim() + ' ' + String(rows[i][2]).trim()) === String(data.nombreOriginal).trim()) {
      sheet.getRange(i + 1, 1, 1, 6).setValues([[
        String(data.dni || '').trim(),
        String(data.apellidos).trim().toUpperCase(),
        String(data.nombres).trim().toUpperCase(),
        String(data.cargo || '').trim().toUpperCase(),
        String(data.area || '').trim().toUpperCase(),
        String(data.activo).toUpperCase()
      ]]);
      break;
    }
  }
  CacheService.getScriptCache().remove('ed_entregadores');
  return ok({ message: 'Entregador actualizado' });
}

function handleAddUsuario(data) {
  if (!data.dni || !data.apellidos || !data.nombres) return err('Datos incompletos');
  const sheet = getSheet(SHEETS.USUARIOS);
  const tz = 'America/Lima';
  sheet.appendRow([
    String(data.dni).trim(),
    String(data.apellidos).trim().toUpperCase(),
    String(data.nombres).trim().toUpperCase(),
    String(data.empresa || '').trim().toUpperCase(),
    String(data.cargo || '').trim().toUpperCase(),
    String(data.area || '').trim().toUpperCase(),
    String(data.rol || 'OPERARIO').toUpperCase(),
    'TRUE',
    String(data.password || '').trim(),
    Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy')
  ]);
  return ok({ message: 'Usuario agregado' });
}

function handleGetCargos() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('ed_cargos');
  if (cached) return ok(JSON.parse(cached));

  const rows = sheetData(getSheet(SHEETS.USUARIOS));
  const cargos = [...new Set(
    rows
      .map(r => String(r.CARGO || '').trim().toUpperCase())
      .filter(c => c.length > 0)
  )].sort();

  cache.put('ed_cargos', JSON.stringify(cargos), 300);
  return ok(cargos);
}

function handleAutoRegistro(data) {
  if (!data.dni || !data.apellidos || !data.nombres) return err('Datos incompletos');
  const sheet = getSheet(SHEETS.USUARIOS);
  const rows  = sheetData(sheet);

  // Verificar que el DNI no se haya registrado mientras tanto
  const existe = rows.find(r => String(r.DNI).trim() === String(data.dni).trim());
  if (existe) {
    const rol = String(existe.ROL || 'OPERARIO').toUpperCase();
    // Un ADMIN existente NO puede iniciar sesión por esta vía (saltaría la contraseña)
    if (rol === 'ADMIN') return err('Use el ingreso normal con su contraseña.');
    return ok({
      dni:       String(existe.DNI).trim(),
      nombres:   String(existe.NOMBRES).trim(),
      apellidos: String(existe.APELLIDOS).trim(),
      nombre:    (String(existe.APELLIDOS) + ' ' + String(existe.NOMBRES)).trim(),
      empresa:   String(existe.EMPRESA || '').trim(),
      cargo:     String(existe.CARGO || '').trim(),
      area:      String(existe.AREA || '').trim(),
      rol
    });
  }

  const tz = 'America/Lima';
  sheet.appendRow([
    String(data.dni).trim(),
    String(data.apellidos).trim().toUpperCase(),
    String(data.nombres).trim().toUpperCase(),
    String(data.empresa || '').trim().toUpperCase(),
    String(data.cargo || '').trim().toUpperCase(),
    '',
    'OPERARIO',
    'TRUE',
    '',
    Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy')
  ]);

  return ok({
    dni:       String(data.dni).trim(),
    nombres:   String(data.nombres).trim().toUpperCase(),
    apellidos: String(data.apellidos).trim().toUpperCase(),
    nombre:    (String(data.apellidos) + ' ' + String(data.nombres)).trim().toUpperCase(),
    empresa:   String(data.empresa || '').trim().toUpperCase(),
    cargo:     String(data.cargo || '').trim().toUpperCase(),
    area:      '',
    rol:       'OPERARIO'
  });
}

function handleEditUsuario(data) {
  const sheet = getSheet(SHEETS.USUARIOS);
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(data.dniOriginal).trim()) {
      sheet.getRange(i + 1, 1, 1, 9).setValues([[
        String(data.dni || rows[i][0]).trim(),
        String(data.apellidos || rows[i][1]).trim().toUpperCase(),
        String(data.nombres || rows[i][2]).trim().toUpperCase(),
        String(data.empresa || rows[i][3]).trim().toUpperCase(),
        String(data.cargo || rows[i][4]).trim().toUpperCase(),
        String(data.area || rows[i][5]).trim().toUpperCase(),
        String(data.rol || rows[i][6]).toUpperCase(),
        data.activo !== undefined ? String(data.activo).toUpperCase() : String(rows[i][7]),
        data.password !== undefined ? String(data.password).trim() : String(rows[i][8])
      ]]);
      break;
    }
  }
  return ok({ message: 'Usuario actualizado' });
}
