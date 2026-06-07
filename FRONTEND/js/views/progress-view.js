// ═══════════════════════════════════════════════════════════════
//  PROGRESS VIEW — Avance mensual del operario
// ═══════════════════════════════════════════════════════════════

var PROG = {
  _meses: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre'],

  load: function () {
    if (!APP.user) return;
    var el = document.getElementById('prog-content');
    el.innerHTML = '<div class="skel" style="height:80px;border-radius:14px;margin-bottom:8px"></div>'.repeat(3);
    var now  = new Date();
    var anio = String(now.getFullYear());
    var mes  = String(now.getMonth() + 1).padStart(2, '0');
    PROG._anio = anio;
    PROG._mes  = mes;
    API.resumen(APP.user.dni, anio, mes)
      .then(PROG.render)
      .catch(function () {
        document.getElementById('prog-content').innerHTML =
          '<div class="empty-state"><span class="material-icons">error_outline</span><p>Error al cargar tu avance.</p></div>';
      });
  },

  render: function (data) {
    var el   = document.getElementById('prog-content');
    var tipos = data.porTipo || {};
    var keys  = Object.keys(tipos);
    var ini   = APP.user.nombre.split(' ').slice(0,2).map(function(w){return w[0]||'';}).join('');
    var pct   = data.porcentaje || 0;
    var clr   = pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--primary)' : 'var(--warning)';
    var mesNombre = PROG._meses[(parseInt(PROG._mes, 10) - 1)] || '';
    var periodoLabel = mesNombre + ' ' + PROG._anio;

    var html =
      '<div style="background:linear-gradient(135deg,var(--primary),var(--primary-light));border-radius:var(--r);padding:12px 14px;color:#fff;display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
        '<div class="user-avatar" style="width:38px;height:38px;font-size:.95rem;background:rgba(255,255,255,.2);flex-shrink:0">' + ini + '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-weight:700;font-size:.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + APP.user.nombre + '</div>' +
          '<div style="font-size:.73rem;opacity:.8;margin-top:1px">Avance de herramientas</div>' +
        '</div>' +
        '<div style="text-align:right;flex-shrink:0">' +
          '<div style="font-size:1.5rem;font-weight:800;color:' + (pct >= 80 ? '#a5d6a7' : pct >= 50 ? '#90caf9' : '#ffcc02') + '">' + pct + '%</div>' +
          '<div style="font-size:.68rem;opacity:.75">avance</div>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:6px;margin-bottom:12px;padding:0 2px">' +
        '<span class="material-icons" style="font-size:1rem;color:var(--primary)">calendar_month</span>' +
        '<span style="font-size:.82rem;font-weight:700;color:var(--primary)">Programación de ' + periodoLabel + '</span>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">' +
        '<div class="stat-card blue" style="padding:10px 6px">' +
          '<span class="stat-icon" style="font-size:1.1rem">📋</span>' +
          '<div class="stat-val" style="font-size:1.3rem">' + (data.totalProgramados||0) + '</div>' +
          '<div class="stat-lbl">Prog.</div>' +
        '</div>' +
        '<div class="stat-card green" style="padding:10px 6px">' +
          '<span class="stat-icon" style="font-size:1.1rem">✅</span>' +
          '<div class="stat-val" style="font-size:1.3rem">' + (data.totalEjecutados||0) + '</div>' +
          '<div class="stat-lbl">Ejec.</div>' +
        '</div>' +
        '<div class="stat-card orange" style="padding:10px 6px">' +
          '<span class="stat-icon" style="font-size:1.1rem">⏳</span>' +
          '<div class="stat-val" style="font-size:1.3rem">' + (data.totalPendientes||0) + '</div>' +
          '<div class="stat-lbl">Pend.</div>' +
        '</div>' +
      '</div>';

    if (!keys.length) {
      html += '<div class="empty-state"><span class="material-icons">inventory_2</span><p>Sin programación asignada.<br>Consulta con tu supervisor.</p></div>';
    } else {
      html += '<div style="font-size:.74rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Avance por tipo</div>';
      keys.forEach(function (tipo) {
        var t   = tipos[tipo];
        var tpc = t.programados > 0 ? Math.round((t.ejecutados / t.programados) * 100) : 0;
        var cl  = tpc >= 80 ? 'var(--success)' : tpc >= 50 ? 'var(--primary)' : 'var(--warning)';
        html +=
          '<div class="card" style="margin-bottom:8px">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
              '<div style="display:flex;align-items:center;gap:6px">' +
                '<div style="width:9px;height:9px;border-radius:2px;background:' + cl + ';flex-shrink:0"></div>' +
                '<span style="font-weight:700;font-size:.85rem">' + tipo + '</span>' +
              '</div>' +
              '<span style="font-size:.78rem;color:var(--text-muted)">' + t.ejecutados + ' / ' + t.programados + '</span>' +
            '</div>' +
            '<div class="progress-bar"><div class="progress-fill tipo-prog-bar" style="width:0%;background:' + cl + '" data-t="' + tpc + '"></div></div>' +
            '<div style="text-align:right;font-size:.72rem;color:var(--text-muted);margin-top:3px">' + tpc + '%</div>' +
          '</div>';
      });
    }

    el.innerHTML = html;
    setTimeout(function () {
      document.querySelectorAll('.tipo-prog-bar').forEach(function (b) { b.style.width = b.dataset.t + '%'; });
    }, 120);
  }
};
