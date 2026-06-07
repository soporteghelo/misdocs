// ═══════════════════════════════════════════════════════════════
//  CONFIG VIEW — Asistente de configuración inicial
// ═══════════════════════════════════════════════════════════════

var CONFIG_VIEW = {
  _step: 1,
  _sheetsUrl: '',

  render: function () {
    document.getElementById('view-config').innerHTML = `
    <div class="cfg-bg">
      <div class="cfg-card">
        <div style="text-align:center;margin-bottom:20px">
          <div style="font-size:2.8rem">🔧</div>
          <h1 style="font-size:1.2rem;font-weight:800;color:var(--primary)">HERRAMIENTAS SCAN</h1>
          <p style="font-size:.8rem;color:var(--text-muted);margin-top:4px">Configuración inicial · Paso <span id="cfg-step-num">1</span> de 2</p>
        </div>

        <!-- Step indicators -->
        <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:22px">
          <div class="cfg-step-dot active" id="dot-1">1</div>
          <div style="height:2px;width:50px;background:var(--border)"></div>
          <div class="cfg-step-dot" id="dot-2">2</div>
        </div>

        <!-- Step 1: Sheets -->
        <div id="cfg-s1">
          <div class="cfg-icon-row">
            <span class="material-icons" style="color:#1a237e;font-size:1.8rem">table_chart</span>
            <div>
              <div style="font-weight:700">Google Sheets</div>
              <div style="font-size:.8rem;color:var(--text-muted)">Base de datos de la app</div>
            </div>
          </div>
          <div class="form-group" style="margin-top:14px">
            <label class="form-label">URL del Google Sheets</label>
            <div class="cfg-input-wrap">
              <span class="material-icons cfg-icon-left">link</span>
              <input id="cfg-sheets-url" type="url" class="form-control" style="padding-left:40px;padding-right:42px"
                placeholder="https://docs.google.com/spreadsheets/d/…"
                oninput="CONFIG_VIEW.onSheetsInput(this.value)">
              <button class="cfg-paste-btn" onclick="CONFIG_VIEW.paste('cfg-sheets-url')">
                <span class="material-icons">content_paste</span>
              </button>
            </div>
            <div id="cfg-sheets-msg" style="font-size:.78rem;margin-top:5px;min-height:18px"></div>
          </div>
          <div class="cfg-hint"><span class="material-icons" style="font-size:1rem;color:var(--accent)">info</span>Crea un Sheets en blanco y pega su URL aquí.</div>
          <button class="btn btn-primary" id="cfg-btn-1" onclick="CONFIG_VIEW.nextStep()" style="margin-top:16px">
            <span class="material-icons">arrow_forward</span> Verificar y Continuar
          </button>
        </div>

        <!-- Step 2: Drive -->
        <div id="cfg-s2" style="display:none">
          <div class="cfg-icon-row">
            <span class="material-icons" style="color:#2e7d32;font-size:1.8rem">folder</span>
            <div>
              <div style="font-weight:700">Google Drive</div>
              <div style="font-size:.8rem;color:var(--text-muted)">Carpeta donde se guardan los archivos</div>
            </div>
          </div>
          <div class="form-group" style="margin-top:14px">
            <label class="form-label">URL de la carpeta Drive</label>
            <div class="cfg-input-wrap">
              <span class="material-icons cfg-icon-left">folder_open</span>
              <input id="cfg-drive-url" type="url" class="form-control" style="padding-left:40px;padding-right:42px"
                placeholder="https://drive.google.com/drive/folders/…"
                oninput="CONFIG_VIEW.onDriveInput(this.value)">
              <button class="cfg-paste-btn" onclick="CONFIG_VIEW.paste('cfg-drive-url')">
                <span class="material-icons">content_paste</span>
              </button>
            </div>
            <div id="cfg-drive-msg" style="font-size:.78rem;margin-top:5px;min-height:18px"></div>
          </div>
          <div class="cfg-hint"><span class="material-icons" style="font-size:1rem;color:var(--accent)">info</span>Abre la carpeta en Drive y copia la URL del navegador.</div>
          <div style="display:flex;gap:8px;margin-top:16px">
            <button class="btn btn-outline btn-sm" onclick="CONFIG_VIEW.goStep(1)" style="flex-shrink:0;padding:0 16px;min-height:50px;margin-top:0">
              <span class="material-icons">arrow_back</span>
            </button>
            <button class="btn btn-primary" id="cfg-btn-2" onclick="CONFIG_VIEW.finish()" style="flex:1;margin-top:0">
              <span class="material-icons">rocket_launch</span> Inicializar App
            </button>
          </div>
        </div>

        <!-- Success -->
        <div id="cfg-success" style="display:none;text-align:center;padding:20px 0">
          <div style="font-size:3.5rem;margin-bottom:10px">✅</div>
          <h2 style="color:var(--success);margin-bottom:6px">¡App configurada!</h2>
          <p style="font-size:.85rem;color:var(--text-muted);margin-bottom:16px">Sheets inicializado con todas las pestañas.</p>
          <div style="background:#fff3cd;border-radius:10px;padding:10px 14px;font-size:.8rem;color:#856404;margin-bottom:18px;text-align:left">
            <strong>⚠️ Paso importante:</strong> Abre el Sheets → pestaña <strong>PERSONAL</strong> → celda A2 → acepta el permiso de <strong>IMPORTRANGE</strong>.
          </div>
          <button class="btn btn-primary" onclick="CONFIG_VIEW.enter()">
            <span class="material-icons">login</span> Ingresar a la App
          </button>
        </div>
      </div>
    </div>`;
  },

  onSheetsInput: function (val) {
    this._sheetsUrl = val;
    var msg = document.getElementById('cfg-sheets-msg');
    if (val.includes('spreadsheets/d/')) { msg.innerHTML = '<span style="color:var(--success)">✓ URL detectada</span>'; }
    else if (val.length > 10)            { msg.innerHTML = '<span style="color:var(--danger)">URL inválida — copia desde el navegador</span>'; }
    else                                 { msg.innerHTML = ''; }
  },

  onDriveInput: function (val) {
    var msg = document.getElementById('cfg-drive-msg');
    if (val.includes('folders/')) { msg.innerHTML = '<span style="color:var(--success)">✓ Carpeta detectada</span>'; }
    else if (val.length > 10)     { msg.innerHTML = '<span style="color:var(--danger)">URL inválida — debe contener /folders/</span>'; }
    else                          { msg.innerHTML = ''; }
  },

  nextStep: function () {
    var url = document.getElementById('cfg-sheets-url').value.trim();
    if (!url || (!url.includes('spreadsheets') && !/^[a-zA-Z0-9_-]{25,}$/.test(url))) {
      document.getElementById('cfg-sheets-msg').innerHTML = '<span style="color:var(--danger)">Ingresa la URL del Sheets</span>'; return;
    }
    this._sheetsUrl = url;
    this.goStep(2);
  },

  goStep: function (n) {
    document.getElementById('cfg-s1').style.display = n === 1 ? 'block' : 'none';
    document.getElementById('cfg-s2').style.display = n === 2 ? 'block' : 'none';
    document.getElementById('cfg-step-num').textContent = n;
    document.getElementById('dot-1').className = 'cfg-step-dot' + (n >= 1 ? ' active' : '');
    document.getElementById('dot-2').className = 'cfg-step-dot' + (n >= 2 ? ' active' : '');
  },

  finish: function () {
    var driveUrl = document.getElementById('cfg-drive-url').value.trim();
    if (!driveUrl || !driveUrl.includes('folders')) {
      document.getElementById('cfg-drive-msg').innerHTML = '<span style="color:var(--danger)">Ingresa la URL de la carpeta</span>'; return;
    }
    var btn = document.getElementById('cfg-btn-2');
    setLoading(btn, true);
    API.saveConfig(this._sheetsUrl, driveUrl, '')
      .then(function (res) {
        setLoading(btn, false);
        if (!res.ok) { document.getElementById('cfg-drive-msg').innerHTML = '<span style="color:var(--danger)">' + res.msg + '</span>'; return; }
        document.getElementById('cfg-s2').style.display      = 'none';
        document.getElementById('cfg-success').style.display = 'block';
        vibrate([80, 40, 80]);
        API.tipos().then(function (t) { APP.tipos = Array.isArray(t) ? t : []; });
      })
      .catch(function () { setLoading(btn, false); toast('Error de conexión', 'error'); });
  },

  enter: function () { APP.showView('login'); },

  paste: function (id) {
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(function (t) {
        var el = document.getElementById(id); el.value = t; el.dispatchEvent(new Event('input'));
      }).catch(function () { document.getElementById(id).focus(); });
    } else { document.getElementById(id).focus(); toast('Usa Ctrl+V para pegar', 'warning'); }
  }
};
