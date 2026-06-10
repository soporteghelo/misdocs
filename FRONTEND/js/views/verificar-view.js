// ── VERIFICAR VIEW (público) ──────────────────────────────────────
const VERIFICAR = {
  async cargar(id) {
    const el = document.getElementById('verificar-content');
    if (!id) {
      el.innerHTML = '<div class="alert alert-error">No se especificó un ID de certificado.</div>';
      return;
    }
    el.innerHTML = '<div style="text-align:center;padding:24px"><span class="material-icons" style="animation:spin 1s linear infinite;font-size:2rem">refresh</span></div>';
    try {
      const e = await API.get({ action: 'verificar', id });
      el.innerHTML = `
        <div class="verify-valid">
          <div class="verify-icon">✅</div>
          <div class="verify-title">Certificado válido</div>
          <div class="verify-id">N° ${e.id}</div>
        </div>
        <div class="verify-row"><span>Fecha</span><strong>${e.fecha} ${e.hora}</strong></div>
        <div class="verify-row"><span>Receptor</span><strong>${e.nombreReceptor}</strong></div>
        <div class="verify-row"><span>DNI Receptor</span><strong>${e.dniReceptor}</strong></div>
        <div class="verify-row"><span>Cargo</span><strong>${e.cargoReceptor || '—'}</strong></div>
        <div class="verify-row"><span>Empresa</span><strong>${e.empresaReceptor || '—'}</strong></div>
        <div class="verify-row"><span>Tipo de entrega</span><strong>${e.tipoEntrega}</strong></div>
        <div class="verify-row"><span>Tipo de documento</span><strong>${e.tipoDocumento}</strong></div>
        <div class="verify-row"><span>Entregador</span><strong>${e.nombreEntregador}</strong></div>
        <div class="verify-row"><span>Descripción</span><span>${e.descripcion || '—'}</span></div>
        <div class="verify-row"><span>Hash</span><code style="font-size:.72rem">${e.hash || '—'}</code></div>
        ${e.pdfUrl ? `<a class="btn btn-primary btn-full mt-16" href="${e.pdfUrl}" target="_blank">
          <span class="material-icons">picture_as_pdf</span> Descargar vale original
        </a>` : ''}`;
    } catch (ex) {
      el.innerHTML = `<div class="verify-valid">
        <div class="verify-icon">❌</div>
        <div class="verify-title">Certificado no encontrado</div>
        <p style="color:var(--text-muted);font-size:.88rem;margin-top:8px">El ID "${id}" no existe o fue eliminado.</p>
      </div>`;
    }
  }
};
