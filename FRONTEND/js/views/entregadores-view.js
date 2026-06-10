// ── ENTREGADORES ADMIN VIEW ───────────────────────────────────────
const ENTREGADORES = {
  async cargar() {
    const list = document.getElementById('entregadores-list');
    list.innerHTML = '<div class="skeleton-list"><div class="skeleton-card"></div></div>';
    try {
      const datos = await API.get({ action: 'entregadores' }, null, 0);
      if (!datos.length) { list.innerHTML = '<div class="card text-muted">No hay entregadores configurados</div>'; return; }
      list.innerHTML = datos.map(e => `
        <div class="entrega-card">
          <div class="card-doc">${e.nombre}</div>
          <div class="card-meta">${e.cargo}${e.area ? ' · ' + e.area : ''}</div>
          <div class="card-actions">
            <button class="btn btn-ghost btn-sm" onclick='ENTREGADORES.abrirModal(${JSON.stringify(e)})'>
              <span class="material-icons">edit</span> Editar
            </button>
          </div>
        </div>`).join('');
    } catch (ex) {
      list.innerHTML = `<div class="alert alert-error">${ex.message}</div>`;
    }
  },

  abrirModal(e) {
    document.getElementById('modal-entregador-title').textContent = e ? 'Editar entregador' : 'Nuevo entregador';
    document.getElementById('ent-dni-orig').value  = e?.dni || '';
    document.getElementById('ent-dni').value       = e?.dni || '';
    document.getElementById('ent-apellidos').value = e?.apellidos || '';
    document.getElementById('ent-nombres').value   = e?.nombres || '';
    document.getElementById('ent-cargo').value     = e?.cargo || '';
    document.getElementById('ent-area').value      = e?.area || '';
    document.getElementById('modal-entregador').classList.remove('hidden');
  },

  cerrarModal() { document.getElementById('modal-entregador').classList.add('hidden'); },

  async guardar() {
    const dniOrig = document.getElementById('ent-dni-orig').value;
    const body = {
      action:       dniOrig ? 'edit-entregador' : 'add-entregador',
      dniOriginal:  dniOrig,
      nombreOriginal: dniOrig ? '' : '',
      dni:          document.getElementById('ent-dni').value.trim(),
      apellidos:    document.getElementById('ent-apellidos').value.trim(),
      nombres:      document.getElementById('ent-nombres').value.trim(),
      cargo:        document.getElementById('ent-cargo').value.trim(),
      area:         document.getElementById('ent-area').value.trim(),
      activo:       'TRUE'
    };
    if (!body.apellidos || !body.nombres) { APP.toast('Ingresa nombre completo', 'error'); return; }
    try {
      await API.post(body);
      this.cerrarModal();
      APP.toast('Entregador guardado ✓', 'success');
      API.invalidate('ed_entregadores');
      this.cargar();
    } catch (ex) { APP.toast(ex.message, 'error'); }
  }
};
