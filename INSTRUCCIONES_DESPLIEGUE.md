# HERRAMIENTAS SCAN v2.0 — Instrucciones de Despliegue

## Archivos del proyecto (archivo único de Apps Script)

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `Code.gs` | Apps Script | **Único archivo GAS** — backend completo: config, auth, Drive, DB y setup |
| `Index.html` | HTML | Shell principal de la Web App (SPA con transiciones) |
| `Styles.html` | HTML | Design system CSS — animaciones, skeletons, mobile |
| `Config.html` | HTML | Asistente de configuración inicial (Sheets + Drive) |
| `Login.html` | HTML | Pantalla de ingreso por DNI |
| `Dashboard.html` | HTML | Panel de estadísticas y progreso |
| `Upload.html` | HTML | Formulario de carga con cámara y múltiples archivos |
| `Records.html` | HTML | Historial de registros con filtros y detalle |

> **Solo un archivo `.gs`** — Drive.gs y Setup.gs ya no existen. Todo está en `Code.gs`.

---

## PREPARACIÓN PREVIA (hacer antes de copiar el código)

### A. Crear el Google Sheets vacío
1. Ir a [sheets.google.com](https://sheets.google.com) → **Nuevo** → hoja en blanco
2. Nombrarla: `BD HERRAMIENTAS SCAN`
3. Copiar la **URL completa** del navegador (la necesitarás en el Paso 5)

### B. Crear la carpeta de Drive
1. Ir a [drive.google.com](https://drive.google.com) → **+ Nuevo** → Carpeta
2. Nombrarla: `HERRAMIENTAS_SCAN`
3. Abrir la carpeta y copiar la **URL completa** desde el navegador (la necesitarás en el Paso 5)

---

## PASO 1 — Crear el proyecto Google Apps Script

1. Ir a [script.google.com](https://script.google.com)
2. Hacer clic en **+ Nuevo proyecto**
3. Renombrar el proyecto a: `HERRAMIENTAS SCAN`
   - Clic en "Proyecto sin título" (arriba a la izquierda) → escribir nombre → Aceptar

---

## PASO 2 — Copiar `Code.gs`

El editor abre con un archivo `Code.gs` vacío por defecto.

1. Seleccionar **todo el contenido** del archivo `Code.gs` (Ctrl+A)
2. **Borrar** el contenido existente
3. **Pegar** el contenido completo del archivo `Code.gs` del proyecto
4. Guardar con **Ctrl+S**

---

## PASO 3 — Crear los archivos HTML

Para cada archivo HTML del proyecto, repetir estos pasos:

1. En el panel izquierdo: clic en **+** → **HTML**
2. Escribir el nombre exacto (sin la extensión `.html`):

| Nombre exacto a escribir |
|--------------------------|
| `Index` |
| `Styles` |
| `Config` |
| `Login` |
| `Dashboard` |
| `Upload` |
| `Records` |

3. Borrar el contenido por defecto del archivo
4. Pegar el contenido del archivo correspondiente del proyecto
5. Guardar con **Ctrl+S**

> ⚠️ Los nombres deben ser **exactamente** como se indica — sin mayúsculas ni espacios adicionales.

---

## PASO 4 — Autorizar permisos de la App

1. En el editor GAS, seleccionar la función `doGet` en el desplegable de funciones
2. Hacer clic en **▶ Ejecutar**
3. Aparecerá el diálogo **"Se necesita autorización"**
4. Hacer clic en **Revisar permisos** → seleccionar tu cuenta Google
5. En la pantalla de advertencia: clic en **"Configuración avanzada"** → **"Ir a HERRAMIENTAS SCAN (no seguro)"**
6. Hacer clic en **Permitir**

> Esto autoriza el acceso a Sheets, Drive y la ejecución como Web App. Solo se hace una vez.

---

## PASO 5 — Desplegar como Web App

1. En el editor GAS: menú **Implementar** → **Nueva implementación**
2. Clic en el ícono ⚙️ junto a "Selecciona el tipo" → **Aplicación web**
3. Configurar:
   - **Descripción:** `v2.0`
   - **Ejecutar como:** `Yo (tu-email@gmail.com)`
   - **Quién tiene acceso:** `Cualquier persona`
4. Hacer clic en **Implementar**
5. **Copiar la URL** de la Web App que aparece (formato: `https://script.google.com/macros/s/…/exec`)

> Guarda esta URL — es la dirección de tu app móvil.

---

## PASO 6 — Configurar la App (primera vez)

Al abrir la URL por primera vez, la app detecta que no está configurada y muestra el **Asistente de Configuración**.

### Paso 6a — Conectar el Google Sheets
1. En el campo **"URL del Google Sheets"**: pegar la URL copiada en la preparación (Paso A)
2. La app detecta automáticamente el ID
3. Hacer clic en **"Verificar y Continuar"**

### Paso 6b — Conectar la carpeta de Drive
1. En el campo **"URL de la carpeta de Drive"**: pegar la URL copiada en la preparación (Paso B)
2. Opcionalmente: si tienes otra hoja de personal, pégala en el campo adicional (expandir con el botón)
3. Hacer clic en **"Inicializar App"**

La app realizará automáticamente:
- Verificación de acceso al Sheets y a Drive
- Creación de las 5 pestañas del Sheets: `REGISTRO`, `PERSONAL`, `PROGRAMADOS`, `USUARIOS_MASTER`, `CONFIG`
- Configuración del IMPORTRANGE en la hoja PERSONAL
- Guardado de la configuración en el servidor

---

## PASO 7 — Aceptar permisos de IMPORTRANGE

Este paso es **obligatorio** para que la búsqueda por DNI funcione.

1. Abrir el Google Sheets configurado
2. Ir a la pestaña **PERSONAL**
3. Hacer clic en la celda **A2** (verás un error de IMPORTRANGE)
4. Aparece el botón **"Permitir acceso"** → hacer clic
5. Esperar unos segundos hasta que los datos de personal aparezcan

---

## PASO 8 — Completar la configuración del Sheets

### Usuarios Master (administradores)
En la pestaña **USUARIOS_MASTER**, agregar los DNIs con acceso completo:

| DNI_MASTER | NOMBRE | ROL | ACTIVO |
|-----------|--------|-----|--------|
| 12345678 | JUAN PEREZ GARCIA | ADMIN | TRUE |
| 87654321 | ANA LOPEZ TORRES | SUPERVISOR | TRUE |

> `ACTIVO` debe ser `TRUE` (no texto, sino valor booleano — marcar la celda como checkbox o escribir TRUE).

### Metas programadas
En la pestaña **PROGRAMADOS**, completar las metas por persona y tipo:

| DNI | NOMBRE | TIPO_HERRAMIENTA | AÑO | MES | PROGRAMADOS |
|-----|--------|-----------------|-----|-----|-------------|
| 41943696 | DAMIAN YACHAS ROGER | EPP | 2025 | 06 | 5 |
| 41943696 | DAMIAN YACHAS ROGER | CHARLA | 2025 | 06 | 2 |

> Las columnas EJECUTADOS, PENDIENTES y % AVANCE se actualizan automáticamente cuando se guardan registros.

### Tipos de herramienta (opcional)
En la pestaña **CONFIG** → fila `TIPOS_HERRAMIENTA`, editar la lista separada por comas:
```
EPP,CHARLA,CAPACITACION,INSPECCION,PERMISO DE TRABAJO,ATS,PETS,OTRO
```

---

## PASO 9 — Instalar en el celular (PWA)

### Android (Chrome)
1. Abrir la URL de la Web App en Chrome
2. Menú (⋮) → **"Añadir a pantalla de inicio"**
3. Confirmar → la app aparece como ícono en el escritorio

### iPhone (Safari)
1. Abrir la URL en Safari
2. Botón compartir (□↑) → **"Agregar a inicio"**
3. Confirmar

---

## PASO 10 — Actualizar la app (cuando modifiques el código)

Si realizas cambios al código:

1. En el editor GAS: **Implementar** → **Gestionar implementaciones**
2. Clic en el ícono ✏️ de la implementación activa
3. En "Versión": seleccionar **"Nueva versión"**
4. Hacer clic en **Implementar**

> La URL no cambia — los usuarios siguen usando la misma dirección.

---

## Estructura de archivos en Google Drive

```
HERRAMIENTAS_SCAN/           ← Carpeta configurada en el Paso 6
  2025/
    06/
      DAMIAN_YACHAS_ROGER/   ← APELLIDOS Y NOMBRES del evaluado
        EPP_DAMIAN_YACHAS_ROGER_001.pdf
        EPP_DAMIAN_YACHAS_ROGER_002.jpg
        CHARLA_DAMIAN_YACHAS_ROGER_001.pdf
  2025/
    07/
      ANGEL_TORRES_JOAQUIN/
        EPP_ANGEL_TORRES_JOAQUIN_001.jpg
```

## Convención de nombres de archivo

```
TIPO_HERRAMIENTA_APELLIDOS_NOMBRES_NNN.ext
```
| Parte | Descripción |
|-------|-------------|
| `TIPO_HERRAMIENTA` | Ej: `EPP`, `CHARLA`, `CAPACITACION` |
| `APELLIDOS_NOMBRES` | Nombre del evaluado en mayúsculas, espacios → `_` |
| `NNN` | Secuencial: `001`, `002`, `003`… por tipo y persona |
| `.ext` | Extensión original del archivo: `.pdf`, `.jpg`, `.png`… |

---

## Estructura de la base de datos (Sheets)

| Pestaña | Función | Edición |
|---------|---------|---------|
| `REGISTRO` | Todos los documentos subidos | Solo lectura (escribe la app) |
| `PERSONAL` | Lista de trabajadores activos | IMPORTRANGE automático |
| `PROGRAMADOS` | Metas por persona/tipo/mes | **Editar manualmente** |
| `USUARIOS_MASTER` | DNIs con acceso de administrador | **Editar manualmente** |
| `CONFIG` | Tipos de herramienta y parámetros | **Editar manualmente** |

---

## Solución de problemas frecuentes

| Problema | Solución |
|----------|----------|
| "DNI no encontrado" | Verificar que IMPORTRANGE en PERSONAL esté aceptado (Paso 7) |
| "App no configurada" | Ir a la URL de la app → aparece el asistente de config automáticamente |
| "No se pudo acceder al Sheets" | Verificar que el Sheets sea tuyo o que tengas acceso de edición |
| "No se pudo acceder a la carpeta" | La URL de Drive debe ser de una **carpeta**, no un archivo |
| Los archivos no aparecen en Drive | Verificar que la carpeta configurada exista y tenga permisos |
| Error al desplegar | Asegurarse de haber autorizado permisos (Paso 4) |
| La URL de la app abre una página en blanco | Limpiar caché del navegador o abrir en modo incógnito |

---

## Notas técnicas

- La configuración se guarda en `PropertiesService` del proyecto GAS — no en el Sheets
- Los archivos se transmiten como base64 (límite recomendado: ~10 MB por archivo)
- Compatible con Chrome (Android), Safari (iOS) y Edge (Windows Mobile)
- El campo `EVALUADO` en `REGISTRO` siempre se guarda como `COMPLETADO`; los pendientes se calculan desde `PROGRAMADOS`
- Los usuarios `CESADO` en la hoja de personal no pueden hacer login
