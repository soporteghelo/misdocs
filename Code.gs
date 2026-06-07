// ══════════════════════════════════════════════════════════════════
// HERRAMIENTAS SCAN v2.0 — Google Apps Script (REST API Pura)
// Solo CRUD: no sirve HTML. El frontend vive en Vercel.
// ══════════════════════════════════════════════════════════════════
//
//  ▼▼▼  EDITAR ESTAS VARIABLES ANTES DE DESPLEGAR  ▼▼▼
// ──────────────────────────────────────────────────────────────

var CFG_SHEETS_URL   = 'https://docs.google.com/spreadsheets/d/1DF-REXYbn8Dzxa93Jatoztl_4BHCgpye_hnmEAmZq5A';
var CFG_DRIVE_URL    = 'https://drive.google.com/drive/u/0/folders/1nUTn_1w0_b9u8Px8eD0dStzyai4W1FVa';
var CFG_PERSONAL_URL = 'https://docs.google.com/spreadsheets/d/1OqjJIobnbR7GrsM8AemQNTUtZcX-opcJFq2fh4mzqEI/edit';

// Tokens disponibles: AÑO · MES · NOMBRE · DNI
// Ejemplos: 'AÑO/MES/NOMBRE' | 'AÑO/MES/DNI' | 'NOMBRE/AÑO/MES'
var CFG_ESTRUCTURA   = 'AÑO/MES/NOMBRE';

// ──────────────────────────────────────────────────────────────
//  ▲▲▲  FIN DE CONFIGURACIÓN EDITABLE  ▲▲▲
// ══════════════════════════════════════════════════════════════════

var PROPS = PropertiesService.getScriptProperties();

// ────────────────────────────────────────────────────────────────
// ENTRY POINTS — REST API
// ────────────────────────────────────────────────────────────────

function doGet(e) {
  e = e || {};
  var p      = e.parameter || {};
  var action = p.action    || '';
  var out;
  try {
    switch (action) {
      case 'status':    out = { configured: isConfigured(), version: '2.0.0' }; break;
      case 'login':     out = login(p.dni, p.pwd); break;
      case 'tipos':     out = getTiposHerramienta(); break;
      case 'resumen':   out = getResumen(p.dni, p.anio||null, p.mes||null); break;
      case 'registros': out = getRegistros(p.dni, { tipo: p.tipo||null, evaluado: p.evaluado||null, anio: p.anio||null, mes: p.mes||null }); break;
      case 'personal':     out = getPersonalList(); break;
      case 'programados':  out = getProgramados(p.dni, p.anio||null, p.mes||null); break;
      case 'sheetsUrl':    out = { url: getSpreadsheetUrl() }; break;
      default:          out = { error: 'Accion desconocida: ' + action };
    }
  } catch (err) { out = { error: err.message }; }
  return jsonResponse_(out);
}

function doPost(e) {
  e = e || {};
  var body;
  try { body = JSON.parse((e.postData || {}).contents || '{}'); }
  catch (err) { return jsonResponse_({ ok: false, msg: 'JSON invalido' }); }
  var action = body.action || '';
  var out;
  try {
    switch (action) {
      case 'config':    out = validateAndSaveConfig(body.sheetsUrl, body.driveUrl, body.personalUrl); break;
      case 'upload':    out = uploadFiles(body.filesData, body.formData); break;
      case 'addTipo':    out = addTipoHerramienta(body.tipo, body.reqNombre); break;
      case 'editTipo':   out = editTipoHerramienta(body.old, body.nuevo, body.reqNombre); break;
      case 'deleteTipo': out = deleteTipoHerramienta(body.tipo); break;
      case 'register':   out = registerUser_(body.dni, body.apellidos, body.nombres); break;
      case 'recalcular': out = recalcularTodo(body.anio, body.mes); break;
      default:       out = { ok: false, msg: 'Accion desconocida: ' + action };
    }
  } catch (err) { out = { ok: false, msg: err.message }; }
  return jsonResponse_(out);
}

function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// ────────────────────────────────────────────────────────────────
// RESOLUCIÓN DE IDs
// ────────────────────────────────────────────────────────────────

