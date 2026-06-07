// ═══════════════════════════════════════════════════════════════
//  UPLOAD VIEW — Multi-entrada mejorada
// ═══════════════════════════════════════════════════════════════

var UP = {
  entries: [],
  _eid:    0,

  // ── Inicialización ──────────────────────────────────────────
  reset: function () {
    UP.entries = [];
    UP._eid    = 0;
    document.getElementById('up-entries-list').innerHTML = '';
    document.getElementById('up-prog-icon').textContent  = '☁️';
    document.getElementById('up-prog-title').textContent = 'Subiendo registros';
    document.getElementById('up-prog-msg').textContent   = 'Preparando…';
    document.getElementById('up-prog-fill').style.width  = '0%';
    document.getElementById('up-prog-pct').textContent   = '0%';
    var isMaster = APP.user && APP.user.master === true;
    document.getElementById('bottom-nav').style.display    = isMaster ? 'flex' : 'none';
    document.getElementById('up-logout-btn').style.display = isMaster ? 'none' : 'flex';
    UP._refreshAreasList();
    UP.loadPersonal(); // precarga para evaluador y evaluado
    UP.addEntry();
  },

  // ── Helpers ─────────────────────────────────────────────────
  _tiposHtml: function (selected) {
    return '<option value="">Tipo…</option>' +
      APP.tipos.map(function (t) {
        return '<option value="' + t + '"' + (t === selected ? ' selected' : '') + '>' + t + '</option>';
      }).join('');
  },

  _today: function () {
    var n = new Date();
    return n.getFullYear() + '-' + String(n.getMonth()+1).padStart(2,'0') + '-' + String(n.getDate()).padStart(2,'0');
  },

  getEntry: function (id) {
    return UP.entries.filter(function (e) { return e.id === id; })[0] || null;
  },

  setField: function (id, field, val) {
    var e = UP.getEntry(id);
    if (e) { e[field] = val; UP.checkCompletion(id); }
  },

  // ── Áreas sugeridas (localStorage) ──────────────────────────
  _getAreas: function () {
    try { return JSON.parse(localStorage.getItem('hs_areas') || '[]'); } catch(e) { return []; }
  },

  _saveArea: function (area) {
    if (!area) return;
    try {
      var list = UP._getAreas();
      list = list.filter(function(a){ return a !== area; });
      list.unshift(area);
      if (list.length > 12) list = list.slice(0, 12);
      localStorage.setItem('hs_areas', JSON.stringify(list));
    } catch(e) {}
  },

  _refreshAreasList: function () {
    var dl = document.getElementById('hs-areas-list');
    if (!dl) return;
    dl.innerHTML = UP._getAreas().map(function(a) {
      return '<option value="' + a + '">';
    }).join('');
  },

  // ── Indicador de completitud ─────────────────────────────────
  _userOk: function (e) {
    var isMaster = APP.user && APP.user.master === true;
    if (isMaster) return !!(e.dniData && e.dniData.dni && e.dniData.nombre);
    return !!e.dniData;
  },

  checkCompletion: function (id) {
    var entry = UP.getEntry(id);
    var card  = document.getElementById('ue-' + id);
    if (!entry || !card) return;
    var needsEvaluado = entry.tipo && entry.tipo.toUpperCase() === 'OPT';
    var ok = !!(UP._userOk(entry) && entry.tipo && entry.area.trim() && entry.fecha && entry.files.length &&
                (!needsEvaluado || entry.evaluado));
    card.classList.toggle('complete', ok);
    UP.updateSubmitBtn();
  },

  updateSubmitBtn: function () {
    var btn = document.getElementById('btn-submit');
    if (!btn || btn.disabled) return;
    var total = UP.entries.length;
    var ready = UP.entries.filter(function(e) {
      return !!(UP._userOk(e) && e.tipo && e.area.trim() && e.fecha && e.files.length);
    }).length;
    var label = 'Guardar ' + total + ' Registro' + (total !== 1 ? 's' : '');
    var badge = (ready < total)
      ? ' <span class="submit-badge">' + ready + '/' + total + ' listos</span>'
      : ' <span class="submit-badge">✓ Listo</span>';
    btn.innerHTML = '<span class="material-icons">save_alt</span> ' + label + badge;
  },

  // ── Añadir / eliminar / duplicar entrada ────────────────────
  addEntry: function () {
    var id       = ++UP._eid;
    var isMaster = APP.user && APP.user.master === true;
    UP.entries.push({ id: id, dniData: isMaster ? null : (APP.user || null), tipo: '', area: '', fecha: UP._today(), files: [], evaluado: '' });
    UP._renderCard(id);
    UP.updateSubmitBtn();
    vibrate(20);
  },

  removeEntry: function (id) {
    if (UP.entries.length <= 1) { toast('Debe haber al menos una herramienta', 'warning'); return; }
    var card = document.getElementById('ue-' + id);
    if (card) {
      card.classList.add('removing');
      setTimeout(function () {
        card.remove();
        UP.entries = UP.entries.filter(function (e) { return e.id !== id; });
        UP.updateSubmitBtn();
      }, 240);
    }
    vibrate(20);
  },

  duplicateEntry: function (id) {
    var src      = UP.getEntry(id);
    if (!src) return;
    var newId    = ++UP._eid;
    var isMaster = APP.user && APP.user.master === true;
    UP.entries.push({
      id:       newId,
      dniData:  src.dniData,
      tipo:     src.tipo,
      area:     src.area,
      fecha:    src.fecha,
      files:    [],
      evaluado: ''
    });
    UP._renderCard(newId);
    // Pre-rellenar campos del nuevo card
    if (src.tipo) {
      if (APP.tipos.indexOf(src.tipo) !== -1) {
        var ut = document.getElementById('ut-' + newId); if (ut) ut.value = src.tipo;
      } else {
        UP.onTipoChange(newId, 'OTRO');
        var utic = document.getElementById('utic-' + newId); if (utic) utic.value = src.tipo;
        UP.setField(newId, 'tipo', src.tipo);
      }
    }
    var ua = document.getElementById('ua-' + newId); if (ua) ua.value = src.area;
    var uf = document.getElementById('uf-' + newId); if (uf) uf.value = src.fecha;
    if (isMaster && src.dniData) {
      var ueva = document.getElementById('ueva-' + newId); if (ueva) ueva.value = src.dniData.nombre;
      var chip = document.getElementById('uevac-' + newId); if (chip) chip.style.display = 'flex';
      var chipTxt = document.getElementById('uevact-' + newId);
      if (chipTxt) chipTxt.textContent = src.dniData.cargo || src.dniData.dni || '';
    }
    UP.checkCompletion(newId);
    UP.updateSubmitBtn();
    vibrate(30);
    toast('Duplicado — solo adjunta los archivos', 'success', 2200);
  },

  // ── Renderizado de tarjeta ───────────────────────────────────
  _renderCard: function (id) {
    var entry    = UP.getEntry(id);
    var isMaster = APP.user && APP.user.master === true;

    // Chip para no-master (solo lectura)
    var chipHtml = '';
    if (!isMaster && APP.user) {
      var ini = APP.user.nombre.split(' ').slice(0,2).map(function(w){return w[0]||'';}).join('');
      chipHtml =
        '<div style="display:flex;align-items:center;gap:8px;background:rgba(26,35,126,.06);border-radius:10px;padding:6px 10px;margin-bottom:6px">' +
          '<div class="user-avatar" style="width:28px;height:28px;font-size:.75rem;flex-shrink:0">' + ini + '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-size:.8rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + APP.user.nombre + '</div>' +
            '<div style="font-size:.7rem;color:var(--text-muted)">' + (APP.user.cargo || '') + '</div>' +
          '</div>' +
          '<span class="material-icons" style="color:var(--success);font-size:1rem">verified</span>' +
        '</div>';
    }

    // Campo EVALUADOR (autocomplete personal) solo para master
    var evaluadoHtml = '';
    if (isMaster) {
      evaluadoHtml =
        '<div class="form-group" style="margin-bottom:6px">' +
          '<label class="form-label" style="font-size:.74rem">Evaluador</label>' +
          '<div style="position:relative">' +
            '<input type="text" id="ueva-' + id + '" class="form-control" placeholder="Buscar evaluador..."' +
              ' autocomplete="off" style="text-transform:uppercase"' +
              ' oninput="UP.onEvaluadorInput(' + id + ',this.value)"' +
              ' onblur="setTimeout(function(){var l=document.getElementById(\'ueval-' + id + '\');if(l)l.style.display=\'none\'},200)">' +
            '<div id="ueval-' + id + '" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:200;' +
              'background:#fff;border:2px solid var(--primary);border-top:none;border-radius:0 0 10px 10px;' +
              'max-height:180px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,.15)"></div>' +
          '</div>' +
          '<div id="uevac-' + id + '" style="display:none;align-items:center;gap:4px;margin-top:4px">' +
            '<span class="material-icons" style="color:var(--success);font-size:.9rem">check_circle</span>' +
            '<span id="uevact-' + id + '" style="font-size:.72rem;color:var(--text-muted)"></span>' +
          '</div>' +
        '</div>';
    }

    var div = document.createElement('div');
    div.className = 'card entry-card';
    div.id = 'ue-' + id;
    div.style.cssText = 'margin-bottom:12px;animation:cardIn .22s var(--ease) both';
    div.innerHTML =
      // ── Cabecera ──
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
        '<div style="font-weight:700;font-size:.85rem;display:flex;align-items:center;gap:5px">' +
          '<span class="material-icons entry-hdr-icon" style="font-size:.95rem;color:var(--primary);transition:color .3s">build_circle</span>' +
          '<span style="color:var(--primary)">Herramienta #' + id + '</span>' +
        '</div>' +
        '<div style="display:flex;gap:4px">' +
          '<button onclick="UP.duplicateEntry(' + id + ')" style="background:none;border:none;cursor:pointer;color:var(--primary-light);padding:4px" title="Duplicar">' +
            '<span class="material-icons" style="font-size:1.05rem">content_copy</span>' +
          '</button>' +
          '<button onclick="UP.removeEntry(' + id + ')" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:4px" title="Eliminar">' +
            '<span class="material-icons" style="font-size:1.05rem">delete_outline</span>' +
          '</button>' +
        '</div>' +
      '</div>' +
      evaluadoHtml +
      chipHtml +
      // ── Tipo + Fecha (misma fila) ──
      '<div style="display:grid;grid-template-columns:3fr 2fr;gap:8px;margin-bottom:6px">' +
        '<div class="form-group" style="margin-bottom:0">' +
          '<label class="form-label" style="font-size:.74rem">Tipo de herramienta</label>' +
          '<select id="ut-' + id + '" class="form-control" onchange="UP.onTipoChange(' + id + ',this.value)">' +
            UP._tiposHtml('') +
          '</select>' +
          '<div id="utc-' + id + '" style="display:none;position:relative">' +
            '<input type="text" id="utic-' + id + '" class="form-control" placeholder="Escribe el tipo…"' +
              ' style="text-transform:uppercase;padding-right:44px"' +
              ' oninput="UP.setField(' + id + ',\'tipo\',this.value.trim().toUpperCase())"' +
              ' onkeydown="if(event.key===\'Escape\')UP.backToSelect(' + id + ')">' +
            '<button onclick="UP.backToSelect(' + id + ')"' +
              ' style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-muted);padding:4px"' +
              ' title="Volver a la lista">' +
              '<span class="material-icons" style="font-size:1.1rem">arrow_drop_down</span>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div class="form-group" style="margin-bottom:0">' +
          '<label class="form-label" style="font-size:.74rem">Fecha Ejecución</label>' +
          '<input type="date" id="uf-' + id + '" class="form-control" value="' + UP._today() + '"' +
            ' onchange="UP.setField(' + id + ',\'fecha\',this.value)">' +
        '</div>' +
      '</div>' +
      // ── Evaluado (solo visible cuando tipo=OPT) ──
      '<div id="uev-' + id + '" style="display:none;margin-bottom:6px">' +
        '<div class="form-group" style="margin-bottom:0;position:relative">' +
          '<label class="form-label" style="font-size:.74rem">Evaluado</label>' +
          '<input type="text" id="uevi-' + id + '" class="form-control" placeholder="Buscar nombre…"' +
            ' autocomplete="off" style="text-transform:uppercase"' +
            ' oninput="UP.onEvaluadoInput(' + id + ',this.value)"' +
            ' onblur="setTimeout(function(){var l=document.getElementById(\'uevl-' + id + '\');if(l)l.style.display=\'none\'},200)">' +
          '<div id="uevl-' + id + '" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:200;' +
            'background:#fff;border:2px solid var(--primary);border-top:none;border-radius:0 0 10px 10px;' +
            'max-height:180px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,.15)"></div>' +
        '</div>' +
      '</div>' +
      // ── Área ──
      '<div class="form-group" style="margin-bottom:6px">' +
        '<label class="form-label" style="font-size:.74rem">Área</label>' +
        '<select id="ua-' + id + '" class="form-control" onchange="UP.setField(' + id + ',\'area\',this.value)">' +
          '<option value="">Área…</option>' +
          '<option>AVANCES</option>' +
          '<option>SERVICIOS</option>' +
          '<option>LOGISTICA</option>' +
          '<option>ADMINISTRACION</option>' +
          '<option>MANTENIMIENTO</option>' +
          '<option>OFICINA TÉCNICA</option>' +
          '<option>SEGURIDAD</option>' +
        '</select>' +
      '</div>' +
      // ── Archivos ──
      '<div onclick="document.getElementById(\'ufi-' + id + '\').click()"' +
        ' class="drop-zone-sm" style="margin-bottom:6px">' +
        '<span class="material-icons" style="color:var(--primary-light);font-size:1.6rem">cloud_upload</span>' +
        '<p style="font-size:.76rem;margin:2px 0 0;color:var(--text-muted)">Toca para adjuntar · 1 archivo · PDF, JPG, PNG, DOCX</p>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:4px">' +
        '<button class="btn btn-outline btn-sm" onclick="document.getElementById(\'ufc-' + id + '\').click()" style="margin-top:0;width:100%">' +
          '<span class="material-icons" style="font-size:1rem">photo_camera</span> Cámara' +
        '</button>' +
        '<button class="btn btn-outline btn-sm" onclick="document.getElementById(\'ufi-' + id + '\').click()" style="margin-top:0;width:100%">' +
          '<span class="material-icons" style="font-size:1rem">folder_open</span> Archivos' +
        '</button>' +
      '</div>' +
      '<input type="file" id="ufi-' + id + '" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" style="display:none"' +
        ' onchange="UP.onFiles(' + id + ',this.files)">' +
      '<input type="file" id="ufc-' + id + '" accept="image/*" capture="environment" style="display:none"' +
        ' onchange="UP.onFiles(' + id + ',this.files)">' +
      '<div id="ufl-' + id + '" class="file-list" style="margin-top:4px"></div>';

    document.getElementById('up-entries-list').appendChild(div);
    setTimeout(function () { div.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 80);
  },


  // ── Archivos ─────────────────────────────────────────────────
  onFiles: function (id, list) {
    var entry = UP.getEntry(id); if (!entry) return;
    if (list.length > 0) entry.files = [list[0]];
    UP._renderFiles(id);
    var fi = document.getElementById('ufi-' + id); if (fi) fi.value = '';
    var fc = document.getElementById('ufc-' + id); if (fc) fc.value = '';
    UP.checkCompletion(id); vibrate(20);
  },

  removeFile: function (eid, idx) {
    var entry = UP.getEntry(eid); if (!entry) return;
    var container = document.getElementById('ufl-' + eid);
    if (container) {
      var items = container.querySelectorAll('.file-item');
      if (items[idx]) {
        items[idx].classList.add('removing');
        setTimeout(function () {
          entry.files.splice(idx, 1);
          UP._renderFiles(eid);
          UP.checkCompletion(eid);
        }, 200);
        return;
      }
    }
    entry.files.splice(idx, 1);
    UP._renderFiles(eid);
    UP.checkCompletion(eid);
  },

  _renderFiles: function (id) {
    var entry = UP.getEntry(id); if (!entry) return;
    var container = document.getElementById('ufl-' + id); if (!container) return;
    container.innerHTML = '';
    entry.files.forEach(function (f, i) {
      var isImg = f.type.startsWith('image/');
      var div   = document.createElement('div');
      div.className = 'file-item';
      div.innerHTML =
        '<div class="file-thumb">' + (isImg ? '<img id="uft-'+id+'-'+i+'" src="">' : fileIcon(f)) + '</div>' +
        '<div class="file-info"><div class="file-name">' + f.name + '</div><div class="file-size">' + fmtSize(f.size) + '</div></div>' +
        '<button class="file-remove" onclick="UP.removeFile(' + id + ',' + i + ')"><span class="material-icons">delete_outline</span></button>';
      container.appendChild(div);
      if (isImg) {
        var r = new FileReader();
        r.onload = (function(ii,jj){ return function(ev){ var el=document.getElementById('uft-'+ii+'-'+jj); if(el) el.src=ev.target.result; }; })(id, i);
        r.readAsDataURL(f);
      }
    });
  },

  // ── Tipo personalizado (OTRO) ────────────────────────────────
  onTipoChange: function (id, val) {
    // Mostrar u ocultar sección Evaluado según tipo=OP
    var evSec = document.getElementById('uev-' + id);
    var isOP  = val.toUpperCase() === 'OPT';
    if (evSec) {
      evSec.style.display = isOP ? 'block' : 'none';
      if (!isOP) {
        var evInp = document.getElementById('uevi-' + id);
        if (evInp) evInp.value = '';
        var evList = document.getElementById('uevl-' + id);
        if (evList) { evList.style.display = 'none'; evList.innerHTML = ''; }
        var entry = UP.getEntry(id);
        if (entry) entry.evaluado = '';
      } else {
        UP.loadPersonal();
      }
    }
    if (val === 'OTRO') {
      var sel = document.getElementById('ut-' + id);
      if (sel) sel.style.display = 'none';
      var ctc = document.getElementById('utc-' + id);
      if (ctc) ctc.style.display = 'block';
      var inp = document.getElementById('utic-' + id);
      if (inp) { inp.value = ''; setTimeout(function () { inp.focus(); }, 50); }
      UP.setField(id, 'tipo', '');
    } else {
      UP.setField(id, 'tipo', val);
    }
  },

  backToSelect: function (id) {
    var ctc = document.getElementById('utc-' + id);
    if (ctc) ctc.style.display = 'none';
    var sel = document.getElementById('ut-' + id);
    if (sel) { sel.style.display = 'block'; sel.value = ''; }
    UP.setField(id, 'tipo', '');
  },

  // ── Personal para campos Evaluador / Evaluado ────────────────
  _personalList: [],

  _personalLoading: null,

  loadPersonal: function () {
    if (UP._personalList.length) return Promise.resolve(UP._personalList);
    if (UP._personalLoading) return UP._personalLoading;
    UP._personalLoading = API.personal().then(function (list) {
      UP._personalList   = Array.isArray(list) ? list : [];
      UP._personalLoading = null;
      return UP._personalList;
    }).catch(function () { UP._personalLoading = null; return []; });
    return UP._personalLoading;
  },

  // Helpers comunes para los desplegables de personal
  _personNombre: function (item) { return typeof item === 'string' ? item : (item.nombre || ''); },
  _personCargo:  function (item) { return typeof item === 'object' ? (item.cargo  || '') : ''; },
  _personDni:    function (item) { return typeof item === 'object' ? (item.dni    || '') : ''; },

  _buildPersonDropdown: function (listEl, val, onSelect) {
    listEl.innerHTML = '';
    if (val.length < 2) { listEl.style.display = 'none'; return; }
    var matches = UP._personalList.filter(function (item) {
      return UP._personNombre(item).toUpperCase().indexOf(val) !== -1;
    }).slice(0, 8);
    if (!matches.length) { listEl.style.display = 'none'; return; }
    matches.forEach(function (item) {
      var nombre = UP._personNombre(item);
      var cargo  = UP._personCargo(item);
      var div = document.createElement('div');
      div.style.cssText = 'padding:8px 14px;cursor:pointer;border-bottom:1px solid var(--border)';
      div.innerHTML = '<div style="font-size:.85rem">' + nombre + '</div>' +
        (cargo ? '<div style="font-size:.7rem;color:var(--text-muted)">' + cargo + '</div>' : '');
      div.onmousedown = function (e) { e.preventDefault(); };
      div.onclick = function () { onSelect(item); listEl.style.display = 'none'; listEl.innerHTML = ''; };
      div.onmouseover = function () { this.style.background = '#f0f2f8'; };
      div.onmouseout  = function () { this.style.background = ''; };
      listEl.appendChild(div);
    });
    listEl.style.display = 'block';
  },

  // ── Evaluador (solo master) ──────────────────────────────────
  onEvaluadorInput: function (id, val) {
    val = (val || '').toUpperCase();
    var inp = document.getElementById('ueva-' + id);
    if (inp && inp.value !== val) inp.value = val;
    var entry = UP.getEntry(id);
    if (!entry) return;
    if (entry.dniData && entry.dniData.nombre !== val) {
      entry.dniData = null;
      var chip = document.getElementById('uevac-' + id);
      if (chip) chip.style.display = 'none';
    }
    UP.checkCompletion(id);
    var listEl = document.getElementById('ueval-' + id);
    if (!listEl) return;
    UP.loadPersonal().then(function () {
      // Verificar que el input sigue activo con el mismo valor
      var cur = document.getElementById('ueva-' + id);
      if (!cur || cur.value.toUpperCase() !== val) return;
      UP._buildPersonDropdown(listEl, val, function (item) {
        UP.selectEvaluador(id, item);
      });
    });
  },

  selectEvaluador: function (id, item) {
    var nombre = UP._personNombre(item).trim().toUpperCase();
    var dni    = UP._personDni(item);
    var cargo  = UP._personCargo(item);
    var inp = document.getElementById('ueva-' + id);
    if (inp) inp.value = nombre;
    var entry = UP.getEntry(id);
    if (entry) {
      entry.dniData = { dni: dni, nombre: nombre, cargo: cargo, ok: true };
      var chip = document.getElementById('uevac-' + id);
      var chipTxt = document.getElementById('uevact-' + id);
      if (chip) chip.style.display = 'flex';
      if (chipTxt) chipTxt.textContent = cargo || dni;
      UP.checkCompletion(id);
    }
    vibrate(20);
  },

  // ── Evaluado (OPT, todos los usuarios) ───────────────────────
  onEvaluadoInput: function (id, val) {
    val = (val || '').toUpperCase();
    var inp = document.getElementById('uevi-' + id);
    if (inp && inp.value !== val) inp.value = val;
    var entry = UP.getEntry(id);
    if (entry) { entry.evaluado = val; UP.checkCompletion(id); }
    var listEl = document.getElementById('uevl-' + id);
    if (!listEl) return;
    UP.loadPersonal().then(function () {
      var cur = document.getElementById('uevi-' + id);
      if (!cur || cur.value.toUpperCase() !== val) return;
      UP._buildPersonDropdown(listEl, val, function (item) {
        UP.selectEvaluado(id, UP._personNombre(item));
      });
    });
  },

  selectEvaluado: function (id, name) {
    name = (typeof name === 'string' ? name : UP._personNombre(name)).trim().toUpperCase();
    var inp = document.getElementById('uevi-' + id);
    if (inp) inp.value = name;
    var listEl = document.getElementById('uevl-' + id);
    if (listEl) { listEl.style.display = 'none'; listEl.innerHTML = ''; }
    var entry = UP.getEntry(id);
    if (entry) { entry.evaluado = name; UP.checkCompletion(id); }
  },

  // ── Validación ───────────────────────────────────────────────
  validate: function () {
    for (var i = 0; i < UP.entries.length; i++) {
      var e = UP.entries[i], n = i + 1;
      if (!UP._userOk(e)) { toast('Herramienta #' + n + ': ingresa DNI y nombre del trabajador', 'warning'); return false; }
      if (!e.tipo)         { toast('Herramienta #' + n + ': selecciona el tipo',         'warning'); return false; }
      if (e.tipo.toUpperCase() === 'OPT' && !e.evaluado) { toast('Herramienta #' + n + ': ingresa el evaluado', 'warning'); return false; }
      if (!e.area.trim())  { toast('Herramienta #' + n + ': ingresa el área',            'warning'); return false; }
      if (!e.fecha)        { toast('Herramienta #' + n + ': selecciona la fecha',        'warning'); return false; }
      if (!e.files.length) { toast('Herramienta #' + n + ': adjunta el archivo','warning'); return false; }
    }
    return true;
  },

  // ── Envío secuencial ─────────────────────────────────────────
  submit: function () {
    if (!UP.validate()) return;
    var btn   = document.getElementById('btn-submit');
    var total = UP.entries.length;
    var done  = 0;
    setLoading(btn, true);
    document.getElementById('up-progress').classList.add('show');
    vibrate(30);

    var processNext = function () {
      if (done >= total) {
        document.getElementById('up-prog-icon').textContent  = '✅';
        document.getElementById('up-prog-title').textContent = '¡Registros guardados!';
        document.getElementById('up-prog-msg').textContent   = total + ' herramienta(s) guardadas correctamente';
        document.getElementById('up-prog-fill').style.width  = '100%';
        document.getElementById('up-prog-pct').textContent   = '100%';
        vibrate([80,40,80]);
        setTimeout(function () {
          setLoading(btn, false);
          document.getElementById('up-progress').classList.remove('show');
          UP.reset();
          if (APP.user && APP.user.master === true) APP.nav('dashboard');
        }, 2200);
        return;
      }
      var entry = UP.entries[done];
      var pct   = Math.round((done / total) * 88);
      document.getElementById('up-prog-fill').style.width = pct + '%';
      document.getElementById('up-prog-pct').textContent  = pct + '%';
      document.getElementById('up-prog-msg').textContent  = 'Guardando ' + (done+1) + ' de ' + total + '…';

      UP._saveArea(entry.area.trim()); // Guardar en historial

      UP._readB64(entry.files, function (filesData) {
        API.upload(filesData, {
          dni:              entry.dniData.dni,
          nombre:           entry.dniData.nombre,
          cargo:            entry.dniData.cargo || '',
          area:             entry.area.trim(),
          fechaHerramienta: entry.fecha,
          tipo:             entry.tipo,
          cantidad:         entry.files.length,
          evaluado:         entry.evaluado || ''
        }).then(function (res) {
          if (res.ok) { done++; processNext(); }
          else {
            setLoading(btn, false);
            document.getElementById('up-progress').classList.remove('show');
            toast('Error en #' + (done+1) + ': ' + (res.msg || 'Error'), 'error', 4000);
            vibrate([100,50,100]);
          }
        }).catch(function () {
          setLoading(btn, false);
          document.getElementById('up-progress').classList.remove('show');
          toast('Error de conexión en herramienta #' + (done+1), 'error', 4000);
        });
      });
    };
    processNext();
  },

  _readB64: function (files, cb) {
    var res = new Array(files.length), pending = files.length;
    if (!pending) { cb([]); return; }
    files.forEach(function (f, i) {
      var r = new FileReader();
      r.onload = function (e) {
        res[i] = { base64: e.target.result.split(',')[1], mimeType: f.type || 'application/octet-stream', ext: f.name.split('.').pop(), name: f.name };
        if (--pending === 0) cb(res);
      };
      r.readAsDataURL(f);
    });
  },

  // Compatibilidad
  buildTipos: function () {},

  // Utilidad: ¿hay datos sin guardar?
  hasUnsavedData: function () {
    return UP.entries && UP.entries.some(function (e) {
      return e.dniData || e.tipo || e.files.length > 0;
    });
  }
};
