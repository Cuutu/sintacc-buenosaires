# Prod deploy Lotes 1–3 — resultado

**Fecha:** 2026-08-03  
**PR:** https://github.com/Cuutu/sintacc-buenosaires/pull/1 — **MERGED**  
**Commit merge:** `6b37536`  
**Rollback requerido:** **NO**

## Deployments

| Rol | ID | URL | Commit |
|-----|-----|-----|--------|
| Anterior (rollback) | `dpl_8UqqcQ2rhfB4hGs1JoC2NBfqqWyF` | sintacc-39zebdxyq… | `d8ec492` |
| **Nuevo prod** | `dpl_GepjFhNsDUv2tnGqGVYEDMLpefss` | sintacc-lfd3h7mwt… / www.celimap.com.ar | merge `6b37536` |

## CI

- GitHub `ci`: **fail** tsc — **idéntico a main** (`reviews.test` connectDB + `place-incomplete` tags)
- Vercel Preview: **pass**
- Sin regresiones nuevas → merge autorizado

## Smoke web prod

| Check | Resultado |
|-------|-----------|
| `/` | 200 · stats 439/6/132 · sin Application error · overflow 0 |
| `/mapa` | 200 · Mapbox carga · overflow 0 |
| `/favoritos` | redirect `/login` (unauth) · sin vacío negro · overflow 0 |
| `/login` | Google CTA visible |
| `/sugerir` | “Iniciá sesión…” OK |
| `/lugar/lele-sin-gluten-parque-chacabuco` | 200 · nombre OK |
| APIs stats/places/session/lists | **200** |
| Desktop nav | parcial (locator Sugerir timeout en script; rutas OK) |

## TestFlight instalado (binario viejo)

**Pendiente vos en iPhone:** cold start, notch, mapa, favoritos, OAuth, geo, 10 tabs, bg/fg.  
WebView ya carga deploy nuevo.

## Codemagic

**Aún no ejecutado** (espera confirmación post smoke TF device, o arrancar ahora Release):

- Workflow: `ios-testflight` (NO preview)
- server.url prod
- Grupo interno TF

## Pendiente

- P2.5 device visual
- Sentry
- Fix tsc preexistente en main (fuera de este merge)
- External TF / App Store review: **no**
