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
| `screen-albaranes` | Control de albaranes pendientes/facturados |
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
| `hcarmen_facturas` | Array de facturas/albaranes (campos: syncId, fecha, proveedor, proveedorId, tipo, numeroFactura, importeTotal, tienda, notas, usuario, createdAt, estadoFacturacion, contabiliza, facturaRelacionadaId, albaranesRelacionados, synced) |
| `hcarmen_ventas` | Array de ventas diarias (campos: syncId, fecha, tienda, efectivo, tarjeta, total, notas, usuario, createdAt, synced) |
| `hcarmen_gastos` | Array de gastos manuales (campos: syncId, fecha, concepto, categoria, importe, tienda, notas, usuario, createdAt, synced) |
| `hcarmen_proveedores` | Array de proveedores (incluye `modoFacturacion`, `diasMaxFactura`, `toleranciaFactura`) |
| `hcarmen_session` | Sesion activa (usuario + expiracion) |
| `hcarmen_log` | Array de entradas de actividad (max 300 locales; se sincroniza con Sheet tab Log) |
| `hcarmen_api_usage` | Objeto `{ "YYYY-MM": N }` con contador de llamadas OCR por mes (local) |
| `hcarmen_reparto_config` | Objeto con `diasSA`, `diasJdG` y `categorias` (criterio de reparto por categoria) |

## Relacion entre documentos y proveedores

Las facturas/albaranes se guardan con dos referencias:

- `proveedor`: nombre visible del proveedor, usado por compatibilidad con los datos antiguos y con Sheets.
- `proveedorId`: id estable del proveedor en `hcarmen_proveedores`, usado para reasignar y contar documentos sin depender solo del texto.

Los registros antiguos que no tengan `proveedorId` siguen resolviendose por coincidencia normalizada de nombre (`proveedor` vs `razonSocial`). Al eliminar un proveedor, la app reasigna todas las facturas que coincidan por `proveedorId` o por nombre, y actualiza ambos campos (`proveedor` y `proveedorId`) antes de borrar el proveedor.

`createdAt` registra cuando se guardo el registro en la app. La fecha `fecha` sigue siendo la fecha del documento, venta o gasto, y es la que se usa para resumenes y calendario.

## Control de facturacion

Cada proveedor puede tener un `modoFacturacion`:

- `pago_inmediato`: el albaran cuenta como coste desde el registro.
- `factura_unitaria`: el albaran queda pendiente hasta recibir factura.
- `factura_mensual`: varios albaranes quedan pendientes hasta una factura agrupada.
- `solo_factura`: los albaranes no se contabilizan.
- `revisar`: modo conservador para proveedores sin configurar.

Los documentos nuevos guardan `estadoFacturacion` y `contabiliza`. Los resumenes y estadisticas suman solo documentos contabilizables. Los documentos antiguos sin esos campos se siguen contabilizando para no alterar historicos sin una migracion revisada.

## Schema de Google Sheets

### Tab `Facturas` (9 columnas + recomendadas)

| Col | Índice | Campo |
|---|---|---|
| A | 0 | fecha |
| B | 1 | proveedor |
| C | 2 | tienda |
| D | 3 | importe |
| E | 4 | tipo |
| F | 5 | notas |
| G | 6 | syncId |
| H | 7 | numeroFactura |
| I | 8 | usuario |
| J | 9 | proveedorId (recomendado) |
| K | 10 | createdAt (recomendado) |
| L | 11 | estadoFacturacion (recomendado) |
| M | 12 | contabiliza (recomendado) |
| N | 13 | facturaRelacionadaId (recomendado) |
| O | 14 | albaranesRelacionados (recomendado) |

### Tab `Ventas` (7 columnas + recomendadas)

| Col | Índice | Campo |
|---|---|---|
| A | 0 | fecha |
| B | 1 | tienda |
| C | 2 | efectivo |
| D | 3 | tarjeta |
| E | 4 | total |
| F | 5 | notas |
| G | 6 | syncId |
| H | 7 | usuario (recomendado) |
| I | 8 | createdAt (recomendado) |

### Tab `Gastos_Manual` (8 columnas + recomendadas)

| Col | Índice | Campo |
|---|---|---|
| A | 0 | fecha |
| B | 1 | concepto |
| C | 2 | tienda |
| D | 3 | importe |
| E | 4 | categoria |
| F | 5 | notas |
| G | 6 | syncId |
| H | 7 | usuario |
| I | 8 | createdAt (recomendado) |

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
| `addFactura` | GET/POST | Upsert por `syncId` en tab Facturas (sobreescribe si existe, inserta si no); el frontend envia tambien `proveedorId`, `createdAt`, `estadoFacturacion`, `contabiliza`, `facturaRelacionadaId` y `albaranesRelacionados` |
| `addVenta` | GET/POST | Añade o actualiza fila en tab Ventas; el frontend envia `usuario` y `createdAt` |
| `addGasto` | GET/POST | Añade fila en tab Gastos_Manual; el frontend envia `usuario` y `createdAt` |
| `deleteRegistro` | GET/POST | Borra por syncId en Facturas/Ventas/Gastos |
| `saveProveedor` | GET/POST | Crea o edita proveedor (flag `isEdit`); el frontend envia tambien modo y parametros de facturacion |
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

## Versioning

La constante `APP_VERSION` (en la sección `// ── CONFIGURACIÓN ──` del script) controla la versión visible en la app. Se muestra en un badge pequeño al final de la pantalla Home (`#appVersionBadge`).

**Historial de versiones:**

| Versión | Cambios principales |
|---|---|
| v1.9.0 | Control inicial de facturacion: modo por proveedor, albaranes pendientes y costes solo contabilizables |
| v1.8.0 | OCR tambien en Gastos Manuales con relleno de concepto, importe, fecha y categoria sugerida |
| v1.7.0 | `proveedorId` estable en documentos, `createdAt` en registros e historial con vista calendario mensual/semanal |
| v1.6.0 | Detección de duplicados en facturas (×2 comprobaciones) y gastos; reasignación de docs al borrar proveedor |
| v1.5.x | Reparto de gastos comunes entre tiendas; configuración de reparto en panel admin |
| v1.4.x | Bottom sheet de detalle de proveedor; botones Editar/Borrar con stopPropagation |
| v1.3.x | OCR multi-imagen y PDF; cotejo inteligente de proveedor (Levenshtein); N° factura |
| v1.2.x | Estadísticas avanzadas; exportación PDF; categorías de gastos |
| v1.1.x | Base de datos de proveedores; autocomplete; ranking con variación de precio |
| v1.0.0 | Core: ventas, facturas, gastos, resumen mensual, login por PIN |

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
| `let` en variables de callback de modal | Las variables `_dupFacturaResolver` / `_dupGastoResolver` se asignan a funciones para resolver Promises desde botones onclick; funcionan en scripts no-módulo porque top-level `let` está en el scope global |
