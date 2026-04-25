# Contexto de negocio — Alimentación HCarmen

## Las tiendas

| Tienda | Nombre |
|---|---|
| Tienda 1 | Tienda San Asturio |
| Tienda 2 | Tienda Juan de Guzmán |

- Nombre comercial: **Alimentación HCarmen**
- Email: alimentacionhcarmen@gmail.com
- App: [https://artcb82.github.io/hcarmen/](https://artcb82.github.io/hcarmen/)

## Backend: Google Sheets + Apps Script

- **Apps Script URL:**
  `https://script.google.com/macros/s/AKfycbzw79H2icOEE_A-4N86p8EvuPZtTSMc3XA9FtAhJU7_Zb3PSlz5uW9mmWfoKt7qyJDNyw/exec`

- **Tabs del Google Sheet:**

| Tab | Contenido |
|---|---|
| Ventas | Registro de ventas diarias |
| Facturas | Facturas y albaranes escaneados |
| Gastos_Manual | Gastos introducidos manualmente |
| Resumen_Proveedores | Resumen agregado por proveedor |
| Log | Log de operaciones |
| API_Usage | Uso y coste de la Claude API |
| Proveedores | Base de datos de proveedores |

## OCR de facturas

- Motor: Claude API, modelo `claude-opus-4-5`
- La API key está almacenada en Apps Script (variables de script), **nunca en el frontend**
- Flujo: el frontend hace un POST no-cors al Apps Script → el script llama a Claude → el frontend hace polling hasta obtener el resultado

## Usuarios

| Usuario | PIN | Rol |
|---|---|---|
| Arturo Admin | 1982 | admin |
| Arturo U | 1234 | user |
| Padre | 0000 | user |

Los PINs se validan en el frontend. El rol `admin` da acceso al panel de administración (usuarios, log de API, log de operaciones).
