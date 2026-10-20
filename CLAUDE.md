# CLAUDE.md — CeliMap

Guía para agentes que trabajan en este repo. Leela entera antes de tocar código.
Producto: **CeliMap** (www.celimap.com.ar), mapa y directorio de lugares sin TACC / con opciones sin gluten en Argentina. El repo se llama `sintacc-bsas` por razones históricas.

> El `README.md` está desactualizado (habla de MVP, fases "scaffolded", sólo Google OAuth). Cuando difieran, manda este archivo y el código.

---

## 1. Lo más importante (leer primero)

1. **Producción es un VPS propio, no Vercel.** Un push a `main` no publica: se publica corriendo `deploy.sh` en el servidor (compila en `/srv/celimap/releases`, cambia `current`, chequea `/api/health` y vuelve atrás solo si falla). Todo cambio pasa antes por **prueba** (`celimap-prueba subir <rama>` → prueba.celimap.com.ar). **Las apps iOS/Android son un WebView que carga `https://www.celimap.com.ar`** (`capacitor.config.ts`): un deploy roto rompe también las apps de las stores al instante, y lo nativo solo se puede probar contra producción.
2. **El build NO valida tipos ni lint** (`next.config.js`: `ignoreBuildErrors` / `ignoreDuringBuilds`), y `deploy.sh` tampoco. GitHub Actions corre aparte. → Antes de commitear corré **siempre** `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` y `npm run perf:bundle` en local. No toques esas flags ni el CI.
3. **No borrar lugares.** Despublicar = `status: "pending"`. Existe `DELETE /api/places/[id]` (hard delete): no lo uses ni lo expongas en UI nueva.
4. **Cambiar `name` o `neighborhood` de un lugar regenera el slug** (`PATCH /api/places/[id]` → `generateUniquePlaceSlug`). El slug viejo queda en `previousSlugs` y `/lugar/<slug-viejo>` redirige 301 al nuevo (`lib/place-route.ts`). Los renombres anteriores a ese cambio (oct. 2026) no tienen historial: esas URLs siguen en 404. Avisar al usuario antes igual (cambian título y URL).
5. **`dedicated_gf` (100% sin TACC) sólo con evidencia clara.** Ante duda o cocina compartida: `gf_options`. Ver §4.
6. **Nada que dependa de la hora actual se renderiza en el servidor** en páginas ISR (fichas `/lugar/*`, landings). Causa errores de hidratación y datos viejos. Ver §6.

---

## 2. Comandos

Entorno de desarrollo del dueño: **Windows / PowerShell**. Node 20 en CI.

| Qué | Comando |
|---|---|
| Dev (genera assets PWA en `predev`) | `npm run dev` |
| Build prod | `npm run build` |
| Typecheck | `npx tsc --noEmit` |
| Lint | `npm run lint` |
| Unit tests (Jest + jsdom) | `npm test` — un archivo: `npx jest __tests__/lib/opening-hours.test.ts` |
| E2E (Playwright, levanta `next start` → requiere build previo) | `npm run test:e2e`, `test:e2e:critical`, `test:e2e:hermetic` |
| Validar env | `npm run check-env` |
| Índices Mongo | `npm run check-indexes`, `npm run ensure:release-indexes` |
| Capacitor | `npm run cap:sync` (iOS por defecto), `npx cap sync android` |
| JS por ruta vs. presupuesto (después de `build`) | `npm run perf:bundle` (`-- --check` falla si alguna ruta se pasa) |
| Tiempos del servidor (HTML y APIs, caché) | `npm run perf:server -- https://prueba.celimap.com.ar` |
| PageSpeed local (Lighthouse mobile, mediana de 3) | `npm run perf:lab -- https://prueba.celimap.com.ar` |
| Prueba de carga (solo contra prueba) | `npm run perf:load -- https://prueba.celimap.com.ar` |

