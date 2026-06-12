// ═══════════════════════════════════════════════════════════════
//  PERSONAS AVANCE VIEW — Avance por Evaluador (SUPERVISOR)
//  Evaluador = usuario con ROL SUPERVISOR
//  Avance    = ejecutados / programados del CODIGO que supervisa
// ═══════════════════════════════════════════════════════════════

var PERSONAS_VIEW = {
  _prog:     [],      // filas de programados
  _usuarios: [],      // usuarios master (para filtrar supervisores)
  _anios:    [],
  _codigos:  [],
  _lastList: [],
  _ft:       null,    // debounce timer

  load: function () {
    var listEl = document.getElementById('pav-list');
    if (listEl) listEl.innerHTML = [1,2,3,4].map(function () {
      return '<div class="skel" style="height:72px;border-radius:14px;margin-bottom:8px"></div>';
    }).join('');

    var anioEl = document.getElementById('pav-anio');
    var anio = (anioEl && anioEl.value) ? anioEl.value : new Date().getFullYear();

    Promise.all([
      API.usuariosMaster(),
      API.programados(APP.user.dni, anio, '')
    ]).then(function (res) {
      PERSONAS_VIEW._usuarios = Array.isArray(res[0]) ? res[0] : [];
      PERSONAS_VIEW._prog     = Array.isArray(res[1]) ? res[1] : [];
      PERSONAS_VIEW._buildMeta();
      PERSONAS_VIEW.applyFilters(true);
    }).catch(function () { toast('Error al cargar avance', 'error'); });
  },

  _buildMeta: function () {
    var seenA = {}, seenC = {};
    PERSONAS_VIEW._anios   = [];
    PERSONAS_VIEW._codigos = [];

    PERSONAS_VIEW._prog.forEach(function (r) {
      var a = String(r.anio || '').trim();
      if (a && !seenA[a]) { seenA[a] = true; PERSONAS_VIEW._anios.push(a); }
      var c = String(r.codigo || '').trim().toUpperCase();
      if (c && !seenC[c]) { seenC[c] = true; PERSONAS_VIEW._codigos.push(c); }
    });
    PERSONAS_VIEW._anios.sort().reverse();
    PERSONAS_VIEW._codigos.sort();

    var cy = String(new Date().getFullYear());
    var anioEl = document.getElementById('pav-anio');
    if (anioEl) {
      var prevA = anioEl.value || cy;
      if (!seenA[cy]) { seenA[cy] = true; PERSONAS_VIEW._anios.unshift(cy); }
      anioEl.innerHTML = '';
      PERSONAS_VIEW._anios.forEach(function (a) {
        var o = document.createElement('option'); o.value = a; o.textContent = a;
        if (a === prevA) o.selected = true;
        anioEl.appendChild(o);
      });
      if (!anioEl.value && PERSONAS_VIEW._anios.length) anioEl.value = PERSONAS_VIEW._anios[0];
    }

    var selC = document.getElementById('pav-codigo');
    if (selC) {
      var prevC = selC.value;
      selC.innerHTML = '<option value="">Todos</option>';
      PERSONAS_VIEW._codigos.forEach(function (c) {
        var o = document.createElement('option'); o.value = c; o.textContent = c;
        if (c === prevC) o.selected = true;
        selC.appendChild(o);
      });
    }

    var mesEl = document.getElementById('pav-mes');
    if (mesEl && !mesEl.value) mesEl.value = String(new Date().getMonth() + 1);
  },

  applyFilters: function (immediate) {
    if (!immediate) {
      clearTimeout(PERSONAS_VIEW._ft);
      PERSONAS_VIEW._ft = setTimeout(function () { PERSONAS_VIEW._doFilter(); }, 180);
      return;
    }
    PERSONAS_VIEW._doFilter();
  },

  _doFilter: function () {
    var anioF = parseInt((document.getElementById('pav-anio')      || {}).value || '0', 10);
    var mesF  = parseInt((document.getElementById('pav-mes')       || {}).value || '0', 10);
    var codF  = ((document.getElementById('pav-codigo')     || {}).value || '').trim().toUpperCase();
    var evalF = ((document.getElementById('pav-eval-input') || {}).value || '').trim().toLowerCase();

    // Acumular programados por CODIGO (con filtros de año/mes/código)
    var byCode = {};
    PERSONAS_VIEW._prog.forEach(function (r) {
      if (anioF && parseInt(r.anio, 10) !== anioF) return;
      if (mesF  && parseInt(r.mes,  10) !== mesF)  return;
      var cod = String(r.codigo || '').toUpperCase();
      if (!cod) return;
      if (codF && cod !== codF) return;
      if (!byCode[cod]) byCode[cod] = { prog: 0, ejec: 0, rows: [] };
      byCode[cod].prog += parseInt(r.programados, 10) || 0;
      byCode[cod].ejec += parseInt(r.ejecutados,  10) || 0;
      byCode[cod].rows.push(r);
    });

    // Supervisores = usuarios con ROL SUPERVISOR activos
    var list = [];
    PERSONAS_VIEW._usuarios.forEach(function (u) {
      var rol = String(u.rol || '').toUpperCase();
      if (rol !== 'SUPERVISOR') return;
      if (!u.activo) return;
      var cod = String(u.codigo || '').toUpperCase();
      if (codF && cod !== codF) return;
      if (evalF && u.nombre.toLowerCase().indexOf(evalF) < 0) return;
      var stats = byCode[cod] || { prog: 0, ejec: 0, rows: [] };
      list.push({
        nombre: u.nombre,
        codigo: cod,
        ejec:   stats.ejec,
        prog:   stats.prog,
        rows:   stats.rows
      });
    });

    // Ordenar por % desc, luego nombre
    list.sort(function (a, b) {
      var pa = a.prog > 0 ? a.ejec / a.prog : 0;
      var pb = b.prog > 0 ? b.ejec / b.prog : 0;
      if (pb !== pa) return pb - pa;
      return a.nombre.localeCompare(b.nombre);
    });

    PERSONAS_VIEW._lastList = list;
    PERSONAS_VIEW._renderList(list);
  },

  _renderList: function (list) {
    var el = document.getElementById('pav-list');
    if (!el) return;
    if (!list.length) {
      el.innerHTML = '<div class="empty-state"><span class="material-icons">supervisor_account</span><p>Sin supervisores para los filtros.</p></div>';
      return;
    }
    var html = '';
    list.forEach(function (ev, rank) {
      var pct = ev.prog > 0 ? Math.round((ev.ejec / ev.prog) * 100) : 0;
      var cl  = pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--primary)' : 'var(--warning)';
      var ini = ev.nombre.split(' ').slice(0, 2).map(function (w) { return w[0] || ''; }).join('');

      html +=
        '<div class="card" style="margin-bottom:10px;padding:14px 14px 10px;cursor:pointer" onclick="PERSONAS_VIEW.openDetail(' + rank + ')">' +
          '<div style="display:flex;align-items:center;gap:10px">' +
            '<div style="width:22px;height:22px;border-radius:50%;background:' + cl + ';color:#fff;font-size:.58rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">' + (rank + 1) + '</div>' +
            '<div class="user-avatar" style="width:40px;height:40px;font-size:.82rem;flex-shrink:0">' + ini + '</div>' +
            '<div style="flex:1;min-width:0">' +
              '<div style="font-weight:700;font-size:.86rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + ev.nombre + '</div>' +
              (ev.codigo
                ? '<div style="font-size:.68rem;margin-top:2px"><span style="background:var(--primary);color:#fff;font-size:.6rem;font-weight:800;padding:1px 7px;border-radius:20px">' + ev.codigo + '</span></div>'
                : '<div style="font-size:.67rem;color:var(--text-muted);margin-top:2px">Sin código asignado</div>') +
              '<div style="font-size:.67rem;color:var(--text-muted);margin-top:3px">' + ev.ejec + ' ejec. · ' + ev.prog + ' prog.</div>' +
            '</div>' +
            '<div style="font-size:1.1rem;font-weight:900;color:' + cl + ';flex-shrink:0">' + pct + '%</div>' +
          '</div>' +
          '<div class="progress-bar" style="margin-top:10px"><div class="progress-fill pav-bar" style="width:0%;background:' + cl + '" data-t="' + pct + '"></div></div>' +
        '</div>';
    });
    el.innerHTML = html;
    setTimeout(function () {
      document.querySelectorAll('.pav-bar').forEach(function (b) { b.style.width = b.dataset.t + '%'; });
    }, 150);
  },

  openDetail: function (idx) {
    var ev = PERSONAS_VIEW._lastList[idx];
    if (!ev) return;

    var meses = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    var pct = ev.prog > 0 ? Math.round((ev.ejec / ev.prog) * 100) : 0;
    var cl  = pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--primary)' : 'var(--warning)';

    // Agrupar rows por usuario
    var byUser = {};
    ev.rows.forEach(function (r) {
      if (!byUser[r.dni]) byUser[r.dni] = { nombre: r.nombre || r.dni, tipos: [] };
      byUser[r.dni].tipos.push(r);
    });

    var rows = '';
    Object.keys(byUser).forEach(function (dni) {
      var u = byUser[dni];
      rows +=
        '<div style="padding:9px 0;border-bottom:1px solid var(--border)">' +
          '<div style="font-size:.78rem;font-weight:700;margin-bottom:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + u.nombre + '</div>';
      u.tipos.forEach(function (r) {
        var tc = (r.ejecutados >= r.programados && r.programados > 0) ? 'var(--success)' : r.ejecutados > 0 ? 'var(--primary)' : 'var(--warning)';
        rows +=
          '<div style="display:flex;justify-content:space-between;align-items:center;font-size:.71rem;padding:2px 0">' +
            '<span style="color:var(--text-muted)">' + r.tipo + ' · ' + (meses[parseInt(r.mes, 10)] || r.mes) + '</span>' +
            '<span style="font-weight:800;color:' + tc + '">' + r.ejecutados + ' / ' + r.programados + '</span>' +
          '</div>';
      });
      rows += '</div>';
    });
    if (!rows) {
      rows = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:.8rem">Sin programados para este período.</div>';
    }

    document.getElementById('pav-modal-name').textContent  = ev.nombre;
    document.getElementById('pav-modal-cargo').textContent = 'SUPERVISOR' + (ev.codigo ? ' · ' + ev.codigo : '');
    document.getElementById('pav-modal-pct').textContent   = pct + '%';
    document.getElementById('pav-modal-pct').style.color   = cl;
    document.getElementById('pav-modal-total').textContent = ev.ejec + ' ejecutados · ' + ev.prog + ' programados';
    document.getElementById('pav-modal-rows').innerHTML    = rows;
    document.getElementById('modal-eval-detail').classList.add('open');
  }
};
