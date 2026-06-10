/* Inserta los anuncios según lo configurado en js/config.js.
   No necesitas editar este archivo. */
(function () {
  var cfg = window.SITE_CONFIG || {};
  var ads = cfg.ADS || {};

  // --- Analítica (GA4) ---
  var ga = (cfg.ANALYTICS || {}).ga4Id;
  if (ga) {
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + ga;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", ga);
  }

  if (!ads.enabled) {
    // Sin IDs configurados: ocultar los espacios reservados para anuncios
    document.querySelectorAll(".ad-slot").forEach(function (el) {
      el.style.display = "none";
    });
    return;
  }

  var at = ads.adsterra || {};

  // --- Popunder (Adsterra) y/o tag de Monetag: scripts globales ---
  [at.popunderScript, at.socialBarScript, (ads.monetag || {}).tagScript]
    .filter(Boolean)
    .forEach(function (src) {
      var sc = document.createElement("script");
      sc.src = src;
      sc.async = true;
      document.body.appendChild(sc);
    });

  // --- Banners (Adsterra atOptions): cada uno en su propio iframe
  //     para que las variables globales atOptions no choquen entre sí ---
  function renderBanner(slotId, banner) {
    var slot = document.getElementById(slotId);
    if (!slot) return;
    if (!banner || !banner.key) { slot.style.display = "none"; return; }
    var f = document.createElement("iframe");
    f.width = banner.width;
    f.height = banner.height;
    f.frameBorder = "0";
    f.scrolling = "no";
    f.style.border = "0";
    f.style.maxWidth = "100%";
    f.srcdoc =
      '<body style="margin:0"><script>atOptions=' +
      JSON.stringify({ key: banner.key, format: "iframe", width: banner.width, height: banner.height, params: {} }) +
      ';<\/script><script src="//www.highperformanceformat.com/' + banner.key + '/invoke.js"><\/script></body>';
    slot.appendChild(f);
  }

  var isMobile = window.matchMedia("(max-width: 767px)").matches;
  renderBanner("ad-top", isMobile ? at.bannerTopMobile : at.bannerTop);
  renderBanner("ad-side", at.bannerSide);
  renderBanner("ad-bottom", at.bannerSide);

  // --- Direct Link en el botón "Abrir app": monetiza el clic ---
  // La primera vez por sesión, además de abrir la app, abre el direct link.
  window.__openWithDirectLink = function (appUrl) {
    if (at.directLink && !sessionStorage.getItem("dl_shown")) {
      sessionStorage.setItem("dl_shown", "1");
      window.open(at.directLink, "_blank");
    }
    window.open(appUrl, "_blank");
  };
})();