Builds de stores: Codemagic (`codemagic.yaml`: iOS TestFlight, iOS Preview, Android AAB). Ver `docs/store/`.

**Scripts de `scripts/`:** leen `.env.local`, que puede apuntar a la base real. La mayoría son dry-run por defecto y escriben sólo con `--write`. Nunca corras uno con `--write` sin que el usuario lo pida explícitamente.

---

## 3. Stack y arquitectura

- **Next.js 14 App Router** + TypeScript strict, alias `@/*` → raíz.
- **MongoDB Atlas + Mongoose** (`lib/mongodb.ts`). En el VPS corre un solo proceso de Next: el pool sale del env (`MONGODB_MAX_POOL_SIZE="10"`, `MONGODB_MAX_IDLE_MS="300000"` en producción y en prueba; los defaults del código son los de Vercel, 1 y 4 s). No agregues retries/disconnects: generaban picos en Atlas.
- **Auth:** NextAuth v4 con JWT. Google OAuth web + providers Credentials `native-google` / `native-apple` (grants one-time desde las apps). Roles `user | admin`; admin se asigna por `ADMIN_EMAILS`.
- **Mapa:** Mapbox GL (`components/map-view/*`, `MapboxMap.tsx` es el núcleo, con capas WebGL en `map-webgl-layers.ts`).
- **Imágenes:** Cloudinary (`/api/upload`, `lib/cloudinary/*`). Fotos de Google Places opcionales.
- **Email:** Resend (`lib/email-*.ts`).
- **IA:** OpenRouter vía AI SDK. Chat público `/api/chat` (+ `lib/chat/*`), investigación de lugares/sugerencias para admin (`lib/place-research/*`, siempre con aprobación humana), redes sociales admin (`lib/social/*`).
- **PWA:** `next-pwa` con SW en estado *waiting* hasta que el usuario acepta (`components/pwa/PwaRegister.tsx`, que lo registra después del `load`). La precarga está vacía a propósito y hay navigation preload: leé el comentario de `next.config.js` antes de tocar caching.
- **Apps nativas:** Capacitor 8. iOS `com.celimap.app`, Android `com.celimap.mobile`. Lógica nativa en `lib/native-*.ts` y `components/native/*`.
- **Analytics:** eventos first-party en Mongo (`ProductEvent`, `lib/analytics-*.ts`), incluidas las web vitals (`web_vital`, pestaña Velocidad del admin). Sin Vercel Analytics, PostHog ni Sentry a propósito. Ver `docs/ANALYTICS.md` antes de agregar/renombrar eventos.
- **Hosting:** VPS LightNode en Buenos Aires (AlmaLinux 9, 2 vCPU, 3,6 GB). `next start -p 3000` (prueba en el 3001) detrás de Caddy; nunca `-H 127.0.0.1` (rompe el rewrite del middleware y da 500 en las landings). Env de producción en `/srv/celimap/shared/.env.production`: las `NEXT_PUBLIC_*` necesitan rebuild, las de servidor solo `systemctl restart celimap`. Nunca `REGENERAR_ENV=1`. El DNS sigue en Vercel. En route handlers, `request.url` es `https://localhost:3000/...`: los redirects van con `Location` relativa o `lib/base-url`, nunca `new URL(path, request.url)`.
- `src/` = Remotion (videos de marketing), **no** es código de la app. `reels/`, `newbranding/`, `docs/baselines/`, `www/`, `out/` tampoco son app.

### Mapa de carpetas

