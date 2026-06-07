// ═══════════════════════════════════════════════════════════════
//  LOGIN VIEW — con soporte de contraseña para masters
// ═══════════════════════════════════════════════════════════════

var LOGIN = {
  _pending:  null,
  _timer:    null,

  reset: function () {
    var el = document.getElementById('login-dni');
    if (el) el.value = '';
    var ui = document.getElementById('login-user-info');
    if (ui) ui.style.display = 'none';
    var ps = document.getElementById('login-pwd-section');
    if (ps) ps.style.display = 'none';
    var mb = document.getElementById('login-btn-main');
    if (mb) { mb.style.display = 'block'; mb.disabled = true; }
    var msg = document.getElementById('login-msg');
    if (msg) msg.innerHTML = '';
    var pe = document.getElementById('login-pwd-err');
    if (pe) pe.innerHTML = '';
    var pi = document.getElementById('login-pwd-input');
    if (pi) pi.value = '';
    var lc = document.getElementById('login-clear');
    if (lc) lc.style.display = 'none';
    LOGIN._pending = null;
    for (var i = 0; i < 8; i++) {
      var d = document.getElementById('dot-' + i);
      if (d) d.style.background = 'var(--border)';
    }
    var av = document.getElementById('login-avatar');
    if (av) av.style.background = 'var(--primary)';
    var rs = document.getElementById('login-reg-section');
    if (rs) rs.style.display = 'none';
    var ra = document.getElementById('reg-apellidos');
    if (ra) ra.value = '';
    var rn = document.getElementById('reg-nombres');
    if (rn) rn.value = '';
    var rm = document.getElementById('reg-msg');
    if (rm) rm.innerHTML = '';
  },

  onInput: function (val) {
    val = val.replace(/\D/g, '');
    document.getElementById('login-dni').value = val;

    for (var i = 0; i < 8; i++) {
      var d = document.getElementById('dot-' + i);
      if (d) d.style.background = i < val.length ? 'var(--primary)' : 'var(--border)';
    }
    var loginClear = document.getElementById('login-clear');
    if (loginClear) loginClear.style.display = val ? 'block' : 'none';
    var loginMsg = document.getElementById('login-msg');
    if (loginMsg) loginMsg.innerHTML = '';
    var loginInfo = document.getElementById('login-user-info');
    if (loginInfo) loginInfo.style.display = 'none';
    var loginPwd = document.getElementById('login-pwd-section');
    if (loginPwd) loginPwd.style.display = 'none';
    var loginBtn = document.getElementById('login-btn-main');
    if (loginBtn) {
      loginBtn.style.display = 'block';
      loginBtn.disabled = val.length < 7;
    }
    LOGIN._pending = null;

    clearTimeout(LOGIN._timer);
    if (val.length === 8) LOGIN._timer = setTimeout(LOGIN.doLogin, 400);
  },

  doLogin: function () {
    var dni = document.getElementById('login-dni').value.trim();
    if (dni.length < 7) return;
    var btn = document.getElementById('login-btn-main');
    setLoading(btn, true);
    document.getElementById('login-msg').innerHTML = '';
    vibrate(30);

    API.login(dni)
      .then(function (res) {
        setLoading(btn, false);
        if (!res.ok) {
          LOGIN.showError(res.msg || 'DNI no encontrado');
          if (res.notFound) LOGIN.showRegisterPrompt();
          vibrate([50,30,50]);
          return;
        }

        // Master con contraseña requerida → pedir contraseña
        if (res.needPassword) {
          LOGIN._pending = res;
          LOGIN.showUserChip(res);
          document.getElementById('login-btn-main').style.display    = 'none';
          document.getElementById('login-pwd-section').style.display = 'block';
          setTimeout(function () { document.getElementById('login-pwd-input').focus(); }, 100);
          vibrate(50);
          return;
        }

        // Login directo (no-master o master sin contraseña configurada)
        vibrate([50, 30, 100]);
        APP.afterLogin(res);
      })
      .catch(function () { setLoading(btn, false); LOGIN.showError('Error de conexión'); });
  },

  submitPassword: function () {
    var pwd = document.getElementById('login-pwd-input').value.trim();
    if (!pwd) { document.getElementById('login-pwd-err').innerHTML = '<div class="alert-err" style="margin-top:6px"><span class="material-icons" style="font-size:1rem">lock</span> Ingresa la contraseña</div>'; return; }
    var dni = document.getElementById('login-dni').value.trim();
    var btn = document.getElementById('login-btn-pwd');
    setLoading(btn, true);
    document.getElementById('login-pwd-err').innerHTML = '';
    vibrate(30);

    API.login(dni, pwd)
      .then(function (res) {
        setLoading(btn, false);
        if (!res.ok) {
          document.getElementById('login-pwd-err').innerHTML =
            '<div class="alert-err" style="margin-top:6px"><span class="material-icons" style="font-size:1rem">lock</span> ' + (res.msg || 'Contraseña incorrecta') + '</div>';
          document.getElementById('login-pwd-input').value = '';
          document.getElementById('login-pwd-input').focus();
          vibrate([60,30,60]);
          return;
        }
        LOGIN._pending = res;
        vibrate([60,30,100]);
        APP.afterLogin(res);
      })
      .catch(function () {
        setLoading(btn, false);
        document.getElementById('login-pwd-err').innerHTML = '<div class="alert-err" style="margin-top:6px">Error de conexión</div>';
      });
  },

  showUserChip: function (user) {
    var initials = user.nombre.split(' ').slice(0,2).map(function(w){return w[0]||'';}).join('');
    var avatar = document.getElementById('login-avatar');
    var nombre = document.getElementById('login-nombre');
    var cargo  = document.getElementById('login-cargo');
    var info   = document.getElementById('login-user-info');
    if (avatar) avatar.textContent = initials;
    if (nombre) nombre.textContent = user.nombre;
    if (cargo)  cargo.textContent = (user.master ? '⭐ MASTER · ' : '') + (user.cargo || 'Personal');
    if (avatar) avatar.style.background = user.master ? '#b71c1c' : 'var(--primary)';
    if (info) info.style.display  = 'block';
  },

  clear: function () {
    document.getElementById('login-dni').value = '';
    LOGIN.reset();
    document.getElementById('login-dni').focus();
  },

  showRegisterPrompt: function () {
    var rs = document.getElementById('login-reg-section');
    if (rs) rs.style.display = 'block';
    var mb = document.getElementById('login-btn-main');
    if (mb) mb.style.display = 'none';
    setTimeout(function () {
      var el = document.getElementById('reg-apellidos');
      if (el) el.focus();
    }, 150);
  },

  hideRegister: function () {
    var rs = document.getElementById('login-reg-section');
    if (rs) rs.style.display = 'none';
    var mb = document.getElementById('login-btn-main');
    if (mb) { mb.style.display = 'block'; mb.disabled = false; }
    document.getElementById('login-msg').innerHTML = '';
    var rm = document.getElementById('reg-msg');
    if (rm) rm.innerHTML = '';
  },

  doRegister: function () {
    var dni      = (document.getElementById('login-dni').value || '').trim();
    var apellidos = (document.getElementById('reg-apellidos').value || '').trim();
    var nombres   = (document.getElementById('reg-nombres').value || '').trim();
    var rmsg = document.getElementById('reg-msg');
    if (!apellidos) { rmsg.innerHTML = '<div class="alert-err" style="margin-top:6px"><span class="material-icons" style="font-size:1rem">error_outline</span> Ingresa tus apellidos</div>'; return; }
    if (!nombres)   { rmsg.innerHTML = '<div class="alert-err" style="margin-top:6px"><span class="material-icons" style="font-size:1rem">error_outline</span> Ingresa tus nombres</div>'; return; }
    var btn = document.getElementById('reg-btn');
    setLoading(btn, true);
    rmsg.innerHTML = '';
    vibrate(30);
    API.register(dni, apellidos, nombres)
      .then(function (res) {
        setLoading(btn, false);
        if (!res.ok) {
          rmsg.innerHTML = '<div class="alert-err" style="margin-top:6px"><span class="material-icons" style="font-size:1rem">error_outline</span>' + (res.msg || 'Error al registrar') + '</div>';
          vibrate([50,30,50]);
          return;
        }
        vibrate([50,30,100]);
        toast('Registro exitoso. ¡Bienvenido!', 'success');
        APP.afterLogin(res);
      })
      .catch(function () {
        setLoading(btn, false);
        rmsg.innerHTML = '<div class="alert-err" style="margin-top:6px">Error de conexión</div>';
      });
  },

  showError: function (msg) {
    document.getElementById('login-msg').innerHTML =
      '<div class="alert-err"><span class="material-icons" style="font-size:1.1rem">error_outline</span>' + msg + '</div>';
  }
};
