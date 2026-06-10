// ── MIS ENTREGAS VIEW ─────────────────────────────────────────────
const MIS_ENTREGAS = {
  async cargar() {
    const s = APP.getSession();
    const list = document.getElementById('mis-entregas-list');
    list.innerHTML = `<div class="skeleton-list">
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
    </div>`;

    try {
      const datos = await API.get({ action: 'mis-entregas', dni: s.dni }, null, 0);
      if (!datos.length) {
        list.innerHTML = '<div class="card" style="text-align:center;color:var(--text-muted)"><span class="material-icons" style="font-size:2.5rem">folder_open</span><p style="margin-top:8px">Aún no tienes entregas registradas</p></div>';
        return;
      }
      datos.sort((a, b) => _ts(b) - _ts(a));   // más reciente primero
      list.innerHTML = datos.map(e => _tarjeta(e)).join('');
    } catch (ex) {
      list.innerHTML = `<div class="alert alert-error">${ex.message}</div>`;
    }
  }
};

// Timestamp para ordenar: combina fecha (cruda o dd/MM/yyyy) + hora (hh:mm:ss a)
function _ts(e) {
  let d = new Date(e.fecha);                  // string crudo de Sheets parsea bien
  if (isNaN(d)) {                             // fallback dd/MM/yyyy
    const p = String(e.fecha).split('/');
    if (p.length === 3) d = new Date(+p[2], +p[1] - 1, +p[0]);
  }
  if (isNaN(d)) return 0;
  const m = String(e.hora || '').match(/(\d+):(\d+):?(\d+)?\s*(a|p)/i);
  if (m) {
    let h = +m[1] % 12;
    if (/p/i.test(m[4])) h += 12;
    d.setHours(h, +m[2], +(m[3] || 0), 0);
  }
  return d.getTime();
}

function _tarjeta(e) {
  const badgeClass = {
    'FISICO': 'badge-fisico',
    'VIRTUAL': 'badge-virtual',
    'FISICO Y VIRTUAL': 'badge-ambos'
  }[e.tipoEntrega] || 'badge-fisico';

  const verPdf = e.pdfUrl
    ? `<a class="btn btn-ghost btn-sm" href="${e.pdfUrl}" target="_blank">
        <span class="material-icons">picture_as_pdf</span> Ver vale
      </a>`
    : '';

  return `<div class="entrega-card">
    <div class="card-id">${e.id} · ${_fechaCorta(e)} ${e.hora || ''}</div>
    <div class="card-doc">${e.tipoDocumento}</div>
    <div class="card-meta">
      <span class="badge ${badgeClass}">${e.tipoEntrega}</span>
      · Entregó: ${e.nombreEntregador}
    </div>
    <p style="font-size:.82rem;color:var(--text-muted);margin-top:6px">${e.descripcion || ''}</p>
    <div class="card-actions">${verPdf}</div>
  </div>`;
}

// Fecha legible dd/MM/yyyy (limpia el string crudo "Tue Jun 09 2026 ...")
function _fechaCorta(e) {
  let d = new Date(e.fecha);
  if (isNaN(d)) return String(e.fecha || '');   // ya viene dd/MM/yyyy
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}
