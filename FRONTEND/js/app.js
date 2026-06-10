// ── SPA Shell — router + sesión + UI helpers ──────────────────────
const SESSION_KEY = 'ed_session';

let _session = null;
let _currentView = null;

const APP = {

  // ── Inicio ────────────────────────────────────────────────────
  async init() {
    // Comprueba configuración
    try {
      const st = await API.get({ action: 'status' });
      if (!st.configured) { APP.navigate('config'); return; }
    } catch {
      APP.toast('Sin conexión con el servidor', 'error');
    }

    // ¿Hay sesión guardada?
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        _session = JSON.parse(saved);
        APP._afterLogin();
        return;
      } catch { localStorage.removeItem(SESSION_KEY); }
    }

    // ¿URL tiene ?verificar=ID?
    const params = new URLSearchParams(location.search);
    if (params.has('verificar')) {
      APP.navigate('verificar', params.get('verificar'));
      return;
    }

    APP.navigate('login');
  },

  // ── Sesión ────────────────────────────────────────────────────
  setSession(data) {
    _session = data;
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  },

  getSession() { return _session; },

  logout() {
    if (!confirm('¿Cerrar sesión?')) return;
    _session = null;
    localStorage.removeItem(SESSION_KEY);
    APP.navigate('login');
    APP.closeMenu();
  },

  isAdmin() { return _session && _session.rol === 'ADMIN'; },

  _afterLogin() {
    APP._updateDrawer();
    if (APP.isAdmin()) {
      APP.navigate('dashboard');
    } else {
      APP.navigate('entrega');
    }
  },

  // ── Navegación ────────────────────────────────────────────────
  navigate(view, param) {
    if (_currentView) {
      document.getElementById('view-' + _currentView)?.classList.add('hidden');
    }
    const el = document.getElementById('view-' + view);
    if (!el) return;
    el.classList.remove('hidden');
    _currentView = view;

    // Actualizar header
    const titles = {
      login:        'Entrega de Documentos',
      config:       'Configuración',
      entrega:      'Nueva entrega',
      'mis-entregas': 'Mis entregas',
      dashboard:    'Panel de entregas',
      usuarios:     'Usuarios',
      tipos:        'Tipos de documento',
      entregadores: 'Entregadores',
      verificar:    'Verificar certificado'
    };
    document.getElementById('header-title').textContent = titles[view] || 'Entrega Docs';

    // Ocultar/mostrar header/bottomnav según vista
    const hideHeader = ['login', 'config', 'verificar'].includes(view);
    document.getElementById('app-header').style.display = hideHeader ? 'none' : '';
    document.getElementById('bottom-nav').style.display =
      !_session || APP.isAdmin() ? 'none' : '';

    // Activar nav item
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === view);
    });
    document.querySelectorAll('.drawer-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === view);
    });

    APP.closeMenu();

    // Llamar onEnter de la vista si existe
    const handlers = {
      entrega:      () => ENTREGA.init(),
      'mis-entregas': () => MIS_ENTREGAS.cargar(),
      dashboard:    () => DASH.cargar(),
      usuarios:     () => USUARIOS.cargar(),
      tipos:        () => TIPOS.cargar(),
      entregadores: () => ENTREGADORES.cargar(),
      verificar:    () => VERIFICAR.cargar(param)
    };
    handlers[view]?.();
  },

  // ── Drawer ────────────────────────────────────────────────────
  toggleMenu() {
    document.getElementById('drawer').classList.toggle('open');
    document.getElementById('drawer-overlay').classList.toggle('open');
  },
  closeMenu() {
    document.getElementById('drawer').classList.remove('open');
    document.getElementById('drawer-overlay').classList.remove('open');
  },

  _updateDrawer() {
    if (!_session) return;
    const s = _session;
    document.getElementById('drawer-avatar').textContent = (s.apellidos || s.nombre || 'U')[0].toUpperCase();
    document.getElementById('drawer-name').textContent   = s.nombre || (s.apellidos + ' ' + s.nombres);
    document.getElementById('drawer-cargo').textContent  = s.cargo || '';
    document.getElementById('drawer-badge').textContent  = s.rol || 'OPERARIO';

    const menu = document.getElementById('drawer-menu');
    const items = APP.isAdmin()
      ? [
          { icon: 'folder_open',   view: 'dashboard',    label: 'Todas las entregas' },
          { icon: 'add_circle',    view: 'entrega',       label: 'Nueva entrega' },
          { divider: true },
          { icon: 'people',        view: 'usuarios',      label: 'Usuarios' },
          { icon: 'category',      view: 'tipos',         label: 'Tipos de documento' },
          { icon: 'badge',         view: 'entregadores',  label: 'Entregadores' },
          { divider: true },
          { icon: 'logout',        action: 'logout',      label: 'Cerrar sesión' }
        ]
      : [
          { icon: 'add_circle',    view: 'entrega',       label: 'Nueva entrega' },
          { icon: 'folder',        view: 'mis-entregas',  label: 'Mis entregas' },
          { divider: true },
          { icon: 'logout',        action: 'logout',      label: 'Cerrar sesión' }
        ];

    menu.innerHTML = items.map(it => {
      if (it.divider) return '<div class="drawer-divider"></div>';
      const onclick = it.action === 'logout'
        ? 'APP.logout()'
        : `APP.navigate('${it.view}')`;
      return `<button class="drawer-item" data-view="${it.view || ''}" onclick="${onclick}">
        <span class="material-icons">${it.icon}</span>${it.label}
      </button>`;
    }).join('');
  },

  // ── Toast ─────────────────────────────────────────────────────
  toast(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => el.remove(), 3200);
  },

  // ── Loading overlay simple ────────────────────────────────────
  loading(on, btnId) {
    if (!btnId) return;
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = on;
    if (on) btn.dataset.origText = btn.innerHTML;
    btn.innerHTML = on
      ? '<span class="material-icons" style="animation:spin 1s linear infinite">refresh</span>'
      : (btn.dataset.origText || btn.innerHTML);
  }
};

// ── Arranque ──────────────────────────────────────────────────────
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('splash').style.display = 'none';
    document.getElementById('app').classList.remove('hidden');
    APP.init();
  }, 1800);
});
