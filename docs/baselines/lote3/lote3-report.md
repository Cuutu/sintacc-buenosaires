# Lote 3 — Informe responsive / overflow

**Estado: aprobado con reservas**

Fecha: 2026-08-03  
No merge · No deploy · No TF/Play · No Sentry · No limpieza android build · P2.5 sigue bloqueante para publicación externa

## Fase 0

- stash KEEP intacto
- P2.5 patch: `p25-exclusive-tracked.diff`
- Native URL prod only
- Diff L3: `lote3-tracked.diff` (sin artefactos Gradle/Next)

## Decisiones visuales

1. **Stats** = carrusel intencional mobile (`82vw`/260px, snap-start, peek, `pr-4` final); md+ grid 3
2. **Search** = stack en &lt;sm; fila ≥sm; targets 48px
3. **Hero** = `1.75rem` → escala sm+
4. **BottomNav** = márgenes left-2, ítems 44px, center más angosto en 320
5. **Map chrome** = min-w-0, chips overflow marcado, FAB right-3
6. **Sin** `overflow-x-hidden` global · **sin** tocar safe-area tokens · **sin** configs nativas

## Comparativos

| Check | Resultado |
|-------|-----------|
| lint L3 files | PASS |
| jest L3 + relacionados | 30 PASS |
| tsc | **6 errores** (mismos preexistentes tests api/place-incomplete) |
| next build | PASS |
| Native URL | prod |

## Overflow legítimo

- `stats-carousel`
- `map-chips`
- `mapbox-canvas` (reservado)

## Evidencia viewport

No capturas device (P2.5 bloqueado). Contratos fuente + build OK.

## Pendiente device

Matriz 320–430 + tablet + teclado + landscape (P2.5).

## Playwright

Propuesta en `audit-findings.md` — **no instalado**.
