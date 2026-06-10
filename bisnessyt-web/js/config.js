/* ============================================================
   CONFIGURACIÓN DEL SITIO — ESTE ES EL ÚNICO ARCHIVO QUE DEBES EDITAR
   ============================================================
   1) APP_URL  -> pega el link de tu app de descargas.
   2) SITE_URL -> tu dominio final (cuando lo tengas en Vercel).
   3) ADS      -> pega los IDs/links que te da Adsterra o Monetag
                  al crear cada zona (ver GUIA_MONETIZACION.md)
                  y cambia enabled a true.
   ============================================================ */

window.SITE_CONFIG = {
  // Link de tu app de descarga de videos/música (la que ya tienes)
  APP_URL: "PEGA_AQUI_EL_LINK_DE_TU_APP",

  // Nombre y dominio del sitio (puedes cambiarlos)
  SITE_NAME: "TubeFlow",
  SITE_URL: "https://TU-DOMINIO.com",

  ADS: {
    // Cambia a true cuando hayas pegado tus IDs de Adsterra/Monetag
    enabled: false,

    adsterra: {
      // URL del script Popunder que te da Adsterra (formato //pl12345.example.com/xx/yy/zz.js)
      popunderScript: "",

      // URL del Smartlink / Direct Link de Adsterra
      directLink: "",

      // URL del script Social Bar (opcional, formato parecido al popunder)
      socialBarScript: "",

      // Banners: pega solo la "key" que aparece en el código atOptions de cada zona
      bannerTop:       { key: "", width: 728, height: 90 },   // escritorio, arriba
      bannerTopMobile: { key: "", width: 320, height: 50 },   // móvil, arriba
      bannerSide:      { key: "", width: 300, height: 250 }   // lateral / entre contenido
    },

    monetag: {
      // Si pruebas Monetag: pega aquí la URL del tag que te den (popunder/vignette)
      tagScript: ""
    }
  },

  ANALYTICS: {
    // ID de Google Analytics 4, ej: "G-XXXXXXXXXX" (opcional pero recomendado)
    ga4Id: ""
  }
};
