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

### Facturas y gastos — detección de duplicados
- [x] Campo N° Factura / Albarán con detección de duplicados (mismo N° + mismo proveedor)
- [x] N° Factura extraído automáticamente por OCR y editable
- [x] Campo `usuario` preservado en carga desde Sheet y en reintento de sync
- [x] Modal de duplicado en `guardarFactura()`: comprobación A por N° referencia + proveedor (case-insensitive); comprobación B por fecha + proveedor + importe (±0.01€) — ambas independientes, se acumulan en un único modal con detalle del doc existente y botones "Guardar de todas formas" / "Cancelar"
- [x] Modal de duplicado en `guardarGasto()`: comprobación por fecha + categoría + importe (±0.01€)

### Proveedores — reasignación al eliminar
- [x] Al borrar un proveedor con facturas/albaranes asociados, se muestra modal de reasignación con selector de proveedor destino
- [x] Reasignación sincroniza cada factura al Apps Script secuencialmente (`addFactura` con `syncId` para upsert) con indicador de progreso
- [x] Si alguna sincronización falla, se muestra el conteo de errores y el proveedor NO se elimina (consistencia)
- [x] Si no hay facturas asociadas, flujo de borrado simple sin cambios
- [x] Fix: documentos vinculados a proveedor por `proveedorId` estable y fallback por nombre para datos antiguos; al reasignar se actualizan `proveedor` y `proveedorId`

### Historial y calendario
- [x] Campo `createdAt` en facturas, ventas y gastos para registrar cuando se guardo cada registro
- [x] Boton de vista calendario desde Historial
- [x] Calendario mensual con marcas V/F/G para ventas, facturas y gastos por fecha del documento
- [x] Vista semanal con detalle diario e importes

### Versión de la app
- [x] Constante `APP_VERSION` en el JS del frontend
- [x] Badge de versión visible al final de la pantalla Home (texto pequeño, no intrusivo)

### OCR de facturas — mejoras
- [x] Calidad de imagen subida: 600px / 75% → 1600px / 88% (mejor legibilidad de texto)
- [x] Polling ampliado: 5 intentos × 2s → 10 intentos × 3s (hasta 30s de espera)
- [x] Soporte para subir múltiples imágenes (páginas de una factura larga) — se fusionan verticalmente antes de enviar al OCR
- [x] Soporte para subir PDF — se renderizan con pdf.js y se fusionan igual que multi-imagen (máx 4 páginas)

### Sync
- [x] Reintento de proveedores pendientes en `reintentarPendientes()` (antes solo facturas/ventas/gastos)
- [x] Mapeo explícito de campos de proveedor al cargar desde Sheet (tolerante a variantes de nombre de columna)

### Proveedores — detalle y navegación
- [x] Click en proveedor (pantalla **Compras por Proveedor**) abre bottom sheet con datos de BD + facturas de ese mes; botón "Ver todos" si hay docs de otros meses
- [x] Click en proveedor (pantalla **Gestión de Proveedores**) abre el mismo bottom sheet con todos los documentos históricos; tarjeta muestra contador de documentos
- [x] Bottom sheet: tirador visual, cabecera fija, cuerpo scrollable; datos con icono + label + valor; documentos con icono por tipo (🧾/📋/🎫) y total en resumen verde
- [x] Botones Editar/Borrar en gestión usan `stopPropagation` para no interferir con el click de la tarjeta
- [x] Bug corregido: `JSON.stringify` en atributo `onclick` producía comillas dobles que rompían el HTML — solucionado con escape manual de comillas simples

### Reparto de gastos comunes
- [x] Opción **Ambas tiendas** en registro de facturas y gastos manuales (gasto compartido entre las dos tiendas)
- [x] Motor de reparto `calcularReparto()` con cuatro criterios: `dias` (4/7 SA, 3/7 JdG), `50/50`, `ventas` (proporcional a ventas del mes), `directa` (sin reparto — solo asignable a una tienda)
- [x] `REPARTO_CONFIG_DEFAULT` con criterio predefinido por categoría de gasto y para facturas
- [x] Configuración persistida en localStorage (`hcarmen_reparto_config`) — editable desde el panel de administración
- [x] Resumen mensual: nueva sección **Gastos Comunes** con importe total y desglose SA / JdG según criterio configurado
- [x] Panel de admin: sección "Configuración de Reparto" con inputs de días de apertura y selector por categoría
- [x] Fix: `nombreTienda()` devuelve 'Ambas tiendas' para el valor `'ambas'`
- [x] Fix: `cargarDatosDesdeSheet()` mapea 'Ambas tiendas' a `'ambas'` (antes caía en `'tienda2'` por ternario binario)
- [x] Fix: `resetFormGasto()` y `resetFormFactura()` limpian visualmente el botón Ambas al resetear el formulario

### Apps Script — correcciones v6.1
- [x] `addFactura` ya tenía upsert por `syncId` (sobreescribe fila si existe, inserta si no)
- [x] `addFactura` guarda `numeroFactura` (col 7) y `usuario` (col 8) — antes se perdían
- [x] `getFacturas` devuelve `numeroFactura` y `usuario` — ya disponibles al sincronizar
- [x] `addGasto` guarda `usuario` (col 7) — antes se perdía
- [x] `getGastos` devuelve `usuario`
- [x] Prompt OCR ampliado: extrae `numeroFactura` además de proveedor, importe, tipo y fecha
- [x] `max_tokens` del OCR subido de 256 a 300 para acomodar el campo extra

## Pendiente

- [ ] Desglose de artículos en líneas de factura (OCR línea a línea, no solo importe total)
- [ ] Notificaciones / alertas de gastos por encima de umbral mensual configurable
