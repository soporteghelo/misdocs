/* ============================================================
   CONFIGURACIÓN DEL SITIO
   ============================================================
   EL LINK DE LA APP se cambia en el archivo `app-config.json`
   (en la raíz del sitio), NO aquí. Así puedes cambiarlo cuando
   quieras editando un solo archivo desde GitHub.

   El sitio busca el link en este orden:
     1) ?app=https://...        (parámetro en la URL, para pruebas)
     2) REMOTE_CONFIG_URL       (JSON externo: cambio instantáneo
                                 sin redesplegar — opcional)
     3) app-config.json         (archivo del sitio — lo normal)
     4) APP_URL de este archivo (respaldo)

   Lo demás: SITE_URL -> tu dominio; ADS -> IDs de Adsterra/Monetag
   (ver GUIA_MONETIZACION.md) y cambia enabled a true.
   ============================================================ */

window.SITE_CONFIG = {
  // Respaldo del link de la app (lo normal es usar app-config.json)
  APP_URL: "PEGA_AQUI_EL_LINK_DE_TU_APP",

  // OPCIONAL: URL de un JSON externo con { "APP_URL": "https://..." }.
  // Sirve para cambiar el link al instante sin redesplegar
  // (ej. un Google Apps Script publicado como web app, o un raw de GitHub).
  REMOTE_CONFIG_URL: "",

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
