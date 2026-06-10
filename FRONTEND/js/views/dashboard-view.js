// ── DASHBOARD ADMIN VIEW ──────────────────────────────────────────
const DASH = {
  _datos: [],
  _quick: '',   // filtro rápido cliente: '', 'HOY', 'FISICO', 'VIRTUAL'

  async cargar() {
    const list = document.getElementById('dashboard-list');
    list.innerHTML = `<div class="skeleton-list">
      <div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div>
    </div>`;

    const params = { action: 'todas-entregas' };
    const fTipo  = document.getElementById('filter-tipo')?.value;
    if (fTipo) params.tipo = fTipo;
    // Las fechas se filtran en el cliente: la hoja guarda la fecha en formato
    // largo ("Wed Jun 10 2026...") y el split('/') del backend no la entiende.

    try {
      this._datos = await API.get(params);
      this._renderStats();
      this._renderLista();
      this._cargarFiltroTipos();
    } catch (ex) {
      list.innerHTML = `<div class="alert alert-error">${ex.message}</div>`;
    }
  },

  _esHoy(e) { return this._fmtFecha(e.fecha) === new Date().toLocaleDateString('es-PE'); },

  // Normaliza la fecha a dd/mm/aaaa (la hoja a veces la guarda como fecha larga)
  _fmtFecha(f) {
    if (!f) return '';
    const s = String(f).trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(s)) return s.split(' ')[0];
    const d = new Date(s);
    return isNaN(d) ? s : d.toLocaleDateString('es-PE');
  },

  // Devuelve un Date (a medianoche local) desde "dd/mm/aaaa" o desde el formato largo de la hoja
  _parseFecha(f) {
    if (!f) return null;
    const s = String(f).trim();
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
    const d = new Date(s);
    return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
  },

  // Aplica el rango DESDE/HASTA (filtrado en cliente)
  _dateFiltered() {
    let d = this._datos;
    const fDesde = document.getElementById('filter-desde')?.value;
    const fHasta = document.getElementById('filter-hasta')?.value;
    if (fDesde) {
      const desde = new Date(fDesde + 'T00:00:00');
      d = d.filter(e => { const fe = this._parseFecha(e.fecha); return fe && fe >= desde; });
    }
    if (fHasta) {
      const hasta = new Date(fHasta + 'T23:59:59');
      d = d.filter(e => { const fe = this._parseFecha(e.fecha); return fe && fe <= hasta; });
    }
    return d;
  },

  _filtrados() {
    let d = this._dateFiltered();
    if (this._quick === 'HOY')     d = d.filter(e => this._esHoy(e));
    if (this._quick === 'FISICO')  d = d.filter(e => e.tipoEntrega === 'FISICO');
    if (this._quick === 'VIRTUAL') d = d.filter(e => e.tipoEntrega === 'VIRTUAL');

    const nombre = document.getElementById('filter-nombre')?.value.trim().toLowerCase();
    if (nombre) d = d.filter(e => String(e.nombreReceptor || '').toLowerCase().includes(nombre));
    return d;
  },

  toggleFiltros() {
    const body  = document.getElementById('filters-body');
    const caret = document.getElementById('filters-caret');
    const oculto = body.classList.toggle('hidden');
    caret.textContent = oculto ? 'expand_more' : 'expand_less';
  },

  _renderStats() {
    const d = this._dateFiltered();
    const hoyCount = d.filter(e => this._esHoy(e)).length;
    const fisicos  = d.filter(e => e.tipoEntrega === 'FISICO').length;
    const virtuales= d.filter(e => e.tipoEntrega === 'VIRTUAL').length;
    const act = q => this._quick === q ? ' stat-active' : '';

    document.getElementById('dashboard-stats').innerHTML = `
      <div class="stat-card${act('')}" onclick="DASH.filtrarRapido('')" title="Ver todas">
        <div class="stat-value">${d.length}</div>
        <div class="stat-label">Total</div>
      </div>
      <div class="stat-card${act('HOY')}" onclick="DASH.filtrarRapido('HOY')" title="Solo de hoy">
        <div class="stat-value" style="color:var(--success)">${hoyCount}</div>
        <div class="stat-label">Hoy</div>
      </div>
      <div class="stat-card${act('FISICO')}" onclick="DASH.filtrarRapido('FISICO')" title="Solo físicas">
        <div class="stat-value" style="color:#c2410c">${fisicos}</div>
        <div class="stat-label">Físicas</div>
      </div>
      <div class="stat-card${act('VIRTUAL')}" onclick="DASH.filtrarRapido('VIRTUAL')" title="Solo virtuales">
        <div class="stat-value" style="color:var(--primary)">${virtuales}</div>
        <div class="stat-label">Virtuales</div>
      </div>`;
  },

  // Toca una tarjeta para filtrar la lista (toggle)
  filtrarRapido(q) {
    this._quick = (this._quick === q) ? '' : q;
    const sel = document.getElementById('filter-entrega');
    if (sel) sel.value = (this._quick === 'FISICO' || this._quick === 'VIRTUAL') ? this._quick : '';
    this._renderStats();
    this._renderLista();
  },

  // Filtro del <select> Físicas/Virtuales
  aplicarRapido() {
    this._quick = document.getElementById('filter-entrega').value;
    this._renderStats();
    this._renderLista();
  },

  _PAGE: 20,            // cuántas tarjetas se renderizan por lote
  _filtradosCache: [],  // resultado del último filtrado
  _visible: 0,          // cuántas tarjetas hay renderizadas
  _io: null,            // IntersectionObserver del centinela

  _cardHTML(e) {
    const badgeClass = {
      'FISICO': 'badge-fisico',
      'VIRTUAL': 'badge-virtual',
      'FISICO Y VIRTUAL': 'badge-ambos'
    }[e.tipoEntrega] || 'badge-fisico';
    const verPdf = e.pdfUrl
      ? `<a class="btn btn-ghost btn-sm card-pdf" href="${e.pdfUrl}" target="_blank" title="Ver vale PDF"><span class="material-icons">picture_as_pdf</span> Vale</a>`
      : '';
    return `<div class="entrega-card">
        <div class="card-body">
          <div class="card-id">${e.id} · ${this._fmtFecha(e.fecha)} · ${e.hora}</div>
          <div class="card-doc">${e.tipoDocumento}</div>
          <div class="card-meta">
            <span class="badge ${badgeClass}">${e.tipoEntrega}</span>
            · Receptor: <strong>${e.nombreReceptor}</strong> (${e.dniReceptor})
          </div>
          <div class="card-meta">Entregador: ${e.nombreEntregador}</div>
          ${e.descripcion ? `<div class="card-desc">${e.descripcion}</div>` : ''}
        </div>
        ${verPdf}
      </div>`;
  },

  _renderLista() {
    const list = document.getElementById('dashboard-list');
    const count = document.getElementById('dashboard-count');
    if (this._io) { this._io.disconnect(); this._io = null; }

    const datos = this._filtrados();
    this._filtradosCache = datos;
    if (count) {
      count.textContent = this._datos.length
        ? `Mostrando ${datos.length} de ${this._datos.length} entregas`
        : '';
    }
    if (!datos.length) {
      list.innerHTML = '<div class="card" style="text-align:center;color:var(--text-muted)"><span class="material-icons" style="font-size:2.5rem">inbox</span><p style="margin-top:8px">No hay entregas para los filtros seleccionados</p></div>';
      return;
    }

    // Primer lote
    this._visible = Math.min(this._PAGE, datos.length);
    list.innerHTML = datos.slice(0, this._visible).map(e => this._cardHTML(e)).join('')
      + (this._visible < datos.length ? '<div id="dash-sentinel" class="dash-sentinel"></div>' : '');
    this._observeSentinel();
  },

  // Agrega el siguiente lote de tarjetas al hacer scroll
  _loadMore() {
    const datos = this._filtradosCache;
    if (this._visible >= datos.length) return;
    const sentinel = document.getElementById('dash-sentinel');
    const next = datos.slice(this._visible, this._visible + this._PAGE);
    this._visible += next.length;
    if (sentinel) sentinel.insertAdjacentHTML('beforebegin', next.map(e => this._cardHTML(e)).join(''));
    if (this._visible >= datos.length && sentinel) {
      if (this._io) this._io.disconnect();
      sentinel.remove();
    }
  },

  _observeSentinel() {
    const sentinel = document.getElementById('dash-sentinel');
    if (!sentinel || !('IntersectionObserver' in window)) return;
    this._io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) this._loadMore();
    }, { rootMargin: '300px' });
    this._io.observe(sentinel);
  },

  _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  // Logo AESA (SVG). Para usar el logo real, reemplaza por:
  //   <img src="URL_O_DATA_URI" style="height:34px">
  _logoAESA() {
    return `<svg viewBox="0 0 120 64" width="86" height="46" xmlns="http://www.w3.org/2000/svg">
      <polygon points="60,4 84,40 36,40" fill="#111"/>
      <polygon points="40,20 60,48 20,48" fill="#111"/>
      <polygon points="80,20 100,48 60,48" fill="#111"/>
      <text x="60" y="61" text-anchor="middle" font-family="Arial" font-size="15" font-weight="bold" letter-spacing="3" fill="#111">AESA</text>
    </svg>`;
  },

  // Genera la "Lista Maestra de Distribución de Documentos" (A4) con los datos filtrados.
  // El encabezado va dentro de <thead>, por lo que el navegador lo repite en cada página.
  generarListaPDF() {
    const datos = this._filtrados();
    if (!datos.length) { APP.toast('No hay entregas para los filtros seleccionados', 'error'); return; }

    const esc = this._esc;
    const tipoFiltro = document.getElementById('filter-tipo')?.value || '';
    const nombreDocumento = tipoFiltro || String(datos[0]?.tipoDocumento || '').trim();
    const maxFilas = Math.max(datos.length, 20);

    const filas = Array.from({ length: maxFilas }, (_, index) => {
      const e = datos[index];
      if (!e) {
        return `
          <tr>
            <td class="col-n">${index + 1}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>`;
      }
      const link = e.pdfUrl
        ? `<a href="${esc(e.pdfUrl)}" target="_blank">VER VALE</a>`
        : '';
      const firma = e.firmaReceptorB64
        ? `<img src="data:image/jpeg;base64,${esc(e.firmaReceptorB64)}" alt="" onerror="this.style.display='none'">`
        : '';
      return `
        <tr>
          <td class="col-n">${index + 1}</td>
          <td class="col-nombres">${esc(e.nombreReceptor)}</td>
          <td class="col-dni">${esc(e.dniReceptor)}</td>
          <td class="col-fecha">${esc(this._fmtFecha(e.fecha))}</td>
          <td class="col-firma">${firma}</td>
          <td class="col-link link-cell">${link}</td>
          <td class="col-coment">${esc(e.descripcion || '')}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lista Maestra de Distribución de Documentos</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 20px;
      display: flex;
      justify-content: center;
    }

    .page {
      background-color: white;
      width: 210mm;
      min-height: 297mm;
      padding: 15mm;
      box-sizing: border-box;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }

    th, td {
      border: 1px solid black;
      padding: 5px;
    }

    .hdr-wrap {
      margin-bottom: 15px;
      border: none !important;
    }

    .hdr-wrap td {
      text-align: center;
      vertical-align: middle;
    }

    .logo-container {
      width: 20%;
      font-size: 24px;
      font-weight: bold;
      letter-spacing: 2px;
    }

    .title-container {
      width: 55%;
    }

    .sys-title {
      font-size: 12px;
      margin-bottom: 5px;
    }

    .main-title {
      font-size: 14px;
      font-weight: bold;
    }

    .meta-container {
      width: 25%;
      padding: 0 !important;
    }

    .meta-table {
      width: 100%;
      height: 100%;
      border: none;
    }

    .meta-table td, .meta-table th {
      border: none;
      border-bottom: 1px solid black;
      text-align: left;
      padding: 4px;
      font-size: 10px;
    }

    .meta-table th {
      border-right: 1px solid black;
      width: 45%;
      font-weight: bold;
    }

    .meta-table tr:last-child td, .meta-table tr:last-child th {
      border-bottom: none;
    }

    .document-info {
      margin-bottom: 15px;
      font-size: 12px;
      font-weight: bold;
      line-height: 1.8;
    }

    .document-info span {
      font-weight: normal;
    }

    .main-table th {
      background-color: #f0f0f0;
      text-align: center;
      font-weight: bold;
      font-size: 10px;
    }

    .main-table td {
      height: 22px;
    }

    .col-n { width: 3%; text-align: center; }
    .col-nombres { width: 23%; }
    .col-dni { width: 11%; text-align: center; }
    .col-fecha { width: 11%; text-align: center; }
    .col-firma { width: 16%; }
    .col-coment { width: 21%; font-size: 10px; }
    .col-firma img {
      max-width: 100%;
      max-height: 28px;
      display: block;
      margin: 0 auto;
      object-fit: contain;
    }
    .col-link { width: 15%; text-align: center; }

    .link-cell a {
      color: blue;
      font-style: italic;
      text-decoration: none;
      font-weight: bold;
    }

    @media print {
      body {
        background-color: transparent;
        padding: 0;
      }
      .page {
        box-shadow: none;
        margin: 0;
        padding: 10mm;
      }
      .main-table th {
        background-color: #e0e0e0 !important;
        -webkit-print-color-adjust: exact;
      }
      thead { display: table-header-group; }
    }
  </style>
</head>
<body>
  <div class="page">
    <table class="main-table">
      <thead>
        <tr>
          <td colspan="7" class="hdr-wrap">
            <table class="hdr">
              <tr>
                <td class="logo-container">AESA</td>
                <td class="title-container">
                  <div class="sys-title">SISTEMA INTEGRADO DE GESTIÓN</div>
                  <div class="main-title">LISTA MAESTRA DE DISTRIBUCIÓN DE DOCUMENTOS</div>
                </td>
                <td class="meta-container">
                  <table class="meta-table">
                    <tr>
                      <th>Código:</th>
                      <td>FPG-CL-SIG06-05-</td>
                    </tr>
                    <tr>
                      <th>Versión:</th>
                      <td>00</td>
                    </tr>
                    <tr>
                      <th>Fecha de Actualización:</th>
                      <td>10/3/2025</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td colspan="7" class="document-info">
            NOMBRE DEL DOCUMENTO: <span>${nombreDocumento ? esc(nombreDocumento) : '____________________________________________________________________'}</span>
            &nbsp;&nbsp;&nbsp;&nbsp; VERSIÓN: <span>_____</span>
          </td>
        </tr>
        <tr>
          <th class="col-n">N°</th>
          <th class="col-nombres">APELLIDOS Y NOMBRES</th>
          <th class="col-dni">DNI</th>
          <th class="col-fecha">FECHA</th>
          <th class="col-firma">FIRMA</th>
          <th class="col-link">LINK</th>
          <th class="col-coment">COMENTARIO</th>
        </tr>
      </thead>
      <tbody>
        ${filas}
      </tbody>
    </table>
  </div>
  <script>window.onload=function(){setTimeout(function(){window.print();},300);};</script>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (!w) { APP.toast('Permite las ventanas emergentes para generar el PDF', 'error'); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
  },

  async _cargarFiltroTipos() {
    try {
      const tipos = await API.get({ action: 'tipos' }, 'ed_tipos', 900);
      const sel = document.getElementById('filter-tipo');
      if (!sel) return;
      sel.innerHTML = '<option value="">Todos los tipos</option>' +
        tipos.map(t => `<option value="${t.tipo}">${t.tipo}</option>`).join('');
    } catch {}
  },

  // Chips de rango rápido de fecha
  rangoFecha(tipo, btn) {
    document.querySelectorAll('#filter-chips .chip').forEach(c => c.classList.remove('chip-active'));
    if (btn) btn.classList.add('chip-active');

    const fmt = dt => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
    const hoy = new Date();
    let desde = '', hasta = '';

    if (tipo === 'hoy') {
      desde = hasta = fmt(hoy);
    } else if (tipo === '7' || tipo === '30') {
      const d = new Date(hoy); d.setDate(d.getDate() - (Number(tipo) - 1));
      desde = fmt(d); hasta = fmt(hoy);
    } else if (tipo === 'mes') {
      desde = fmt(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
      hasta = fmt(hoy);
    }
    document.getElementById('filter-desde').value = desde;
    document.getElementById('filter-hasta').value = hasta;
    this.cargar();
  },

  limpiar() {
    ['filter-nombre','filter-desde','filter-hasta'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    const t = document.getElementById('filter-tipo');    if (t) t.value = '';
    const e = document.getElementById('filter-entrega'); if (e) e.value = '';
    this._quick = '';
    document.querySelectorAll('#filter-chips .chip').forEach(c => c.classList.remove('chip-active'));
    const todo = document.querySelector('#filter-chips .chip[data-rango=""]');
    if (todo) todo.classList.add('chip-active');
    this.cargar();
  },

  exportar() {
    const datos = this._filtrados();
    if (!datos.length) { APP.toast('No hay datos para exportar', 'error'); return; }
    const headers = ['ID','FECHA','HORA','DNI RECEPTOR','NOMBRE RECEPTOR','EMPRESA','CARGO',
                     'TIPO ENTREGA','TIPO DOCUMENTO','DESCRIPCIÓN','ENTREGADOR','GEO','HASH'];
    const rows = datos.map(e => [
      e.id, e.fecha, e.hora, e.dniReceptor, e.nombreReceptor, e.empresaReceptor,
      e.cargoReceptor, e.tipoEntrega, e.tipoDocumento, e.descripcion,
      e.nombreEntregador, e.geolocalizacion, e.hash
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,﻿' + encodeURIComponent(csv);
    link.download = 'entregas_' + new Date().toISOString().slice(0,10) + '.csv';
    link.click();
    APP.toast('Exportado ✓', 'success');
  }
};