function getSheetsId_()      { var v=extractIdFromUrl(CFG_SHEETS_URL);   return v||PROPS.getProperty('SHEETS_ID')||null; }
function getDriveFolderId_() { var v=extractIdFromUrl(CFG_DRIVE_URL);    return v||PROPS.getProperty('DRIVE_FOLDER_ID')||null; }
function getPersonalSheetId_(){ var v=extractIdFromUrl(CFG_PERSONAL_URL); return v||PROPS.getProperty('PERSONAL_SHEET_ID')||'1OqjJIobnbR7GrsM8AemQNTUtZcX-opcJFq2fh4mzqEI'; }
function getEstructura_()    { return (CFG_ESTRUCTURA&&CFG_ESTRUCTURA.indexOf('/')!==-1)?CFG_ESTRUCTURA:PROPS.getProperty('ESTRUCTURA_CARPETA')||'AÑO/MES/NOMBRE'; }

// ────────────────────────────────────────────────────────────────
// CONFIGURACIÓN
// ────────────────────────────────────────────────────────────────

function isConfigured() { return !!(getSheetsId_() && getDriveFolderId_()); }

function extractIdFromUrl(url) {
  if (!url) return null;
  url = url.trim();
  var m;
  m=url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/); if(m) return m[1];
  m=url.match(/\/folders\/([a-zA-Z0-9_-]+)/);          if(m) return m[1];
  m=url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);           if(m) return m[1];
  if(/^[a-zA-Z0-9_-]{25,}$/.test(url)) return url;
  return null;
}

function validateAndSaveConfig(sheetsUrl, driveUrl, personalUrl) {
  try {
    var sheetsId = extractIdFromUrl(sheetsUrl);
    if (!sheetsId) return { ok:false, field:'sheets', msg:'URL de Sheets invalida.' };
    var ss, ssName;
    try { ss=SpreadsheetApp.openById(sheetsId); ssName=ss.getName(); }
    catch(e) { return { ok:false, field:'sheets', msg:'Sin acceso al Sheets: '+e.message }; }

    var driveFolderId = extractIdFromUrl(driveUrl);
    if (!driveFolderId) return { ok:false, field:'drive', msg:'URL de Drive invalida.' };
    var folder, folderName;
    try { folder=DriveApp.getFolderById(driveFolderId); folderName=folder.getName(); }
    catch(e) { return { ok:false, field:'drive', msg:'Sin acceso a la carpeta: '+e.message }; }

    var personalId = getPersonalSheetId_();
    if (personalUrl&&personalUrl.trim()) { var pid=extractIdFromUrl(personalUrl); if(pid) personalId=pid; }

    PROPS.setProperties({ SHEETS_ID:sheetsId, SHEETS_NAME:ssName, DRIVE_FOLDER_ID:driveFolderId,
      FOLDER_NAME:folderName, PERSONAL_SHEET_ID:personalId, ESTRUCTURA_CARPETA:getEstructura_() });
    setupSpreadsheet_(ss, personalId);
    return { ok:true, sheetsName:ssName, folderName:folderName };
  } catch(err) { return { ok:false, field:'general', msg:err.message }; }
}

// ────────────────────────────────────────────────────────────────
// ACCESO A RECURSOS
// ────────────────────────────────────────────────────────────────

function getSpreadsheet_() {
  var id=getSheetsId_(); if(!id) throw new Error('Sheets no configurado.'); return SpreadsheetApp.openById(id);
}
function getRootDriveFolder_() {
  var id=getDriveFolderId_(); if(!id) throw new Error('Drive no configurado.'); return DriveApp.getFolderById(id);
}

// ────────────────────────────────────────────────────────────────
// SETUP INICIAL DE LA SPREADSHEET
// ────────────────────────────────────────────────────────────────

