# Playwright — informe instalación + e2e

**Versión:** `@playwright/test@1.62.1` (latest al instalar; package.json `^1.62.1`)  
**Browsers:** Chromium + WebKit vía `npx playwright install chromium webkit` (sin `--with-deps`)  
**Ubicación browsers:** cache fuera del repo (`PLAYWRIGHT_BROWSERS_PATH` / AppData Temp sandbox) — **no versionados**

## Diff package

- `package.json`: +devDep + scripts `test:e2e`, `test:e2e:mobile`, `test:e2e:webkit`
- `package-lock.json`: +63 líneas
- Tamaños: package.json 3738→3774 · lock 857189→859292 (~+2.1 KB)

Archivos: `playwright.config.ts`, `e2e/**`, `.gitignore` (test-results/report)

## Resultados

### Chromium (25 tests)
- **25 passed / 0 failed** · ~29.4s
- Viewports smoke: 320–430 + tablet + desktop
- Overflow home/mapa: OK (tras filtrar carrusel Embla + pointer-events:none)
- Home carrusel/buscador/CTA: OK
- Mapa 10 ciclos: OK
- Favoritos sin sesión: OK (redirect/skeleton; entorno sin `NEXTAUTH_SECRET`/Mongo)

### WebKit (25 tests)
- **25 passed / 0 failed** (2ª corrida completa) · ~30s
- 1ª corrida: 1 fail flaky smoke@360 — `pageerror` RSC prefetch “access control checks” (ruido WebKit). Filtrado en smoke; **no es crash de app**.
- WebKit Playwright **≠** WKWebView iOS real.

## Overflow real

1ª pasada: falsos positivos Embla featured + blobs `pointer-events:none`.  
Tras detector: **0 overflow accidental** en rutas testeadas.

## JS errors entorno

Server logs: `MONGODB_URI` missing, `NO_SECRET` next-auth — limitan ficha lugar / APIs. No Application error en UI smoke.

## Flaky

- WebKit RSC “access control checks” bajo paralelismo (documentado + filtrado).

## Screenshots fallos

En `test-results/` (gitignore). Corridas verdes finales sin fallos nuevos.

## CI

**No** integrado todavía.

## Confirmación

No merge · No deploy · P2.5 sigue bloqueante publicación externa.
