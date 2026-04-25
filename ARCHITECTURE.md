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

## Persistencia

| Capa | Rol |
|---|---|
| localStorage | Caché local; los datos se guardan aquí primero, luego se sincronizan |
| Google Sheets | Base de datos permanente; fuente de verdad |

La app funciona offline con los datos en caché. Cuando hay conectividad, sincroniza con Sheets.

## Comunicación con el backend

### Operaciones de lectura/escritura normales
- Se usa **GET** con el parámetro `data` como JSON codificado en la URL.
- Motivo: workaround para el problema de CORS en Apps Script sin dominio propio.

### OCR de facturas
- Se hace **POST no-cors** (fetch mode `no-cors`) para enviar la imagen en base64.
- El Apps Script procesa la imagen con Claude API de forma asíncrona.
- El frontend hace **polling** (GET periódico) hasta recibir el resultado.

## Librerías externas

| Librería | Uso |
|---|---|
| Chart.js (CDN) | Gráficas de tendencias, comparativa interanual, ajuste inflación |

## Lecciones aprendidas (trampas conocidas)

| Problema | Solución |
|---|---|
| Campo `importe` vs `importeTotal` | En el Sheet se usa `importeTotal`; en el objeto JS se mapea explícitamente |
| `id=syncId` obligatorio | Cada registro necesita este campo para que Apps Script pueda identificar duplicados |
| `getProveedores()` devuelve array plano | No anida objetos; filtrar directamente sobre el array |
| CORS en Apps Script | Usar GET con JSON en parámetro; POST solo para no-cors (OCR) |
