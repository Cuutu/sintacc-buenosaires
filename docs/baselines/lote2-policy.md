# Lote 2 — Safe areas & layout móvil

## Fase 0 — Separación

- `stash@{0}: KEEP-backup-wip-pre-lote1` **intacto**
- Patches: `docs/baselines/lote-separation/`
  - `lote1-tracked.diff`
  - `p2-wip-tracked.diff`
  - `layout-shared.diff`
  - `INVENTORY.txt`
- `public/sw.js`: artefacto `next-pwa` / `next build` → **restaurado a HEAD**, fuera de diff lógico
- No reset / checkout destructivo de WIP productivo

### Layout compartido (`app/layout.tsx`)

| Parte | Lote |
|-------|------|
| `ClientErrorListeners` | Lote 1 |
| `viewportFit: "cover"` | Lote 2 |
| `NativeStatusBar` | Lote 2 |
| `appleWebApp.statusBarStyle: black-translucent` | Lote 2 |

---

## 1. Política elegida: **B — edge-to-edge + CSS**

**Justificación (config real):**

- Capacitor **8.4.x**, `@capacitor/status-bar` **^8.0.3**
- iOS 15+, `UIViewControllerBasedStatusBarAppearance=true`
- Android `minSdk 24` / `targetSdk 36`; styles colorean status/nav splash; **sin** `WindowCompat` edge-to-edge forzado en MainActivity
- Mapa + fondos necesitan full-bleed
- WIP previo (`overlay: false` + `env(safe-area)`) = **doble compensación** / comentario invertido

**Regla:** nativo pone WebView bajo barras (`overlaysWebView: true`); **solo CSS** (`--safe-area-*`) mueve chrome interactivo. No `overlay:false` + padding CSS juntos.

| Capa | Compensa |
|------|----------|
| Shell nativo (overlay true) | Nada de layout web; deja insets en `env()` |
| CSS tokens | Status/notch, home indicator, gesture nav |
| BottomNav float | Altura interactiva ≠ clearance de contenido |

---

## 2. iOS vs Android

| | iOS | Android |
|--|-----|---------|
| `setOverlaysWebView(true)` | Contenido bajo status; insets > 0 | Dibuja bajo status; con target 36 insets vía CSS/WebView |
| `setBackgroundColor` | Casi no-op con overlay | Puede teñir barra; no reemplaza CSS |
| `Style.Dark` | Iconos claros | Iconos claros |
| Gesture nav | N/A (home indicator) | `--safe-area-bottom` + float gap |
| MainActivity | — | No inset padding nativo; WebView full |

---

## 3–10. Entregable operativo

Ver informe final en chat + `docs/baselines/lote2-report.md` (si generado post-build).