```
app/                    rutas (páginas públicas, /admin, /api)
  lugar/[id]/           ficha de lugar (ISR 1h, slug o ObjectId → 301 al slug)
  sin-gluten/...        landings SEO ciudad / provincia / categoría
  mapa*/ , mapa-sin-tacc, mapa-celiaco, mapa-para-celiacos   landings de mapa
  emprendimientos/      "Ventures": marcas sin local físico
  api/                  route handlers (públicos, auth, admin, internal)
components/             UI por dominio (lugar/, map-view/, seo/, admin/, ventures/, ui/ = shadcn)
lib/                    lógica de dominio; lib/seo/* = toda la lógica SEO
models/                 schemas Mongoose (Place, Review, Suggestion, Venture, List, User, ...)
scripts/                mantenimiento/backfills (tsx)
__tests__/              Jest (api/, lib/, components/, layout/, native/)
e2e/                    Playwright
docs/                   decisiones (ANALYTICS, SEO-AI-VISIBILITY, INDEXES-CHECKLIST, store/)
```

---

## 4. Datos de lugares (reglas de negocio)

Modelo: `models/Place.ts`. Validación de entrada: `placeSchema` en `lib/validations.ts`.

**Estado TACC — dos señales, y los tags mandan:**
- `safetyLevel`: `dedicated_gf | gf_options | cross_contamination_risk | unknown`.
- `tags`: `100_gf`, `opciones_sin_tacc`, `certificado_sin_tacc`, `cocina_separada`, `sin_info`.
- Lo que se muestra sale de `inferSafetyLevel()` (`components/featured/featured-utils.ts`): **tags primero**, `safetyLevel` sólo si no hay señal en tags. `opciones_sin_tacc` gana sobre `100_gf`.
- **`certificado_sin_tacc` = insumos certificados, NO cocina dedicada.** Nunca implica 100%.
- Si cambiás el estado de un lugar, dejá `safetyLevel` y `tags` coherentes entre sí.
- Nunca subas un lugar de "con opciones" a "100%" de forma automática o inferida.

**Ciclo de vida:**
- `status: "approved" | "pending"`. Público = sólo `approved`. Despublicar = `pending`. No borrar.
- Sugerencias de usuarios → `Suggestion` (pending/approved/rejected) → el admin aprueba y se crea el `Place`.
- `editLog` guarda los últimos 12 cambios del admin.

**Slugs:** `lib/place-slugs.ts` (`name` + `neighborhood`, único con sufijo `-2`, `-3`…; los slugs viejos de otros lugares cuentan como ocupados). Historial en `previousSlugs` (hasta 10, `nextPreviousSlugs`). URL canónica: `getPlacePath()` en `lib/place-url.ts`.

**Horarios (`openingHours`, string libre):**
- Formato canónico: `Lun–Vie 08:00–12:30 y 16:00–20:00; Sáb 08:00–12:00; Dom cerrado`. Sin teléfonos, URLs ni notas.
- Parser/estado abierto: `lib/opening-hours.ts` (zona `America/Argentina/Buenos_Aires`). Tests en `__tests__/lib/opening-hours.test.ts`.

**Fuentes permitidas:** Google Maps/Places, Instagram público, webs oficiales y sugerencias de usuarios. **Prohibido** usar Glunot u otros mapas competidores. Nunca inventes lugares, horarios ni certificaciones.

**Emprendimientos (`Venture`):** catálogo aparte para marcas sin local abierto al público (venta por IG/WA/delivery/ferias). Safety propio: `fully_gf | gf_options | to_confirm` (`lib/venture-constants.ts`). `category` siempre = `categories[0]` (hook `pre("validate")`; con `findByIdAndUpdate` normalizá antes).

**Moderación admin:** reseñas, contactos y otros usan `estado: pendiente | respondido | archivado` (`lib/admin-estado.ts`); los docs sin `estado` cuentan como pendientes.

---

## 5. Copy, marca y UI

