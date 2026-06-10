// ── TIPOS DOCUMENTO ADMIN VIEW ────────────────────────────────────
const TIPOS = {
  async cargar() {
    const list = document.getElementById('tipos-list');
    list.innerHTML = '<div class="skeleton-list"><div class="skeleton-card"></div></div>';
    try {
      const datos = await API.get({ action: 'tipos' }, null, 0);
      if (!datos.length) { list.innerHTML = '<div class="card text-muted">No hay tipos configurados</div>'; return; }
      list.innerHTML = datos.map(t => `
        <div class="entrega-card">
          <div class="card-doc">${t.tipo}</div>
          <div class="card-meta">${t.descripcion || '—'}</div>
          <div class="card-actions">
            <button class="btn btn-ghost btn-sm" onclick='TIPOS.abrirModal(${JSON.stringify(t)})'>
              <span class="material-icons">edit</span> Editar
            </button>
            <button class="btn btn-danger btn-sm" onclick="TIPOS.eliminar('${t.tipo}')">
              <span class="material-icons">delete</span>
            </button>
          </div>
        </div>`).join('');
    } catch (ex) {
      list.innerHTML = `<div class="alert alert-error">${ex.message}</div>`;
    }
  },

  abrirModal(t) {
    document.getElementById('modal-tipo-title').textContent = t ? 'Editar tipo' : 'Nuevo tipo';
    document.getElementById('tipo-orig').value  = t?.tipo || '';
    document.getElementById('tipo-nombre').value = t?.tipo || '';
    document.getElementById('tipo-desc').value   = t?.descripcion || '';
    document.getElementById('modal-tipo').classList.remove('hidden');
  },

  cerrarModal() { document.getElementById('modal-tipo').classList.add('hidden'); },

  async guardar() {
    const orig = document.getElementById('tipo-orig').value;
    const tipo  = document.getElementById('tipo-nombre').value.trim();
    const desc  = document.getElementById('tipo-desc').value.trim();
    if (!tipo) { APP.toast('Ingresa el nombre del tipo', 'error'); return; }
    try {
      if (orig) {
        await API.post({ action: 'edit-tipo', tipoOriginal: orig, tipo, descripcion: desc, activo: 'TRUE' });
      } else {
        await API.post({ action: 'add-tipo', tipo, descripcion: desc });
      }
      this.cerrarModal();
      APP.toast('Guardado ✓', 'success');
      API.invalidate('ed_tipos');
      this.cargar();
    } catch (ex) { APP.toast(ex.message, 'error'); }
  },

  async eliminar(tipo) {
    if (!confirm('¿Desactivar el tipo "' + tipo + '"?')) return;
    try {
      await API.post({ action: 'delete-tipo', tipo });
      APP.toast('Tipo desactivado', 'success');
      API.invalidate('ed_tipos');
      this.cargar();
    } catch (ex) { APP.toast(ex.message, 'error'); }
  }
};
