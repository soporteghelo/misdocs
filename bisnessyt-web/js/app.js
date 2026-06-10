/* Resuelve el link de la app (funciona con cualquier URL) y maneja
   la incrustación con fallback. Orden de búsqueda del link:
   1) parámetro ?app=...  2) REMOTE_CONFIG_URL  3) app-config.json  4) config.js */
(function () {
  var cfg = window.SITE_CONFIG || {};

  var frame = document.getElementById("app-frame");
  var spinner = document.getElementById("app-loading");
  var notice = document.getElementById("app-notice");
  var openBtn = document.getElementById("open-app-btn");

  function isValidUrl(u) {
    return typeof u === "string" && /^https?:\/\//i.test(u) && u.indexOf("PEGA_AQUI") === -1;
  }

  function fetchJsonUrl(url) {
    // cache-bust para que un cambio de link se vea de inmediato
    var sep = url.indexOf("?") === -1 ? "?" : "&";
    return fetch(url + sep + "v=" + Date.now())
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return j && isValidUrl(j.APP_URL) ? j.APP_URL : null; })
      .catch(function () { return null; });
  }

  function resolveAppUrl() {
    // 1) ?app=https://... (para probar cualquier link al vuelo)
    var param = new URLSearchParams(location.search).get("app");
    if (isValidUrl(param)) return Promise.resolve(param);

    // 2) config remota (cambio sin redesplegar) -> 3) app-config.json -> 4) config.js
    var remote = (cfg.REMOTE_CONFIG_URL || "").trim()
      ? fetchJsonUrl(cfg.REMOTE_CONFIG_URL.trim())
      : Promise.resolve(null);

    return remote
      .then(function (url) { return url || fetchJsonUrl("/app-config.json"); })
      .then(function (url) { return url || (isValidUrl(cfg.APP_URL) ? cfg.APP_URL : null); });
  }

  function showUnconfigured() {
    if (spinner) spinner.style.display = "none";
    if (frame) frame.style.display = "none";
    if (notice) notice.style.display = "block";
    if (openBtn) openBtn.style.display = "none";
  }

  resolveAppUrl().then(function (appUrl) {
    if (!appUrl) { showUnconfigured(); return; }

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
  });

  // Botones de compartir
  var url = encodeURIComponent(cfg.SITE_URL && cfg.SITE_URL.indexOf("TU-DOMINIO") === -1 ? cfg.SITE_URL : location.href);
  var waBtn = document.getElementById("share-wa");
  var tgBtn = document.getElementById("share-tg");
  if (waBtn) waBtn.href = "https://wa.me/?text=" + url;
  if (tgBtn) tgBtn.href = "https://t.me/share/url?url=" + url;
})();