- **Claims:** CeliMap no certifica ni garantiza. Prohibido en copy público: "verificado(s)", "certificado" (salvo insumos), "100% seguro", "apto garantizado", "lugares seguros para celíacos", "reseñas reales", etc. `__tests__/lib/seo/public-claim-consistency.test.ts` lo controla; si agregás copy SEO nuevo, sumá el archivo a esa lista.
- La marca visible es **CeliMap** (no "Celimap") en landings y templates SEO. "Celimap" sólo como nombre de app en stores / alternateName.
- Tono: cálido, editorial, comunitario. Nada clínico, corporativo ni "dashboard de IA".
- **Tokens:** `app/globals.css` + `tailwind.config.ts`. Oliva `#2D4A34` (texto/marca), crema `#F7F3EB` (fondo), terracota `#D4633A` (acento), terracota strong `#B84420` (botón primario, por contraste AA). Tipos: Nunito (UI) y Fraunces itálica (taglines). Detalle en `REBRANDING.md`.
- Algunas pantallas (ficha de lugar, admin ops) usan hex directos (`#1F4D35`, `#F8F5EF`, `#E8E1D6`). Respetá lo que ya usa cada área; no mezcles sistemas en un mismo componente.
- Reusá `components/ui/*` (shadcn/Radix), `components/brand/*` y `lucide-react` (ya está optimizado en `optimizePackageImports`). No agregues librerías de UI.

---

## 6. Caché, ISR y rendimiento

- **Fichas `/lugar/[id]`:** `revalidate = 3600`, `generateStaticParams` devuelve `[]` a propósito (on-demand ISR), `dynamicParams = true`. Loader único con `react cache()` en `lib/place-route.ts`. No uses `force-dynamic`. `__tests__/lugar-ssr.test.ts` verifica esta estructura leyendo el source.
- **Hidratación:** un componente `"use client"` igual se renderiza en el servidor. Cualquier cosa basada en `new Date()` / "abierto ahora" / tiempo relativo tiene que calcularse después de montar (`useEffect` + estado) o con `dynamic(..., { ssr: false })`.
- **Caché de API:** `getOrSetApiCache` / `invalidateApiCache` en `lib/api-cache.ts` (tags `public:places`, `admin:places`, `admin:counts`, `seo:province`, …). Toda escritura de lugares debe invalidar `["public:places:", "admin:places:", "admin:counts", "seo:province:"]` y llamar `revalidatePlacePages()` con el doc viejo **y** el nuevo (por el slug).
- **Queries Mongo:** `.lean()` + `.select()` siempre en lecturas públicas. Usá las listas explícitas de `lib/places-public-select.ts` (`PUBLIC_PLACE_LIST_SELECT`, `PUBLIC_PLACE_PAGE_SELECT`, `PUBLIC_PLACE_DETAIL_SELECT`): son inclusión explícita para que campos internos (`aiEnrichment`, `editLog`, `googleSync`, emails) no lleguen al cliente. Índices nuevos → declararlos en el schema y en `docs/INDEXES-CHECKLIST.md` / `scripts/ensure-release-indexes.ts`.
- `/api/places` cachea por bbox redondeado (`expandViewportBbox`) y filtra después; límite máximo `PUBLIC_PLACES_MAX_LIMIT` (100) — no subirlo sin revisar clientes.
- **Middleware:** cada invocación cuesta. Si agregás una rama en `middleware.ts`, agregala al `matcher` (lo controla `__tests__/middleware-matcher.test.ts`).
- **Service Worker:** no agregues runtime caching sobre `/_next/static`, precarga ni cambies `skipWaiting/clientsClaim` sin entender el ciclo del banner de actualización. Con la precarga vacía, `sw.js` es igual entre builds y el aviso solo sale cuando cambia su configuración. `public/sw.js` lo regenera cada build: no lo commitees.

### Presupuesto de JS y carga diferida

