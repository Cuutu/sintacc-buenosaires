# Lote 3 — Estabilización E2E

**Estado Lote 3: APROBADO** (web responsive / E2E hermético)

Fecha: 2026-08-03 · No merge · No deploy · No Sentry

Ver cierre final: [`e2e-happy-path-closure-report.md`](./e2e-happy-path-closure-report.md)

---

## 1. Reproducibilidad

| Check | Resultado |
|-------|-----------|
| `@playwright/test` | **exacto `1.62.1`** |
| `npm ci` | EXIT 0 |
| Browsers | Chromium / WebKit en cache fuera del repo |
| Binarios en git | **0** |

## 2. Overflow

### A) Document `scrollWidth`
Sin excepciones. Assert: `scrollWidth <= clientWidth + 1`.

### B) Bounding boxes
Ignora **solo** `data-overflow-allowed` ∈:

1. `stats-carousel`
2. `map-chips`
3. `mapbox-canvas`
4. `featured-carousel`
5. `decoration`

## 3. WebKit “access control checks”

Fingerprint exacto localhost únicamente (ver investigación previa).  
No silencia otros pageerrors.

## 4. Dos niveles

| Nivel | Tag | Estado |
|-------|-----|--------|
| Hermético local | `@hermetic` | **APROBADO** — fixtures `page.route` 200 |
| Staging | `@staging` | Pendiente URL |

Scripts: `test:e2e:hermetic`, `test:e2e:critical`

## 5. Red hermética (post-cierre)

Happy-path: **cero 500 permitidos**. Mocks 200 + abort insights.  
Negativos: solo en `@resilience` (provocados intencionalmente).

## 6. Suite crítica + resiliencia vs `next build` + `next start`

**24/24 PASS** Chromium+WebKit (~34s):

- home fixture stats + overflow
- overflow 320/390/430
- favoritos unauth 200
- mapa 10 ciclos (adapter mock)
- fallback 404
- 5 negativos resiliencia

Mapa lifecycle (mock, no WebGL): `inits=11 destroys=10 active=1 peakActive=1 canvases=1`

## Estado final Lote 3

**APROBADO** — web responsive / E2E hermético

Separado (no bloquea cierre Lote 3 E2E):
1. P2.5 device — **bloqueante publicar**
2. Staging E2E — pendiente
3. Sentry — pendiente pre-TestFlight externo
