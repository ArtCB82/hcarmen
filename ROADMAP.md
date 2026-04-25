# Roadmap — Alimentación HCarmen

## Completado

- [x] Login Netflix-style con PINs y sesiones de 1 hora
- [x] Registro de ventas diarias (total caja – tarjeta = efectivo calculado automáticamente)
- [x] Cierre de caja con conteo físico de billetes y monedas (desde 50 € hasta 0,20 €)
- [x] Escaneo OCR de facturas y albaranes (Claude API)
- [x] Registro manual de gastos
- [x] Resumen mensual con KPIs
- [x] Estadísticas avanzadas con Chart.js (tendencias, comparativa interanual, ajuste por inflación)
- [x] Panel de administración (gestión de usuarios, uso de API, log de operaciones)
- [x] Base de datos de proveedores (modal de edición, autocomplete, sincronización con Sheet)

## Bugs conocidos / Pendiente

### CRÍTICO (resuelto en último commit)
- [x] `guardarFactura` fallaba porque `proveedorSeleccionado` no estaba declarada y faltaban las funciones:
  `getProveedores`, `seleccionarProveedor`, `resetProveedor`, `buscarProveedor`,
  `mostrarModalProveedor`, `cerrarModalProveedor`, `guardarProveedor`, `renderListaProveedores`, `borrarProveedor`

### Pendiente
- [ ] Verificar sincronización bidireccional de proveedores con el Sheet (tab `Proveedores`)
- [ ] Validar que `saveProveedor` y `deleteProveedor` están implementadas en Apps Script

## Fase futura

- [ ] Desglose de artículos en líneas de factura (OCR línea a línea, no solo importe total)
- [ ] Exportación de informes a PDF
- [ ] Notificaciones / alertas de gastos por encima de umbral
