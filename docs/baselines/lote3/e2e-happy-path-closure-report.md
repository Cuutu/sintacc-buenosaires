# Lote 3 — Cierre E2E happy-path (cero 500)

**Estado Lote 3 (web responsive / E2E hermético): APROBADO**

Fecha: 2026-08-03 · No merge · No deploy

Pendiente **fuera** de Lote 3:
- **P2.5 device** — bloqueante publicar
- **Staging real** — pendiente URL
- **Sentry** — pendiente antes TestFlight externo

---

## 1. Endpoints mockeados y contratos

| Endpoint | Status | Fixture / contrato |
|----------|--------|--------------------|
| `GET /api/stats` | 200 | `{ placesCount, reviewsCount, usersCount }` — assert numérico |
| `GET /api/places` | 200 | `{ places[], pagination{page,limit,total,pages} }` + place mínimo |
| `GET /api/places/*` | 200 | place fixture |
| `GET /api/lists*` | 200 | `{ lists: [] }` |
| `GET /api/favorites*` | 200 | `{ favorites: [] }` |
| `GET /api/auth/session` | 200 | `null` (unauth válido) |
| `GET /api/auth/csrf` | 200 | `{ csrfToken }` |
| `GET /api/auth/providers` | 200 | google stub |
| `GET /api/auth/_log` | 200 | `{}` |
| `/_vercel/insights/**` | **abort** | no 500 allowlist |

Fixtures: `e2e/fixtures/payloads.ts` — mínimos, sin PII, sin Mongo, sin prod.  
`assert*Contract()` falla si shape cambia.

---

## 2. Cero 500 en happy-path

`assertHappyPathNetwork`: **cualquier HTTP ≥500 → fail**.  
Sin allowlist global de 500.  
Abort insights + cancel RSC/prefetch no cuentan como fallo.

Suite crítica + smoke/home/overflow/favoritos unauth: mocks 200.

---

## 3. Tests negativos (`@resilience`) — PASS Chromium+WebKit

| Test | Provoca | Verifica |
|------|---------|----------|
| stats 500 | `/api/stats` 500 | home estructura + fallback `—` |
| places 500 | `/api/places` 500 | `[data-places-error]` + Reintentar |
| auth session 500 | session 500 | `[data-auth-state=session_error]` |
| Mapbox fail | `__CELIMAP_E2E_FORCE_MAP_INIT_ERROR__` | "No pudimos cargar el mapa" |
| retry places | 500 → flag → 200 | lista muestra `Local E2E Fixture` |

---

## 4. Mapa 10 ciclos — evidencia

**Modo: `e2e-mock-adapter` — NO WebGL real.**  
Flags: `__CELIMAP_E2E_MOCK_MAPBOX__` + `__CELIMAP_E2E_MAPBOX_STATS__`.  
Canvas: `data-e2e-mapbox-adapter="mock"`.  
Nav: soft SPA (`softLeaveMapa` / `softEnterMapa`) — full `goto` resetea módulo.

Contadores (Chromium, annotation `mapbox-lifecycle`):

```json
{
  "mode": "e2e-mock-adapter",
  "webglReal": false,
  "inits": 11,
  "destroys": 10,
  "active": 1,
  "peakActive": 1,
  "canvases": 1
}
```

Checks por ciclo: active 0 al salir, active 1 al volver, peakActive=1, 1 canvas, sin fallback init.

---

## 5. Favoritos — 3 tests distintos

1. Sesión válida no autenticada (`null` 200) → login / `unauthenticated`
2. Sesión cargando (`delaySessionMs`) → `data-auth-state=loading`
3. API auth 500 → `session_error` + Reintentar (probe HTTP en página)

---

## 6. Home

Mock `/api/stats` 200 → números fixture `42/17/9` en carrusel (3 articles).  
No skeleton-only. Sin overflow document.

---

## 7. Resultado final Chromium / WebKit

Contra `next build` + `next start`:

```
npx playwright test --grep "@critical|@resilience"
→ 24 passed (Chromium + WebKit)
```

- Crítica `@critical`: 14 tests (7×2 browsers) PASS  
- Resiliencia `@resilience`: 10 tests (5×2) PASS  

---

## 8. Diff exclusivo este ajuste (archivos clave)

App / lib:
- `lib/e2e-mapbox-adapter.ts` (nuevo)
- `lib/mapbox-lifecycle.ts` — stats con flag E2E
- `components/map-view/MapboxMap.tsx` — mock / force error
- `components/map-view/PlacesList.tsx` + MapScreen/Mobile/Desktop — `loadError` + retry
- `app/mapa/page.tsx` — `placesError`
- `app/favoritos/page.tsx` — probe session HTTP
- `components/map-view/MapLegend.tsx` / MapMobile — overflow markers

E2E:
- `e2e/fixtures/payloads.ts`
- `e2e/helpers.ts` — mocks 200, `assertHappyPathNetwork`, soft nav mapa
- `e2e/critical.spec.ts`, `home`, `favoritos`, `mapa`, `smoke`, `overflow`
- `e2e/resilience.spec.ts` (nuevo)
- `playwright.config.ts` — comentario hermético

---

## Estado final Lote 3

**APROBADO** — web responsive / E2E hermético (Chromium + WebKit).

No cierra:
1. P2.5 device (bloqueante publicar)
2. Staging E2E real
3. Sentry pre-TestFlight externo
