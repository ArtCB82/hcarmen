# Roadmap — Alimentación HCarmen

## Completado

### Core
- [x] Login Netflix-style con PINs y sesiones de 1 hora
- [x] Registro de ventas diarias (total caja – tarjeta = efectivo calculado automáticamente)
- [x] Cierre de caja con conteo físico de billetes y monedas (desde 50 € hasta 0,20 €)
- [x] Escaneo OCR de facturas y albaranes (Claude API `claude-opus-4-5`)
- [x] Registro manual de gastos
- [x] Panel de administración (gestión de usuarios, uso de API, log de operaciones)

### Consultas y resumen
- [x] Resumen mensual con KPIs (ventas, costes, beneficio, desglose por tienda)
- [x] Resumen mensual — KPIs extra: margen neto %, % compras/ventas, venta media/día, variación vs mes anterior
- [x] Resumen mensual — gráfica de ventas vs costes por semana del mes
- [x] Compras por proveedor (resumen mensual agrupado)

### Estadísticas avanzadas
- [x] Menú selector: Ventas y Beneficio / Compras y Gastos
- [x] Estadísticas Ventas: tendencias, comparativa interanual, ajuste inflación, margen, medios de pago
- [x] Estadísticas Compras y Gastos: 8 KPIs, evolución mensual, top proveedores, distribución costes, ranking con variación de precio, gastos por categoría, tipo de documento

### Exportación
- [x] Exportar informe PDF en Resumen Mensual (window.print con HTML profesional, charts embebidos)
- [x] Exportar informe PDF en Estadísticas Ventas
- [x] Exportar informe PDF en Estadísticas Compras y Gastos

### Proveedores
- [x] Base de datos de proveedores (modal de edición, sincronización con Sheet tab `Proveedores`)
- [x] Autocomplete al escribir en campo proveedor (solo se despliega al teclear, se cierra al hacer click fuera)
- [x] Botón `+` junto al input para crear proveedor nuevo directamente
- [x] Ranking de proveedores con detección de variación de precio (1ª vs 2ª mitad del período)

### Backend (Apps Script)
- [x] `saveProveedor` con soporte para crear y editar (flag `isEdit`)
- [x] `deleteProveedor` para borrar filas del Sheet tab `Proveedores`
- [x] `getProveedores` devuelve `{ proveedores: [...] }` — el frontend maneja ambos formatos

### OCR — Cotejo inteligente de proveedor
- [x] Distancia Levenshtein normalizada para comparar el texto OCR contra la BD de proveedores
- [x] Score ≥ 0.85 → selección automática; score 0.45–0.85 → modal con candidatos ordenados por similitud
- [x] Normalización previa: sin acentos, sin formas jurídicas (SL, SA, CB…), sin puntuación

### Gastos manuales
- [x] Categorías predefinidas (9): Alquiler, Transporte/Gasolina, Suministros, Personal, Material, Reparaciones, Impuestos, Gestoría, Otros

### UX y navegación
- [x] Botón atrás del navegador/móvil funciona correctamente (History API — `pushState` + `popstate`)
- [x] Usuarios hardcodeados en el código — eliminada gestión dinámica desde Admin (lista `USUARIOS` en index.html); 6 usuarios activos (Arturo admin, Arturo H, Arturo P, Carmen, Alvaro, Sonia)
- [x] Campo `usuario` registrado en facturas, ventas y gastos — visible en el historial

### Bugs resueltos
- [x] `guardarFactura` petaba en silencio — `proveedorSeleccionado` no declarada y 9 funciones de proveedor faltaban
- [x] Al editar proveedor se creaba fila nueva en lugar de actualizar — faltaba pasar `isEdit: true`
- [x] Autocomplete se desplegaba al entrar a la pantalla (onfocus) — eliminado, solo se activa con oninput

### Facturas
- [x] Campo N° Factura / Albarán con detección de duplicados (mismo N° + mismo proveedor)
- [x] N° Factura extraído automáticamente por OCR y editable
- [x] Campo `usuario` preservado en carga desde Sheet y en reintento de sync

### OCR de facturas — mejoras
- [x] Calidad de imagen subida: 600px / 75% → 1600px / 88% (mejor legibilidad de texto)
- [x] Polling ampliado: 5 intentos × 2s → 10 intentos × 3s (hasta 30s de espera)
- [x] Soporte para subir múltiples imágenes (páginas de una factura larga) — se fusionan verticalmente antes de enviar al OCR
- [x] Soporte para subir PDF — se renderizan con pdf.js y se fusionan igual que multi-imagen (máx 4 páginas)

### Sync
- [x] Reintento de proveedores pendientes en `reintentarPendientes()` (antes solo facturas/ventas/gastos)
- [x] Mapeo explícito de campos de proveedor al cargar desde Sheet (tolerante a variantes de nombre de columna)

### Proveedores
- [x] Click en proveedor (pantalla Compras por Proveedor) abre modal con datos de BD + historial de documentos

## Pendiente

- [ ] Desglose de artículos en líneas de factura (OCR línea a línea, no solo importe total)
- [ ] Notificaciones / alertas de gastos por encima de umbral mensual configurable