function setupSpreadsheet_(ss, personalId) {
  var reg=getOrCreateSheet_(ss,'REGISTRO');
  if(reg.getLastRow()===0) {
    reg.appendRow(['ID','DNI','APELLIDOS Y NOMBRES','CARGO','AREA','FECHA_HERRAMIENTA','FECHA_CARGA','TIPO_HERRAMIENTA','CANTIDAD','EVALUADO','EVALUADO_CARGO','LINK_HERRAMIENTA','AÑO','MES','NOMBRE_ARCHIVO']);
    formatHeader_(reg,'#1a237e'); reg.setColumnWidth(11,350); reg.setColumnWidth(6,130); reg.setColumnWidth(7,155); reg.setFrozenRows(1); reg.setTabColor('#1a237e');
  }
  var per=getOrCreateSheet_(ss,'PERSONAL');
  if(per.getLastRow()===0) {
    per.appendRow(['DNI','APELLIDOS Y NOMBRES','CARGO','EMPRESA','ESTADO']);
    formatHeader_(per,'#4a148c'); per.setFrozenRows(1); per.setTabColor('#4a148c');
    per.getRange('A2').setFormula('=IMPORTRANGE("'+personalId+'","REGISTER!A:H")');
    per.getRange('A2').setNote('Fórmula IMPORTRANGE — haz clic en la celda → Permitir acceso.');
  }
  var prog=getOrCreateSheet_(ss,'PROGRAMADOS');
  if(prog.getLastRow()===0) {
    prog.appendRow(['DNI','CODIGO','NOMBRE','TIPO_HERRAMIENTA','AÑO','MES','PROGRAMADOS','EJECUTADOS','PENDIENTES','% AVANCE']);
    formatHeader_(prog,'#006064'); prog.setFrozenRows(1); prog.setTabColor('#006064');
  }
  var master=getOrCreateSheet_(ss,'USUARIOS_MASTER');
  if(master.getLastRow()===0) {
    master.appendRow(['DNI_MASTER','NOMBRE','ROL','ACTIVO','PASSWORD']);
    formatHeader_(master,'#b71c1c'); master.setFrozenRows(1); master.setTabColor('#b71c1c');
    master.appendRow(['00000000','ADMINISTRADOR','ADMIN',true,'admin123']);
    master.getRange(1,5).setNote('Dejar en blanco = sin contraseña. Llenar para exigir contraseña al login.');
  }
  var herr=getOrCreateSheet_(ss,'HERRAMIENTAS');
  if(herr.getLastRow()===0) {
    herr.appendRow(['HERRAMIENTAS','REQ. NOMBRE']); formatHeader_(herr,'#004d40');
    [['AUD. IPERC','NO'],['AUD. PETAR','NO'],['AUD. HABLA FACIL','NO'],['OPT','SI'],
     ['TALLER PERCEPCION','NO'],['ORT','NO'],['VCC','NO'],['EV. EFICACIA','NO'],['OTRO','NO']
    ].forEach(function(t){ herr.appendRow(t); });
    herr.setColumnWidth(1,220); herr.setColumnWidth(2,120); herr.setTabColor('#004d40'); herr.setFrozenRows(1);
  }
  ['Hoja 1','Sheet1','Hoja1'].forEach(function(n){
    try{var h=ss.getSheetByName(n);if(h&&ss.getSheets().length>1)ss.deleteSheet(h);}catch(e){}
  });
}

function getOrCreateSheet_(ss,name){return ss.getSheetByName(name)||ss.insertSheet(name);}
function formatHeader_(sheet,color){var c=Math.max(sheet.getLastColumn(),5);sheet.getRange(1,1,1,c).setBackground(color).setFontColor('#fff').setFontWeight('bold').setFontSize(10);}

// ────────────────────────────────────────────────────────────────
// AUTH
// ────────────────────────────────────────────────────────────────

function login(dni, pwd) {
  if (!isConfigured()) return { ok:false, msg:'App no configurada.' };

  var md = getMasterData_(dni);
  if (!md) {
    return { ok:false, notFound:true, msg:'DNI no registrado.' };
  }

  if (!md.nombre || String(md.nombre).trim() === '') {
    return { ok:false, msg:'Nombre no configurado en USUARIOS_MASTER.' };
  }

  var rol = String(md.rol || '').trim().toUpperCase();
  var isAdmin = rol === 'ADMIN';
  var result = {
    ok:true, dni:normDNI_(dni), nombre:String(md.nombre).trim(),
    cargo:String(md.rol || '').trim(), empresa:'SISTEMA', estado:'ACTIVO', master:isAdmin
  };

  if (isAdmin) {
    var hasPassword = md.password && String(md.password).trim() !== '';
    if (hasPassword) {
      if (!pwd || String(pwd).trim() === '') {
        return Object.assign({}, result, { needPassword:true });
      }
      if (String(pwd).trim() !== String(md.password).trim()) {
        return { ok:false, msg:'Contraseña incorrecta', needPassword:true };
      }
    }
    // Sin contraseña configurada → acceso master directo
  }

  return result;
}

