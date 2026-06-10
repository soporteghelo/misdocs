/* Carga la app en el iframe y maneja el fallback si no se puede incrustar. */
(function () {
  var cfg = window.SITE_CONFIG || {};
  var appUrl = cfg.APP_URL || "";
  var configured = appUrl && appUrl.indexOf("PEGA_AQUI") === -1;

  var frame = document.getElementById("app-frame");
  var spinner = document.getElementById("app-loading");
  var notice = document.getElementById("app-notice");
  var openBtn = document.getElementById("open-app-btn");

  if (!configured) {
    // APP_URL sin configurar: mostrar aviso para el administrador
    if (spinner) spinner.style.display = "none";
    if (frame) frame.style.display = "none";
    if (notice) notice.style.display = "block";
    if (openBtn) openBtn.style.display = "none";
    return;
  }

  if (frame) {
    frame.addEventListener("load", function () {
      if (spinner) spinner.style.display = "none";
    });
    frame.src = appUrl;
    // Si en 8s no cargó (cabeceras X-Frame-Options/CSP la bloquean),
    // se oculta el spinner y queda el botón de abrir en pestaña nueva.
    setTimeout(function () {
      if (spinner) spinner.style.display = "none";
    }, 8000);
  }

  if (openBtn) {
    openBtn.addEventListener("click", function (e) {
      e.preventDefault();
      if (typeof window.__openWithDirectLink === "function") {
        window.__openWithDirectLink(appUrl);
      } else {
        window.open(appUrl, "_blank");
      }
    });
  }

  // Botones de compartir
  var url = encodeURIComponent(cfg.SITE_URL || location.href);
  var waBtn = document.getElementById("share-wa");
  var tgBtn = document.getElementById("share-tg");
  if (waBtn) waBtn.href = "https://wa.me/?text=" + url;
  if (tgBtn) tgBtn.href = "https://t.me/share/url?url=" + url;
})();
