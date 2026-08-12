# SEO y visibilidad en buscadores / IA — CeliMap

## Identidad canónica

Definición oficial: `lib/seo/brand.ts`.

`sameAs` Organization: solo `https://www.instagram.com/celimap_/` (confirmado).

## Indexación de ciudades

- Config: `lib/seo/indexing-config.ts`
- Calidad: `lib/seo/city-index-quality.ts` (`evaluateCityPageIndexability`)
- Reglas: `lib/seo/indexing-rules.ts`

Umbral general ciudad: **≥3** lugares.

Excepciones (`CITY_INDEX_EXCEPTIONS`) solo bajan cantidad (mín. **1**). **Nunca** indexan 0 lugares.
Excepción thin (1–2) exige editorial en `ciudades-data` + geo válida.

Excepciones actuales:

| slug | min | tráfico | editorial |
|------|-----|---------|-----------|
| san-miguel-de-tucuman | 1 | reported_by_team (brief; sin GSC en repo) | sí |
| la-plata | 1 | reported_by_team (brief; sin GSC en repo) | sí |
| buenos-aires | 1 | unverified (hub estratégico) | sí |

Yerba Buena ≠ San Miguel de Tucumán.

Diagnóstico read-only: `npx tsx scripts/diagnose-city-seo.ts la-plata san-miguel-de-tucuman yerba-buena`

## API places `limit`

Techo oficial: `PUBLIC_PLACES_MAX_LIMIT` (= 5000) en `lib/validations.ts`.
Motivo: mapa nacional + embeds necesitan hasta ~todos los lugares; no subir sin revisar clientes.
Compartido con `MAP_PLACES_LIMIT` en `/mapa`.

## Mongo durante `next build`

**Esperado.** Rutas ISR/`generateStaticParams` consultan Mongo en build:

- `/sin-gluten/[ciudad]` (+ categoría)
- `/sin-gluten/provincia/*`
- `/categoria/*`
- `/sin-gluten-argentina`
- `/` (stats)
- `/sitemap.xml`
- `/listas/[id]` (metadata)
- fichas/emprendimientos según params

Vercel build necesita `MONGODB_URI` alcanzable. Fallo local `ECONNREFUSED` ≠ bug de SEO.
No se convirtió el sitio a `force-dynamic`.

## Guías draft

Prod: 404 salvo admin. Preview/dev: visibles. Sin sitemap / sin links públicos.

## Analítica

`city_to_place_click` en `PlaceListWithFilters` → `PlaceCard` (props: city_slug, place_id, position, source). Distinto de `place_view`.