// Lee DNI directamente del Sheets de personal (CFG_PERSONAL_URL)
// Columnas del REGISTER: A=DNI(0), B=EMPRESA(1), C=ESTADO(2), F=NOMBRE(5), I=CARGO(8)
function lookupDNI(dni) {
  try {
    var personalId = getPersonalSheetId_();
    var ps         = SpreadsheetApp.openById(personalId);
    var sheet      = ps.getSheetByName('REGISTER');
    if (!sheet) return { ok:false, msg:'Hoja REGISTER no encontrada en el Sheets de personal.' };

    var data   = sheet.getDataRange().getValues();
    var dniStr = String(dni).trim();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === dniStr) {
        return {
          ok:      true,
          nombre:  String(data[i][5] || '').trim(),  // Columna F — APELLIDOS Y NOMBRES
          cargo:   String(data[i][8] || '').trim(),  // Columna I — CARGO
          empresa: String(data[i][1] || '').trim(),  // Columna B — EMPRESA
          estado:  String(data[i][2] || '').trim()   // Columna C — ESTADO
        };
      }
    }
    return { ok:false, msg:'DNI no registrado en el sistema' };
  } catch (err) { return { ok:false, msg:'Error al buscar DNI: ' + err.message }; }
}

// Verifica si el DNI tiene acceso master (acepta boolean true o string "TRUE"/"VERDADERO")
function isMaster(dni) {
  try {
    var sheet = getSpreadsheet_().getSheetByName('USUARIOS_MASTER');
    if (!sheet) return false;
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var activo = data[i][3];
      var esActivo = activo === true ||
                     String(activo).toUpperCase() === 'TRUE' ||
                     String(activo).toUpperCase() === 'VERDADERO' ||
                     activo === 1;
      var rol = String(data[i][2] || '').trim().toUpperCase();
      if (normDNI_(data[i][0]) === normDNI_(dni) && esActivo && rol === 'ADMIN') return true;
    }
    return false;
  } catch (e) { return false; }
}

// Devuelve datos completos del master (incluye contraseña — columna E)
function getMasterData_(dni) {
  try {
    var sheet = getSpreadsheet_().getSheetByName('USUARIOS_MASTER');
    if (!sheet) return null;
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var activo = data[i][3];
      var esActivo = activo === true ||
                     String(activo).toUpperCase() === 'TRUE' ||
                     String(activo).toUpperCase() === 'VERDADERO';
      if (normDNI_(data[i][0]) === normDNI_(dni) && esActivo) {
        return { dni: normDNI_(data[i][0]), nombre: data[i][1], rol: data[i][2], password: data[i][4] || '' };
      }
    }
    return null;
  } catch (e) { return null; }
}

// ────────────────────────────────────────────────────────────────
// CRUD — REGISTROS
// ────────────────────────────────────────────────────────────────

function getRegistros(dni, filtros) {
  try {
    var sheet=getSpreadsheet_().getSheetByName('REGISTRO');
    if(!sheet||sheet.getLastRow()<2) return [];
    var data=sheet.getDataRange().getValues(); var master=isMaster(dni);
    var tz=Session.getScriptTimeZone(); var result=[];
    for(var i=1;i<data.length;i++){
      var row=data[i];
      if(!master&&normDNI_(row[1])!==normDNI_(dni)) continue;
      if(filtros){
        if(filtros.anio&&String(row[12])!==String(filtros.anio)) continue;
        if(filtros.mes&&String(row[13])!==String(filtros.mes)) continue;
        if(filtros.tipo&&row[7]!==filtros.tipo) continue;
        if(filtros.evaluado&&row[9]!==filtros.evaluado) continue;
      }
      result.push({id:row[0],dni:row[1],nombre:row[2],cargo:row[3],area:row[4],
        fechaHerramienta:row[5]?Utilities.formatDate(new Date(row[5]),tz,'dd/MM/yyyy'):'',
        fechaCarga:row[6]?Utilities.formatDate(new Date(row[6]),tz,'dd/MM/yyyy HH:mm'):'',
        tipo:row[7],cantidad:row[8],evaluado:row[9],evaluadoCargo:row[10],links:row[11],anio:row[12],mes:row[13],archivos:row[14]});
    }
    return result.reverse();
  } catch(err){return [];}
}

