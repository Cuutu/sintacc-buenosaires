# Lote 2 — Informe de entrega

**Estado: aprobado con reservas**

Fecha: 2026-08-03

## Fase 0 (previa a implementación)

- Stash `KEEP-backup-wip-pre-lote1` intacto
- Separación en `docs/baselines/lote-separation/`
- `public/sw.js` = artefacto next-pwa → restaurado a HEAD (build lo regenera)

## Política: B — edge-to-edge + CSS

Nativo: `overlaysWebView: true` (config + runtime).
Layout: tokens `--safe-area-*`, `--bottom-nav-*`.
Prohibido: overlay false + mismo inset CSS.

## Diff Lote 2 (tracked)

`docs/baselines/lote-separation/lote2-tracked.diff`

Untracked Lote 2:
- `components/native/NativeStatusBar.tsx`
- `__tests__/layout/safe-area-policy.test.ts`
- `__tests__/components/NativeStatusBar.test.tsx`
- `docs/baselines/lote2-policy.md`

## Compartido con Lote 1

- `app/layout.tsx` — ClientErrorListeners (L1) + viewportFit/NativeStatusBar/appleWebApp (L2)
- `components/layout/LayoutChrome.tsx` — AppErrorBoundary (L1) + tokens safe-area (L2)

## Tests

- safe-area-policy: 9 contratos fuente
- NativeStatusBar: web skip / overlay true / no reconfig / plugin error
- mapbox-lifecycle + media-query: OK (sin reinit por safe areas)

## Verificación CI local

- lint archivos Lote 2 TS/TSX: PASS
- jest Lote 2: PASS
- `next build`: PASS
- `1.1rem`: ausente

## Limitaciones device real

- Insets reales iOS notch / Dynamic Island / Android gesture
- `setOverlaysWebView` vs OEM Android
- Teclado + buscador mapa
- Landscape + tablet
- Flash status bar cold start (config sync vs JS)

## Riesgos

- StickyActionBar ahora encima de BottomNav clearance — verificar ficha lugar
- Android styles aún colorean status/nav splash (puede verse flash pre-JS)
- PWA `black-translucent` cambia status en iOS standalone (intencional con B)
- `cap sync` no corrido (solo config TS)

## Checklist TestFlight / Android

- [ ] Cold start: mapa full-bleed, MapTopBar bajo notch
- [ ] BottomNav iconos sobre home indicator / gesture bar
- [ ] CTA Ver lugares + FAB + leyenda sobre BottomNav
- [ ] Home / Favoritos / Login: sin padding fantasma; contenido scrolleable
- [ ] Ficha lugar: sticky actions usables
- [ ] Landscape mapa
- [ ] Teclado buscador: controles alcanzables
- [ ] Comparar Safari PWA vs binario (sin doble inset)
- [ ] Desktop sin cambio visual
- [ ] Confirmar una sola instancia Mapbox

## Capturas viewport

No tomadas: Lote 2 aún no desplegado; shell apunta a prod remota. Validar en device / preview local.
