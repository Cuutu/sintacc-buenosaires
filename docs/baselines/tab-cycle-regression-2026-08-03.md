# Regresión BottomNav → global-error — cierre técnico

**Estado propuesto:** aprobado con reservas (sin stack prod).  
**No deploy / no Codemagic / no merge** hasta aprobación.

## Hipótesis actualizada

Mezcla de chunks/Service Worker durante navegación, amplificada por redirects y remounts del chrome. **No causa confirmada** sin stack productivo.

## Diff (exclusivo esta corrección)

- `AppErrorBoundary`: `resetKey` + `variant="chrome"` fallback chico BottomNav
- `LayoutChrome`: page `resetKey={pathname}` sin `key`; BottomNav boundary estable
- `BottomNav` / `lib/bottom-nav-perfil.ts`: href Perfil por status; slots estables
- `perfil`: redirect dedupe + `isAllowedAvatarUrl`
- `lib/chunk-reload.ts`: clave **global** `celimap_chunk_reload_v1:{build}`
- `lib/native-sw-cleanup.ts`: ciclo `reloading`→`done`; máx. 1 reload/versión
- `PwaRegister`: register manual web; update banner + SKIP_WAITING; native cleanup+reload
- `ClientErrorListeners` + `lib/celimap-diag.ts`: mounts diagnósticos
- E2E: tab-cycle, stress, chunk, native-sw
- Jest: boundary runtime, avatar, chunk, nav/sw contratos

## Estrategia nativo vs PWA

| | Nativo | Web/PWA |
|--|--|--|
| Register | no | `/sw.js` manual (`register:false`) |
| Cleanup | unregister Celimap + caches prefijo; 1 reload/versión | — |
| Update | — | banner si `waiting`; aceptar → SKIP_WAITING → controllerchange → 1 reload |
| Chunks | sin SW | precache + cleanupOutdatedCaches; sin NetworkOnly contradictorio |

**Ciclo SW web real:** install → waiting (skipWaiting:false) → usuario acepta → SKIP_WAITING → controllerchange → reload. Postergar = build actual. No afirmar cold-start automático.

## Riesgos restantes

- Sin stack prod: hipótesis no verificada en WebView real.
- Stress 88 clicks: telemetría; hang histórico puede ser presión RSC del test.
- Avatar: solo hosts allowlist; otros proveedores Google → fallback UI.
