// ── ENTREGA VIEW — 5 pasos ────────────────────────────────────────
const ENTREGA = (() => {
  let _step = 1;
  const TOTAL_STEPS = 4;
  let _sigReceptor   = null;
  let _sigEntregador = null;
  let _fotoReceptorB64   = null;
  let _fotoEntregadorB64 = null;
  let _fotoReceptorTime   = null;
  let _fotoEntregadorTime = null;
  let _entregadores = [];
  let _entregadorSel = null;
  let _tipoEntrega   = null;
  let _geo = 'NO DISPONIBLE';

  // Hora peruana (America/Lima, UTC-5)
  function _horaPeru() {
    const now = new Date();
    const opt = { timeZone: 'America/Lima' };
    return {
      fecha: now.toLocaleDateString('es-PE', opt),
      hora:  now.toLocaleTimeString('es-PE', { ...opt, hour12: true })
    };
  }

  // ── Init ─────────────────────────────────────────────────────
  async function init() {
    _reset();
    _renderStep(1);
    await _cargarDatos();
    _pedirGeo();
  }

  function _reset() {
    _step = 1;
    _sigReceptor = null;
    _sigEntregador = null;
    _fotoReceptorB64 = null;
    _fotoEntregadorB64 = null;
    _fotoReceptorTime = null;
    _fotoEntregadorTime = null;
    _entregadorSel = null;
    _tipoEntrega = null;
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tipo-documento').value = '';
    const _otro = document.getElementById('tipo-documento-otro');
    if (_otro) { _otro.value = ''; _otro.classList.add('hidden'); }
    document.getElementById('descripcion').value = '';
    document.getElementById('entregador-search').value = '';
    document.getElementById('entregador-selected').classList.add('hidden');
    document.getElementById('entregador-firma-section').classList.add('hidden');
    document.getElementById('entregador-foto-section').classList.add('hidden');
    _resetFotoPreview('receptor');
    _resetFotoPreview('entregador');
  }

  async function _cargarDatos() {
    try {
      const [tipos, ents] = await Promise.all([
        API.get({ action: 'tipos' }, 'ed_tipos', 900),
        API.get({ action: 'entregadores' }, 'ed_entregadores', 600)
      ]);
      _entregadores = ents;
      const sel = document.getElementById('tipo-documento');
      sel.innerHTML = '<option value="">— Selecciona —</option>' +
        tipos.map(t => `<option value="${t.tipo}">${t.tipo}</option>`).join('');
    } catch (ex) {
      APP.toast('Error cargando datos: ' + ex.message, 'error');
    }
  }

  function _pedirGeo() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => { _geo = pos.coords.latitude.toFixed(6) + ',' + pos.coords.longitude.toFixed(6); },
      ()  => { _geo = 'NO DISPONIBLE'; },
      { timeout: 8000 }
    );
  }

  // ── Paso a paso ───────────────────────────────────────────────
  function _renderStep(n) {
    for (let i = 1; i <= TOTAL_STEPS; i++) {
      document.getElementById('entrega-step-' + i)?.classList.toggle('hidden', i !== n);
    }
    const pct = ((n - 1) / (TOTAL_STEPS - 1)) * 100;
    document.getElementById('step-progress').style.width = pct + '%';
    document.getElementById('step-label').textContent = `Paso ${n} de ${TOTAL_STEPS}`;
    _step = n;

    if (n === 1 && !_sigReceptor) setTimeout(() => _initSig('receptor'), 60);
    if (n === 3) _initSigEntregador();
    if (n === 4) _renderResumen();
  }

  async function nextStep() {
    if (!_validateStep(_step)) return;
    if (_step < TOTAL_STEPS) _renderStep(_step + 1);
  }

  function prevStep() {
    if (_step > 1) _renderStep(_step - 1);
  }

  function _validateStep(s) {
    if (s === 1) {
      if (!_tipoEntrega) { APP.toast('Selecciona el tipo de entrega', 'error'); return false; }
      if (!document.getElementById('tipo-documento').value) { APP.toast('Selecciona el tipo de documento', 'error'); return false; }
      if (!_tipoDocumento()) { APP.toast('Especifica el tipo de documento', 'error'); return false; }
      if (!document.getElementById('descripcion').value.trim()) { APP.toast('Describe qué se entrega', 'error'); return false; }
      if (!_sigReceptor || _sigReceptor.isEmpty()) { APP.toast('Debes firmar', 'error'); return false; }
      return true;
    }
    if (s === 2) {
      if (!_fotoReceptorB64) { APP.toast('Debes tomar tu foto', 'error'); return false; }
      return true;
    }
    if (s === 3) {
      // Solo el entregador es obligatorio; firma y foto son opcionales
      if (!_entregadorSel) { APP.toast('Selecciona al entregador', 'error'); return false; }
      return true;
    }
    return true;
  }

  // ── Tipo de entrega ───────────────────────────────────────────
  function selectTipoEntrega(btn) {
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _tipoEntrega = btn.dataset.val;
  }

  // ── Tipo de documento (muestra campo libre si es "Otros") ─────
  // Detecta la opción "Otros" de forma flexible (Otro, Otros, Otros documentos…)
  function _esOtros(val) {
    return String(val || '').trim().toLowerCase().startsWith('otro');
  }

  function onTipoDocChange() {
    const val = document.getElementById('tipo-documento').value;
    const otro = document.getElementById('tipo-documento-otro');
    const esOtros = _esOtros(val);
    otro.classList.toggle('hidden', !esOtros);
    if (esOtros) otro.focus(); else otro.value = '';
  }

  // Valor efectivo del tipo de documento (usa el campo libre si es "Otros")
  function _tipoDocumento() {
    const val = document.getElementById('tipo-documento').value;
    if (_esOtros(val)) {
      return document.getElementById('tipo-documento-otro').value.trim();
    }
    return val;
  }

  // ── Firmas ────────────────────────────────────────────────────
  function _initSig(who) {
    const canvasId = 'canvas-' + who;
    const canvas   = document.getElementById(canvasId);
    if (!canvas) return;
    canvas.width  = canvas.offsetWidth  * (window.devicePixelRatio || 1);
    canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
    canvas.getContext('2d').scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    const sig = new SignaturePad(canvas, { penColor: '#1e293b', backgroundColor: '#ffffff' });
    if (who === 'receptor')   _sigReceptor   = sig;
    if (who === 'entregador') _sigEntregador = sig;
  }

  function _initSigEntregador() {
    if (!_sigEntregador) _initSig('entregador');
    else _sigEntregador.clear();
  }

  function clearSig(who) {
    if (who === 'receptor'   && _sigReceptor)   _sigReceptor.clear();
    if (who === 'entregador' && _sigEntregador) _sigEntregador.clear();
  }

  // ── Fotos (via CAM modal) ─────────────────────────────────────
  function abrirCamara(who) {
    // 'user' para selfie receptor, 'environment' para foto entregador
    const facing = who === 'receptor' ? 'user' : 'user';
    const title  = who === 'receptor' ? 'Tu foto (receptor)' : 'Foto del entregador';
    document.getElementById('cam-title').textContent = title;

    CAM.abrir(facing, b64 => {
      const t = _horaPeru();
      const stamp = t.fecha + ' ' + t.hora;
      if (who === 'receptor')   { _fotoReceptorB64   = b64; _fotoReceptorTime   = stamp; }
      if (who === 'entregador') { _fotoEntregadorB64 = b64; _fotoEntregadorTime = stamp; }
      _actualizarFotoPreview(who, b64);
    });
  }

  function _actualizarFotoPreview(who, b64) {
    const prev = document.getElementById('foto-' + who + '-preview');
    if (prev) prev.innerHTML = `<img src="data:image/jpeg;base64,${b64}" alt="foto ${who}">`;
  }

  function _resetFotoPreview(who) {
    const prev = document.getElementById('foto-' + who + '-preview');
    if (prev) prev.innerHTML = '<span class="material-icons photo-placeholder-icon">face</span>';
  }

  // ── Entregador dropdown ───────────────────────────────────────
  function _renderItems(q) {
    const dd = document.getElementById('entregador-dropdown');
    if (!dd) return;
    if (!_entregadores.length) {
      dd.innerHTML = '<div class="dropdown-item text-muted">Sin entregadores cargados</div>';
      return;
    }
    const matches = _entregadores.filter(e =>
      e.nombre.toLowerCase().includes(q) || e.cargo.toLowerCase().includes(q)
    );
    dd.innerHTML = matches.length
      ? matches.map(e =>
          `<div class="dropdown-item" onmousedown="event.preventDefault();ENTREGA.selEntregador(${JSON.stringify(e).replace(/"/g,'&quot;')})">
            <strong>${e.nombre}</strong>
            <div class="item-cargo">${e.cargo}${e.area ? ' · ' + e.area : ''}</div>
          </div>`
        ).join('')
      : '<div class="dropdown-item text-muted">Sin resultados</div>';
  }

  function filtrarEntregadores(val) {
    _renderItems((val || '').toLowerCase());
    document.getElementById('entregador-dropdown').classList.remove('hidden');
  }

  function showDropdown() {
    _renderItems(document.getElementById('entregador-search').value.toLowerCase());
    document.getElementById('entregador-dropdown').classList.remove('hidden');
  }

  function hideDropdown() {
    // Delay para que onmousedown del item se ejecute antes del blur
    setTimeout(() => {
      document.getElementById('entregador-dropdown').classList.add('hidden');
    }, 150);
  }

  function selEntregador(ent) {
    _entregadorSel = ent;
    document.getElementById('entregador-search').value = ent.nombre;
    document.getElementById('entregador-dropdown').classList.add('hidden');
    const chip = document.getElementById('entregador-selected');
    chip.innerHTML = `<span class="material-icons">person</span>${ent.nombre} — ${ent.cargo}`;
    chip.classList.remove('hidden');
    document.getElementById('entregador-firma-section').classList.remove('hidden');
    document.getElementById('entregador-foto-section').classList.remove('hidden');
    setTimeout(() => _initSig('entregador'), 100);
  }

  // ── Resumen ───────────────────────────────────────────────────
  function _renderResumen() {
    const s = APP.getSession();
    const simple = [
      ['Tipo de entrega',  _tipoEntrega],
      ['Tipo de documento', _tipoDocumento()],
      ['Descripción',      document.getElementById('descripcion').value]
    ];
    let html = simple.map(([l, v]) =>
      `<div class="summary-row"><span class="summary-label">${l}</span><span class="summary-value">${v || '—'}</span></div>`
    ).join('');
    // Filas con foto: receptor y entregador
    html += _summaryPersonRow('Receptor', s.nombre + ' — ' + s.cargo, _fotoReceptorB64, 'receptor');
    html += _summaryPersonRow('Entregador',
      (_entregadorSel?.nombre || '') + ' — ' + (_entregadorSel?.cargo || ''), _fotoEntregadorB64, 'entregador');
    document.getElementById('resumen-entrega').innerHTML = html;
  }

  function _summaryPersonRow(label, value, fotoB64, who) {
    const foto = fotoB64
      ? `<img class="summary-foto summary-foto-click" src="data:image/jpeg;base64,${fotoB64}"
           alt="foto ${label}" title="Ver foto" onclick="ENTREGA.ampliarFoto('${who}')">`
      : `<span class="summary-foto summary-foto-empty material-icons">person</span>`;
    return `<div class="summary-row">
      <span class="summary-label">${label}</span>
      <span class="summary-value summary-value-foto">${foto}<span>${value || '—'}</span></span>
    </div>`;
  }

  // ── Visor de foto ampliada (lightbox) ─────────────────────────
  function ampliarFoto(who) {
    const b64 = who === 'receptor' ? _fotoReceptorB64 : _fotoEntregadorB64;
    if (!b64) return;
    let lb = document.getElementById('foto-lightbox');
    if (!lb) {
      lb = document.createElement('div');
      lb.id = 'foto-lightbox';
      lb.className = 'foto-lightbox hidden';
      lb.innerHTML =
        '<div class="foto-lightbox-bar">' +
          '<button class="foto-lightbox-back" onclick="ENTREGA.cerrarFoto()">' +
            '<span class="material-icons">arrow_back</span> Volver' +
          '</button>' +
        '</div>' +
        '<div class="foto-lightbox-body"><img id="foto-lightbox-img" alt="foto ampliada"></div>';
      lb.addEventListener('click', e => { if (e.target === lb) cerrarFoto(); });
      document.body.appendChild(lb);
    }
    document.getElementById('foto-lightbox-img').src = 'data:image/jpeg;base64,' + b64;
    lb.classList.remove('hidden');
  }

  function cerrarFoto() {
    const lb = document.getElementById('foto-lightbox');
    if (lb) lb.classList.add('hidden');
  }

  // ── Confirmar y generar PDF ───────────────────────────────────
  async function confirmar() {
    const btn = document.getElementById('btn-confirmar');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons" style="animation:spin 1s linear infinite">refresh</span> Generando...';

    try {
      const s = APP.getSession();
      const t = _horaPeru();
      const fecha = t.fecha;
      const hora  = t.hora;
      const tipoDocumento = _tipoDocumento();
      const descripcion   = document.getElementById('descripcion').value;

      // Obtener imágenes de firmas comprimidas
      const firmaReceptorB64   = _exportSig(_sigReceptor);
      const firmaEntregadorB64 = _exportSig(_sigEntregador);

      // Generar PDF liviano en el navegador
      const { pdfBase64, previewId } = await _generarPDF({
        fecha, hora,
        receptor: s,
        tipoEntrega:    _tipoEntrega,
        tipoDocumento:  tipoDocumento,
        descripcion:    descripcion,
        entregador:     _entregadorSel,
        firmaReceptorB64,
        firmaEntregadorB64,
        fotoReceptorB64:   _fotoReceptorB64,
        fotoEntregadorB64: _fotoEntregadorB64,
        fotoReceptorTime:   _fotoReceptorTime,
        fotoEntregadorTime: _fotoEntregadorTime,
        geo: _geo
      });

      // Enviar a servidor para guardar en Sheets + Drive
      const res = await API.post({
        action: 'registrar-entrega',
        dniReceptor:     s.dni,
        nombreReceptor:  s.nombre,
        empresaReceptor: s.empresa,
        cargoReceptor:   s.cargo,
        tipoEntrega:     _tipoEntrega,
        tipoDocumento:   tipoDocumento,
        descripcion:     descripcion,
        nombreEntregador: _entregadorSel.nombre,
        geolocalizacion: _geo,
        firmaReceptorB64,
        pdfBase64
      });

      // Re-generar PDF con el ID real del servidor y descargarlo
      const pdfFinal = await _generarPDF({
        fecha: res.fecha || fecha,
        hora:  res.hora  || hora,
        id:    res.id,
        hash:  res.hash,
        receptor: s,
        tipoEntrega:    _tipoEntrega,
        tipoDocumento:  tipoDocumento,
        descripcion:    descripcion,
        entregador:     _entregadorSel,
        firmaReceptorB64,
        firmaEntregadorB64,
        fotoReceptorB64:   _fotoReceptorB64,
        fotoEntregadorB64: _fotoEntregadorB64,
        fotoReceptorTime:   _fotoReceptorTime,
        fotoEntregadorTime: _fotoEntregadorTime,
        geo: _geo
      });

      _descargarPDF(pdfFinal.pdfBase64, res.id + '.pdf');
      APP.toast('Vale generado y guardado ✓', 'success');
      APP.navigate('mis-entregas');

    } catch (ex) {
      APP.toast('Error: ' + ex.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons">verified</span> Confirmar y descargar vale';
    }
  }

  function _exportSig(sig) {
    if (!sig || sig.isEmpty()) return null;
    // Dibujar DIRECTO del canvas vivo del SignaturePad (ya renderizado).
    // Antes se usaba una Image() async y se dibujaba antes de cargar → firma vacía.
    const src = sig.canvas;
    if (!src) return null;
    // Proporción ancha 420×130 para llenar bien la caja de firma del vale
    const c = document.createElement('canvas');
    c.width = 420; c.height = 130;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(src, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.65).split(',')[1];
  }

  async function _generarPDF(d) {
    const { jsPDF } = window.jspdf;
    // A5 = mitad de A4 (148 × 210 mm)
    const doc = new jsPDF({ unit: 'mm', format: 'a5', compress: true });
    const W = 148, M = 10;        // ancho A5 y margen lateral
    const CW = W - M * 2;         // ancho útil = 128
    let y;

    // ── Cabecera ──
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, W, 19, 'F');
    doc.setTextColor(255, 255, 255);
    // Título dinámico según el tipo de documento (en mayúsculas)
    const tipoUpper = String(d.tipoDocumento || 'DOCUMENTO').toUpperCase();
    const titulo = 'VALE DE ENTREGA DE ' + tipoUpper;
    doc.setFont('helvetica', 'bold');
    let titleSize = 12;
    doc.setFontSize(titleSize);
    const maxTitleW = W - 14;
    while (titleSize > 7 && doc.getTextWidth(titulo) > maxTitleW) {
      titleSize -= 0.5;
      doc.setFontSize(titleSize);
    }
    doc.text(titulo, W / 2, 8.5, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    doc.text('Sistema de Gestión SSMA', W / 2, 13.5, { align: 'center' });
    if (d.id) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
      doc.text('N° ' + d.id, W / 2, 17.5, { align: 'center' });
    }
    y = 25;

    // ── Fecha / Hora del vale ──
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(M, y, CW, 8, 1.5, 1.5, 'FD');
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text('FECHA:', M + 3, y + 5.2);
    doc.setFont('helvetica', 'normal');
    doc.text(String(d.fecha || '—'), M + 17, y + 5.2);
    doc.setFont('helvetica', 'bold');
    doc.text('HORA:', M + 58, y + 5.2);
    doc.setFont('helvetica', 'normal');
    doc.text(String(d.hora || '—'), M + 71, y + 5.2);
    y += 11;

    // ── Documento entregado ──
    y = _seccion(doc, 'DOCUMENTO ENTREGADO', M, y, CW);
    const half = CW / 2;
    // Tipo de entrega | Categoría en dos columnas
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(100, 116, 139);
    doc.text('TIPO DE ENTREGA', M, y);
    doc.text('CATEGORÍA', M + half, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(30, 41, 59);
    doc.text(_trunc(doc, String(d.tipoEntrega || '—'), half - 4), M, y + 4.8);
    doc.text(_trunc(doc, String(d.tipoDocumento || '—'), half - 4), M + half, y + 4.8);
    y += 10;
    // Descripción a ancho completo dentro de una caja
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(100, 116, 139);
    doc.text('DESCRIPCIÓN', M, y);
    y += 1.5;
    let descLines = doc.splitTextToSize(String(d.descripcion || '—'), CW - 6);
    if (descLines.length > 3) { descLines = descLines.slice(0, 3); descLines[2] += '…'; }
    const dBoxH = Math.max(9, descLines.length * 4 + 5);
    doc.setFillColor(248, 250, 252); doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2);
    doc.roundedRect(M, y, CW, dBoxH, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(30, 41, 59);
    doc.text(descLines, M + 3, y + 5);
    y += dBoxH + 5;

    // ── Partes involucradas ──
    y = _seccion(doc, 'PARTES INVOLUCRADAS', M, y, CW);
    const colW = (CW - 4) / 2;
    const boxH = 18;
    const ex2  = M + colW + 4;
    // Receptor
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(M, y, colW, boxH, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
    doc.setTextColor(37, 99, 235);
    doc.text('RECEPTOR', M + 2.5, y + 4.5);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    doc.text(_trunc(doc, d.receptor.nombre, colW - 5), M + 2.5, y + 9);
    doc.text('DNI: ' + d.receptor.dni, M + 2.5, y + 13);
    doc.text(_trunc(doc, d.receptor.cargo || '', colW - 5), M + 2.5, y + 17);
    // Entregador
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(ex2, y, colW, boxH, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
    doc.setTextColor(22, 101, 52);
    doc.text('ENTREGADOR', ex2 + 2.5, y + 4.5);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    doc.text(_trunc(doc, d.entregador.nombre, colW - 5), ex2 + 2.5, y + 9);
    doc.text('DNI: ' + (d.entregador.dni || '—'), ex2 + 2.5, y + 13);
    doc.text(_trunc(doc, d.entregador.cargo || '', colW - 5), ex2 + 2.5, y + 17);
    y += boxH + 4;

    // ── Evidencias biométricas ──
    y = _seccion(doc, 'EVIDENCIAS BIOMÉTRICAS', M, y, CW);
    const evY = _evidencia(doc, M, y, colW, 'RECEPTOR', [37, 99, 235],
      d.fotoReceptorB64, d.fotoReceptorTime, d.firmaReceptorB64);
    // El bloque del entregador solo se dibuja si tiene foto o firma
    if (d.fotoEntregadorB64 || d.firmaEntregadorB64) {
      _evidencia(doc, ex2, y, colW, 'ENTREGADOR', [22, 101, 52],
        d.fotoEntregadorB64, d.fotoEntregadorTime, d.firmaEntregadorB64);
    }
    y = evY + 5;

    // ── Pie: autenticidad + nota legal (sin QR) ──
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2);
    doc.line(M, y, W - M, y);
    let dyy = y + 5;
    // Verificación + hash en una fila
    doc.setFontSize(6.5); doc.setTextColor(71, 85, 105);
    if (d.id) {
      doc.setFont('helvetica', 'bold'); doc.text('Verificación N°:', M, dyy);
      doc.setFont('helvetica', 'normal'); doc.text(String(d.id), M + 23, dyy);
    }
    if (d.hash) {
      doc.setFont('helvetica', 'bold'); doc.text('Hash:', M + 55, dyy);
      doc.setFont('helvetica', 'normal'); doc.text(String(d.hash), M + 66, dyy);
    }
    dyy += 4.5;
    if (d.geo && d.geo !== 'NO DISPONIBLE') {
      doc.setFont('helvetica', 'bold'); doc.text('Geolocalización:', M, dyy);
      doc.setFont('helvetica', 'normal'); doc.text(String(d.geo), M + 23, dyy);
      dyy += 4.5;
    }
    // Nota legal a todo el ancho
    doc.setFont('helvetica', 'italic'); doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    const legal = 'El receptor declara haber recibido conforme el(los) documento(s) detallado(s). '
      + 'Documento con validez como constancia de entrega, respaldado por firmas digitales y evidencia fotográfica.';
    const legalLines = doc.splitTextToSize(legal, CW);
    doc.text(legalLines, M, dyy + 1);

    const pdfBase64 = doc.output('datauristring').split(',')[1];
    return { pdfBase64 };
  }

  // Dibuja un bloque de evidencia: foto arriba, firma justo debajo. Devuelve la y final.
  function _evidencia(doc, x, y, colW, label, color, fotoB64, fotoTime, firmaB64) {
    const fW = 32, fH = 40;             // proporción ~3:4 de la captura
    const px = x + (colW - fW) / 2;     // foto centrada en la columna
    // Etiqueta
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(label, x, y + 3);
    // Sello de hora de la foto
    doc.setFont('helvetica', 'normal'); doc.setFontSize(5);
    doc.setTextColor(100, 116, 139);
    doc.text(fotoTime ? ('Tomada: ' + fotoTime) : 'Sin sello de hora', x, y + 6.5);
    // Foto
    const fy = y + 9;
    if (fotoB64) {
      try { doc.addImage('data:image/jpeg;base64,' + fotoB64, 'JPEG', px, fy, fW, fH); } catch {}
    } else {
      doc.setFillColor(226, 232, 240); doc.rect(px, fy, fW, fH, 'F');
      doc.setFontSize(6); doc.setTextColor(100, 116, 139);
      doc.text('Sin foto', px + fW / 2, fy + fH / 2, { align: 'center' });
    }
    // Firma justo debajo de la foto, a todo el ancho de la columna
    const sy = fy + fH + 3.5, sW = colW, sH = 16;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6);
    doc.setTextColor(30, 41, 59);
    doc.text('FIRMA', x, sy);
    doc.setFillColor(252, 252, 253);
    doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.2);
    doc.rect(x, sy + 1.5, sW, sH, 'FD');
    if (firmaB64) {
      try { doc.addImage('data:image/jpeg;base64,' + firmaB64, 'JPEG', x, sy + 1.5, sW, sH); } catch {}
    }
    return sy + 1.5 + sH;
  }

  // Cabecera de sección (barra azul). Devuelve la y debajo de la barra.
  function _seccion(doc, txt, x, y, CW) {
    doc.setFillColor(37, 99, 235);
    doc.rect(x, y, CW, 5.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
    doc.text(txt, x + 2.5, y + 3.8);
    doc.setTextColor(30, 41, 59);
    return y + 9;
  }

  function _fila(doc, label, val, x, y) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text(label, x, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(val || '—'), x + 24, y);
  }

  // Trunca texto que excede el ancho disponible (mm) agregando "…"
  function _trunc(doc, txt, maxW) {
    txt = String(txt || '');
    if (doc.getTextWidth(txt) <= maxW) return txt;
    while (txt.length > 1 && doc.getTextWidth(txt + '…') > maxW) txt = txt.slice(0, -1);
    return txt + '…';
  }

  function _descargarPDF(b64, nombre) {
    const link = document.createElement('a');
    link.href = 'data:application/pdf;base64,' + b64;
    link.download = nombre;
    link.click();
  }

  return {
    init,
    nextStep,
    prevStep,
    selectTipoEntrega,
    onTipoDocChange,
    clearSig,
    abrirCamara,
    filtrarEntregadores,
    showDropdown,
    hideDropdown,
    selEntregador,
    ampliarFoto,
    cerrarFoto,
    confirmar
  };
})();