- **Presupuesto:** ≤ 200 KB de JS gzip de primera carga por ruta (`/mapa` ≤ 220), en `scripts/perf/budgets.json`. Lo mide `npm run perf:bundle` después del build. Si una ruta se pasa, lo nuevo se carga diferido.
- **Mapbox (~450 KB gzip) nunca en el JS inicial:** en `/mapa` va por `MapboxMapLazy` (`lib/mapbox-preload.ts` lo precarga); en landings, `LandingMapLazy`; en `/sugerir`, `LazyMapPickerModal`. No importes el barrel `@/components/map-view` desde páginas: arrastra `MapboxMap`.
- **zod y `@/lib/validations` no van en componentes** (regla de ESLint): los límites compartidos viven en `lib/places-limits.ts`.
- **Lo que casi nadie abre se baja al usarlo:** chat (`ChatFab` + panel con `next/dynamic`), formularios de reseña y reporte de la ficha, modales de listas. Patrón: `dynamic` o `import()` + precarga en `onPointerEnter`/`onPointerDown`/`onFocus`.
- **Mapa:** los lugares se piden por zona redondeada a una grilla (`snapViewportToGrid`), las zonas completas se recuerdan (`isViewportCovered`) y las páginas van en paralelo; `MapboxMap` no hace `setData` si la firma de los datos no cambió. La URL del mapa cambia con `history.replaceState` (no `router.replace`, que vuelve al servidor).
- **Medir:** web vitals reales en `/admin/analytics` → Velocidad (eventos `web_vital`); en laboratorio, los scripts `perf:*` de la tabla de comandos. Historia y números: `rendimiento/auditoria-rendimiento-2026-10-17.md` en el proyecto de Claude.
- El build consulta Mongo (ISR/sitemap). `ECONNREFUSED` local en build ≠ bug de SEO.

---

## 7. SEO / GEO

Keywords objetivo: "mapa sin TACC", "mapa sin gluten", "lugares sin TACC", "restaurante sin TACC cerca de mí", "restaurantes sin gluten".

- **Origen canónico único:** `https://www.celimap.com.ar` vía `getBaseUrl()` / `absoluteUrl()` (`lib/base-url.ts`). Nunca hardcodees el dominio. Apex → www lo resuelve el middleware.
- **Títulos:** `app/layout.tsx` usa `title.template: "%s | CeliMap"`. Las páginas devuelven el título **sin** la marca.
- **Indexación:** única fuente de verdad en `lib/seo/indexing-rules.ts` + `indexing-config.ts` + `city-index-quality.ts`. Metadata, sitemap y render usan esas funciones; no dupliques umbrales. Ciudades: ≥3 lugares (excepciones documentadas en `docs/SEO-AI-VISIBILITY.md`), nunca indexar 0.
- **Sitemap:** `app/sitemap.ts` + `lib/seo/sitemap-pages.ts` (sólo URLs indexables; slugs ObjectId no entran). `robots.ts` bloquea `/admin`, `/api/`, `/login`, `/perfil`, `/favoritos`, `/listas/privadas`, `/chat-test`.
- **Redirects:** en `next.config.js` (estáticos) y `middleware.ts` (`*-sin-gluten/*`, `top-sin-gluten-*`, apex). Preservá URLs existentes; si una ruta cambia, 301.
- **JSON-LD:** global en `components/seo/JsonLdScript.tsx`; por página en `components/seo/*JsonLd.tsx`. FAQPage sólo donde las FAQ son visibles. Nunca metas strings de usuario en JSON-LD sin pasar por `JSON.stringify` (y escapá `<` si el contenido viene de la DB).
- `app/llms.txt/route.ts` sirve contexto para buscadores de IA.
- Cambios en landings de provincia/ciudad o sitemap → verificar en el sitio después del deploy (curl de la URL, del sitemap y de `<link rel="canonical">`).

---

## 8. Seguridad

