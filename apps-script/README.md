# Apps Script Backend

Este directorio guarda el codigo del backend de Google Apps Script usado por la app.

Flujo recomendado:

1. Modificar primero `apps-script/Code.gs` en este repo.
2. Hacer commit y push.
3. Copiar el contenido de `Code.gs` en el editor de Google Apps Script.
4. Guardar e implementar una nueva version.

Notas:

- `CLAUDE_API_KEY` debe rellenarse en Google Apps Script, no en el frontend.
- Apps Script actua como backend/API: lee y escribe Google Sheets, procesa OCR con Claude y ejecuta mantenimiento de datos.
- La accion `mergeDuplicateProveedores` fusiona proveedores duplicados en Google Sheets; conviene usarla solo tras revisar que el script desplegado esta actualizado.
