# SSMA Entrega Docs — Cerro HG Scan

Aplicación web para registrar **constancias de entrega de documentos** con firma digital, foto del receptor (cámara con detección facial), generación de **vale PDF** y panel administrativo. Pensada para uso interno de SSMA (AESA).

---

## ✨ Características

- **Login por DNI** (8 dígitos) sin contraseña para operarios; **admin** con contraseña.
- **Auto-registro**: si el DNI no existe, el usuario completa sus datos y queda registrado para futuros ingresos.
- **Flujo de entrega en 4 pasos**:
  1. Documento (tipo de entrega física/virtual/ambos + tipo de documento + descripción) y **firma del receptor**.
  2. **Foto del receptor** mediante cámara con guía facial (MediaPipe) y captura automática.
  3. **Entregador** (selección + firma + foto opcionales).
  4. Confirmación con resumen y miniaturas ampliables.
- **Vale PDF tamaño A5** con firmas, fotos con sello de hora peruana, datos de ambas partes, hash de integridad y geolocalización. Título dinámico según el tipo de documento.
- **Panel de administración**:
  - Estadísticas (total, hoy, físicas, virtuales).
  - Filtros por fecha, tipo y nombre, con chips de rango rápido.
  - Carga incremental (infinite scroll) para soportar muchos registros.
  - **Lista Maestra de Distribución de Documentos** imprimible (formato AESA).
  - Exportación CSV.
- **Almacenamiento en Drive**: el PDF se guarda en `SSMA_ENTREGA_DOCS / AÑO / MES / NOMBRE_RECEPTOR /`.
- **Diseño premium** (estilo Minimalism & Swiss, accesible WCAG AA), responsive y mobile-first.
- **Embebible en iframe** (compatible con bloqueo de `localStorage` de terceros).

---

## 🧱 Tecnología

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML5 + CSS3 + JavaScript vanilla (ES6+), sin frameworks |
| Backend | Google Apps Script (`Code.gs`) |
| Base de datos | Google Sheets (4 pestañas) |
| Almacenamiento | Google Drive (PDFs) |
| Hosting | Vercel (estático) |
| Librerías | signature_pad, jsPDF, qrcode.js, MediaPipe Face Detection |
| Tipografía | Plus Jakarta Sans + Material Icons |

---

## 📁 Estructura

```
ENTREGA DOCS/
├── Code.gs                     # Backend: API REST sobre Google Apps Script
├── INSTRUCCIONES_DESPLIEGUE.md # Guía paso a paso de despliegue
├── FRONTEND/
│   ├── index.html              # Shell SPA
│   ├── manifest.json           # PWA
│   ├── vercel.json             # Rewrites + cabeceras (CSP/Permissions)
│   ├── css/
│   │   └── main.css            # Design system completo
│   └── js/
│       ├── config.js           # GAS_URL (endpoint del backend)
│       ├── api.js              # Capa HTTP con caché
│       ├── app.js              # Router SPA + sesión + helpers
│       └── views/              # Vistas: login, entrega, dashboard, etc.
```

---

## 🚀 Despliegue rápido

1. **Google Sheets**: crear una hoja con las pestañas `ENTREGAS`, `USUARIOS`, `TIPOS_DOCUMENTO`, `ENTREGADORES` (ver headers en `INSTRUCCIONES_DESPLIEGUE.md`).
2. **Apps Script**: pegar `Code.gs`, configurar las URLs de Sheets/Drive, y **desplegar como aplicación web** (acceso: cualquiera). Copiar la URL `/exec`.
3. **Frontend**: poner esa URL en `FRONTEND/js/config.js` (`GAS_URL`).
4. **Vercel**: desplegar la carpeta `FRONTEND` (o conectar este repositorio).

> Detalle completo en [INSTRUCCIONES_DESPLIEGUE.md](INSTRUCCIONES_DESPLIEGUE.md).

### Incrustar en un iframe

```html
<iframe src="https://TU-APP.vercel.app"
        allow="camera; microphone; geolocation; fullscreen"
        style="width:100%;height:100%;border:0"></iframe>
```

El atributo `allow` es necesario para que la cámara y la geolocalización funcionen embebidas.

---

## 🔒 Notas

- `config.js` y `Code.gs` contienen URLs de recursos públicos del web app (no son credenciales secretas).
- La fecha/hora se registra siempre en **hora peruana** (`America/Lima`) desde el servidor.
- La firma del receptor se almacena para mostrarla en la Lista Maestra; las fotos viven dentro del PDF.

---

## 📄 Licencia

Uso interno — SSMA / AESA.
