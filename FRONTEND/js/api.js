// ═══════════════════════════════════════════════════════════════
//  API — Wrapper de fetch hacia Google Apps Script
//  GET  → parámetros en query string (sin preflight CORS)
//  POST → body JSON sin Content-Type (evita preflight CORS)
// ═══════════════════════════════════════════════════════════════

var API = {

  _get: function (params) {
    var qs  = Object.keys(params).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k] || '');
    }).join('&');
    return fetch(GAS_URL + '?' + qs, { redirect: 'follow' })
      .then(function (r) { return r.json(); });
  },

  // Sin Content-Type → text/plain → sin preflight CORS
  _post: function (body) {
    return fetch(GAS_URL, {
      method:   'POST',
      redirect: 'follow',
      body:     JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  },

  // ── GET endpoints ──────────────────────────────────────────
  status: function () {
    return API._get({ action: 'status' });
  },

  login: function (dni, pwd) {
    var p = { action: 'login', dni: dni };
    if (pwd) p.pwd = pwd;
    return API._get(p);
  },

  tipos: function () {
    return API._get({ action: 'tipos' });
  },

  resumen: function (dni, anio, mes) {
    var p = { action: 'resumen', dni: dni };
    if (anio) p.anio = anio;
    if (mes)  p.mes  = mes;
    return API._get(p);
  },

  registros: function (dni, filtros) {
    var p = Object.assign({ action: 'registros', dni: dni }, filtros || {});
    return API._get(p);
  },

  sheetsUrl: function () {
    return API._get({ action: 'sheetsUrl' });
  },

  // ── POST endpoints ─────────────────────────────────────────
  saveConfig: function (sheetsUrl, driveUrl, personalUrl) {
    return API._post({ action: 'config', sheetsUrl: sheetsUrl, driveUrl: driveUrl, personalUrl: personalUrl || '' });
  },

  upload: function (filesData, formData) {
    return API._post({ action: 'upload', filesData: filesData, formData: formData });
  },

  addTipo: function (tipo) {
    return API._post({ action: 'addTipo', tipo: tipo });
  },

  register: function (dni, apellidos, nombres) {
    return API._post({ action: 'register', dni: dni, apellidos: apellidos, nombres: nombres });
  },

  personal: function () {
    return API._get({ action: 'personal' });
  },

  programados: function (dni, anio, mes) {
    var p = { action: 'programados', dni: dni };
    if (anio) p.anio = anio;
    if (mes)  p.mes  = mes;
    return API._get(p);
  },

  recalcular: function (anio, mes) {
    return API._post({ action: 'recalcular', anio: anio || '', mes: mes || '' });
  }
};
