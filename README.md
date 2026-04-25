# Alimentación HCarmen — App de Gestión

Aplicación web de gestión para dos tiendas de alimentación familiares: **Tienda San Asturio** y **Tienda Juan de Guzmán**, bajo el nombre comercial Alimentación HCarmen.

## App en producción

**[https://artcb82.github.io/hcarmen/](https://artcb82.github.io/hcarmen/)**

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | HTML + Vanilla JS (single-file) |
| Hosting | GitHub Pages |
| Base de datos | Google Sheets |
| Backend / API | Google Apps Script |
| Gráficas | Chart.js |
| OCR de facturas | Claude API (claude-opus-4-5) |
| Caché local | localStorage |

## Estructura del repositorio

```
hcarmen/
└── index.html   # Toda la app: HTML, CSS y JS en un solo archivo
```

## Despliegue

La app se despliega automáticamente via GitHub Pages desde la rama `main`. No requiere build step.

1. Editar `index.html`
2. Hacer commit y push a `main`
3. GitHub Pages publica en ~1 min en la URL de producción

## Contacto

alimentacionhcarmen@gmail.com
