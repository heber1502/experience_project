# Welcome — clon del landing (Awwwards Top 16)

Proyecto Vite (vanilla JS + CSS), sin frameworks. Vamos sección por sección; esta entrega trae **header + hero**.

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre lo que te muestre la terminal (normalmente http://localhost:5173).

Para producción:

```bash
npm run build
npm run preview
```

## Estructura

```
index.html        ← punto de entrada (Vite lo sirve desde la raíz)
src/
  style.css       ← todo el CSS (tokens en :root, luego componentes por sección)
  main.js         ← JS: header sticky, menú móvil, animaciones on-scroll
public/
  assets/         ← pon aquí las imágenes descargadas (ver nota abajo)
```

## ⚠️ Importante sobre las imágenes

Ahora mismo el `index.html` apunta a URLs temporales de la API de Figma
(`https://www.figma.com/api/mcp/asset/...`). **Esos links expiran a los 7 días.**

Antes de darlo por terminado:
1. Descarga cada imagen a `public/assets/`.
2. Reemplaza la URL en `index.html` por la ruta local, ej. `/assets/hero-glow.png`.

Te dejo ya la carpeta `public/assets/` creada para que sea directo. Si quieres,
en la próxima sección te paso también un script chiquito que descargue todas
las imágenes usadas hasta ese punto.

## Progreso

- [x] Header + nav (desktop y menú móvil)
- [x] Hero (título, subtítulo, CTAs, marco de video con glow)
- [ ] "World-class teams are upgrading to Welcome" (logos de clientes)
- [ ] ... resto de secciones