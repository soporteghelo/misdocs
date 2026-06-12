// ═══════════════════════════════════════════════════════════════
//  USERS VIEW — Gestión de Usuarios (agrupado por código)
// ═══════════════════════════════════════════════════════════════

var USERS_VIEW = {
  _data:      [],
  _codes:     [],   // unique codes from ASIGNACION
  _editIdx:   -1,
  _ft:        null, // filter debounce timer

  load: function () {
    document.getElementById('users-list').innerHTML =
      '<div class="skel" style="height:90px;border-radius:14px;margin-bottom:8px"></div>'.repeat(5);
    // Reset filtros
    var fn = document.getElementById('uf-nombre');
    var fc = document.getElementById('uf-codigo');
    if (fn) fn.value = '';
    Promise.all([API.usuariosMaster(), API.asignacion()])
      .then(function (res) {
        USERS_VIEW._data  = Array.isArray(res[0]) ? res[0] : [];
        var asig = Array.isArray(res[1]) ? res[1] : [];
        // unique codes from ASIGNACION
        var seen = {};
        USERS_VIEW._codes = [];
        asig.forEach(function (a) {
          var c = String(a.codigo || '').trim().toUpperCase();
          if (c && !seen[c]) { seen[c] = true; USERS_VIEW._codes.push(c); }
        });
        USERS_VIEW._codes.sort();
        // Poblar dropdown filtro de código (incluye códigos de usuarios también)
        USERS_VIEW._buildCodigoFilter();
        if (fc) fc.value = '';
        USERS_VIEW._render(USERS_VIEW._data);
      })
      .catch(function () { toast('Error al cargar usuarios', 'error'); });
  },

  _buildCodigoFilter: function () {
    var sel = document.getElementById('uf-codigo');
    if (!sel) return;
    // Códigos únicos de ASIGNACION + los que tengan los usuarios
    var seen = {};
    var all = [];
    USERS_VIEW._codes.forEach(function (c) { seen[c] = true; all.push(c); });
    USERS_VIEW._data.forEach(function (u) {
      var c = (u.codigo || '').toUpperCase();
      if (c && !seen[c]) { seen[c] = true; all.push(c); }
    });
    all.sort();
    sel.innerHTML = '<option value="">Todos</option>';
    all.forEach(function (c) {
      var o = document.createElement('option');
      o.value = c; o.textContent = c;
      sel.appendChild(o);
    });
  },

  applyFilters: function (immediate) {
    if (!immediate) {
      clearTimeout(USERS_VIEW._ft);
      USERS_VIEW._ft = setTimeout(function () { USERS_VIEW._doFilter(); }, 180);
      return;
    }
    USERS_VIEW._doFilter();
  },

  _doFilter: function () {
    var nombre = (document.getElementById('uf-nombre').value || '').trim().toUpperCase();
    var codigo = (document.getElementById('uf-codigo').value || '').trim().toUpperCase();
    var filtered = USERS_VIEW._data.filter(function (u) {
      if (nombre && (u.nombre || '').toUpperCase().indexOf(nombre) === -1) return false;
      if (codigo) {
        var uc = (u.codigo || '').toUpperCase();
        if (uc !== codigo) return false;
      }
      return true;
    });
    USERS_VIEW._render(filtered);
  },

  _render: function (data) {
    var el = document.getElementById('users-list');
    if (!data || !data.length) {
      el.innerHTML = '<div class="empty-state"><span class="material-icons">group</span><p>Sin resultados.</p></div>';
      return;
    }

    // Agrupar por código (sin código va al final)
    var groups = {};
    // Preservar índice real en _data para openEdit
    data.forEach(function (u) {
      var realIdx = USERS_VIEW._data.indexOf(u);
      var key = u.codigo ? u.codigo.toUpperCase() : '__NONE__';
      if (!groups[key]) groups[key] = [];
      groups[key].push({ u: u, idx: realIdx });
    });

    var keys = Object.keys(groups).filter(function (k) { return k !== '__NONE__'; }).sort();
    if (groups['__NONE__'] && groups['__NONE__'].length) keys.push('__NONE__');

    var html = '';
    keys.forEach(function (key) {
      var label = key === '__NONE__' ? 'Sin Código' : key;
      var badgeColor = key === '__NONE__' ? '#9e9e9e' : 'var(--primary)';

      html += '<div style="display:flex;align-items:center;gap:8px;margin:14px 0 8px">' +
        '<span style="background:' + badgeColor + ';color:#fff;font-size:.68rem;font-weight:800;padding:3px 12px;border-radius:20px;letter-spacing:.4px">' + label + '</span>' +
        '<div style="flex:1;height:1px;background:var(--border)"></div>' +
        '<span style="font-size:.65rem;color:var(--text-muted)">' + groups[key].length + ' usuario(s)</span>' +
      '</div>';

      groups[key].forEach(function (item) {
        html += USERS_VIEW._cardHtml(item.u, item.idx);
      });
    });

    el.innerHTML = html;
  },

  _cardHtml: function (u, idx) {
    var ini      = (u.nombre || '').split(' ').slice(0, 2).map(function (w) { return w[0] || ''; }).join('');
    var rolUpper = (u.rol || '').toUpperCase();
    var rolColor = rolUpper === 'ADMIN' ? '#b71c1c' : 'var(--primary-light)';
    var activo   = u.activo
      ? '<span style="color:var(--success);font-size:.6rem;font-weight:700;background:#e8f5e9;padding:2px 6px;border-radius:20px">ACTIVO</span>'
      : '<span style="color:#9e9e9e;font-size:.6rem;font-weight:700;background:#f5f5f5;padding:2px 6px;border-radius:20px">INACTIVO</span>';

    return '<div class="card" style="margin-bottom:8px;padding:12px;cursor:pointer;transition:box-shadow .15s" ' +
      'onclick="USERS_VIEW.openEdit(' + idx + ')" ' +
      'onmouseenter="this.style.boxShadow=\'0 4px 18px rgba(26,35,126,.18)\'" ' +
      'onmouseleave="this.style.boxShadow=\'\'">' +
      '<div style="display:flex;align-items:center;gap:10px">' +
        '<div class="user-avatar" style="width:40px;height:40px;font-size:.82rem;background:' + rolColor + ';flex-shrink:0">' + ini + '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px">' +
            '<span style="font-weight:700;font-size:.84rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px">' + (u.nombre || '—') + '</span>' +
            '<span style="background:' + rolColor + ';color:#fff;font-size:.57rem;font-weight:800;padding:2px 7px;border-radius:20px">' + (u.rol || '?') + '</span>' +
            activo +
          '</div>' +
          '<div style="font-size:.7rem;color:var(--text-muted)">DNI: ' + u.dni + '</div>' +
        '</div>' +
        '<span class="material-icons" style="color:var(--text-muted);font-size:1.1rem;flex-shrink:0">edit</span>' +
      '</div>' +
    '</div>';
  },

  openEdit: function (idx) {
    var u = USERS_VIEW._data[idx];
    if (!u) return;
    USERS_VIEW._editIdx = idx;

    document.getElementById('ue-dni').textContent    = u.dni;
    document.getElementById('ue-nombre').value       = u.nombre || '';
    document.getElementById('ue-activo').checked     = !!u.activo;
    document.getElementById('ue-password').value     = '';

    // Normalizar rol a las 2 opciones válidas
    var rol = (u.rol || '').toUpperCase();
    document.getElementById('ue-rol').value = (rol === 'ADMIN') ? 'ADMIN' : 'SUPERVISOR';
    USERS_VIEW.onRolChange(document.getElementById('ue-rol').value);

    // Poblar dropdown de códigos
    var sel = document.getElementById('ue-codigo');
    sel.innerHTML = '<option value="">— Sin código —</option>';
    USERS_VIEW._codes.forEach(function (c) {
      var o = document.createElement('option');
      o.value = c; o.textContent = c;
      if (c === (u.codigo || '').toUpperCase()) o.selected = true;
      sel.appendChild(o);
    });
    // Si tiene un código que no está en la lista, añadirlo igual
    if (u.codigo && USERS_VIEW._codes.indexOf(u.codigo.toUpperCase()) === -1) {
      var extra = document.createElement('option');
      extra.value = u.codigo.toUpperCase(); extra.textContent = u.codigo.toUpperCase() + ' (manual)';
      extra.selected = true;
      sel.appendChild(extra);
    }

    document.getElementById('modal-edit-user').classList.add('open');
  },

  onRolChange: function (val) {
    var show = val === 'ADMIN';
    var grp = document.getElementById('ue-pwd-group');
    if (grp) grp.style.display = show ? 'block' : 'none';
    if (!show) document.getElementById('ue-password').value = '';
  },

  saveEdit: function () {
    var idx = USERS_VIEW._editIdx;
    if (idx < 0) return;
    var u = USERS_VIEW._data[idx];
    if (!u) return;

    var btn = document.getElementById('ue-save-btn');
    setLoading(btn, true);

    var rol = document.getElementById('ue-rol').value.trim().toUpperCase();
    var pwd = document.getElementById('ue-password').value.trim();
    var payload = {
      nombre:   document.getElementById('ue-nombre').value.trim().toUpperCase(),
      rol:      rol,
      activo:   document.getElementById('ue-activo').checked,
      codigo:   document.getElementById('ue-codigo').value.trim().toUpperCase()
    };
    // Solo enviar contraseña si el rol es ADMIN y se escribió algo
    if (rol === 'ADMIN' && pwd) payload.password = pwd;

    API.updateUsuario(u.dni, payload)
      .then(function (res) {
        setLoading(btn, false);
        if (res.ok) {
          Object.assign(USERS_VIEW._data[idx], payload);
          toast('Usuario actualizado', 'success', 2000);
          closeModal('modal-edit-user');
          USERS_VIEW._buildCodigoFilter();
          USERS_VIEW._doFilter();
        } else {
          toast(res.msg || 'Error al guardar', 'error');
        }
      })
      .catch(function () {
        setLoading(btn, false);
        toast('Error de conexión', 'error');
      });
  }
};
