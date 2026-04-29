# Arquitectura técnica — Alimentación HCarmen

## Visión general

```
Navegador (GitHub Pages)
    │
    │  GET ?action=...&data=<JSON codificado>   (workaround CORS)
    │  POST no-cors (OCR + polling)
    ▼
Google Apps Script (doGet / doPost)
    │
    ├── Lee / escribe Google Sheets
    └── Llama a Claude API (OCR)
```

## Frontend

- **Un único archivo**: `index.html` contiene todo el HTML, CSS y JS.
- **Sin framework**: Vanilla JS puro, sin npm, sin build step.
- **Hosting**: GitHub Pages (rama `main`, raíz del repo).

## Pantallas de la app

| Pantalla (id) | Descripción |
|---|---|
| `screen-home` | Menú principal |
| `screen-ventas` | Registro de venta diaria |
| `screen-factura` | Escanear / registrar factura o albarán |
| `screen-gasto` | Registro manual de gasto |
| `screen-resumen` | Resumen mensual con KPIs y gráfica semanal |
| `screen-proveedores` | Compras por proveedor (resumen mensual) |
| `screen-historial` | Historial de registros |
| `screen-estadisticas` | Selector: Ventas o Compras |
| `screen-stats-ventas` | Estadísticas avanzadas de ventas |
| `screen-stats-compras` | Estadísticas avanzadas de compras y gastos |
| `screen-gestion-proveedores` | Base de datos de proveedores (CRUD) |
| `screen-admin` | Panel de administración (solo rol admin) |

## Persistencia

| Capa | Rol |
|---|---|
| localStorage | Caché local; los datos se guardan aquí primero, luego se sincronizan |
| Google Sheets | Base de datos permanente; fuente de verdad |

La app funciona offline con los datos en caché. Cuando hay conectividad, sincroniza con Sheets.

## Claves de localStorage

| Clave | Contenido |
|---|---|
| `hcarmen_ventas` | Array de ventas diarias |
| `hcarmen_facturas` | Array de facturas/albaranes (campos: syncId, fecha, proveedor, tipo, numeroFactura, importeTotal, tienda, notas, usuario, synced) |
| `hcarmen_gastos` | Array de gastos manuales (campos: syncId, fecha, concepto, categoria, importe, tienda, notas, usuario, synced) |
| `hcarmen_proveedores` | Array de proveedores (BD local) |
| `hcarmen_session` | Sesión activa (usuario + expiración) |
| `hcarmen_log` | Array de entradas de actividad (máx 300 locales; se sincroniza con Sheet tab Log) |
| `hcarmen_api_usage` | Objeto `{ "YYYY-MM": N }` con contador de llamadas OCR por mes (local) |
| `hcarmen_reparto_config` | Objeto con `diasSA`, `diasJdG` y `categorias` (criterio de reparto por categoría) |

## Comunicación con el backend

### Operaciones de lectura/escritura normales
- Se usa **GET** con el parámetro `data` como JSON codificado en la URL.
- Motivo: workaround para el problema de CORS en Apps Script sin dominio propio.

### OCR de facturas
- Se hace **POST no-cors** (fetch mode `no-cors`) para enviar la imagen en base64.
- El Apps Script procesa la imagen con Claude API de forma asíncrona.
- El frontend hace **polling** (GET periódico) hasta recibir el resultado.

### Subida de archivos
- **Imágenes** (una o varias): el input `#fileInput` acepta `image/*` con atributo `multiple`. Si se seleccionan varias, se fusionan verticalmente en un canvas antes de enviar al OCR — así se tratan facturas de varias páginas sin cambios en el backend.
- **PDF**: se renderiza con `pdf.js` (CDN `3.11.174`) a escala 2× por página, se fusionan las páginas (máx 4) y se envía como imagen JPEG igual que las imágenes normales.
- Calidad de compresión: max 1600px, JPEG 88%.

### Cotejo inteligente de proveedor (post-OCR)
Tras recibir el nombre del proveedor del OCR, el frontend lo compara contra la BD local de proveedores usando distancia Levenshtein normalizada:
- `_normProv()` — normaliza texto: minúsculas, sin acentos, sin formas jurídicas (SL, SA, CB…)
- `_levenshtein()` — distancia de edición entre dos cadenas
- `_similitudProv()` — devuelve score 0–1; también detecta substring (score 0.92)
- `_candidatosProveedor()` — filtra candidatos con score ≥ 0.45, devuelve top 5

