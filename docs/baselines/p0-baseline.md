# PRIORIDAD 0 — Baseline (2026-08-02)

## Separación WIP vs Lote 1

### Cambios PREVIO (WIP, no de este lote) — NO tocar en Lote 1 safe-area

| Archivo | Qué | Categoría |
|---------|-----|-----------|
| `app/layout.tsx` | viewportFit cover + AppErrorBoundary + NativeStatusBar | Mixed (boundary=L1, viewport/status=P2) |
| `components/native/NativeStatusBar.tsx` | overlay:false | P2 safe-area — NO Lote 1 |
| `components/layout/LayoutChrome.tsx` | pt safe-area | P2 — NO Lote 1 |
| `components/map-view/MapTopBar.tsx` | top 1.1rem | P2 — NO Lote 1 |
| `app/page.tsx` | pt-8 hero | Visual menor |
| `lib/native-app.ts` | detección Capacitor ampliada | P4 |
| `app/auth/mobile-return/page.tsx` | mensajes handoff | P4 |
| `docs/auditoria-movil-celimap.md` | auditoría | docs |

### WIP útil para Lote 1 (crash)

| Archivo | Qué |
|---------|-----|
| `components/AppErrorBoundary.tsx` | nuevo boundary (refinar) |
| `components/map-view/MapboxMap.tsx` | disposedRef + guards (incompleto: Strict Mode bug) |
| `app/favoritos/page.tsx` | filter placeId null (parcial; session status aún mal) |

### Backup

- Patch: `docs/baselines/wip-pre-lote1.patch`
- Copies: `docs/baselines/*.bak`
- Git stash: `stash@{0}` = `KEEP-backup-wip-pre-lote1`

## Baseline results

| Check | Resultado |
|-------|-----------|
| lint | PASS (warnings preexistentes hooks/img) |
| typecheck `tsc --noEmit` | FAIL tests types preexistentes (`connectDB`, PlaceLike tags) |
| jest | 12 pass / 5 fail suites (Request not defined, places limit) — **preexistente** |
| Playwright | **NO existe** en repo |
| build prod | PASS (antes y después Lote 1) |
| .env.local | **AUSENTE** en workspace |
| Playwright | **NO existe** — smoke manual browser + Jest nuevos |

## Notas

- Fallos tsc/jest parecen preexistentes en HEAD, no introducidos por WIP.
- Sin Playwright: smoke manual + script Node/browser en P1.
