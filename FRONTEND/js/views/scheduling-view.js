// ═══════════════════════════════════════════════════════════════
//  SCHEDULING VIEW — Programación Mensual
// ═══════════════════════════════════════════════════════════════

var SCHED = {
  _data:   [],
  _anio:   new Date().getFullYear(),
  _mes:    new Date().getMonth() + 1,
  _filter: 'todos',   // 'todos' | 'programados' | 'pendientes'

  load: function () {
    SCHED._buildYearOptions();
    var yEl = document.getElementById('sched-year');
    var mEl = document.getElementById('sched-month');
    if (yEl) yEl.value = SCHED._anio;
    if (mEl) mEl.value = String(SCHED._mes).padStart(2, '0');
    SCHED._skeleton();
    API.estadoProgramacion(SCHED._anio, SCHED._mes)
      .then(function (data) {
        SCHED._data = Array.isArray(data) ? data : [];
        SCHED._render();
      })
      .catch(function () { toast('Error al cargar programación', 'error'); });
  },

  refresh: function () {
    var y = parseInt(document.getElementById('sched-year').value) || new Date().getFullYear();
    var m = parseInt(document.getElementById('sched-month').value) || new Date().getMonth() + 1;
    SCHED._anio = y; SCHED._mes = m;
    SCHED._filter = 'todos';
    SCHED.load();
  },

  _buildYearOptions: function () {
    var sel = document.getElementById('sched-year');
    if (!sel || sel.options.length > 1) return;
    var y = new Date().getFullYear();
    for (var i = y; i >= y - 3; i--) {
      var o = document.createElement('option');
      o.value = i; o.textContent = i;
      if (i === y) o.selected = true;
      sel.appendChild(o);
    }
  },

  _skeleton: function () {
    document.getElementById('sched-summary').innerHTML =
      '<div class="skel" style="height:58px;border-radius:12px"></div>';
    document.getElementById('sched-list').innerHTML =
      '<div class="skel" style="height:76px;border-radius:14px;margin-bottom:8px"></div>'.repeat(5);
  },

  _render: function () {
    var data   = SCHED._data;
    var total  = data.length;
    var progr  = data.filter(function (u) { return u.programado; }).length;
    var pend   = total - progr;
    var sinCod = data.filter(function (u) { return !u.codigo; }).length;

    // ── Resumen de contadores ─────────────────────────────────
    document.getElementById('sched-summary').innerHTML =
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">' +
        SCHED._chip('group',           total, 'Total',  'var(--primary)') +
        SCHED._chip('check_circle',    progr, 'Progr.', 'var(--success)') +
        SCHED._chip('pending_actions', pend,  'Pend.',  'var(--warning)') +
      '</div>' +
      (sinCod ? '<div style="margin-top:8px;font-size:.72rem;color:var(--warning);display:flex;align-items:center;gap:4px">' +
        '<span class="material-icons" style="font-size:.9rem">warning</span>' + sinCod + ' usuario(s) sin código asignado</div>' : '');

    // ── Pills de filtro ───────────────────────────────────────
    var filters = [
      { key: 'todos',       label: 'Todos',       count: total, icon: 'group',           color: 'var(--primary)' },
      { key: 'programados', label: 'Programados', count: progr, icon: 'check_circle',    color: 'var(--success)' },
      { key: 'pendientes',  label: 'Pendientes',  count: pend,  icon: 'pending_actions', color: 'var(--warning)' }
    ];
    var pillHtml = '<div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:2px">';
    filters.forEach(function (f) {
      var active = SCHED._filter === f.key;
      pillHtml +=
        '<button onclick="SCHED.setFilter(\'' + f.key + '\')" ' +
          'style="display:inline-flex;align-items:center;gap:4px;white-space:nowrap;' +
          'border:1.5px solid ' + (active ? f.color : 'var(--border)') + ';' +
          'background:' + (active ? f.color : '#fff') + ';' +
          'color:' + (active ? '#fff' : 'var(--text-muted)') + ';' +
          'font-size:.72rem;font-weight:700;padding:5px 12px;border-radius:20px;cursor:pointer;transition:all .15s">' +
          '<span class="material-icons" style="font-size:.8rem">' + f.icon + '</span>' +
          f.label + ' (' + f.count + ')' +
        '</button>';
    });
    pillHtml += '</div>';
    document.getElementById('sched-filter').innerHTML = pillHtml;

    SCHED._applyFilter();
  },

  setFilter: function (f) {
    SCHED._filter = f;
    SCHED._render();
  },

  _applyFilter: function () {
    var listEl = document.getElementById('sched-list');
    var data   = SCHED._data;

    if (!data.length) {
      listEl.innerHTML = '<div class="empty-state"><span class="material-icons">people_outline</span><p>Sin usuarios configurados.</p></div>';
      return;
    }

    // Aplicar filtro activo
    var filtered = data.filter(function (u) {
      if (SCHED._filter === 'programados') return u.programado;
      if (SCHED._filter === 'pendientes')  return !u.programado;
      return true;
    });

    if (!filtered.length) {
      var emptyMsg = SCHED._filter === 'programados' ? 'Ningún usuario programado aún.' : 'Todos los usuarios ya están programados.';
      listEl.innerHTML = '<div class="empty-state"><span class="material-icons">task_alt</span><p>' + emptyMsg + '</p></div>';
      return;
    }

    // Ordenar: pendientes primero (dentro de cada filtro), luego nombre
    var sorted = filtered.slice().sort(function (a, b) {
      if (a.programado !== b.programado) return a.programado ? 1 : -1;
      return (a.nombre || '').localeCompare(b.nombre || '');
    });

    listEl.innerHTML = sorted.map(function (u, idx) {
      var ini = (u.nombre || '').split(' ').slice(0, 2).map(function (w) { return w[0] || ''; }).join('');
      var statusHtml, actionHtml = '';

      if (u.programado) {
        statusHtml = '<span style="display:inline-flex;align-items:center;gap:3px;font-size:.68rem;font-weight:700;color:var(--success);background:#e8f5e9;padding:3px 9px;border-radius:20px">' +
          '<span class="material-icons" style="font-size:.8rem">check_circle</span>' + u.tiposProgramados + ' tipo(s)</span>';
      } else if (!u.codigo) {
        statusHtml = '<span style="font-size:.68rem;font-weight:700;color:#9e9e9e;background:#f5f5f5;padding:3px 9px;border-radius:20px">Sin código</span>';
        actionHtml = '<button onclick="APP.nav(\'users\')" style="background:none;border:1px solid var(--primary);color:var(--primary);border-radius:8px;padding:5px 10px;font-size:.72rem;font-weight:700;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:3px">' +
          '<span class="material-icons" style="font-size:.82rem">edit</span>Asignar</button>';
      } else {
        statusHtml = '<span style="display:inline-flex;align-items:center;gap:3px;font-size:.68rem;font-weight:700;color:var(--warning);background:#fff3e0;padding:3px 9px;border-radius:20px">' +
          '<span class="material-icons" style="font-size:.8rem">pending_actions</span>Pendiente</span>';
        actionHtml = '<button id="sched-btn-' + idx + '" onclick="SCHED.programar(this,\'' + u.dni + '\',\'' + u.codigo + '\')" ' +
          'style="background:var(--primary);color:#fff;border:none;border-radius:8px;padding:6px 11px;font-size:.72rem;font-weight:700;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:3px">' +
          '<span class="material-icons" style="font-size:.82rem">add_task</span>Programar</button>';
      }

      var codigoBadge = u.codigo ?
        '<span style="background:var(--primary);color:#fff;font-size:.6rem;font-weight:800;padding:2px 8px;border-radius:20px">' + u.codigo + '</span>' : '';

      return '<div class="card" style="margin-bottom:8px;padding:12px">' +
        '<div style="display:flex;align-items:center;gap:10px">' +
          '<div class="user-avatar" style="width:38px;height:38px;font-size:.8rem;flex-shrink:0' + (u.programado ? ';background:var(--success)' : '') + '">' + ini + '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:5px">' +
              '<span style="font-weight:700;font-size:.83rem">' + (u.nombre || '—') + '</span>' +
              codigoBadge +
            '</div>' +
            statusHtml +
          '</div>' +
          (actionHtml ? '<div style="flex-shrink:0">' + actionHtml + '</div>' : '') +
        '</div>' +
      '</div>';
    }).join('');
  },

  _chip: function (icon, val, lbl, color) {
    return '<div style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:10px 6px;text-align:center">' +
      '<div style="font-size:1.15rem;font-weight:900;color:' + color + '">' + val + '</div>' +
      '<div style="font-size:.6rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-top:2px">' + lbl + '</div>' +
    '</div>';
  },

  programar: function (btn, dni, codigo) {
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="btn-spinner"></span>'; }
    API.programarMes(dni, codigo, SCHED._anio, SCHED._mes)
      .then(function (res) {
        if (res.ok) {
          toast(res.added + ' tipos programados', 'success', 2500);
          SCHED.load();
        } else {
          toast(res.msg || 'Error', 'error');
          if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons" style="font-size:.82rem">add_task</span>Programar'; }
        }
      })
      .catch(function () {
        toast('Error de conexión', 'error');
        if (btn) { btn.disabled = false; }
      });
  },

  programarTodos: function () {
    var btn = document.getElementById('sched-prog-todos-btn');
    setLoading(btn, true);
    API.programarTodos(SCHED._anio, SCHED._mes)
      .then(function (res) {
        setLoading(btn, false);
        if (res.ok) {
          var msg = res.added + ' filas creadas';
          if (res.skipped) msg += ', ' + res.skipped + ' ya programados';
          toast(msg, 'success', 3500);
          SCHED.load();
        } else {
          toast(res.msg || 'Error', 'error');
        }
      })
      .catch(function () {
        setLoading(btn, false);
        toast('Error de conexión', 'error');
      });
  }
};
