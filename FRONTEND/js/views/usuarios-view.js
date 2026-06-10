// ── USUARIOS ADMIN VIEW ───────────────────────────────────────────
const USUARIOS = {
  async cargar() {
    const list = document.getElementById('usuarios-list');
    list.innerHTML = '<div class="skeleton-list"><div class="skeleton-card"></div></div>';
    try {
      const datos = await API.get({ action: 'usuarios' });
      if (!datos.length) { list.innerHTML = '<div class="card text-muted">No hay usuarios</div>'; return; }
      list.innerHTML = datos.map(u => `
        <div class="entrega-card">
          <div class="card-doc">${u.apellidos} ${u.nombres}</div>
          <div class="card-meta">DNI: ${u.dni} · ${u.rol} · ${u.activo ? '✅ Activo' : '⛔ Inactivo'}</div>
          <div class="card-meta">${u.empresa || ''} — ${u.cargo || ''}</div>
          <div class="card-actions">
            <button class="btn btn-ghost btn-sm" onclick='USUARIOS.abrirModal(${JSON.stringify(u)})'>
              <span class="material-icons">edit</span> Editar
            </button>
          </div>
        </div>`).join('');
    } catch (ex) {
      list.innerHTML = `<div class="alert alert-error">${ex.message}</div>`;
    }
  },

  abrirModal(u) {
    document.getElementById('modal-usuario-title').textContent = u ? 'Editar usuario' : 'Nuevo usuario';
    document.getElementById('usr-dni-orig').value  = u?.dni || '';
    document.getElementById('usr-dni').value       = u?.dni || '';
    document.getElementById('usr-apellidos').value = u?.apellidos || '';
    document.getElementById('usr-nombres').value   = u?.nombres || '';
    document.getElementById('usr-empresa').value   = u?.empresa || '';
    document.getElementById('usr-cargo').value     = u?.cargo || '';
    document.getElementById('usr-area').value      = u?.area || '';
    document.getElementById('usr-rol').value       = u?.rol || 'OPERARIO';
    document.getElementById('usr-pwd').value       = '';
    document.getElementById('usr-activo').checked  = u ? u.activo : true;
    document.getElementById('modal-usuario').classList.remove('hidden');
  },

  cerrarModal() { document.getElementById('modal-usuario').classList.add('hidden'); },

  async guardar() {
    const dniOrig = document.getElementById('usr-dni-orig').value;
    const body = {
      action:    dniOrig ? 'edit-usuario' : 'add-usuario',
      dniOriginal: dniOrig,
      dni:       document.getElementById('usr-dni').value.trim(),
      apellidos: document.getElementById('usr-apellidos').value.trim(),
      nombres:   document.getElementById('usr-nombres').value.trim(),
      empresa:   document.getElementById('usr-empresa').value.trim(),
      cargo:     document.getElementById('usr-cargo').value.trim(),
      area:      document.getElementById('usr-area').value.trim(),
      rol:       document.getElementById('usr-rol').value,
      activo:    document.getElementById('usr-activo').checked ? 'TRUE' : 'FALSE',
      password:  document.getElementById('usr-pwd').value.trim()
    };
    try {
      await API.post(body);
      this.cerrarModal();
      APP.toast('Usuario guardado ✓', 'success');
      this.cargar();
    } catch (ex) { APP.toast(ex.message, 'error'); }
  }
};
