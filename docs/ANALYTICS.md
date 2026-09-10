# Analytics de producto (CeliMap)

## Decisión

No instalamos PostHog.

Motivo:

- El Admin ya existe y tiene que responder preguntas de producto con la estética de CeliMap.
- Ya había Vercel Analytics + sanitize de PII + ciclo de sesión (`first_open` / `app_open` / `session_start`).
- Cuentas nuevas, reseñas y favoritos ya viven en Mongo: esa es la fuente de verdad.
- PostHog agrega cookie de tercero, otro encargado de datos y costo variable. Para Argentina, first-party es más simple.
- Session replay / autocapture mandan de más. No los queremos.

Si más adelante hace falta funnels visuales tipo PostHog, el lugar es un sink opcional en `trackEvent` (mismo patrón que el sink de Sentry, todavía no conectado).

## Qué hay ahora

| Capa | Para qué | Dónde se ve |
|------|----------|-------------|
| Vercel Analytics | Pageviews, web vitals, eventos custom históricos | Dashboard de Vercel |
| First-party `productevents` | Insights de producto + actividad reciente (plataforma/versión) | `/admin/analytics` |
| Mongo operativo | Cuentas, reseñas, favoritos, sugerencias | `/admin/analytics` (mismas tarjetas) |
| `/api/client-errors` | Crashes / errores de UI sanitizados | Logs de Vercel. No Sentry. |

No se duplica Sentry. Los eventos `login_error` / `map_load_error` / `place_load_error` son señales de producto, no un APM.

## Eventos

Se **mantienen** los nombres viejos (`place_view`, no `place_viewed`) para no romper Vercel.

First-party (Mongo), además de Vercel:

- `first_open`, `session_start`
- `place_view`, `place_dwell_qualified`, `place_share`, `directions_clicked`
- `useful_discovery` (métrica Core — ver sección Useful Discovery)
- `favorite_add`, `favorite_remove`, `review_submit`, `place_submitted`
- `map_open`, `map_filter`, `search_performed`, `search_no_results`
- `login_started`, `login_completed`, `login_error`
- `map_load_error`, `place_load_error`
- `city_page_view`, `onboarding_complete`, `list_create`, `list_open`

Solo Vercel (no Mongo, poco valor en Admin):

- `app_open` (ruidoso en mobile)
- `store_banner_*`, `install_prompt_shown`
- clicks SEO `city_to_*` / `guide_to_*`
- `suggest_place_click` (intención; el envío real es `place_submitted`)

### Useful Discovery

**Métrica Core:** mide entrega de valor al usuario en la web.

Se emite `useful_discovery` cuando en la misma sesión el usuario demuestra:

1. **Intent:** `search_performed` | `map_filter` | `list_open` (NO `map_open` solo)
2. **Qualified dwell:** `place_dwell_qualified` para placeId X (≥8s visible)
3. **Core commitment:** `favorite_add` | `place_share` | `directions_clicked` en el mismo placeId X

**Deduplicación:** máximo un `useful_discovery` por (sesión, placeId).

**Props:** `placeId`, `commitmentType`, `intentType`, `dwellMs`, `dwellThresholdMs`, más contexto estándar de lugar (ciudad/provincia/categoría).

**ASSUMPTION:** El umbral de 8s dwell es una hipótesis, no verdad de producto validada.

### Place Dwell Qualified

Se emite `place_dwell_qualified` cuando el usuario acumula ≥8000ms de tiempo *visible* en la misma ficha de lugar (`document.visibilityState === 'visible'`; se pausa cuando tab oculta).

- Se cancela si el usuario navega a otra ficha o página antes del umbral.
- Máximo una emisión por (sesión, placeId).
- **ASSUMPTION:** El umbral de 8s es una hipótesis, no verdad de producto validada.

**Props:** `placeId`, `dwellMs`, `dwellThresholdMs: 8000`, más contexto estándar de lugar (ciudad/provincia/categoría).

### Mapeo Framework de Analytics → Product Events

Los nombres de los eventos en el código del Framework pueden diferir de los nombres almacenados:

- Framework: `share_place` → Product: `place_share`
- Framework: `directions_or_external_nav` → Product: `directions_clicked`

Internamente todos los eventos pasan por `trackEvent(name, props)` que normaliza nombres según el catálogo (`analytics-catalog.ts`).

No trackeamos:

- `page_viewed` en Mongo (Vercel ya cuenta pageviews; duplicar infla costos)
- `signup_started` / `signup_completed` — no hay signup clásico, es OAuth. Alta real = `User.createdAt`. Login = `login_*`

## Privacidad

Se manda:

- `placeId`, ciudad/provincia/categoría de la ficha (datos públicos del mapa)
- query de búsqueda sanitizada (máx. 80, sin emails/tokens)
- plataforma (`web` / `pwa` / `ios_native` / `android_native`)
- `authenticated: true|false` (boolean, sin user id)
- UTM + host de referrer (no la URL completa)
- país/ciudad aproximados **solo server-side** via headers de Vercel (`x-vercel-ip-country`, etc.)

No se manda:

- email, nombre, foto, user id
- tokens, URLs de listas privadas
- GPS / coordenadas del usuario
- texto de reseñas

`distinctId` = id anónimo en `localStorage` (`celimap_aid`). No se vincula a la cuenta.

TTL Mongo: 180 días. Rate limit ingest: 120 eventos / 15 min por IP.

Admin (`/admin`) no genera eventos.

## Actividad reciente (Play Store)

Tabla en `/admin/analytics` → **Actividad**.

Columnas: dispositivo anónimo, última actividad, plataforma (Android / iOS / Web), versión nativa, activo/inactivo (5 min).

**No** muestra nombre, email ni user id. Filtro Android = evidencia de uso de la app para revisión de Play.

Versión sale de Capacitor `App.getInfo()` en nativo. Eventos viejos o web pueden tener versión vacía (`—`).

## Variables de entorno

Ninguna nueva obligatoria.

Opcional, ya existente: `FEATURES` (el flag `analytics` de phase3 **no** gobierna este sistema; el tracking P0 ya estaba siempre on).

Geo IP solo aparece en deploys Vercel. En local las tarjetas de país/ciudad quedan vacías a propósito.

## Links de campaña

Para Adquisición, usá:

```
https://www.celimap.com.ar/?utm_source=instagram&utm_medium=social&utm_campaign=lanzamiento-cordoba
```

Sin UTM, la fuente sale del referrer (`google`, `instagram`, `tiktok`, `facebook`, `direct`, `referral`).

## Índices

```bash
npm run check:release-indexes
npm run ensure:release-indexes -- --apply
```

Colección `productevents`: TTL `ts_ttl` 180d + `name+ts` + `distinctId+ts`.
