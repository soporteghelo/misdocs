const CFG = {
  async guardar() {
    const url = document.getElementById('cfg-sheets-url').value.trim();
    if (!url) { APP.toast('Ingresa la URL de Sheets', 'error'); return; }
    try {
      APP.loading(true, 'cfg-btn');
      await API.post({ action: 'config', sheetsUrl: url });
      APP.toast('Configuración guardada ✓', 'success');
      APP.navigate('login');
    } catch (ex) {
      APP.toast(ex.message, 'error');
    } finally {
      APP.loading(false, 'cfg-btn');
    }
  }
};
