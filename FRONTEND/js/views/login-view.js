// ── LOGIN VIEW ────────────────────────────────────────────────────
const LOGIN = (() => {
  let _autoTimer = null;
  let _needPwd   = false;
  let _dniActual = '';

  function onDniInput(val) {
    const clean = val.replace(/\D/g, '').slice(0, 8);
    document.getElementById('login-dni').value = clean;
    _dniActual = clean;

    document.getElementById('login-btn').disabled = clean.length < 8;
    document.getElementById('login-error').classList.add('hidden');
    document.getElementById('login-registro').classList.add('hidden');
    document.getElementById('login-pwd-wrap').classList.add('hidden');
    _needPwd = false;

    clearTimeout(_autoTimer);
    if (clean.length === 8) {
      _autoTimer = setTimeout(() => _checkDni(clean), 500);
    }
  }

  async function _checkDni(dni) {
    try {
      const data = await API.get({ action: 'login', dni });
      if (data.rol === 'ADMIN') {
        document.getElementById('login-pwd-wrap').classList.remove('hidden');
        document.getElementById('login-pwd').focus();
        _needPwd = true;
      } else {
        _doLogin(data);
      }
    } catch (ex) {
      if (ex.message === 'DNI no encontrado') {
        _mostrarRegistro();
      }
    }
  }

  async function _mostrarRegistro() {
    document.getElementById('login-registro').classList.remove('hidden');
    document.getElementById('login-btn').disabled = true;
    document.getElementById('reg-empresa').value = 'AESA';
    document.getElementById('reg-apellidos').focus();

    // Cargar cargos históricos en el datalist
    try {
      const cargos = await API.get({ action: 'cargos' }, 'ed_cargos', 300);
      const dl = document.getElementById('cargos-list');
      dl.innerHTML = cargos.map(c => `<option value="${c}">`).join('');
    } catch {}
  }

  async function submit() {
    const dni = document.getElementById('login-dni').value.trim();
    const pwd = document.getElementById('login-pwd').value.trim();
    if (dni.length < 8) return;

    const errEl = document.getElementById('login-error');
    errEl.classList.add('hidden');
    APP.loading(true, 'login-btn');

    try {
      const params = { action: 'login', dni };
      if (_needPwd) params.pwd = pwd;
      const data = await API.get(params);
      if (data.needPwd) {
        document.getElementById('login-pwd-wrap').classList.remove('hidden');
        document.getElementById('login-pwd').focus();
        _needPwd = true;
        return;
      }
      _doLogin(data);
    } catch (ex) {
      if (ex.message === 'DNI no encontrado') {
        _mostrarRegistro();
      } else {
        errEl.textContent = ex.message;
        errEl.classList.remove('hidden');
      }
    } finally {
      APP.loading(false, 'login-btn');
    }
  }

  function onRegInput() {
    const ap  = document.getElementById('reg-apellidos').value.trim();
    const nm  = document.getElementById('reg-nombres').value.trim();
    const emp = document.getElementById('reg-empresa').value.trim();
    const car = document.getElementById('reg-cargo').value.trim();
    document.getElementById('reg-btn').disabled = !(ap && nm && emp && car);
  }

  async function registrar() {
    const dni      = _dniActual;
    const apellidos = document.getElementById('reg-apellidos').value.trim();
    const nombres   = document.getElementById('reg-nombres').value.trim();
    const empresa   = document.getElementById('reg-empresa').value.trim();
    const cargo     = document.getElementById('reg-cargo').value.trim();

    if (!apellidos || !nombres || !empresa || !cargo) {
      APP.toast('Todos los campos con * son obligatorios', 'error');
      return;
    }

    APP.loading(true, 'reg-btn');
    try {
      const data = await API.post({ action: 'auto-registro', dni, apellidos, nombres, empresa, cargo });
      _doLogin(data);
      APP.toast('Registro exitoso. ¡Bienvenido!', 'success');
      // Invalidar caché de cargos para que el nuevo cargo aparezca la próxima vez
      API.invalidate('ed_cargos');
    } catch (ex) {
      APP.toast(ex.message, 'error');
    } finally {
      APP.loading(false, 'reg-btn');
    }
  }

  function _doLogin(data) {
    APP.setSession(data);
    document.getElementById('login-dni').value     = '';
    document.getElementById('login-pwd').value     = '';
    document.getElementById('reg-apellidos').value = '';
    document.getElementById('reg-nombres').value   = '';
    document.getElementById('reg-empresa').value   = '';
    document.getElementById('reg-cargo').value     = '';
    document.getElementById('login-pwd-wrap').classList.add('hidden');
    document.getElementById('login-registro').classList.add('hidden');
    document.getElementById('login-error').classList.add('hidden');
    _needPwd   = false;
    _dniActual = '';
    APP._afterLogin();
  }

  return { onDniInput, submit, onRegInput, registrar };
})();
