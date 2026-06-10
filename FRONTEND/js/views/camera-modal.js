// ── CAMERA MODAL — getUserMedia + MediaPipe Face Detection ────────
// Replica la tecnología de PAC_CERRO (CAPACITACIONE_LEARNINGNEWS)
const CAM = (() => {
  const CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe';
  const STABILITY_MS   = 3000;
  const PROX_MIN       = 0.15;
  const PROX_MAX       = 0.75;

  let _stream          = null;
  let _faceDetection   = null;
  let _stabilityStart  = null;
  let _animFrame       = null;
  let _capturedB64     = null;
  let _callback        = null;
  let _facingMode      = 'user';
  let _isClosed        = false;

  // ── API pública ───────────────────────────────────────────────
  async function abrir(facingMode, callback) {
    _callback    = callback;
    _facingMode  = facingMode || 'user';
    _capturedB64 = null;
    _isClosed    = false;

    document.getElementById('camera-modal').classList.remove('hidden');
    _setStatus('Iniciando cámara...', 'muted');
    _mostrarViewfinder();

    try {
      await _initStream();
      _cargarMediaPipe();
    } catch (ex) {
      _fallback();
    }
  }

  function cerrar() {
    _isClosed = true;
    _stop();
    document.getElementById('camera-modal').classList.add('hidden');
  }

  async function reiniciar() {
    _capturedB64     = null;
    _stabilityStart  = null;
    _isClosed        = false;
    _setProgress(0);
    _mostrarViewfinder();
    _setStatus('Iniciando cámara...', 'muted');
    try {
      await _initStream();
      _cargarMediaPipe();
    } catch (ex) {
      _fallback();
    }
  }

  function aceptar() {
    if (_capturedB64 && _callback) {
      _callback(_capturedB64);
    }
    cerrar();
  }

  // ── Stream de cámara ──────────────────────────────────────────
  async function _initStream() {
    if (_stream) { _stream.getTracks().forEach(t => t.stop()); }
    _stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: _facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false
    });
    const video = document.getElementById('cam-video');
    video.srcObject = _stream;
    await video.play();
  }

  // ── Cargar MediaPipe desde CDN ─────────────────────────────────
  function _cargarMediaPipe() {
    _setStatus('Cargando detección facial...', 'muted');
    _loadScript(`${CDN}/face_detection@0.4.1646425229/face_detection.js`)
      .then(() => _initFaceDetection())
      .catch(() => {
        // Sin MediaPipe: igual funciona, solo sin detección automática
        _setStatus('Coloca tu cara en el óvalo y pulsa Capturar', 'warning');
        _mostrarBotonManual();
      });
  }

  function _loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function _initFaceDetection() {
    const W = window;
    if (!W.FaceDetection) { _mostrarBotonManual(); return; }

    // FaceDetection se crea UNA sola vez y se reutiliza entre aperturas.
    // Cerrar/recrear el módulo WASM rompe la detección en la 2ª apertura.
    if (!_faceDetection) {
      _faceDetection = new W.FaceDetection({
        locateFile: f => `${CDN}/face_detection@0.4.1646425229/${f}`
      });
      _faceDetection.setOptions({ model: 'short', minDetectionConfidence: 0.5 });
      _faceDetection.onResults(_onResults);
    }

    _setStatus('Coloca tu cara en el óvalo', 'muted');
    _detectLoop();
  }

  // Loop manual con requestAnimationFrame (sin camera_utils).
  // Evita el doble getUserMedia que rompía la reapertura.
  async function _detectLoop() {
    if (_isClosed || _capturedB64) return;
    const video = document.getElementById('cam-video');
    if (_faceDetection && video && video.readyState >= 2 && video.videoWidth > 0) {
      try { await _faceDetection.send({ image: video }); } catch (e) {}
    }
    if (!_isClosed && !_capturedB64) {
      _animFrame = requestAnimationFrame(_detectLoop);
    }
  }

  // ── Resultados de detección ───────────────────────────────────
  function _onResults(results) {
    if (_isClosed || _capturedB64) return;

    if (!results.detections || results.detections.length === 0) {
      _stabilityStart = null;
      _setProgress(0);
      _setOvalState('none');
      _setStatus('No se detecta ningún rostro', 'warning');
      return;
    }

    const { width, xCenter, yCenter } = results.detections[0].boundingBox;

    if (width < PROX_MIN) {
      _stabilityStart = null; _setProgress(0);
      _setOvalState('warn');
      _setStatus('🔍 Acércate un poco más', 'warning');
      return;
    }
    if (width > PROX_MAX) {
      _stabilityStart = null; _setProgress(0);
      _setOvalState('warn');
      _setStatus('↩ Aléjate un poco', 'warning');
      return;
    }

    const centrado = xCenter > 0.25 && xCenter < 0.75 && yCenter > 0.2 && yCenter < 0.8;
    if (!centrado) {
      _stabilityStart = null; _setProgress(0);
      _setOvalState('warn');
      _setStatus('⊕ Centra tu rostro en el óvalo', 'warning');
      return;
    }

    // Rostro en posición correcta
    _setOvalState('good');
    _setStatus('✓ Mantén la posición...', 'success');
    if (!_stabilityStart) _stabilityStart = Date.now();

    const elapsed = Date.now() - _stabilityStart;
    const pct = Math.min((elapsed / STABILITY_MS) * 100, 100);
    _setProgress(pct);

    if (pct >= 100) {
      _autoCapturar();
    }
  }

  // ── Captura automática ────────────────────────────────────────
  function _autoCapturar() {
    if (_capturedB64) return;
    const video = document.getElementById('cam-video');
    _procesarFrame(video);
  }

  function capturarManual() {
    const video = document.getElementById('cam-video');
    _procesarFrame(video);
  }

  function _procesarFrame(video) {
    const canvas = document.createElement('canvas');
    // Recortar a proporción 3:4 (retrato), igual que PAC_CERRO
    const W = video.videoWidth  || 640;
    const H = video.videoHeight || 480;
    const targetAspect = 3 / 4;
    const curAspect    = W / H;
    let sw, sh, sx, sy;
    if (curAspect > targetAspect) {
      sh = H; sw = sh * targetAspect; sx = (W - sw) / 2; sy = 0;
    } else {
      sw = W; sh = sw / targetAspect; sx = 0; sy = (H - sh) / 2;
    }
    canvas.width  = 300;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 300, 400);

    // JPEG al 55% — liviano para el PDF
    _capturedB64 = canvas.toDataURL('image/jpeg', 0.55).split(',')[1];
    _mostrarPreview(_capturedB64);
  }

  // ── Sin cámara disponible: solo mostrar error ─────────────────
  function _fallback() {
    document.getElementById('cam-viewfinder').classList.add('hidden');
    document.getElementById('cam-fallback').classList.remove('hidden');
    _setStatus('Se requiere cámara para continuar', 'warning');
  }

  // ── Helpers UI ────────────────────────────────────────────────
  function _mostrarViewfinder() {
    document.getElementById('cam-viewfinder').classList.remove('hidden');
    document.getElementById('cam-preview-section').classList.add('hidden');
    document.getElementById('cam-btn-capturar').classList.add('hidden');
    document.getElementById('cam-btn-retry').classList.add('hidden');
    document.getElementById('cam-btn-aceptar').classList.add('hidden');
    document.getElementById('cam-fallback').classList.add('hidden');
    _setOvalState('none');
    _setProgress(0);
  }

  function _mostrarBotonManual() {
    document.getElementById('cam-btn-capturar').classList.remove('hidden');
  }

  function _mostrarPreview(b64) {
    _stop();
    document.getElementById('cam-viewfinder').classList.add('hidden');
    document.getElementById('cam-btn-capturar').classList.add('hidden');
    const section = document.getElementById('cam-preview-section');
    section.classList.remove('hidden');
    document.getElementById('cam-captured-img').src = 'data:image/jpeg;base64,' + b64;
    document.getElementById('cam-btn-retry').classList.remove('hidden');
    document.getElementById('cam-btn-aceptar').classList.remove('hidden');
    _setStatus('✓ Captura exitosa', 'success');
  }

  function _setStatus(msg, type) {
    const el = document.getElementById('cam-status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'cam-status cam-status-' + (type || 'muted');
  }

  function _setOvalState(state) {
    const oval = document.getElementById('cam-oval');
    if (!oval) return;
    oval.className = 'cam-oval cam-oval-' + state;
  }

  function _setProgress(pct) {
    const bar = document.getElementById('cam-progress');
    if (bar) bar.style.width = pct + '%';
  }

  function _stop() {
    // OJO: _faceDetection NO se cierra a propósito — se reutiliza entre aperturas.
    if (_animFrame)  { cancelAnimationFrame(_animFrame); _animFrame = null; }
    if (_stream)     { _stream.getTracks().forEach(t => t.stop()); _stream = null; }
    const video = document.getElementById('cam-video');
    if (video) { video.srcObject = null; }
  }

  return { abrir, cerrar, reiniciar, aceptar, capturarManual };
})();
