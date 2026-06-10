# Instrucciones de Despliegue — SSMA Entrega Docs

## Paso 1 — Crear la Google Spreadsheet

1. Ir a [sheets.google.com](https://sheets.google.com) → **+ Nueva hoja de cálculo**
2. Renombrarla: `SSMA_ENTREGA_DOCS`
3. Crear **4 pestañas** (click en el "+" al pie):
   - `ENTREGAS`
   - `USUARIOS`
   - `TIPOS_DOCUMENTO`
   - `ENTREGADORES`

4. **Pestaña ENTREGAS** — Pegar en la fila 1:
```
ID	FECHA	HORA	DNI_RECEPTOR	NOMBRE_RECEPTOR	EMPRESA_RECEPTOR	CARGO_RECEPTOR	TIPO_ENTREGA	TIPO_DOCUMENTO	DESCRIPCION	NOMBRE_ENTREGADOR	GEOLOCALIZACION	PDF_DRIVE_URL	HASH_VERIFICACION
```

5. **Pestaña USUARIOS** — Pegar en la fila 1:
```
DNI	APELLIDOS	NOMBRES	EMPRESA	CARGO	AREA	ROL	ACTIVO	PASSWORD	FECHA_REGISTRO
```
   - Agregar al menos 1 admin en la fila 2:
```
00000001	ADMINISTRADOR	SISTEMA	SSMA	ADMINISTRADOR	SSMA	ADMIN	TRUE	admin2024	01/01/2024
```

6. **Pestaña TIPOS_DOCUMENTO** — Pegar en la fila 1:
```
TIPO	DESCRIPCION	ACTIVO
```
   - Agregar filas de ejemplo (fila 2 en adelante):
```
Contrato de Trabajo	Documento contractual laboral	TRUE
Entrega de EPP	Equipos de Protección Personal	TRUE
Procedimiento de Trabajo	PETS y similares	TRUE
Reglamento Interno	RISST y normativas	TRUE
Certificado de Capacitación	Constancias de formación	TRUE
Memorándum	Comunicaciones internas	TRUE
Acta de Reunión	Registro de acuerdos	TRUE
Otros	Documentos varios	TRUE
```

7. **Pestaña ENTREGADORES** — Pegar en la fila 1:
```
DNI	APELLIDOS	NOMBRES	CARGO	AREA	ACTIVO
```
   - Agregar al menos 1 entregador:
```
12345678	GARCIA LOPEZ	MARIA	Jefe de RRHH	Administración	TRUE
```

8. **Copiar la URL** de la Spreadsheet desde la barra del navegador.

---

## Paso 2 — Crear el Google Apps Script

1. Ir a [script.google.com](https://script.google.com) → **+ Nuevo proyecto**
2. Renombrar el proyecto: `SSMA_ENTREGA_DOCS_API`
3. Borrar el contenido de `Código.gs`
4. Pegar el contenido completo de `Code.gs` (del proyecto)
5. Guardar (Ctrl+S)

### Desplegar el script:
1. Click en **Desplegar** → **Nueva implementación**
2. Tipo: **Aplicación web**
3. Ejecutar como: **Yo** (tu cuenta)
4. Quién tiene acceso: **Cualquier usuario** (para que Vercel pueda llamarlo)
5. Click **Desplegar** → Autorizar permisos cuando aparezca
6. **Copiar la URL de implementación** (termina en `/exec`)

---

## Paso 3 — Configurar el Frontend

1. Abrir `FRONTEND/js/config.js`
2. Reemplazar `'TU_URL_AQUI'` con la URL que copiaste del paso anterior:
```js
const GAS_URL = 'https://script.google.com/macros/s/XXXXXX/exec';
```
3. Guardar el archivo.

---

## Paso 4 — Desplegar en Vercel

1. Crear cuenta en [vercel.com](https://vercel.com) (gratis)
2. Opción A — Desde GitHub:
   - Subir la carpeta `FRONTEND` a un repositorio GitHub
   - En Vercel: **Add New Project** → Importar el repo
   - Root Directory: `FRONTEND`
3. Opción B — Drag & Drop:
   - Ir a [vercel.com/new](https://vercel.com/new)
   - Arrastrar la carpeta `FRONTEND` directamente
4. Click **Deploy**
5. Copiar la URL de producción (ej: `https://ssma-entrega.vercel.app`)

---

## Paso 5 — Primera configuración en la app

1. Abrir la URL de Vercel
2. Si aparece "Configuración inicial" → pegar la URL de la Spreadsheet → Guardar
3. Ingresar con DNI: `00000001` y contraseña: `admin2024`
4. ¡Listo! Ya puedes crear usuarios y tipos de documento

---

## Uso diario

### Para operarios (usuario normal):
- Ingresan con su DNI (8 dígitos, sin contraseña)
- Completan el formulario de 5 pasos
- Se descarga el vale PDF automáticamente

### Para el Admin:
- Ingresa con DNI + contraseña
- Ve el panel con todas las entregas y filtros
- Puede exportar a CSV
- Gestiona usuarios, tipos y entregadores

### Verificar un certificado:
- Cualquier persona puede verificar un vale en:
  `https://tu-app.vercel.app?verificar=ED-XXXXXX`

---

## Actualizar el Apps Script (si haces cambios en Code.gs):

1. En script.google.com → **Desplegar** → **Administrar implementaciones**
2. Editar la implementación existente → **Nueva versión**
3. Click **Desplegar** (la URL no cambia)

---

## Estructura de archivos

```
ENTREGA DOCS/
├── Code.gs                          ← Backend (Apps Script)
└── FRONTEND/                        ← Subir esto a Vercel
    ├── index.html
    ├── manifest.json
    ├── vercel.json
    ├── css/
    │   └── main.css
    └── js/
        ├── config.js                ← EDITAR: poner GAS_URL
        ├── api.js
        ├── app.js
        ├── libs/
        │   ├── signature_pad.min.js
        │   ├── jspdf.umd.min.js
        │   └── qrcode.min.js
        └── views/
            ├── config-view.js
            ├── login-view.js
            ├── entrega-view.js
            ├── mis-entregas-view.js
            ├── dashboard-view.js
            ├── usuarios-view.js
            ├── tipos-view.js
            ├── entregadores-view.js
            └── verificar-view.js
```
