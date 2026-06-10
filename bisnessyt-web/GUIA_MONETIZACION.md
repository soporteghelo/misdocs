# Guía de Monetización — TubeFlow

Esta guía te lleva de cero a cobrar publicidad. Síguela en orden.

---

## ⚠️ Lee esto primero (importante)

1. **NO uses Google AdSense.** Google rechaza y banea sitios de descarga de YouTube
   (violan sus políticas). Si aplicas, arriesgas un ban permanente de tu cuenta de Google.
   Por eso esta guía usa redes alternativas que SÍ aceptan este tipo de sitios.
2. **Riesgo legal:** descargar contenido de YouTube viola los Términos de Servicio de
   YouTube. El sitio ya incluye disclaimer, términos de uso y página DMCA para reducir
   tu exposición, pero el riesgo no desaparece. Úsalo bajo tu responsabilidad.
3. **Expectativas realistas:** con tráfico de Latinoamérica el CPM (pago por mil
   visitas) es de ~$0.5–2 en banners y ~$2–4 en popunders.
   - 10.000 visitas/mes ≈ $10–50/mes
   - 100.000 visitas/mes ≈ $300–800/mes (con popunder + direct link)
   - El tráfico de EE.UU./Europa paga 5–10x más: por eso el sitio es bilingüe.

---

## Paso 1 — Configurar tu app

Edita `js/config.js` (es el ÚNICO archivo que tocarás):

```js
APP_URL: "https://el-link-de-tu-app...",
```

Si tu app no se deja incrustar (pantalla en blanco en el iframe), no pasa nada:
el botón **"Abrir la app en pestaña nueva"** siempre funciona y también monetiza.

## Paso 2 — Desplegar en Vercel

1. Sube esta carpeta a tu repositorio `bisnessyt` (cópiala a la raíz del repo).
2. Entra a [vercel.com](https://vercel.com) → **Add New → Project** → importa `bisnessyt`.
   - Si la carpeta `bisnessyt-web` no está en la raíz del repo, en **Root Directory**
     selecciona `bisnessyt-web`.
3. Deploy. Tendrás un dominio tipo `bisnessyt.vercel.app`.
4. **Compra un dominio propio** (~$10/año un `.com` en Namecheap o Porkbun) y conéctalo
   en Vercel → Settings → Domains. **Esto es casi obligatorio:** varias redes de anuncios
   rechazan o pagan menos a los dominios `.vercel.app`.
5. Reemplaza `https://TU-DOMINIO.com` por tu dominio real en estos archivos:
   `js/config.js`, `index.html`, `en/index.html`, `sitemap.xml`, `robots.txt` y los
   4 artículos de `blog/`.

## Paso 3 — Registrarte en Adsterra (red principal)

1. Entra a [adsterra.com](https://adsterra.com) → **Sign up** como **Publisher**.
2. Panel → **Websites → Add website** → pega tu dominio.
   - Categoría: "Downloads/Software". Aprobación normalmente en minutos/horas.
3. Crea estas 4 zonas (**Websites → tu sitio → Add ad unit**):

   | Zona | Formato en Adsterra | Dónde pegarlo en `js/config.js` |
   |---|---|---|
   | Popunder | Popunder | `popunderScript` (la URL del script que te dan) |
   | Direct Link | Direct Link / Smartlink | `directLink` (la URL completa) |
   | Banner escritorio | Banner 728×90 | `bannerTop.key` (solo la "key" del código atOptions) |
   | Banner móvil/lateral | Banner 320×50 y 300×250 | `bannerTopMobile.key` y `bannerSide.key` |

4. En `js/config.js` cambia `enabled: false` → `enabled: true`.
5. **ads.txt:** en el panel de Adsterra copia las líneas de ads.txt de tu dominio y
   pégalas en el archivo `ads.txt` del sitio. Vuelve a desplegar.

**Cobros en Adsterra:** mínimo $5 con Paxum/WebMoney/cripto; $100 con PayPal/Wise/
transferencia. Paga cada 2 semanas (NET-15).

## Paso 4 — (Opcional) Monetag como segunda red

1. Regístrate en [monetag.com](https://monetag.com) como publisher.
2. Agrega tu sitio → crea un tag (MultiTag o Popunder) → pega la URL del script en
   `monetag.tagScript` de `js/config.js`.
3. **No actives popunder de Adsterra y Monetag a la vez** (se canibalizan y empeora
   la experiencia): usa una red por vez durante 2 semanas, compara ganancias en cada
   panel y quédate con la que pague más para tu tráfico.

## Paso 5 — Analítica

1. Crea una propiedad en [analytics.google.com](https://analytics.google.com) (GA4).
2. Copia el ID `G-XXXXXXXXXX` en `ANALYTICS.ga4Id` de `js/config.js`.
3. Úsalo para saber de qué país/canal vienen tus visitas y qué artículo del blog
   atrae más gente.

---

## Estrategia de tráfico (sin visitas no hay ingresos)

**Semanas 1–2 — Base:**
- Da de alta el sitio en [Google Search Console](https://search.google.com/search-console)
  y envía el `sitemap.xml`.
- Comparte el link en tus grupos de WhatsApp/Telegram (el sitio ya tiene botones de
  compartir integrados).

**Semanas 2–8 — Crecimiento:**
- Publica 1–2 artículos nuevos por semana en `blog/` (copia el formato de los 4 que ya
  existen). Apunta a búsquedas long-tail: "descargar música de youtube en iphone",
  "youtube a mp3 sin virus", "download youtube shorts", etc.
- Videos cortos (TikTok / YouTube Shorts / Reels) mostrando cómo usar la app, con el
  link en la bio. Es el canal que más rápido trae tráfico a este nicho.
- Canal de Telegram propio: cada usuario que se suscribe es tráfico recurrente gratis.

**Mes 2+ — Optimización:**
- Compara CPM de Adsterra vs Monetag por país en sus paneles.
- Si superas ~50k visitas/mes, escribe al account manager de Adsterra y negocia tarifa.
- Invierte en más contenido en inglés: el mismo esfuerzo paga 5–10x más.

## Alternativas si Adsterra/Monetag no te funcionan

- **HilltopAds**, **EvaDav**, **Galaksion**: aceptan sitios de descargas, buenos con
  tráfico tier-3 (LatAm/Asia).
- **A-ADS**: sin requisitos, paga en Bitcoin, CPM bajo.

## Resumen del flujo de dinero

Visitante → ve banners (CPM) → hace clic en "Abrir app" (direct link = pago por clic)
→ popunder al interactuar (CPM alto) → tú cobras en Adsterra → retiro quincenal a
Paxum/PayPal/cripto según el mínimo del método.
