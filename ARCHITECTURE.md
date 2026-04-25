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
| `screen-venta` | Registro de venta diaria |
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
| `hcarmen_facturas` | Array de facturas/albaranes |
| `hcarmen_gastos` | Array de gastos manuales |
| `hcarmen_proveedores` | Array de proveedores (BD local) |
| `hcarmen_session` | Sesión activa (usuario + expiración) |

## Comunicación con el backend

### Operaciones de lectura/escritura normales
- Se usa **GET** con el parámetro `data` como JSON codificado en la URL.
- Motivo: workaround para el problema de CORS en Apps Script sin dominio propio.

### OCR de facturas
- Se hace **POST no-cors** (fetch mode `no-cors`) para enviar la imagen en base64.
- El Apps Script procesa la imagen con Claude API de forma asíncrona.
- El frontend hace **polling** (GET periódico) hasta recibir el resultado.

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

## Exportación de informes PDF

- Se usa `window.open()` + `window.print()` sin dependencias externas.
- Los charts de Chart.js se capturan con `.toBase64Image()` y se embeben como `<img>` en el HTML del informe.
- El usuario selecciona "Guardar como PDF" en el diálogo de impresión del sistema.
- Disponible en: Resumen Mensual, Estadísticas Ventas, Estadísticas Compras.

## Librerías externas

| Librería | Uso |
|---|---|
| Chart.js (CDN) | Gráficas en estadísticas y resumen mensual |

## Lecciones aprendidas (trampas conocidas)

| Problema | Solución |
|---|---|
| Campo `importe` vs `importeTotal` | En el Sheet se usa `importe`; en el objeto JS local se usa `importeTotal`; mapeo explícito en `cargarDatosDesdeSheet` |
| `id=syncId` obligatorio | Cada registro necesita este campo para que Apps Script identifique duplicados |
| `getProveedores()` devuelve objeto, no array | Devuelve `{ proveedores: [...] }`; el frontend maneja ambos formatos en `cargarDatosDesdeSheet` |
| CORS en Apps Script | Usar GET con JSON en parámetro; POST solo para no-cors (OCR) |
| `onfocus` en autocomplete | Causaba que el desplegable se abriera al entrar a la pantalla; eliminado, solo `oninput` |
| `isEdit` en saveProveedor | Hay que pasarlo explícitamente desde el frontend; sin él siempre crea fila nueva |