function generateId_() {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var id = '';
  for (var i = 0; i < 6; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  return id;
}

function saveRegistro(data) {
  try {
    var ss=getSpreadsheet_(); var sheet=ss.getSheetByName('REGISTRO');
    var newId=generateId_();
    var now=new Date(); var anio=now.getFullYear(); var mes=String(now.getMonth()+1).padStart(2,'0');
    var fechaHerr=Utilities.parseDate(String(data.fechaHerramienta||''),'America/Lima','yyyy-MM-dd');
    // Nombre y cargo canónicos desde CFG_PERSONAL_URL para garantizar consistencia
    var lu = lookupDNI(data.dni);
    var nombreCanon = (lu && lu.ok && lu.nombre) ? lu.nombre : (data.nombre || '');
    var cargoCanon  = (lu && lu.ok && lu.cargo)  ? lu.cargo  : (data.cargo  || '');
    var evaluadoCargo = lookupCargoByNombre_(data.evaluado || '');
    sheet.appendRow([newId,data.dni,nombreCanon,cargoCanon,data.area,fechaHerr,now,data.tipo,data.cantidad,data.evaluado||'COMPLETADO',evaluadoCargo,data.links,anio,mes,data.archivos]);
    // Usar año/mes de FECHA_HERRAMIENTA para recalcular programados
    var hParts  = String(data.fechaHerramienta||'').split('-');
    var anioEjec = hParts[0] ? parseInt(hParts[0],10) : anio;
    var mesEjec  = hParts[1] ? normMes_(hParts[1])    : normMes_(mes);
    actualizarEjecutados_(ss,data.dni,data.tipo,anioEjec,mesEjec);
    return {ok:true,id:newId};
  } catch(err){return {ok:false,msg:err.message};}
}

// Busca CARGO en CFG_PERSONAL_URL por APELLIDOS Y NOMBRES (col F=5, CARGO col I=8)
function lookupCargoByNombre_(nombre) {
  try {
    nombre = String(nombre || '').trim().toUpperCase();
    if (!nombre || nombre === 'COMPLETADO') return '';
    var ps    = SpreadsheetApp.openById(getPersonalSheetId_());
    var sheet = ps.getSheetByName('REGISTER');
    if (!sheet) return 'SIN CARGO';
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][5] || '').trim().toUpperCase() === nombre)
        return String(data[i][8] || '').trim() || 'SIN CARGO';
    }
    return 'SIN CARGO';
  } catch (e) { return 'SIN CARGO'; }
}

function tipoRequiereNombre_(tipo) {
  try {
    var tipos = getTiposHerramienta();
    var key = String(tipo||'').trim().toUpperCase();
    for (var i = 0; i < tipos.length; i++) {
      if (tipos[i].nombre.toUpperCase() === key) return tipos[i].reqNombre;
    }
    return false;
  } catch(e) { return false; }
}

function getProgramados(dni, anio, mes) {
  try {
    var sheet=getSpreadsheet_().getSheetByName('PROGRAMADOS');
    if(!sheet||sheet.getLastRow()<2) return [];
    var data=sheet.getDataRange().getValues(); var master=isMaster(dni);
    var anioN = anio ? parseInt(anio, 10) : null;
    var mesN  = mes  ? normMes_(mes)      : null;
    return data.slice(1).filter(function(r){
      if(!master && normDNI_(r[0])!==normDNI_(dni)) return false;
      if(anioN && parseInt(r[4],10)!==anioN) return false;
      if(mesN  && normMes_(r[5])   !==mesN)  return false;
      return true;
    }).map(function(r){return{dni:r[0],codigo:r[1],nombre:r[2],tipo:r[3],anio:r[4],mes:r[5],programados:r[6]||0,ejecutados:r[7]||0,pendientes:r[8]||0,avance:r[9]||0};});
  } catch(e){return [];}
}

function getResumen(dni, anio, mes) {
  var prog=getProgramados(dni, anio, mes);
  var tP=prog.reduce(function(a,b){return a+(b.programados||0);},0);
  var tE=prog.reduce(function(a,b){return a+(b.ejecutados||0);},0);
  var pct=tP>0?Math.round((tE/tP)*100):0;
  var porTipo={};
  prog.forEach(function(p){if(!porTipo[p.tipo])porTipo[p.tipo]={programados:0,ejecutados:0};porTipo[p.tipo].programados+=p.programados;porTipo[p.tipo].ejecutados+=p.ejecutados;});
  return {totalProgramados:tP,totalEjecutados:tE,totalPendientes:tP-tE,porcentaje:pct,porTipo:porTipo,ultimosRegistros:getRegistros(dni,null).slice(0,5)};
}

// Normaliza mes: "06", "6", 6 → todos se comparan como entero
function normMes_(m) { return parseInt(m, 10); }

// Normaliza DNI: número o texto → string de 8 dígitos con ceros a la izquierda
function normDNI_(d) { return String(d || '').replace(/\D/g, '').padStart(8, '0'); }

// Convierte valor de celda a Date de forma robusta (Date nativo, número serial o string)
function toDate_(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number' && v > 0) return new Date(Math.round((v - 25569) * 86400000));
  if (typeof v === 'string' && v.trim()) { var d = new Date(v); return isNaN(d.getTime()) ? null : d; }
  return null;
}

