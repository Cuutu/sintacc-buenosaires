# CeliMap · Reels

Proyecto Remotion independiente para reels de Instagram. No toca la web: tiene su propio
`package.json` y `node_modules`, y la carpeta está excluida del `tsconfig.json` raíz.

## Renderizar

```bash
cd reels
npm install        # solo la primera vez
npm run build      # video + portada + portada alternativa
```

- `npm run render` → `out/reel-emprendimientos.mp4` (H.264, yuv420p, 1080x1920, 30fps, ~17s, sin audio)
- `npm run portada` → `out/portada-emprendimientos.png` (el CTA, dentro del recorte 1080x1350 del feed)
- `npm run portada-alternativa` → `out/portada-emprendimientos-alternativa.png` (la pregunta + tarjetas)
- `npm run studio` → Remotion Studio para ver y ajustar en el navegador
- `npm run ilustraciones` → las 5 ilustraciones de comida juntas, para retocarlas

En el Studio también están `ReelEmprendimientos-Guias` y `PortadaEmprendimientos-Guias`:
el mismo reel con las zonas que tapa Instagram en rojo (220px arriba, 380px abajo, 160px a la
derecha) y el recorte del feed en azul. Usalas para revisar antes de publicar.

## Cambiar textos

Todo está en `src/copy.ts`:

- Titulares: lista de líneas `{ t: 'texto', f: 'sans' | 'serif' }`. `sans` es Nunito ExtraBold
  (como los h1 de la web) y `serif` es Fraunces itálica (el acento, como "tu mapa sin gluten").
  Máximo 3 líneas. `subrayado: true` le agrega el trazo terracota.
- `catalogo.palabras` y `catalogo.tarjetas` van en el mismo orden: cada palabra de
  "Los que hacen …" corresponde a una tarjeta.
- Tarjetas: nombre, zona, categoría, ilustración (`pan`, `torta`, `vianda`, `pizza`, `alfajores`)
  y chips. Nombres genéricos a propósito.

Regla de marca: nunca "seguro", "garantizado", "certificado" ni "sin riesgo", y nunca nombres de
emprendimientos reales sin su permiso.

## Estructura

| Escena | Qué pasa | Archivo |
| --- | --- | --- |
| 1 · Gancho + catálogo (0–6s) | Pregunta + abanico de tarjetas; sube la onda crema y el carrusel "Los que hacen pan / tortas / …" | `src/scenes/SceneIntro.tsx` |
| 2 · Cómo se hace (6–12.5s) | Celular con la web: Sugerir → formulario → ¡Gracias! → la tarjeta nueva en el listado | `src/scenes/SceneHowTo.tsx` |
| 3 · CTA (12.5–17.5s) | "Mencionalo en los comentarios", comentario tipeándose, bajada y logo | `src/scenes/SceneCTA.tsx` |

Tiempos de cada escena: constantes `INTRO`, `HOWTO` y `CTA` al principio de cada archivo, y el
encadenado en `src/ReelEmprendimientos.tsx`. Los cambios de tarjeta van cada 15 frames
(un beat a 120 bpm), así el audio que agregues en Instagram cae a tiempo.

| Archivo | Qué es |
| --- | --- |
| `src/brand.ts` | Colores, tipografías, zonas seguras, easings |
| `src/components/Headline.tsx` | Titulares palabra por palabra (Nunito + Fraunces) |
| `src/components/FoodArt.tsx` | Ilustraciones de comida para la "foto" de las tarjetas |
| `src/components/VentureCatalog.tsx` | `/emprendimientos` y `VentureCard` de la web |
| `src/components/AppScreens.tsx` | `/sugerir-emprendimiento` y la pantalla de gracias |
| `src/components/BottomNav.tsx` | La barra flotante de la web en mobile |
| `src/components/Atlas.tsx` | El mapa ilustrado del hero de la web (`CeliMapAtlas`) |
| `src/components/Decor.tsx` | Onda, damero, textura de espigas, grano, emojis |
| `src/components/Phone.tsx`, `Finger.tsx` | Mockup de iPhone y dedo con toques |
| `scripts/prepare-logo.js` | Genera `public/logo-crema.png` desde el logo negativo de la web |

Assets copiados de la web: `public/brand/texture-wheat.svg`, `public/brand/icon-ig.png`,
`public/noise.png`, `public/map/pin-*.png`. Íconos: `lucide-react` (misma versión que la web).

## Hacer un reel nuevo

1. Copiá la escena que quieras reutilizar y editá sus textos en `src/copy.ts`.
2. Encadenala en un archivo nuevo como `src/ReelEmprendimientos.tsx`.
3. Registrá la composición en `src/Root.tsx` y sumá los scripts de render en `package.json`.

Si cambia el logo de la web, corré `npm run prepare-logo`.
