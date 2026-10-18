# Rendimiento de CeliMap

Cómo medimos la velocidad y cuáles son las metas. Plan completo y auditoría (oct. 2026): ver los docs
"Plan de rendimiento para el lanzamiento" y "Auditoría de rendimiento de CeliMap" en el proyecto.

## Metas

| Qué | Meta |
|---|---|
| LCP de usuarios reales (p75, celular) | ≤ 2,5 s |
| INP de usuarios reales (p75) | ≤ 200 ms |
| CLS de usuarios reales (p75) | ≤ 0,1 |
| PageSpeed mobile de home, ficha y landings | ≥ 90 |
| PageSpeed mobile de /mapa | ≥ 75 |
| JS de primera carga por ruta (gzip) | ≤ 200 KB; /mapa ≤ 220 KB antes de cargar el mapa |
| HTML de ficha y landings en el servidor | ≤ 100 ms |

## Usuarios reales

`/admin/analytics` → **Velocidad**. Sale de los eventos `web_vital` (ver `docs/ANALYTICS.md`): p75 por tipo de
página y por público (web en celular, app, web en compu). Es la medición que manda.

## Laboratorio y servidor

Los tres comandos guardan sus resultados en `perf-results/` (ignorado por git) para comparar antes y después.

| Comando | Qué mide |
|---|---|
| `npm run perf:lab [url-base]` | Lighthouse mobile (lo mismo que PageSpeed), 3 corridas por página y la mediana. Necesita Chrome instalado. |
| `npm run perf:bundle` | JS gzip de primera carga por ruta, del último `npm run build`, contra el presupuesto de `scripts/perf/budgets.json`. `--check` sale con error si alguna ruta se pasa; `--baseline <json>` muestra la diferencia con una corrida anterior. |
| `npm run perf:server [url-base]` | Tiempo de respuesta del HTML y de la API (uno solo y ráfagas de 6 en paralelo). |
| `npm run perf:load <url-de-prueba>` | Carga: 20 conexiones a la vez durante 20 s sobre home, ciudad y ficha (`--connections`, `--seconds`). Solo contra prueba. |

Sin URL, `perf:lab` y `perf:server` miden producción. Para prueba: `npm run perf:lab -- https://prueba.celimap.com.ar`
(solo desde una IP habilitada). Compará siempre desde la misma compu y la misma red.

## Antes de cada cambio que toque rendimiento

1. Correr los tres comandos contra prueba con la versión actual (el "antes").
2. Aplicar el cambio en prueba y repetir.
3. Anotar los dos resultados en el plan.