function actualizarEjecutados_(ss,dni,tipo,anio,mes) {
  var rS=ss.getSheetByName('REGISTRO'); var pS=ss.getSheetByName('PROGRAMADOS');
  if(!pS||pS.getLastRow()<2) return;
  var rD=rS.getDataRange().getValues(); var count=0;
  var mesN=normMes_(mes); var anioN=parseInt(anio,10);
  for(var i=1;i<rD.length;i++) {
    var fH=toDate_(rD[i][5]); // FECHA_HERRAMIENTA
    if(!fH) continue;
    if(normDNI_(rD[i][1])===normDNI_(dni) &&
       rD[i][7]===tipo &&
       fH.getFullYear()===anioN &&
       fH.getMonth()+1===mesN) count++;
  }
  var pD=pS.getDataRange().getValues();
  for(var j=1;j<pD.length;j++) {
    if(normDNI_(pD[j][0])===normDNI_(dni) &&
       pD[j][3]===tipo &&
       parseInt(pD[j][4],10)===anioN &&
       normMes_(pD[j][5])===mesN) {
      var p=pD[j][6]||0;
      pS.getRange(j+1,8).setValue(count);
      pS.getRange(j+1,9).setValue(Math.max(0,p-count));
      pS.getRange(j+1,10).setValue(p>0?Math.min(1,Math.round(count/p*100)/100):0);
      break;
    }
  }
}

// ── Ejecutar UNA VEZ para añadir columna PASSWORD a USUARIOS_MASTER ──
function migrarPasswordColumn() {
  var ss    = getSpreadsheet_();
  var sheet = ss.getSheetByName('USUARIOS_MASTER');
  if (!sheet) { Logger.log('Hoja no encontrada'); return; }
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers.indexOf('PASSWORD') === -1) {
    var nextCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, nextCol).setValue('PASSWORD');
    sheet.getRange(1, nextCol)
      .setBackground('#b71c1c').setFontColor('#fff').setFontWeight('bold');
    sheet.getRange(1, nextCol).setNote('Dejar vacío = sin contraseña. Con valor = exige contraseña al login.');
    Logger.log('Columna PASSWORD añadida en columna ' + nextCol);
  } else {
    Logger.log('Ya existe columna PASSWORD');
  }
}

// ────────────────────────────────────────────────────────────────
// DRIVE
// ────────────────────────────────────────────────────────────────

function getOrCreateDriveFolder_(parent,name){var it=parent.getFoldersByName(name);return it.hasNext()?it.next():parent.createFolder(name);}

function buildFolderPath_(anio,mes,nombre,dni){
  var tokens=getEstructura_().split('/');
  var map={'AÑO':String(anio),'MES':String(mes).padStart(2,'0'),'NOMBRE':sanitizeName_(nombre),'DNI':String(dni||'')};
  var cur=getRootDriveFolder_();
  tokens.forEach(function(t){var n=map[t.trim().toUpperCase()]||sanitizeName_(t);if(n)cur=getOrCreateDriveFolder_(cur,n);});
  return cur;
}

function sanitizeName_(str){return String(str).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Z0-9]/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'');}
function buildFileName_(anio,mes,dia,tipo,evaluado,seq,ext){var e=ext?'.'+ext.toLowerCase().replace(/[^a-z0-9]/g,''):'.pdf';return anio+'_'+mes+'_'+dia+'_'+sanitizeName_(tipo)+'_'+sanitizeName_(evaluado)+'_'+String(seq).padStart(3,'0')+e;}
function countExistingFiles_(folder,anio,mes,dia,tipo,evaluado){var prefix=anio+'_'+mes+'_'+dia+'_'+sanitizeName_(tipo)+'_'+sanitizeName_(evaluado)+'_';var files=folder.getFiles();var c=0;while(files.hasNext()){if(files.next().getName().startsWith(prefix))c++;}return c;}

function uploadFileToDrive_(base64,mimeType,ext,formData,seqOffset){
  var parts=(String(formData.fechaHerramienta||'')).split('-');
  var anio=parts[0]||String(new Date().getFullYear());
  var mes=(parts[1]||'').padStart(2,'0')||String(new Date().getMonth()+1).padStart(2,'0');
  var dia=(parts[2]||'').padStart(2,'0')||String(new Date().getDate()).padStart(2,'0');
  var folder=buildFolderPath_(anio,mes,formData.nombre,formData.dni);
  var evaluado=tipoRequiereNombre_(formData.tipo)?(formData.evaluado||'SN'):'SN';
  var seq=countExistingFiles_(folder,anio,mes,dia,formData.tipo,evaluado)+parseInt(seqOffset,10);
  var name=buildFileName_(anio,mes,dia,formData.tipo,evaluado,seq,ext);
  var blob=Utilities.newBlob(Utilities.base64Decode(base64),mimeType,name);
  var file=folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);
  return {link:'https://drive.google.com/file/d/'+file.getId()+'/view',nombre:name};
}

