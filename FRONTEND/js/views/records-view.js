// ═══════════════════════════════════════════════════════════════
//  RECORDS VIEW
// ═══════════════════════════════════════════════════════════════

var REC = {
  _all:            [],
  _filtered:       [],
  _cargosSelected: [],

  load: function () {
    if (!APP.user) return;
    if (APP.user.master !== true) { APP.nav('upload'); return; }

    var tipSel = document.getElementById('rec-tipo');
    if (tipSel && tipSel.options.length === 1 && APP.tipos.length) {
      APP.tipos.forEach(function (t) {
        var nombre = typeof t === 'object' ? t.nombre : t;
        var o = document.createElement('option'); o.value = nombre; o.textContent = nombre;
        tipSel.appendChild(o);
      });
    }

    REC._cargosSelected = [];
    REC._updateCargoLabel();
    REC.skeleton();
    document.getElementById('rec-count').textContent = 'Cargando…';

    API.registros(APP.user.dni, {})
      .then(function (data) {
        REC._all = Array.isArray(data) ? data : [];
        REC.applyFilters();
      })
      .catch(function () {
        toast('Error al cargar registros', 'error');
        REC.skeleton(false);
      });
  },

  skeleton: function (show) {
    if (show === false) {
      document.getElementById('rec-list').innerHTML =
        '<div class="empty-state"><span class="material-icons">wifi_off</span><p>Sin conexión</p></div>';
      return;
    }
    document.getElementById('rec-list').innerHTML =
      '<div class="skel" style="height:90px;border-radius:14px;margin-bottom:10px"></div>'.repeat(4);
  },

  applyFilters: function () {
    var tipo      = (document.getElementById('rec-tipo')         || {}).value || '';
    var evaluador = ((document.getElementById('rec-f-evaluador') || {}).value || '').trim().toLowerCase();
    var evaluado  = ((document.getElementById('rec-f-evaluado')  || {}).value || '').trim().toLowerCase();
    var desde     = (document.getElementById('rec-f-desde')      || {}).value || '';
    var hasta     = (document.getElementById('rec-f-hasta')      || {}).value || '';
    var cargos    = REC._cargosSelected;

    var dDesde = desde ? new Date(desde) : null;
    var dHasta = hasta ? new Date(hasta + 'T23:59:59') : null;

    REC._filtered = REC._all.filter(function (r) {
      if (tipo && r.tipo !== tipo) return false;
      if (evaluador && !(r.nombre||'').toLowerCase().includes(evaluador)) return false;
      if (evaluado && !(r.evaluado||'').toLowerCase().includes(evaluado)) return false;
      if (cargos.length && cargos.indexOf(r.evaluadoCargo || '') === -1) return false;
      if (dDesde || dHasta) {
        var fH = REC._parseDMY(r.fechaHerramienta);
        if (!fH) return false;
        if (dDesde && fH < dDesde) return false;
        if (dHasta && fH > dHasta) return false;
      }
      return true;
    });

    REC.render(REC._filtered);
  },

  clearFilters: function () {
    ['rec-tipo','rec-f-evaluador','rec-f-evaluado','rec-f-desde','rec-f-hasta'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.value = '';
    });
    REC._cargosSelected = [];
    REC._updateCargoLabel();
    REC.applyFilters();
  },

  openCargosPanel: function () {
    var cargos = [];
    REC._all.forEach(function (r) {
      var c = r.evaluadoCargo || '';
      if (cargos.indexOf(c) === -1) cargos.push(c);
    });
    cargos.sort();

    if (!cargos.length) { toast('Sin datos de cargo en los registros', 'warning'); return; }

    var ov = document.createElement('div');
    ov.id = 'rec-cargo-panel';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;display:flex;align-items:flex-end;justify-content:center';

    var selCount = REC._cargosSelected.length;
    var itemsHtml = cargos.map(function (c) {
      var checked = REC._cargosSelected.indexOf(c) !== -1;
      var label   = c || 'Sin cargo';
      return '<label style="display:flex;align-items:center;gap:12px;padding:11px 16px;border-bottom:1px solid var(--border);cursor:pointer;' +
        'background:' + (checked ? '#f0f7ff' : '#fff') + '">' +
        '<input type="checkbox" ' + (checked ? 'checked' : '') + ' onchange="REC._toggleCargo(\'' + c.replace(/'/g,"\\'") + '\',this.checked)"' +
          ' style="width:18px;height:18px;accent-color:var(--primary);flex-shrink:0">' +
        '<span style="font-size:.85rem;font-weight:' + (checked ? '700' : '500') + '">' + label + '</span>' +
        '</label>';
    }).join('');

    ov.innerHTML =
      '<div style="background:var(--bg);border-radius:20px 20px 0 0;width:100%;max-width:480px;max-height:75vh;display:flex;flex-direction:column">' +
        '<div style="padding:14px 16px 10px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);flex-shrink:0">' +
          '<div>' +
            '<div style="font-weight:700;font-size:.95rem">Cargo del evaluado</div>' +
            '<div style="font-size:.72rem;color:var(--text-muted)">Selecciona uno o más cargos</div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;align-items:center">' +
            '<button onclick="REC._clearCargos()" style="background:none;border:none;cursor:pointer;font-size:.72rem;color:var(--primary);font-weight:700">Limpiar</button>' +
            '<button onclick="REC._closeCargosPanel()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);display:flex;align-items:center">' +
              '<span class="material-icons">close</span>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div style="overflow-y:auto;flex:1">' + itemsHtml + '</div>' +
        '<div style="padding:12px 16px;flex-shrink:0">' +
          '<button onclick="REC._closeCargosPanel()" class="btn btn-primary">Aplicar filtro</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov) REC._closeCargosPanel(); });
  },

  _toggleCargo: function (cargo, checked) {
    var idx = REC._cargosSelected.indexOf(cargo);
    if (checked && idx === -1) REC._cargosSelected.push(cargo);
    else if (!checked && idx !== -1) REC._cargosSelected.splice(idx, 1);
    // actualizar color de fila del panel
    var labels = document.querySelectorAll('#rec-cargo-panel label');
    labels.forEach(function (lbl) {
      var cb = lbl.querySelector('input[type=checkbox]');
      if (cb) {
        lbl.style.background = cb.checked ? '#f0f7ff' : '#fff';
        var span = lbl.querySelector('span');
        if (span) span.style.fontWeight = cb.checked ? '700' : '500';
      }
    });
    REC._updateCargoLabel();
    REC.applyFilters();
  },

  _clearCargos: function () {
    REC._cargosSelected = [];
    var labels = document.querySelectorAll('#rec-cargo-panel label');
    labels.forEach(function (lbl) {
      var cb = lbl.querySelector('input[type=checkbox]');
      if (cb) { cb.checked = false; lbl.style.background = '#fff'; }
      var span = lbl.querySelector('span');
      if (span) span.style.fontWeight = '500';
    });
    REC._updateCargoLabel();
    REC.applyFilters();
  },

  _closeCargosPanel: function () {
    var ov = document.getElementById('rec-cargo-panel');
    if (ov) document.body.removeChild(ov);
  },

  _updateCargoLabel: function () {
    var el = document.getElementById('rec-f-cargo-label');
    if (!el) return;
    var n = REC._cargosSelected.length;
    if (n === 0) {
      el.textContent = 'Cargo evdo.';
      el.style.color = 'var(--text-muted)';
      var btn = document.getElementById('rec-f-cargo-btn');
      if (btn) btn.style.borderColor = 'var(--border)';
    } else {
      el.textContent = n === 1 ? REC._cargosSelected[0] || 'Sin cargo' : n + ' cargos';
      el.style.color = 'var(--primary)';
      var btn2 = document.getElementById('rec-f-cargo-btn');
      if (btn2) btn2.style.borderColor = 'var(--primary)';
    }
  },

  _parseDMY: function (s) {
    var p = (s||'').split('/');
    if (p.length !== 3) return null;
    return new Date(parseInt(p[2],10), parseInt(p[1],10)-1, parseInt(p[0],10));
  },

  _typeColor: function (tipo) {
    var c = {
      'OPT':'#4caf50','AUD. IPERC':'#1a237e','AUD. PETAR':'#1565c0',
      'AUD. HABLA FACIL':'#7b1fa2','TALLER PERCEPCION':'#e65100',
      'ORT':'#00838f','VCC':'#2e7d32','EV. EFICACIA':'#c62828','CHARLA':'#f57f17'
    };
    return c[tipo] || '#546e7a';
  },

  render: function (data) {
    var el = document.getElementById('rec-list');
    el.innerHTML = '';
    document.getElementById('rec-count').textContent = data.length + ' registro(s)';

    if (!data.length) {
      el.innerHTML = '<div class="empty-state"><span class="material-icons">search_off</span><p>Sin resultados para los filtros aplicados.</p></div>';
      return;
    }

    data.forEach(function (r, i) {
      var color   = REC._typeColor(r.tipo);
      var isOPT   = r.evaluado && r.evaluado !== 'COMPLETADO';
      var card    = document.createElement('div');

      card.style.cssText =
        'background:#fff;border-radius:12px;margin-bottom:7px;border:1px solid var(--border);' +
        'overflow:hidden;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.06);' +
        'animation:fadeIn .2s ease both;animation-delay:' + Math.min(i * .03, .24) + 's';
      card.onclick = function () { REC.detail(r); };

      card.innerHTML =
        '<div style="display:flex">' +
          '<div style="width:4px;background:' + color + ';flex-shrink:0"></div>' +
          '<div style="padding:8px 11px;flex:1;min-width:0">' +

            /* Fila 1: tipo + fecha ejecución */
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">' +
              '<span style="font-weight:800;font-size:.82rem;color:' + color + ';letter-spacing:.2px">' + r.tipo + '</span>' +
              '<span style="display:flex;align-items:center;gap:2px;font-size:.7rem;color:var(--text-muted);white-space:nowrap">' +
                '<span class="material-icons" style="font-size:.78rem">event</span>' + (r.fechaHerramienta || '—') +
              '</span>' +
            '</div>' +

            /* Fila 2: evaluador */
            '<div style="display:flex;align-items:center;gap:4px;margin-bottom:3px">' +
              '<span style="font-size:.63rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;white-space:nowrap">Eval.</span>' +
              '<span style="font-size:.78rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (r.nombre || '—') + '</span>' +
            '</div>' +

            /* Fila 3: evaluado + cargo */
            (isOPT
              ? '<div style="display:flex;align-items:flex-start;gap:4px;margin-bottom:3px">' +
                  '<span style="font-size:.63rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;white-space:nowrap;padding-top:1px">Evdo.</span>' +
                  '<div style="min-width:0">' +
                    '<div style="font-size:.78rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + r.evaluado + '</div>' +
                    (r.evaluadoCargo
                      ? '<div style="font-size:.68rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + r.evaluadoCargo + '</div>'
                      : '') +
                  '</div>' +
                '</div>'
              : '<div style="margin-bottom:3px"><span style="background:#e8f5e9;color:#2e7d32;font-size:.65rem;font-weight:700;padding:2px 8px;border-radius:99px">COMPLETADO</span></div>'
            ) +

            /* Fila 4: área */
            (r.area
              ? '<div style="margin-top:1px"><span style="font-size:.67rem;background:var(--bg);border:1px solid var(--border);border-radius:5px;padding:1px 7px;color:var(--text-muted)">' + r.area + '</span></div>'
              : '') +

          '</div>' +
        '</div>';

      el.appendChild(card);
    });
  },

  detail: function (r) {
    var links    = r.links   ? r.links.split('\n').filter(Boolean) : [];
    var archivos = r.archivos ? r.archivos.split(', ') : [];
    var color    = REC._typeColor(r.tipo);

    var linksHTML = links.map(function (lk, i) {
      return '<a href="' + lk + '" target="_blank" ' +
        'style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg);border-radius:10px;margin-bottom:6px;text-decoration:none;color:var(--text)">' +
        '<span class="material-icons" style="color:' + color + '">description</span>' +
        '<span style="flex:1;font-size:.82rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (archivos[i] || 'Archivo ' + (i + 1)) + '</span>' +
        '<span class="material-icons" style="color:var(--accent);font-size:1.1rem">open_in_new</span>' +
        '</a>';
    }).join('');

    var fields = [
      ['Apellidos y Nombres', r.nombre||'—'],
      ['DNI',                  r.dni||'—'],
      ['Cargo',                r.cargo||'—'],
      ['Área',                 r.area||'—'],
      ['Fecha Ejecución',      r.fechaHerramienta||'—'],
      ['Fecha Carga',          r.fechaCarga||'—'],
      ['Cantidad Archivos',    String(r.cantidad||links.length)],
      ['Evaluado',             r.evaluado||'COMPLETADO'],
      ['Cargo Evaluado',       r.evaluadoCargo||'—'],
      ['ID Registro',          r.id||'—']
    ];

    document.getElementById('modal-detail-body').innerHTML =
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid var(--border)">' +
        '<div style="background:' + color + ';color:#fff;width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0">' +
          '<span class="material-icons">description</span></div>' +
        '<div><div style="font-weight:800;font-size:1rem;color:' + color + '">' + r.tipo + '</div>' +
        '<div style="font-size:.75rem;color:var(--text-muted)">' + (r.fechaCarga||'') + '</div></div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:14px">' +
        fields.map(function (f) {
          return '<div style="background:var(--bg);border-radius:8px;padding:8px 10px">' +
            '<div style="font-size:.63rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.3px;margin-bottom:2px">' + f[0] + '</div>' +
            '<div style="font-weight:600;font-size:.82rem;word-break:break-word">' + f[1] + '</div></div>';
        }).join('') +
      '</div>' +
      (links.length
        ? '<div style="font-size:.73rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Archivos adjuntos</div>' + linksHTML
        : '');

    document.getElementById('modal-detail').classList.add('open');
    vibrate(30);
  },

  exportXlsx: function () {
    if (typeof XLSX === 'undefined') { toast('Librería Excel no cargada aún, reintenta', 'error'); return; }
    var data = REC._filtered.length > 0 ? REC._filtered : REC._all;
    if (!data.length) { toast('Sin datos para exportar', 'error'); return; }

    var rows = data.map(function (r) {
      return {
        'ID':                  r.id            || '',
        'DNI':                 r.dni           || '',
        'APELLIDOS Y NOMBRES': r.nombre        || '',
        'CARGO':               r.cargo         || '',
        'AREA':                r.area          || '',
        'FECHA HERRAMIENTA':   r.fechaHerramienta || '',
        'FECHA CARGA':         r.fechaCarga    || '',
        'TIPO HERRAMIENTA':    r.tipo          || '',
        'CANTIDAD':            r.cantidad      || '',
        'EVALUADO':            r.evaluado      || '',
        'EVALUADO CARGO':      r.evaluadoCargo || '',
        'ARCHIVOS':            r.archivos      || ''
      };
    });

    var ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      {wch:10},{wch:12},{wch:36},{wch:26},{wch:14},{wch:16},{wch:20},
      {wch:20},{wch:10},{wch:36},{wch:26},{wch:55}
    ];

    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'REGISTRO');
    XLSX.writeFile(wb, 'registros_' + new Date().toISOString().slice(0,10) + '.xlsx');
    toast('Exportado: ' + data.length + ' registros', 'success');
  }
};
