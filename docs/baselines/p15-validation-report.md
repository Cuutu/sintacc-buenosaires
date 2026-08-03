# P1.5 — Validación y endurecimiento Lote 1

**Estado:** **APROBADO CON RESERVAS** (listo para review; **no** merge/deploy)  
**Fecha:** 2026-08-02  
**Causa Application error:** documentada como **causa probable principal** (doble init Mapbox / throw en effect / favoritos session), **no** causa raíz confirmada (sin stack trace original).

---

## 1. Diff real

### `git status --short` (al cierre P1.5)
Ver working tree: Lote 1 + WIP P2 mezclados en disco.

### Stash backup
`stash@{0}: KEEP-backup-wip-pre-lote1` — **INTACTO**.

### Diff lógico Lote 1 (tracked)
`docs/baselines/lote1-only.diff` (~26 KB)

Tracked Lote 1:
- `app/favoritos/page.tsx`, `app/layout.tsx`
- `components/layout/LayoutChrome.tsx`
- `components/map-view/{MapScreen,MapboxMap,PlacesList,useMediaQuery}.tsx`
- (+ untracked nuevos listados abajo)

### Untracked Lote 1 (nuevos)
- `app/error.tsx`, `app/global-error.tsx`
- `components/AppErrorBoundary.tsx`, `components/ClientErrorListeners.tsx`
- `lib/{client-error-reporter,favoritos-auth-view,mapbox-lifecycle,media-query-store}.ts`
- `__tests__/…` (5 suites Lote 1)

### WIP P2 / no-Lote1 (siguen presentes; **fuera** diff lógico Lote 1)
- `components/native/NativeStatusBar.tsx` (nuevo)
- `components/map-view/MapTopBar.tsx` (`1.1rem` offset)
- `app/page.tsx` (pt hero)
- `lib/native-app.ts` (detección ampliada)
- `app/auth/mobile-return/page.tsx`
- `app/layout.tsx` también tiene `viewportFit` + NativeStatusBar (WIP P2 mezclado en mismo archivo)
- `docs/auditoria-movil-celimap.md`, `public/sw.js` (build)

---

## 2–6. Endurecimiento hecho

| Área | Cambio |
|------|--------|
| useSyncExternalStore | Store cacheado por query (`lib/media-query-store.ts`); subscribe/getSnapshot estables; Safari `addListener` fallback; SSR `null`; `resolveMapVariant` → una sola variante |
| Mapbox lifecycle | `disposedRef` reset; cleanup idempotente (`removed`); no setState post-dispose; no throw en effect; contadores DEV (`window.__celimapMapboxStats`); no-op en prod |
| Favoritos | `resolveFavoritosAuthView`: loading / unauthenticated / session_error / ready; redirect 1× (`redirectedRef`); nunca `return null` negro; load error recuperable |
| Boundaries | `error.tsx` client; `global-error` con html/body; boundary en `<main key={pathname}>`; mapa tiene `MapErrorBoundary`; mensaje DEV visible |
| Reporter | dedupe 5s; rate limit; no reentrada; sanitize email/token/coords; sink pluggable `setClientErrorSink` (Sentry futuro); ref-count listeners Strict Mode |

**Sentry:** no conectado. Interfaz: `setClientErrorSink(report => …)`. Hoy solo `console.error("[CelimapClientError]", JSON)`.

---

## 7. Baseline vs resultado

### TypeScript (`tsc --noEmit`)
| | HEAD | AFTER P1.5 |
|--|------|------------|
| Errores | **6** | **6** |
| Archivos | reviews `connectDB` + place-incomplete `tags` | **iguales** |
| Errores en archivos Lote 1 | 0 | **0** |

→ Lote 1 **no agregó** errores TS.

### Jest
| | HEAD | AFTER |
|--|------|-------|
| Suites fail | **5** (rate-limit, reviews, upload, places, stats) | **5** (mismas) |
| Suites pass | 12 | **17** (+5 Lote 1) |
| Tests fail | 1 (`places` limit 100 vs 500) | **1** (mismo) |
| Tests pass | 51 | **73** |

→ Lote 1 **no agregó** fallas Jest. Suites Lote 1: **22/22 verdes**.

### lint / build
- lint archivos Lote 1: limpio  
- `next build`: PASS

---

## 8. Smoke (sin Playwright)

Herramienta: browser IDE → `www.celimap.com.ar` (**prod desplegada = sin Lote 1**).

| Ruta | Resultado |
|------|-----------|
| `/` | OK, BottomNav visible |
| `/mapa` | OK canvas (viewport depende) |
| `/favoritos` sin sesión | Prod aún pantalla vacía (solo nav) — bug que Lote 1 corrige **local**, no en prod |
| Init Mapbox error fallback | Cubierto por código + tests lifecycle; no forzado en WebView real aquí |
| Contador instancia activa | Unit tests demuestran peakActive≤1 con tracking DEV |

**Requiere dispositivo real / TestFlight post-deploy:** 10 ciclos tabs, `__celimapMapboxStats.active===1`, OAuth, geo, stack del Application error original.

---

## 9. Resultado

### Estado: **APROBADO CON RESERVAS**
Listo para tu review. Bloqueantes abiertos solo de entorno:
- Sin stack del crash original en TestFlight
- Fixes no están en prod hasta deploy (no pedido)
- Suites Jest/tsc preexistentes siguen rotas (no regresiones Lote 1)

### Evidencia 1 instancia Mapbox
Tests `mapbox-lifecycle`: init→destroy→init mantiene `active===1`, `peakActive===1`. En DEV runtime: `window.__celimapMapboxStats`.

### Regresiones
Ninguna nueva en lint/tsc/jest/build atribuible a Lote 1.

### Riesgos restantes
1. Causa Application error sigue **probable**, no confirmada.  
2. `layout.tsx` mezcla Lote 1 (listeners) + WIP P2 (viewportFit, NativeStatusBar). Separar al committear.  
3. `useSyncExternalStore` getServerSnapshot `null` vs client boolean: React 18 OK; verificar no warning hydration en Next.  
4. Contador Mapbox solo DEV — no prueba automática E2E de “una instancia” en browser.  
5. Reporter aún no persiste errores.

### Commits sugeridos (NO ejecutar)
1. `fix(map): prevent double Mapbox mount and harden map lifecycle`  
2. `fix(auth): gate favoritos on session status with recoverable UI`  
3. `feat(errors): add route/global boundaries and safe client error reporter`  
4. `test: cover media-query store, mapbox lifecycle, favoritos auth view`

### No hecho
Merge, deploy, commit, P2 safe-area.