function uploadFiles(filesData, formData) {
  try {
    var links = [], nombres = [];
    for (var i = 0; i < filesData.length; i++) {
      var f = filesData[i];
      var r = uploadFileToDrive_(f.base64, f.mimeType, f.ext, formData, i + 1);
      links.push(r.link); nombres.push(r.nombre);
    }
    formData.links    = links.join('\n');
    formData.archivos = nombres.join(', ');
    formData.cantidad = filesData.length;
    return saveRegistro(formData);
  } catch(err) { return { ok:false, msg:err.message }; }
}

// ────────────────────────────────────────────────────────────────
// LISTA DE PERSONAL (para campo EVALUADO)
// ────────────────────────────────────────────────────────────────

function getPersonalList() {
  try {
    var personalId = getPersonalSheetId_();
    var ps    = SpreadsheetApp.openById(personalId);
    var sheet = ps.getSheetByName('REGISTER');
    if (!sheet) return [];
    var data   = sheet.getDataRange().getValues();
    var result = [];
    for (var i = 1; i < data.length; i++) {
      var nombre = String(data[i][5] || '').trim();
      var estado = String(data[i][2] || '').trim().toUpperCase();
      var dni    = String(data[i][0] || '').trim();
      var cargo  = String(data[i][8] || '').trim();
      if (nombre && estado !== 'CESADO') result.push({ dni: dni, nombre: nombre, cargo: cargo });
    }
    result.sort(function(a,b){ return a.nombre.localeCompare(b.nombre); });
    return result;
  } catch (e) { return []; }
}

// ────────────────────────────────────────────────────────────────
// REGISTRO DE NUEVOS USUARIOS
// ────────────────────────────────────────────────────────────────

function registerUser_(dni, apellidos, nombres) {
  if (!isConfigured()) return { ok:false, msg:'App no configurada.' };
  dni      = normDNI_(String(dni || ''));
  apellidos = String(apellidos || '').trim().toUpperCase();
  nombres   = String(nombres   || '').trim().toUpperCase();
  if (!dni || !apellidos || !nombres) return { ok:false, msg:'Completa todos los campos.' };
  var fullName = apellidos + ' ' + nombres;
  var sheet = getSpreadsheet_().getSheetByName('USUARIOS_MASTER');
  if (!sheet) return { ok:false, msg:'Tabla de usuarios no encontrada.' };
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (normDNI_(data[i][0]) === dni) {
      return { ok:false, msg:'DNI ya registrado. Intenta ingresar directamente.' };
    }
  }
  sheet.appendRow([dni, fullName, 'OPERARIO', true, '']);
  return { ok:true, dni:dni, nombre:fullName, cargo:'OPERARIO', empresa:'SISTEMA', estado:'ACTIVO', master:false };
}

// ────────────────────────────────────────────────────────────────
// UTILS
// ────────────────────────────────────────────────────────────────

function getTiposHerramienta(){
  var def=[
    {nombre:'AUD. IPERC',reqNombre:false},{nombre:'AUD. PETAR',reqNombre:false},
    {nombre:'AUD. HABLA FACIL',reqNombre:false},{nombre:'OPT',reqNombre:true},
    {nombre:'TALLER PERCEPCION',reqNombre:false},{nombre:'ORT',reqNombre:false},
    {nombre:'VCC',reqNombre:false},{nombre:'EV. EFICACIA',reqNombre:false},{nombre:'OTRO',reqNombre:false}
  ];
  try {
    var sheet = getSpreadsheet_().getSheetByName('HERRAMIENTAS');
    if (!sheet || sheet.getLastRow() < 2) return def;
    var vals = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
    var result = vals.map(function(r){
      var nombre = String(r[0]||'').trim();
      return nombre ? {nombre:nombre, reqNombre:String(r[1]||'').trim().toUpperCase()==='SI'} : null;
    }).filter(Boolean);
    return result.length ? result : def;
  } catch(e) { return def; }
}

