// ═══════════════════════════════════════════════════════════════
//  DASHBOARD VIEW
// ═══════════════════════════════════════════════════════════════

var DASH = {
  load: function () {
    if (!APP.user) return;
    if (APP.user.master !== true) { APP.nav('upload'); return; }
    DASH.skeleton();
    document.getElementById('dash-nombre').textContent  = APP.user.nombre;
    document.getElementById('dash-cargo').textContent   = APP.user.cargo   || '';
    document.getElementById('dash-empresa').textContent = APP.user.empresa || '';
    var ini = APP.user.nombre.split(' ').slice(0,2).map(function(w){return w[0]||'';}).join('');
    document.getElementById('dash-avatar').textContent  = ini;
    document.getElementById('dash-title').textContent   = APP.user.master ? 'Panel Master' : 'Mi Panel';
    document.getElementById('dash-logout-btn').style.display = 'flex';
    var fAnio = (document.getElementById('filter-anio') || {}).value || '';
    var fMes  = (document.getElementById('filter-mes')  || {}).value || '';
    if (APP.user.master) {
      document.getElementById('dash-avatar').style.background  = '#b71c1c';
      document.getElementById('dash-master-badge').style.display = 'inline-block';
      document.getElementById('dash-settings-btn').style.display = 'flex';
      document.getElementById('dash-master-filters').style.display = 'block';
      document.getElementById('dash-personas-title').style.display = 'flex';
      document.getElementById('dash-recalc-btn').style.display = 'flex';
      DASH.buildYearFilter();
      API.programados(APP.user.dni, fAnio, fMes).then(DASH.renderPersonas).catch(function () {
        document.getElementById('dash-personas').innerHTML = '';
      });
    }
    API.resumen(APP.user.dni, fAnio, fMes)
      .then(DASH.render)
      .catch(function () { toast('Error al cargar datos', 'error'); });
  },

  renderPersonas: function (rows) {
    var el = document.getElementById('dash-personas');
    if (!el) return;
    if (!rows || !rows.length) {
      el.innerHTML = '<div style="padding:0 0 8px"><div class="empty-state" style="margin:0"><span class="material-icons">group</span><p>Sin programación por persona.</p></div></div>';
      return;
    }
    var byUser = {};
    rows.forEach(function (r) {
      var key = r.nombre || r.dni;
      if (!byUser[key]) byUser[key] = { nombre: key, total: 0, ejec: 0 };
      byUser[key].total += (r.programados || 0);
      byUser[key].ejec  += (r.ejecutados  || 0);
    });
    var html = '';
    Object.keys(byUser).sort().forEach(function (key) {
      var u   = byUser[key];
      var pct = u.total > 0 ? Math.round((u.ejec / u.total) * 100) : 0;
      var cl  = pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--primary)' : 'var(--warning)';
      var ini = key.split(' ').slice(0,2).map(function(w){return w[0]||'';}).join('');
      html +=
        '<div class="card" style="margin-bottom:8px">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
            '<div class="user-avatar" style="width:30px;height:30px;font-size:.72rem;flex-shrink:0">' + ini + '</div>' +
            '<div style="flex:1;min-width:0">' +
              '<div style="font-weight:700;font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + u.nombre + '</div>' +
              '<div style="font-size:.7rem;color:var(--text-muted)">' + u.ejec + ' / ' + u.total + ' ejecutados</div>' +
            '</div>' +
            '<span style="font-size:.82rem;font-weight:800;color:' + cl + ';flex-shrink:0">' + pct + '%</span>' +
          '</div>' +
          '<div class="progress-bar"><div class="progress-fill persona-bar" style="width:0%;background:' + cl + '" data-t="' + pct + '"></div></div>' +
        '</div>';
    });
    el.innerHTML = html;
    setTimeout(function () {
      document.querySelectorAll('.persona-bar').forEach(function (b) { b.style.width = b.dataset.t + '%'; });
    }, 200);
  },

  skeleton: function () {
    document.getElementById('dash-stats').innerHTML =
      '<div class="skel" style="height:72px;border-radius:14px"></div>'.repeat(4);
    document.getElementById('dash-tipos').innerHTML   = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' + '<div class="skel" style="height:68px;border-radius:14px"></div>'.repeat(4) + '</div>';
    document.getElementById('dash-recientes').innerHTML = '<div class="skel" style="height:70px;border-radius:14px;margin-bottom:8px"></div>'.repeat(3);
  },

  buildYearFilter: function () {
    var sel = document.getElementById('filter-anio');
    if (sel.options.length > 1) return;
    var now = new Date();
    var y = now.getFullYear();
    for (var i = y; i >= y - 4; i--) {
      var o = document.createElement('option'); o.value = i; o.textContent = i;
      if (i === y) o.selected = true;
      sel.appendChild(o);
    }
    // Mes actual por defecto
    var mesEl = document.getElementById('filter-mes');
    if (mesEl && !mesEl.value) mesEl.value = String(now.getMonth() + 1).padStart(2, '0');
  },

  render: function (data) {
    var pct   = data.porcentaje || 0;
    var color = pct >= 80 ? 'green' : pct >= 50 ? 'blue' : 'orange';
    document.getElementById('dash-stats').innerHTML =
      DASH.statCard('blue',  '📋', 'sv-prog', 'Programados') +
      DASH.statCard('green', '✅', 'sv-ejec', 'Ejecutados')  +
      DASH.statCard('orange','⏳', 'sv-pend', 'Pendientes')  +
      `<div class="stat-card ${color}">
        <span class="stat-icon">📊</span>
        <div class="stat-val" id="sv-pct">0%</div>
        <div class="stat-lbl">Avance</div>
        <div class="progress-bar" style="margin-top:5px;height:5px"><div class="progress-fill" id="sv-bar" style="width:0%"></div></div>
      </div>`;

    setTimeout(function () {
      countUp(document.getElementById('sv-prog'), data.totalProgramados);
      countUp(document.getElementById('sv-ejec'), data.totalEjecutados);
      countUp(document.getElementById('sv-pend'), data.totalPendientes);
      DASH.animPct(pct);
    }, 80);

    // Por tipo
    var tipos  = data.porTipo || {};
    var keys   = Object.keys(tipos);
    var tiposEl = document.getElementById('dash-tipos');
    tiposEl.innerHTML = '';
    if (!keys.length) {
      tiposEl.innerHTML = '<div class="empty-state"><span class="material-icons">inventory_2</span><p>Sin metas programadas. Completa la pestaña PROGRAMADOS.</p></div>';
    } else {
      tiposEl.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px';
      keys.forEach(function (tipo, i) {
        var t   = tipos[tipo];
        var tpc = t.programados > 0 ? Math.round((t.ejecutados / t.programados) * 100) : 0;
        var cl  = tpc >= 80 ? 'var(--success)' : tpc >= 50 ? 'var(--primary)' : 'var(--warning)';
        var div = document.createElement('div');
        div.className = 'card'; div.style.animationDelay = (i*.05)+'s'; div.style.marginBottom = '0';
        div.innerHTML =
          `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;gap:4px">
            <div style="display:flex;align-items:center;gap:5px;min-width:0">
              <div style="width:8px;height:8px;border-radius:2px;flex-shrink:0;background:${cl}"></div>
              <span style="font-weight:700;font-size:.76rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${tipo}</span>
            </div>
            <span style="font-size:.7rem;color:var(--text-muted);flex-shrink:0">${t.ejecutados}/${t.programados}</span>
          </div>
          <div class="progress-bar" style="height:6px"><div class="progress-fill tipo-bar" style="width:0%;background:${cl}" data-t="${tpc}"></div></div>
          <div style="text-align:right;font-size:.68rem;font-weight:700;color:${cl};margin-top:3px">${tpc}%</div>`;
        tiposEl.appendChild(div);
      });
      setTimeout(function () {
        document.querySelectorAll('.tipo-bar').forEach(function (b) { b.style.width = b.dataset.t + '%'; });
      }, 200);
    }

    // Últimos registros
    var recEl = document.getElementById('dash-recientes');
    recEl.innerHTML = '';
    var recs  = data.ultimosRegistros || [];
    if (!recs.length) {
      recEl.innerHTML = '<div class="empty-state"><span class="material-icons">folder_open</span><p>Sin registros. Usa + para subir.</p></div>';
    } else {
      recs.forEach(function (r, i) {
        var links = r.links ? r.links.split('\n').filter(Boolean) : [];
        var div = document.createElement('div');
        div.className = 'rec-card'; div.style.animationDelay = (i*.06)+'s';
        div.onclick = function () { APP.nav('records'); };
        div.innerHTML =
          `<div style="display:flex;justify-content:space-between;gap:8px">
            <div style="min-width:0">
              <div style="font-weight:700;font-size:.88rem">${r.tipo}${links.length>1?` <span class="badge-n">${links.length}</span>`:''}</div>
              <div style="font-size:.75rem;color:var(--text-muted);margin-top:2px">${r.fechaHerramienta}${r.area?' · '+r.area:''}</div>
              ${r.nombre?`<div style="font-size:.72rem;color:var(--text-muted);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Eval.: ${r.nombre}</div>`:''}

            </div>
            <span class="badge-status badge-completado" style="white-space:normal;max-width:45%;text-align:right;font-size:.5rem;font-weight:700;letter-spacing:0;line-height:1.3;word-break:break-word;flex-shrink:0">${(!r.evaluado || r.evaluado === 'COMPLETADO') ? 'S/N' : r.evaluado}</span>
          </div>` +
          (links[0] ? `<a href="${links[0]}" target="_blank" onclick="event.stopPropagation()" class="file-link">
            <span class="material-icons" style="font-size:.9rem">open_in_new</span>Ver archivo</a>` : '');
        recEl.appendChild(div);
      });
    }
  },

  recalcular: function () {
    var anio = document.getElementById('filter-anio').value;
    var mes  = document.getElementById('filter-mes').value;
    var C    = 339.3; // 2π × r54

    // ── Overlay ──────────────────────────────────────────────
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(26,35,126,.92);z-index:9999;' +
      'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;' +
      'opacity:0;transition:opacity .2s';
    ov.innerHTML =
      '<svg width="140" height="140" viewBox="0 0 140 140">' +
        '<circle cx="70" cy="70" r="54" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="10"/>' +
        '<circle id="rc-ring" cx="70" cy="70" r="54" fill="none" stroke="#fff" stroke-width="10"' +
          ' stroke-linecap="round" stroke-dasharray="' + C + '" stroke-dashoffset="' + C + '"' +
          ' transform="rotate(-90 70 70)" style="transition:stroke-dashoffset .35s ease"/>' +
        '<text x="70" y="66" text-anchor="middle" dominant-baseline="central"' +
          ' fill="#fff" font-size="26" font-weight="800" id="rc-num">0%</text>' +
        '<text x="70" y="90" text-anchor="middle" fill="rgba(255,255,255,.55)" font-size="10">AVANCE</text>' +
      '</svg>' +
      '<div style="color:#fff;font-size:1.05rem;font-weight:700">Recalculando programados…</div>' +
      '<div id="rc-sub" style="color:rgba(255,255,255,.65);font-size:.82rem">Verificando registros en el Sheets</div>';
    document.body.appendChild(ov);
    requestAnimationFrame(function () { ov.style.opacity = '1'; });

    // ── Helpers ───────────────────────────────────────────────
    var curPct = 0;
    function setRing(p) {
      curPct = Math.min(Math.max(p, 0), 100);
      var ring = document.getElementById('rc-ring');
      var num  = document.getElementById('rc-num');
      if (ring) ring.setAttribute('stroke-dashoffset', C * (1 - curPct / 100));
      if (num)  num.textContent = Math.round(curPct) + '%';
    }
    function setSub(txt, color) {
      var el = document.getElementById('rc-sub');
      if (el) { el.textContent = txt; if (color) el.style.color = color; }
    }
    function closeOv(delay) {
      setTimeout(function () {
        ov.style.opacity = '0';
        setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 320);
      }, delay || 0);
    }
    function animTo(target, ms, onDone) {
      var from = curPct, t0 = null;
      (function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / (ms || 500), 1);
        setRing(from + (target - from) * (1 - Math.pow(1 - p, 2)));
        if (p < 1) requestAnimationFrame(step);
        else if (onDone) onDone();
      })(performance.now());
    }

    // ── Simulación 0 → 82% mientras espera respuesta ─────────
    var iv = setInterval(function () {
      var step = (82 - curPct) * 0.045 + 0.4;
      setRing(curPct + step);
      if (curPct >= 82) clearInterval(iv);
    }, 130);

    // ── Llamada al backend ────────────────────────────────────
    API.recalcular(anio, mes)
      .then(function (res) {
        clearInterval(iv);
        if (res.ok) {
          setSub(res.updated + ' filas recalculadas correctamente', 'rgba(165,214,167,.95)');
          animTo(100, 550, function () {
            var ring = document.getElementById('rc-ring');
            if (ring) ring.setAttribute('stroke', '#a5d6a7');
            closeOv(800);
            setTimeout(function () { DASH.load(); }, 1200);
          });
        } else {
          setSub('Error: ' + (res.msg || 'Sin detalle'), '#ef9a9a');
          animTo(0, 400);
          closeOv(2200);
        }
      })
      .catch(function () {
        clearInterval(iv);
        setSub('Error de conexión', '#ef9a9a');
        closeOv(2000);
      });
  },

  statCard: function (cls, icon, id, lbl) {
    return `<div class="stat-card ${cls}"><span class="stat-icon">${icon}</span><div class="stat-val" id="${id}">0</div><div class="stat-lbl">${lbl}</div></div>`;
  },

  animPct: function (target) {
    var el = document.getElementById('sv-pct'), bar = document.getElementById('sv-bar');
    if (!el || !bar) return;
    var t0 = null;
    (function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts-t0)/900, 1), e = 1-Math.pow(1-p,3), v = Math.round(e*target);
      el.textContent = v+'%'; bar.style.width = v+'%';
      if (p < 1) requestAnimationFrame(step);
    })(performance.now());
  }
};
