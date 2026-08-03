# Lote 1 — P0/P1 resultados

## PRIORIDAD 0

### Backup
- Patch: `docs/baselines/wip-pre-lote1.patch`
- Stash: `KEEP-backup-wip-pre-lote1` (`git stash list`)
- Status snapshot: `docs/baselines/wip-pre-lote1-status.txt`

### Separación
| Origen | Archivos |
|--------|----------|
| WIP previo (P2 safe-area, no tocado en lógica) | `NativeStatusBar`, `viewportFit`, `MapTopBar` 1.1rem, padding LayoutChrome (preservado) |
| Lote 1 (esta impl) | ver diff abajo |

### Baseline
| Check | Resultado |
|-------|-----------|
| lint | PASS (warnings preexistentes) |
| tsc | FAIL preexistente en tests |
| jest | 12 pass / 5 fail suites preexistentes |
| Playwright | **no existe** en repo |
| `next build` | PASS (~74s) |
| `.env.local` | ausente |

## PRIORIDAD 1 — Causa raíz

### Evidencia runtime (prod `www.celimap.com.ar`, viewport 390×844)
1. **Flash Desktop→Mobile en `/mapa`**: primer snapshot mostró UI sidebar Desktop (`Tipo de lugar`, sort, `0 lugares en esta zona`) + BottomNav; luego UI MapMobile (FAB, overlay, `Ver N lugares`). Confirma doble init Mapbox.
2. **`/favoritos` sin sesión**: pantalla casi vacía (solo BottomNav) por `!session` → `return null` durante loading/redirect.
3. **"Application error" literal**: no sostenido en DOM tras reload limpio; falso positivo durante transición. Crash más probable = excepción render/WebGL en remount mapa (código).

### Root cause (código + evidencia)
Documentado como **causa probable principal** (no stack trace del Application error original):

1. `useIsMobile` default `false` → monta `MapDesktop` en phone → remount `MapMobile` → WebGL doble / destroy race.
2. `MapboxMap` **throw en `useEffect`** → Error Boundary **no atrapa** → riesgo unhandled / pantalla Next.
3. `disposedRef` WIP sin reset al remount → Strict Mode / remount deja mapa muerto.
4. Favoritos: redirect con `session` null en loading.
5. Sin `error.tsx` / `global-error.tsx` / reporter.

### Correcciones Lote 1
- `useSyncExternalStore` + `null` hasta medir; MapScreen skeleton; LayoutChrome sin flash Navbar.
- Mapbox: no throw; `setInitError`; reset `disposedRef`; guards `_id`/coords.
- Favoritos: `status` gating + skeleton.
- `app/error.tsx`, `app/global-error.tsx`, `AppErrorBoundary` por sección (main), `ClientErrorListeners`, `reportClientError` (sin PII).
- Tests: `client-error-reporter`, contrato matchMedia.

### NO hecho (bloqueado a P2+)
- Política safe-area / StatusBar / MapTopBar offset
- Overflow home cards
- Playwright suite (no hay deps)
- Merge / deploy