Si hay candidatos, abre el `#modalCotejoProveedor` con botones de selección y porcentaje de similitud. Si el score top es ≥ 0.85 se selecciona automáticamente sin modal.

### Acciones implementadas en Apps Script

| Acción | Método | Descripción |
|---|---|---|
| `getAll` | GET | Devuelve facturas, ventas, gastos y proveedores |
| `getFacturas` | GET | Solo facturas |
| `getVentas` | GET | Solo ventas |
| `getGastos` | GET | Solo gastos |
| `getProveedores` | GET | Devuelve `{ proveedores: [...] }` |
| `getApiUsage` | GET | Uso de Claude API por mes |
| `testApi` | GET | Test de conectividad con Claude |
| `addFactura` | GET/POST | Añade fila en tab Facturas |
| `addVenta` | GET/POST | Añade o actualiza fila en tab Ventas |
| `addGasto` | GET/POST | Añade fila en tab Gastos_Manual |
| `deleteRegistro` | GET/POST | Borra por syncId en Facturas/Ventas/Gastos |
| `saveProveedor` | GET/POST | Crea o edita proveedor (flag `isEdit`) |
| `deleteProveedor` | GET/POST | Borra proveedor por id |
| `addLog` | GET/POST | Añade entrada en tab Log |
| `analizarFoto` | POST no-cors | OCR con Claude API, resultado en PropertiesService |
| `getOcrResult` | GET | Polling: devuelve resultado del OCR por `tempId` (`{ success, datos }` o `{ pending: true }`) |

## Reparto de gastos comunes entre tiendas

Los gastos con `tienda = 'ambas'` se reparten automáticamente entre SA y JdG en el Resumen Mensual.

### Criterios de reparto (campo `categorias` en `REPARTO_CONFIG`)

| Criterio | Fórmula |
|---|---|
| `dias` | 4/7 → SA, 3/7 → JdG (días de apertura semanales) |
| `50/50` | Mitad exacta a cada tienda |
| `ventas` | Proporcional a las ventas del mes (requiere datos de ventas del mismo mes) |
| `directa` | No se reparte (solo asignable a una tienda concreta) |

La configuración por defecto (`REPARTO_CONFIG_DEFAULT`) asigna:
- `Personal`, `Transporte/Gasolina` → `dias`
- `Gestoría`, `Impuestos` → `50/50`
- `Alquiler`, `Suministros`, `Reparaciones` → `directa`
- `Material`, `Otros`, facturas (`_factura`) → `ventas`

El administrador puede cambiar días de apertura y criterio por categoría desde el panel de admin; los cambios se persisten en `hcarmen_reparto_config`.

## Exportación de informes PDF

- Se usa `window.open()` + `window.print()` sin dependencias externas.
- Los charts de Chart.js se capturan con `.toBase64Image()` y se embeben como `<img>` en el HTML del informe.
- El usuario selecciona "Guardar como PDF" en el diálogo de impresión del sistema.
- Disponible en: Resumen Mensual, Estadísticas Ventas, Estadísticas Compras.

## Librerías externas

| Librería | Uso |
|---|---|
| Chart.js 4.4.1 (CDN) | Gráficas en estadísticas y resumen mensual |
| pdf.js 3.11.174 (CDN) | Renderizado de PDF a canvas para enviar al OCR como imagen |

## Lecciones aprendidas (trampas conocidas)

| Problema | Solución |
|---|---|
| Campo `importe` vs `importeTotal` | En el Sheet se usa `importe`; en el objeto JS local se usa `importeTotal`; mapeo explícito en `cargarDatosDesdeSheet` |
| `id=syncId` obligatorio | Cada registro necesita este campo para que Apps Script identifique duplicados |
| `getProveedores()` devuelve objeto, no array | Devuelve `{ proveedores: [...] }`; el frontend maneja ambos formatos en `cargarDatosDesdeSheet` |
| CORS en Apps Script | Usar GET con JSON en parámetro; POST solo para no-cors (OCR) |
| `onfocus` en autocomplete | Causaba que el desplegable se abriera al entrar a la pantalla; eliminado, solo `oninput` |
| `isEdit` en saveProveedor | Hay que pasarlo explícitamente desde el frontend; sin él siempre crea fila nueva |
| `JSON.stringify` en atributo `onclick` | Produce comillas dobles que rompen el atributo HTML; solución: escape manual con `str.replace(/'/g, "\\'")` y usar comillas simples en el JS del atributo |
| `modal-card` sin CSS | La clase no existía y el modal salía transparente; solución: estilos inline en el elemento o usar la clase `modal-box` ya definida |
