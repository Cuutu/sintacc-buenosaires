# Lote 3 — Auditoría responsive / overflow

Severidad: **P0** rompe 320–430 · **P1** degrada UX · **P2** deuda / edge

| # | Archivo | Hallazgo | Sev | Acción Lote 3 |
|---|---------|----------|-----|----------------|
| 1 | `components/home/StatsRow.tsx` | Card `100vw-2rem` + `-mx-4` → 2ª tarjeta cortada / riesgo overflow doc | P0 | Carrusel intencional 82vw/260px, snap-start, pr final, marker |
| 2 | `components/search-bar.tsx` | Fila input+Botón desborda ~320 | P0 | Stack `flex-col` → `sm:flex-row` |
| 3 | `app/page.tsx` hero H1 | `text-4xl` apretado en 320 | P1 | `text-[1.75rem]` → sm+ |
| 4 | `components/nav/BottomNav.tsx` | 5 ítems + center 76px + left-3 apretado en 320 | P1 | left-2, ítems 44/48, center w-14 |
| 5 | `MapTopBar` overlay | paddings laterales + chips | P1 | left-2, min-w-0, chips marker |
| 6 | `MapMobile` CTA | números 3 dígitos | P1 | max-w-full, px menor |
| 7 | `FabButtons` | right-4 en 320 OK pero justo | P2 | right-3 mobile |
| 8 | `PlaceMiniCard` | thumb 100px + texto en angosto | P1 | thumb 80→100 |
| 9 | `app/page.tsx` blobs | absolute -right-32 | P2 | OK: parent `overflow-hidden` (decorativo) |
| 10 | `MapboxMap` popup HTML | `100vw` en width popup | P2 | Legítimo interno canvas/popup; no doc overflow |
| 11 | `MapDesktop` aside `min-w-[440px]` | Solo desktop | — | Sin cambio |
| 12 | Admin tables | min-widths | — | Fuera alcance móvil user |
| 13 | `overflow-x-hidden` global | No encontrado en layout | — | No agregar |
| 14 | Login / favoritos | contenedores max-w OK | P2 | Sin cambio estructural |
| 15 | StickyActionBar | clearance L2 | — | Contrato test; sin re-tocar tokens |

## Overflow legítimo permitido

1. `data-overflow-allowed="stats-carousel"` — carrusel stats  
2. `data-overflow-allowed="map-chips"` — chips MapTopBar  
3. `data-overflow-allowed="mapbox-canvas"` — reservado canvas Mapbox  

## Playwright (no instalado)

Si se aprueba después:

| | |
|--|--|
| Paquete | `@playwright/test` |
| Versión sugerida | `^1.49.0` (o latest stable al instalar) |
| package.json | `devDependency` + scripts `test:e2e`, `test:e2e:mobile` |
| lock | regenera package-lock (~decenas MB browsers) |
| CI | +2–5 min cold; cache browsers |
| Comandos | `npx playwright install --with-deps` · `npx playwright test` |

**No instalado en Lote 3** (sin aprobación).
