// ═══════════════════════════════════════════════════════════════
//  RECORDS VIEW
// ═══════════════════════════════════════════════════════════════

var REC = {
  _all: [],

  load: function () {
    if (!APP.user) return;
    if (APP.user.master !== true) { APP.nav('upload'); return; }
    document.getElementById('rec-export').style.display  = APP.user.master ? 'flex'  : 'none';
    document.getElementById('rec-search-wrap').style.display = APP.user.master ? 'block' : 'none';

    var tipSel = document.getElementById('rec-tipo');
    if (tipSel.options.length === 1 && APP.tipos.length) {
      APP.tipos.forEach(function (t) { var o = document.createElement('option'); o.value=t; o.textContent=t; tipSel.appendChild(o); });
    }

    REC.skeleton();
    document.getElementById('rec-count').textContent = 'Cargando…';

    var filtros = { tipo: tipSel.value||null, evaluado: document.getElementById('rec-eval').value||null };
    API.registros(APP.user.dni, filtros)
      .then(function (data) { REC._all = data; REC.filter(); })
      .catch(function () { toast('Error al cargar registros','error'); REC.skeleton(false); });
  },

  skeleton: function (show) {
    if (show === false) { document.getElementById('rec-list').innerHTML = '<div class="empty-state"><span class="material-icons">wifi_off</span><p>Sin conexión</p></div>'; return; }
    document.getElementById('rec-list').innerHTML = '<div class="skel" style="height:70px;border-radius:14px;margin-bottom:8px"></div>'.repeat(4);
  },

  filter: function () {
    var q = ((document.getElementById('rec-search')||{}).value||'').toLowerCase();
    var filtered = REC._all.filter(function (r) {
      return !q || String(r.dni).includes(q) || r.nombre.toLowerCase().includes(q) || (r.area||'').toLowerCase().includes(q);
    });
    REC.render(filtered);
  },

  render: function (data) {
    var el = document.getElementById('rec-list');
    el.innerHTML = '';
    document.getElementById('rec-count').textContent = data.length + ' registro(s)';
    if (!data.length) {
      el.innerHTML = '<div class="empty-state"><span class="material-icons">search_off</span><p>Sin resultados</p></div>'; return;
    }
    data.forEach(function (r, i) {
      var links = r.links ? r.links.split('\n').filter(Boolean) : [];
      var card  = document.createElement('div');
      card.className = 'rec-card'; card.style.animationDelay = Math.min(i*.04,.3)+'s';
      card.onclick = function () { REC.detail(r); };
      card.innerHTML =
        `<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
          <div style="min-width:0;flex:1">
            <div style="font-weight:700;font-size:.88rem">${r.tipo}${links.length>1?` <span class="badge-n">${links.length}</span>`:''}</div>
            ${APP.user&&APP.user.master?`<div style="font-size:.75rem;color:var(--text-muted)">${r.nombre} · ${r.dni}</div>`:''}
            <div style="font-size:.72rem;color:var(--text-muted);margin-top:2px">${r.fechaHerramienta}${r.area?' · '+r.area:''}</div>
          </div>
          <span class="badge-status badge-${(r.evaluado||'completado').toLowerCase()}">${r.evaluado||'—'}</span>
        </div>` +
        (links.length ? `<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">` +
          links.slice(0,3).map(function(lk,j){
            return `<a href="${lk}" target="_blank" onclick="event.stopPropagation()" class="file-link">
              <span class="material-icons" style="font-size:.85rem">open_in_new</span>Archivo ${j+1}</a>`;
          }).join('') +
          (links.length>3?`<span style="font-size:.72rem;color:var(--text-muted);padding:4px 6px">+${links.length-3} más</span>`:'') +
          `</div>` : '') +
        `<div style="font-size:.7rem;color:var(--text-muted);margin-top:5px;text-align:right">${r.fechaCarga}</div>`;
      el.appendChild(card);
    });
  },

  detail: function (r) {
    var links    = r.links   ? r.links.split('\n').filter(Boolean) : [];
    var archivos = r.archivos ? r.archivos.split(', ') : [];
    var linksHTML = links.map(function (lk, i) {
      return `<a href="${lk}" target="_blank" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg);border-radius:10px;margin-bottom:6px;text-decoration:none;color:var(--text)">
        <span class="material-icons" style="color:var(--primary)">description</span>
        <span style="flex:1;font-size:.82rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${archivos[i]||'Archivo '+(i+1)}</span>
        <span class="material-icons" style="color:var(--accent);font-size:1.1rem">open_in_new</span>
      </a>`;
    }).join('');

    document.getElementById('modal-detail-body').innerHTML =
      `<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <div style="background:var(--primary);color:#fff;width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0"><span class="material-icons">description</span></div>
        <div><div style="font-weight:800;font-size:1rem;color:var(--primary)">${r.tipo}</div><div style="font-size:.75rem;color:var(--text-muted)">${r.fechaCarga}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:14px">
        ${['Evaluado|'+r.nombre,'DNI|'+r.dni,'Cargo|'+(r.cargo||'—'),'Área|'+(r.area||'—'),'Fecha doc.|'+r.fechaHerramienta,'Archivos|'+(r.cantidad||links.length),'Estado|<span class="badge-status badge-'+(r.evaluado||'').toLowerCase()+'">'+(r.evaluado||'—')+'</span>'].map(function(p){var s=p.split('|');return `<div style="background:var(--bg);border-radius:8px;padding:8px 10px"><div style="font-size:.68rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:2px">${s[0]}</div><div style="font-weight:600">${s[1]}</div></div>`;}).join('')}
      </div>
      ${links.length ? '<div style="font-size:.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Archivos</div>' + linksHTML : ''}`;

    document.getElementById('modal-detail').classList.add('open');
    vibrate(30);
  },

  export: function () {
    API.sheetsUrl().then(function (r) {
      if (r.url) { window.open(r.url,'_blank'); toast('Abriendo Spreadsheet…','success'); }
    });
  }
};