- **APIs protegidas:** `requireAuth()` / `requireAdmin()` de `lib/middleware.ts` en cada handler (devuelven `NextResponse` en error: `if (session instanceof NextResponse) return session`). El `middleware.ts` raíz sólo protege las **páginas** `/admin*`, no las APIs. Tests: `__tests__/api/admin-protection.test.ts`.
- **Input:** todo lo que entra se valida con Zod (`lib/validations.ts`). Texto libre de usuarios: `sanitizeHtml()` antes de guardar; en render, nada de `dangerouslySetInnerHTML` con contenido de usuario. Markdown del chat: `react-markdown` + `rehype-sanitize`.
- **Regex con input de usuario:** escapá siempre (patrón `replace(/[.*+?^${}()|[\]\\]/g, "\\$&")`, ya usado en todo el repo).
- **Rate limits:** por usuario (`checkRateLimit`, ej. 3 reseñas/día) y por IP (`checkRateLimitByIp`). La IP sale de `getClientIp`: en el servidor propio, el primer valor de `x-forwarded-for` (lo pone Caddy). Nunca uses `x-vercel-forwarded-for`, `x-real-ip` ni `cf-connecting-ip` fuera de Vercel: el cliente los puede mandar y saltarse los límites. Lecturas públicas: `enforcePublicReadRateLimit` (fail-open a propósito). Chat: límite normal + burst.
- **Secretos:** nunca en `NEXT_PUBLIC_*` (Apple key, Cloudinary secret, OpenRouter, `INTERNAL_JOB_SECRET`). Variables documentadas en `.env.example`. No leas, copies ni commitees `.env.local`, `.env.vercel.*` ni `secrets/`.
- **Listas privadas:** token en URL; `no-store`, `noindex`, `no-referrer` vía middleware, y el logger redacta tokens. No los loguees.
- **Uploads:** MIME allowlist + magic bytes + tamaño máx; carpeta `places` exige admin.
- **CSP** en `next.config.js`: si agregás un dominio externo (script, img, connect), sumalo ahí o se rompe en prod.

---

## 9. Tests

- Jest con `next/jest`, entorno jsdom (usá `@jest-environment node` arriba del archivo para APIs/libs).
- Varios tests son **estructurales**: leen el source y verifican strings (`lugar-ssr`, `public-claim-consistency`, `middleware-matcher`, `layout/*`, `native/*`). Si un refactor los rompe, entendé qué invariante protegen antes de editarlos; no los borres para que pase.
- Al tocar lógica de dominio (`lib/`), agregá o actualizá el test en `__tests__/lib/`.
- E2E: Playwright contra `next start` con `NEXTAUTH_SECRET` de test y fixtures (`e2e/fixtures`). Chromium y WebKit en viewport mobile.

---

## 10. Checklist antes de commitear a `main`

1. `npx tsc --noEmit`
2. `npm run lint`
3. `npm test`
4. `npm run build` y `npm run perf:bundle -- --check`
5. Si tocaste ficha/mapa/landings: probar en `npm run dev` (o `next start`) en mobile y desktop, y revisar consola por errores de hidratación.
6. Si tocaste SEO: verificar canonical, robots y sitemap después del deploy.
7. Commits chicos y descriptivos. No pushear sin que el usuario lo pida.

Si algo falla, reportalo; no lo silencies (nada de `ignoreBuildErrors`, `@ts-ignore` masivos, `eslint-disable` de archivo o `.skip` en tests).

---

## 11. Deuda conocida / cuidado

- `DELETE /api/places/[id]` hace hard delete (contradice la regla de no borrar).
- `PlaceHoursToggle` y `PlaceDesktopAside` calculan "Abierto/Cerrado" con la hora actual durante el render de la ficha ISR (riesgo de hidratación y estado viejo).
- `PlaceEditModal` re-serializa `openingHours` con `parseOpeningHours` → `formatOpeningHours` en cada guardado. Ese formato es un rango por día con `·` y no entiende rangos de días ni doble turno, así que puede pisar horarios en formato canónico.
- `lib/features.ts` (`FEATURES=phase1/2/3`) todavía gatea cosas como `SafetyBadge` y el límite de fotos. Revisá el flag antes de asumir que algo se ve.
- `README.md` desactualizado.