function addTipoHerramienta(tipo, reqNombre) {
  try {
    tipo = String(tipo || '').trim().toUpperCase();
    if (!tipo) return { ok:false, msg:'Nombre vacío.' };
    var tipos = getTiposHerramienta();
    if (tipos.map(function(t){return t.nombre.toUpperCase();}).indexOf(tipo) !== -1)
      return { ok:false, msg:'El tipo "' + tipo + '" ya existe.' };
    var sheet = getSpreadsheet_().getSheetByName('HERRAMIENTAS');
    if (!sheet) return { ok:false, msg:'Hoja HERRAMIENTAS no encontrada.' };
    sheet.appendRow([tipo, reqNombre ? 'SI' : 'NO']);
    return { ok:true, tipos: getTiposHerramienta() };
  } catch(e) { return { ok:false, msg:e.message }; }
}

function editTipoHerramienta(oldNombre, newNombre, reqNombre) {
  try {
    oldNombre = String(oldNombre || '').trim().toUpperCase();
    newNombre = String(newNombre || '').trim().toUpperCase();
    if (!newNombre) return { ok:false, msg:'Nombre vacío.' };
    var sheet = getSpreadsheet_().getSheetByName('HERRAMIENTAS');
    if (!sheet) return { ok:false, msg:'Hoja HERRAMIENTAS no encontrada.' };
    var data = sheet.getDataRange().getValues();
    if (oldNombre !== newNombre) {
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]||'').trim().toUpperCase() === newNombre)
          return { ok:false, msg:'El tipo "' + newNombre + '" ya existe.' };
      }
    }
    for (var j = 1; j < data.length; j++) {
      if (String(data[j][0]||'').trim().toUpperCase() === oldNombre) {
        sheet.getRange(j+1, 1).setValue(newNombre);
        if (reqNombre !== undefined) sheet.getRange(j+1, 2).setValue(reqNombre ? 'SI' : 'NO');
        return { ok:true, tipos: getTiposHerramienta() };
      }
    }
    return { ok:false, msg:'Tipo "' + oldNombre + '" no encontrado.' };
  } catch(e) { return { ok:false, msg:e.message }; }
}

function deleteTipoHerramienta(nombre) {
  try {
    nombre = String(nombre || '').trim().toUpperCase();
    var sheet = getSpreadsheet_().getSheetByName('HERRAMIENTAS');
    if (!sheet) return { ok:false, msg:'Hoja HERRAMIENTAS no encontrada.' };
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]||'').trim().toUpperCase() === nombre) {
        sheet.deleteRow(i+1);
        return { ok:true, tipos: getTiposHerramienta() };
      }
    }
    return { ok:false, msg:'Tipo "' + nombre + '" no encontrado.' };
  } catch(e) { return { ok:false, msg:e.message }; }
}
function getSpreadsheetUrl(){try{return getSpreadsheet_().getUrl();}catch(e){return null;}}

// ────────────────────────────────────────────────────────────────
// RECALCULO MASIVO DE PROGRAMADOS
// ────────────────────────────────────────────────────────────────

function recalcularTodo(anio, mes) {
  try {
    var ss = getSpreadsheet_();
    var rS = ss.getSheetByName('REGISTRO');
    var pS = ss.getSheetByName('PROGRAMADOS');
    if (!pS || pS.getLastRow() < 2) return { ok:true, updated:0 };
    var rD = (rS && rS.getLastRow() > 1) ? rS.getDataRange().getValues() : [[]];
    var pD = pS.getDataRange().getValues();
    var anioN = anio ? parseInt(anio, 10) : null;
    var updated = 0;
    for (var j = 1; j < pD.length; j++) {
      var row   = pD[j];
      var pAnio = parseInt(row[4], 10);
      var pMes  = normMes_(row[5]);
      if (anioN && pAnio !== anioN) continue;
      var count = 0;
      for (var i = 1; i < rD.length; i++) {
        var fH = toDate_(rD[i][5]); // FECHA_HERRAMIENTA
        if (!fH) continue;
        if (normDNI_(rD[i][1]) === normDNI_(row[0]) &&
            rD[i][7]             === row[3]          &&
            fH.getFullYear()     === pAnio           &&
            fH.getMonth() + 1    === pMes) count++;
      }
      var prog = row[6] || 0;
      pS.getRange(j+1, 8).setValue(count);
      pS.getRange(j+1, 9).setValue(Math.max(0, prog - count));
      pS.getRange(j+1, 10).setValue(prog > 0 ? Math.min(1, Math.round(count/prog*100)/100) : 0);
      updated++;
    }
    return { ok:true, updated:updated };
  } catch(err) { return { ok:false, msg:err.message }; }
}
