# Lote 3 — Fase 0 checkpoint

- stash@{0}: KEEP-backup-wip-pre-lote1 **intacto**
- Patch P2.5 tracked: `docs/baselines/lote3/p25-exclusive-tracked.diff`
- Native JSON URL: `https://www.celimap.com.ar` (iOS + Android)
- Release sync default: `https://www.celimap.com.ar` (guards CAPACITOR_*)
- No artefactos Next/Gradle incluidos en diff Lote 3

## Archivos compartidos L1/L2/L3

| Archivo | L1 | L2 | L3 (previsto) |
|---------|----|----|----------------|
| app/layout.tsx | errors | statusbar/debug | sin cambio política |
| LayoutChrome | boundary | safe tokens | sin tocar tokens |
| MapTopBar / MapMobile | lifecycle | safe pos | responsive only |
| BottomNav | — | safe bottom | 320px fit |
| StickyActionBar / lugar | — | clearance | sin re-tocar tokens |
| globals.css | — | safe tokens | overflow helpers only |
| app/page.tsx | — | pt design | hero/search |
| StatsRow | — | — | carrusel |
| capacitor / ios / android | — | P2.5 | **no tocar** |
