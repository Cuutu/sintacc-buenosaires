# Implementation Plan

## [Overview]

Implementar una arquitectura SEO programática por provincia en CeliMap con URLs `/sin-gluten/provincia/[provinceSlug]` y `/sin-gluten/provincia/[provinceSlug]/[categorySlug]`, corrigiendo el modelo geográfico (país/provincia/ciudad/barrio) y los bugs de asignación que hoy cruzan lugares entre ciudades y provincias.

La arquitectura actual filtra lugares exclusivamente por el campo de texto libre `neighborhood` contra listas de barrios por ciudad (`data/cities.seed.json`). Esto produce el bug confirmado: un establecimiento de Mar del Plata con `neighborhood: "Centro"` aparece en `/sin-gluten/cordoba` porque ambas ciudades tienen `"Centro"` en sus listas. El modelo `Place` no tiene campo de provincia ni de localidad normalizado, por lo que no existe una fuente confiable de jurisdicción. Además, `buenos-aires` mezcla CABA con partidos de la Provincia de Buenos Aires (San Isidro, Vicente López, Tigre, Avellaneda, etc.), y el sitemap duplica `/sin-gluten/cordoba` (una vez desde `PROVINCES` y otra desde `CITIES`).

La solución introduce: (1) una configuración canónica de las 24 jurisdicciones argentinas con aliases y normalización; (2) campos normalizados `province` y `locality` en `Place` con backfill idempotente y dry-run; (3) páginas provinciales SSR con metadata, JSON-LD, sitemap y reglas de indexación centralizadas y testeables; (4) desambiguación por contexto de ruta: `/sin-gluten/cordoba` se resuelve exclusivamente contra `CITIES` (página de la ciudad de Córdoba, conservando su canonical, metadata e intención actuales) y `/sin-gluten/provincia/cordoba` se resuelve exclusivamente contra `PROVINCES` (página provincial con canonical propio); (5) filtrado de páginas de ciudad por `province` + `locality` (no por `neighborhood`, porque barrios como "Centro" existen en múltiples ciudades); (6) corrección del sitemap (sin duplicados, `lastmod` por URL, exclusión de páginas `noindex`/vacías). No se redirecciona ni canonicaliza una URL hacia la otra porque responden a intenciones geográficas distintas. No se rompen las URLs de ciudades, fichas, mapa, PWA, login, favoritos ni service worker.

## [Types]

Definir los tipos geográficos canónicos, los campos nuevos del modelo y las reglas de indexación centralizadas.

```ts
// lib/seo/provinces.ts — configuración canónica de las 24 jurisdicciones
export type ProvinceConfig = {
  name: string
  slug: string
  aliases: string[]
  countryCode: "AR"
  /** Centro [lng, lat] y zoom para el mapa provincial (opcional) */
  center?: [number, number]
  zoom?: number
}

export const PROVINCES: ProvinceConfig[] = [
  { name: "Buenos Aires", slug: "buenos-aires", aliases: ["Provincia de Buenos Aires", "PBA", "Buenos Aires Province"], countryCode: "AR" },
  { name: "Ciudad Autónoma de Buenos Aires", slug: "caba", aliases: ["CABA", "Capital Federal", "Buenos Aires Ciudad", "Ciudad de Buenos Aires"], countryCode: "AR" },
  { name: "Catamarca", slug: "catamarca", aliases: ["Provincia de Catamarca"], countryCode: "AR" },
  { name: "Chaco", slug: "chaco", aliases: ["Provincia del Chaco"], countryCode: "AR" },
  { name: "Chubut", slug: "chubut", aliases: ["Provincia del Chubut"], countryCode: "AR" },
  { name: "Córdoba", slug: "cordoba", aliases: ["Provincia de Córdoba"], countryCode: "AR" },
  { name: "Corrientes", slug: "corrientes", aliases: ["Provincia de Corrientes"], countryCode: "AR" },
  { name: "Entre Ríos", slug: "entre-rios", aliases: ["Provincia de Entre Ríos"], countryCode: "AR" },
  { name: "Formosa", slug: "formosa", aliases: ["Provincia de Formosa"], countryCode: "AR" },
  { name: "Jujuy", slug: "jujuy", aliases: ["Provincia de Jujuy"], countryCode: "AR" },
  { name: "La Pampa", slug: "la-pampa", aliases: ["Provincia de La Pampa"], countryCode: "AR" },
  { name: "La Rioja", slug: "la-rioja", aliases: ["Provincia de La Rioja"], countryCode: "AR" },
  { name: "Mendoza", slug: "mendoza", aliases: ["Provincia de Mendoza"], countryCode: "AR" },
  { name: "Misiones", slug: "misiones", aliases: ["Provincia de Misiones"], countryCode: "AR" },
  { name: "Neuquén", slug: "neuquen", aliases: ["Provincia del Neuquén"], countryCode: "AR" },
  { name: "Río Negro", slug: "rio-negro", aliases: ["Provincia de Río Negro"], countryCode: "AR" },
  { name: "Salta", slug: "salta", aliases: ["Provincia de Salta"], countryCode: "AR" },
  { name: "San Juan", slug: "san-juan", aliases: ["Provincia de San Juan"], countryCode: "AR" },
  { name: "San Luis", slug: "san-luis", aliases: ["Provincia de San Luis"], countryCode: "AR" },
  { name: "Santa Cruz", slug: "santa-cruz", aliases: ["Provincia de Santa Cruz"], countryCode: "AR" },
  { name: "Santa Fe", slug: "santa-fe", aliases: ["Provincia de Santa Fe"], countryCode: "AR" },
  { name: "Santiago del Estero", slug: "santiago-del-estero", aliases: ["Provincia de Santiago del Estero"], countryCode: "AR" },
  { name: "Tierra del Fuego", slug: "tierra-del-fuego", aliases: ["Provincia de Tierra del Fuego", "Tierra del Fuego, Antártida e Islas del Atlántico Sur"], countryCode: "AR" },
  { name: "Tucumán", slug: "tucuman", aliases: ["Provincia de Tucumán", "Tucumán"], countryCode: "AR" },
]
```

```ts
// lib/seo/cities.ts — City con provincia normalizada
// Jerarquía: province = provincia, locality = ciudad/localidad, neighborhood = barrio
export interface City {
  slug: string
  name: string
  province: string        // nombre legible (se mantiene)
  provinceSlug: string    // NUEVO: slug normalizado de la jurisdicción
  neighborhoods: string[]
}
```

```ts
// models/Place.ts — campos geográficos normalizados
province?: string   // slug normalizado de la jurisdicción (ej: "tucuman", "buenos-aires", "caba")
locality?: string   // slug normalizado de la localidad/ciudad (ej: "san-miguel-de-tucuman", "la-plata")
```

```ts
// lib/seo/indexing-rules.ts — reglas centralizadas (única fuente de verdad)
export type IndexingDecision = "index" | "noindex" | "not_found"

export function decideProvincePageIndexing(totalPlaces: number, distinctLocalities: number): IndexingDecision
// 0 lugares → "not_found"; 1-4 lugares o <2 localidades → "noindex"; ≥5 lugares y ≥2 localidades → "index"

export function decideProvinceCategoryIndexing(totalPlaces: number): IndexingDecision
// 0 resultados → "not_found"; 1-2 → "noindex"; ≥3 → "index"

export function isProvincePageIndexable(totalPlaces: number, distinctLocalities: number): boolean
export function isProvinceCategoryIndexable(totalPlaces: number): boolean
```

```ts
// lib/validations.ts — filtros geográficos normalizados
provinceSlugs: z.array(z.string().min(1)).optional()
localitySlugs: z.array(z.string().min(1)).optional()
```

```ts
// lib/seo/province-pages.ts — datos para las páginas provinciales
export type ProvinceLocalities = {
  name: string
  slug: string
  count: number
  citySlug?: string   // enlace a la página de ciudad existente cuando corresponda
}

export type ProvinceCategorySummary = {
  slug: string
  name: string
  emoji: string
  count: number
  indexable: boolean
}

export type ProvincePageData = {
  province: ProvinceConfig
  places: PlaceSEO[]
  total: number
  dedicatedGfCount: number
  gfOptionsCount: number
  localities: ProvinceLocalities[]
  categories: ProvinceCategorySummary[]
  lastUpdated: Date | null
}

export type ProvinceCategoryPageData = {
  province: ProvinceConfig
  categorySlug: string
  places: PlaceSEO[]
  total: number
  localities: ProvinceLocalities[]
  lastUpdated: Date | null
}
```

## [Files]

Crear los archivos de reglas de indexación, acceso a datos provinciales, rutas nuevas, componentes JSON-LD/contenido, backfill y tests; modificar la configuración de provincias/ciudades, el modelo, las consultas, el sitemap, la metadata y el enlazado interno.

### Archivos nuevos

| Ruta | Propósito |
|---|---|
| `lib/seo/indexing-rules.ts` | Reglas `index`/`noindex`/`not_found` centralizadas y puras (testeables sin DB). |
| `lib/seo/province-pages.ts` | Acceso a datos SSR de páginas provinciales: lugares, localidades, categorías, conteos, `lastUpdated`. |
| `app/sin-gluten/provincia/[provinceSlug]/page.tsx` | Página provincial SSR con `generateMetadata`, `generateStaticParams`, `revalidate = 3600`, `dynamicParams = true`. |
| `app/sin-gluten/provincia/[provinceSlug]/[categorySlug]/page.tsx` | Página provincia + categoría SSR. |
| `components/seo/ProvincePageJsonLd.tsx` | JSON-LD: `BreadcrumbList` + `CollectionPage` + `ItemList` (enlaces a fichas visibles). |
| `components/seo/ProvinceCategoryPageJsonLd.tsx` | JSON-LD: `BreadcrumbList` + `CollectionPage` + `ItemList`. |
| `components/seo/ProvincePageContent.tsx` | Server component con el contenido completo de la página provincial (breadcrumb, H1, resumen, categorías, localidades, listado, mapa, FAQ, CTA). |
| `components/seo/ProvinceCategoryPageContent.tsx` | Server component de provincia + categoría. |
| `scripts/backfill-place-provinces.ts` | Backfill idempotente de `province`/`locality` con `--dry-run` y reporte de casos ambiguos. |
| `__tests__/lib/seo/provinces.test.ts` | Normalización de provincias, aliases, separación CABA/PBA. |
| `__tests__/lib/seo/indexing-rules.test.ts` | Reglas de indexación. |
| `__tests__/lib/seo/province-pages.test.ts` | Filtrado provincia + categoría, sin duplicados, conteos SSR. |
| `__tests__/lib/seo/sitemap.test.ts` | Sitemap sin duplicados, sin páginas vacías/noindex, `lastmod` por URL. |

### Archivos modificados

| Ruta | Cambio |
|---|---|
| `lib/seo/provinces.ts` | Reemplazar `ProvinceConfig` actual (solo Córdoba, con `citySlugs`) por las 24 jurisdicciones con `aliases`. Agregar `normalizeProvinceSlug`, `getProvinceBySlug`, `getProvinceByName`, `getProvinceByAlias`, `resolveProvinceFromAddress` (fallback controlado). `isProvincialSlug("cordoba")` debe devolver `true` (Córdoba es slug provincial válido); la desambiguación ciudad/provincia se hace por contexto de ruta, no por esta función. NO incluir "Buenos Aires" como alias resoluble de PBA (ambiguo con CABA). |
| `lib/seo/cities.ts` | Agregar `provinceSlug` a `City`. Corregir `buenos-aires` para que sea CABA (ver `data/cities.seed.json`). |
| `data/cities.seed.json` | Agregar `provinceSlug` a cada ciudad. En `buenos-aires` eliminar los partidos de PBA (San Isidro, Vicente López, Tigre, Avellaneda, Lanús, Lomas de Zamora, Quilmes, Berazategui, Florencio Varela, San Martín, Tres de Febrero, Morón, Merlo, Moreno) y dejar solo barrios de CABA; `provinceSlug: "caba"`. `la-plata`, `mar-del-plata`, `bahia-blanca`, `tandil` → `provinceSlug: "buenos-aires"`. `cordoba` → `provinceSlug: "cordoba"`. `san-miguel-de-tucuman` → `provinceSlug: "tucuman"`. |
| `models/Place.ts` | Agregar campos opcionales `province` y `locality` (String, indexados). Índices: `{ status: 1, province: 1 }`, `{ status: 1, province: 1, type: 1 }`, `{ status: 1, province: 1, locality: 1 }`. |
| `lib/seo/places.ts` | Agregar `getPlacesByProvinceSlug(provinceSlug, { categorySlug?, limit? })` que filtra por `province` normalizado (no por neighborhoods). Corregir `getPlacesByProvince` (o reemplazarla) para usar `province` y devolver `total` real (no `enriched.length`). Agregar `getProvinceLocalities`, `getProvinceLastUpdated`. `getPlacesByCity` y `getPlacesByCityAndCategory` deben filtrar por `province: city.provinceSlug` Y `locality: city.slug` (no por `neighborhood`); el filtro `?barrio=` se mantiene como refinamiento adicional sobre `neighborhood` dentro de la localidad. |
| `lib/seo/templates.ts` | Agregar `getProvinceTitle`, `getProvinceDescription`, `getProvinceCategoryTitle`, `getProvinceCategoryDescription`, `getProvinceSEOTextBlock` con textos basados en datos reales (sin keyword stuffing, sin "los mejores"). |
| `lib/validations.ts` | Agregar `provinceSlugs` y `localitySlugs: z.array(z.string().min(1)).optional()` a `publicPlacesQuerySchema` y su parseo. |
| `lib/places-public-query.ts` | Agregar filtro `provinceSlugs` → `query.province = { $in: params.provinceSlugs }` y `localitySlugs` → `query.locality = { $in: params.localitySlugs }`. |
| `app/api/places/route.ts` | Sin cambios de lógica (usa `buildPublicPlacesMongoQuery`); verificar que `provinceSlugs` y `localitySlugs` se propaguen. |
| `app/sin-gluten/[ciudadSlug]/page.tsx` | Eliminar el branch `isProvincialSlug` (la ruta se resuelve exclusivamente contra `CITIES`). `/sin-gluten/cordoba` renderiza la ciudad de Córdoba con su metadata/canonical actuales. |
| `app/sin-gluten/[ciudadSlug]/[categoriaSlug]/page.tsx` | Verificar que no tenga lógica provincial (hoy no la tiene); mantener. |
| `app/sitemap.ts` | Corregir duplicado de `/sin-gluten/cordoba` (dedupe por URL). Agregar páginas provinciales y provincia+categoría solo si son indexables. Excluir páginas `noindex`/vacías. `lastmod` por URL: usar el `updatedAt` máximo de los lugares de ese scope (no global). Mantener URLs de ciudades y fichas. |
| `app/sin-gluten-argentina/page.tsx` | Agregar sección "Lugares sin TACC por provincia" con enlaces HTML a las provincias indexables. |
| `app/page.tsx` | Agregar sección compacta de provincias indexables + enlace "Ver todas las provincias" (sin llenar el footer). |
| `app/lugar/[id]/layout.tsx` | Breadcrumb `Argentina → Provincia → Ciudad → Lugar` usando `province`/`locality` del lugar (fallback al estado actual). |
| `components/seo/PlaceListWithFilters.tsx` | Agregar enlace "Ver todos los lugares sin TACC en la provincia de X" en páginas de ciudad. |
| `components/seo/ProvincialMapEmbed.tsx` | Cambiar `citySlugs=provinceSlug` por `provinceSlugs=provinceSlug` (usa el filtro normalizado). |
| `components/seo/CityMapEmbed.tsx` | Cambiar `citySlugs=citySlug` por `provinceSlugs=<provinceSlug de la ciudad>` + `localitySlugs=<citySlug>` (filtro normalizado, no `neighborhood`). |
| `components/seo/ProvincialPageJsonLd.tsx` | Reemplazar por `ProvincePageJsonLd` (nuevo) o actualizar para `CollectionPage` + `ItemList` sin `LocalBusiness` para CeliMap. |
| `components/seo/ProvincialPlaceCard.tsx` | Mantener; verificar enlace a ficha. |
| `lib/geocode.ts` | Extraer provincia de la respuesta de geocoding (Mapbox context `region` / Google `administrative_area_level_1`) y devolverla en `GeocodeResult`. |
| `lib/constants.ts` | Agregar provincias a `LOCALITIES` si hace falta para autocompletado (opcional). |
| `lib/map-search.ts` | Agregar provincias a `KNOWN_NEIGHBORHOODS` solo si se desea búsqueda por provincia en el mapa (opcional, fase 2). |

### Archivos eliminados (al final, después de tests)

| Ruta | Razón |
|---|---|
| `app/sin-gluten/[ciudadSlug]/ProvincialPage.tsx` | La lógica provincial se traslada a la ruta nueva `/sin-gluten/provincia/[provinceSlug]`. NO eliminar hasta comprobar que ningún import o ruta activa lo utiliza; hacer la eliminación al final, después de los tests. |

## [Functions]

Agregar funciones de normalización geográfica, reglas de indexación, acceso a datos provinciales y metadata; modificar las consultas existentes para usar los campos `province` y `locality` normalizados.

### Funciones nuevas

| Función | Firma | Archivo | Propósito |
|---|---|---|---|
| `normalizeProvinceSlug` | `(value: string) => string \| null` | `lib/seo/provinces.ts` | Normaliza texto a slug de provincia (sin tildes, lowercase, guiones) y valida contra las 24 jurisdicciones. |
| `getProvinceBySlug` | `(slug: string) => ProvinceConfig \| undefined` | `lib/seo/provinces.ts` | Busca por slug canónico. |
| `getProvinceByName` | `(name: string) => ProvinceConfig \| undefined` | `lib/seo/provinces.ts` | Busca por nombre exacto (normalizado). |
| `getProvinceByAlias` | `(alias: string) => ProvinceConfig \| undefined` | `lib/seo/provinces.ts` | Busca por alias. "Buenos Aires" a secas NO resuelve PBA (ambiguo con CABA); solo resuelven señales inequívocas: "Provincia de Buenos Aires", "PBA", "Buenos Aires Province", `administrative_area_level_1`, región de Mapbox/Google, o coordenadas dentro de un polígono confiable. |
| `resolveProvinceFromAddress` | `(address: string) => ProvinceConfig \| undefined` | `lib/seo/provinces.ts` | Fallback controlado de parsing de dirección. Nunca resuelve "Buenos Aires" ambiguo sin contexto adicional. |
| `isProvincialSlug` | `(slug: string) => boolean` | `lib/seo/provinces.ts` | `isProvincialSlug("cordoba")` devuelve `true` (Córdoba es slug provincial válido). La desambiguación ciudad/provincia se hace por contexto de ruta, no por esta función. |
| `decideProvincePageIndexing` | `(totalPlaces: number, distinctLocalities: number) => IndexingDecision` | `lib/seo/indexing-rules.ts` | Regla de indexación de página provincial. |
| `decideProvinceCategoryIndexing` | `(totalPlaces: number) => IndexingDecision` | `lib/seo/indexing-rules.ts` | Regla de indexación de provincia + categoría. |
| `isProvincePageIndexable` | `(totalPlaces: number, distinctLocalities: number) => boolean` | `lib/seo/indexing-rules.ts` | Helper booleano. |
| `isProvinceCategoryIndexable` | `(totalPlaces: number) => boolean` | `lib/seo/indexing-rules.ts` | Helper booleano. |
| `getPlacesByProvinceSlug` | `(provinceSlug: string, options?: { categorySlug?: string; limit?: number }) => Promise<{ places: PlaceSEO[]; total: number }>` | `lib/seo/places.ts` | Query por `province` normalizado + `status: "approved"` + categoría opcional. Sin duplicados (dedupe por `_id`). `total` = `countDocuments` (todos los resultados); `places.length` = solo los renderizados cuando hay `limit`. |
| `getProvinceLocalities` | `(provinceSlug: string) => Promise<ProvinceLocalities[]>` | `lib/seo/places.ts` | Agrupa por `locality` con conteo y `citySlug` cuando existe página de ciudad. |
| `getProvinceLastUpdated` | `(provinceSlug: string) => Promise<Date \| null>` | `lib/seo/places.ts` | `updatedAt` máximo de los lugares aprobados de la provincia. |
| `getProvincePageData` | `(provinceSlug: string) => Promise<ProvincePageData>` | `lib/seo/province-pages.ts` | Compone todos los datos SSR de la página provincial (lugares, conteos 100% GF / opciones, localidades, categorías, lastUpdated). |
| `getProvinceCategoryPageData` | `(provinceSlug: string, categorySlug: string) => Promise<ProvinceCategoryPageData>` | `lib/seo/province-pages.ts` | Compone datos SSR de provincia + categoría. |
| `getProvinceTitle` | `(province: ProvinceConfig) => string` | `lib/seo/templates.ts` | `Lugares sin TACC en Tucumán: restaurantes y cafeterías \| CeliMap`. |
| `getProvinceDescription` | `(province: ProvinceConfig, data: { total: number; dedicatedGf: number; localities: number }) => string` | `lib/seo/templates.ts` | Basada en datos reales. |
| `getProvinceCategoryTitle` | `(province: ProvinceConfig, categorySlug: string) => string` | `lib/seo/templates.ts` | `Restaurantes sin TACC en Tucumán \| CeliMap`. |
| `getProvinceCategoryDescription` | `(province: ProvinceConfig, categorySlug: string, total: number) => string` | `lib/seo/templates.ts` | Basada en datos reales. |
| `getProvinceSEOTextBlock` | `(province: ProvinceConfig, data: ProvincePageData) => string` | `lib/seo/templates.ts` | Texto inferior dinámico y útil. |
| `getPageLastModified` | `(placeIds: string[]) => Promise<Date \| null>` | `lib/seo/places.ts` | `lastmod` por scope (máximo `updatedAt` de los lugares de esa página). |
| `backfillPlaceProvinces` | `(options: { dryRun: boolean }) => Promise<{ updated: number; skipped: number; ambiguous: Array<{ _id: string; name: string; address: string; reason: string }>; noData: number }>` | `scripts/backfill-place-provinces.ts` | Backfill idempotente. Completa `province` y `locality` de forma INDEPENDIENTE: puede conocerse la provincia y no la localidad (en ese caso guarda solo la provincia y reporta la localidad como pendiente). Orden de preferencia: 1) campo `province`/`locality` existente; 2) datos estructurados del snapshot/geocoding (`addressText`, `googleSnapshot`, `administrative_area_level_1`); 3) coordenadas dentro de POLÍGONOS ADMINISTRATIVOS CONFIABLES (NO bounding boxes ni "límites aproximados", especialmente CABA/PBA); 4) parsing de dirección como fallback controlado. Reporta casos ambiguos. Es preferible NO migrar un lugar antes que asignarlo a una provincia incorrecta. |

### Funciones modificadas

| Función | Archivo | Cambio |
|---|---|---|
| `getPlacesByCity` | `lib/seo/places.ts` | Filtrar por `province: city.provinceSlug` Y `locality: city.slug` (no por `neighborhood`). El filtro `?barrio=` se mantiene como refinamiento adicional sobre `neighborhood` dentro de la localidad. |
| `getPlacesByCityAndCategory` | `lib/seo/places.ts` | Ídem: `province` + `locality` + categoría. |
| `getPlacesByProvince` | `lib/seo/places.ts` | Reemplazar lógica de neighborhoods por `province` normalizado; `total` real vía `countDocuments`; no tragar errores silenciosamente (loggear). |
| `getTopNeighborhoods` | `lib/seo/places.ts` | Agregar restricción `province` + `locality` para consistencia. |
| `getTopPlaces` | `lib/seo/places.ts` | Ídem. |
| `buildPublicPlacesMongoQuery` | `lib/places-public-query.ts` | Agregar soporte `provinceSlugs` y `localitySlugs`. |
| `buildSeoPages` | `app/sitemap.ts` | Dedupe por URL; agregar páginas provinciales indexables; excluir `noindex`; `lastmod` por scope. |
| `sitemap` | `app/sitemap.ts` | Usar `getPageLastModified` por grupo de URLs en lugar de `getLastPlaceUpdated` global. |
| `generateMetadata` (ciudad) | `app/sin-gluten/[ciudadSlug]/page.tsx` | Eliminar branch provincial (la ruta se resuelve exclusivamente contra `CITIES`). |
| `SinGlutenCiudadPage` | `app/sin-gluten/[ciudadSlug]/page.tsx` | Eliminar branch provincial. |
| `extractLocality` / `geocodeAddress` / `reverseGeocode` | `lib/geocode.ts` | Devolver `province` en `GeocodeResult` a partir del contexto de Mapbox/Google (`region` / `administrative_area_level_1`). |
| `buildPlaceMetadata` | `app/lugar/[id]/layout.tsx` | Breadcrumb con provincia/localidad cuando estén disponibles. |

### Funciones eliminadas

| Función | Archivo | Razón / Migración |
|---|---|---|
| `getPlacesByProvince` (versión por neighborhoods) | `lib/seo/places.ts` | Reemplazada por `getPlacesByProvinceSlug` con campo normalizado. |
| `ProvincialPage` (componente) | `app/sin-gluten/[ciudadSlug]/ProvincialPage.tsx` | Migrada a `app/sin-gluten/provincia/[provinceSlug]/page.tsx` + `ProvincePageContent`. Eliminar SOLO al final, después de comprobar que ningún import o ruta activa lo utiliza y después de los tests. |

## [Classes]

No hay clases OOP en el proyecto (arquitectura funcional con React Server Components); los "componentes" cumplen ese rol.

### Componentes nuevos

| Componente | Archivo | Métodos/partes clave |
|---|---|---|
| `ProvincePageJsonLd` | `components/seo/ProvincePageJsonLd.tsx` | Renderiza `BreadcrumbList` (Inicio → Sin gluten Argentina → Provincia), `CollectionPage` con `name`/`description`/`url` canónica, e `ItemList` con enlaces a las fichas visibles. Sin `LocalBusiness` para CeliMap. |
| `ProvinceCategoryPageJsonLd` | `components/seo/ProvinceCategoryPageJsonLd.tsx` | Ídem para provincia + categoría. |
| `ProvincePageContent` | `components/seo/ProvincePageContent.tsx` | Server component: breadcrumb, H1, intro, resumen dinámico (total, 100% GF, opciones, localidades, última actualización), categorías con enlaces (solo con resultados), localidades con enlaces a páginas de ciudad, listado de lugares agrupado por localidad, mapa provincial, texto inferior, FAQ visible con respuestas derivadas de datos, CTA "Sumalo a CeliMap". |
| `ProvinceCategoryPageContent` | `components/seo/ProvinceCategoryPageContent.tsx` | Server component: breadcrumb, H1, listado de lugares (provincia + categoría + aprobados + sin duplicados), localidades con resultados en esa categoría, enlaces relacionados. |

### Componentes modificados

| Componente | Archivo | Cambio |
|---|---|---|
| `PlaceListWithFilters` | `components/seo/PlaceListWithFilters.tsx` | Agregar prop `provinceSlug`/`provinceName` y enlace "Ver todos los lugares sin TACC en la provincia de X". |
| `ProvincialMapEmbed` | `components/seo/ProvincialMapEmbed.tsx` | Usar `provinceSlugs` en el fetch a `/api/places`. |
| `CityMapEmbed` | `components/seo/CityMapEmbed.tsx` | Usar `provinceSlugs` + `localitySlugs` (filtro normalizado, no `neighborhood`). |
| `ProvincialPageJsonLd` | `components/seo/ProvincialPageJsonLd.tsx` | Reemplazar por `ProvincePageJsonLd` (nuevo). |
| `Breadcrumbs` | `components/seo/Breadcrumbs.tsx` | Sin cambios (ya soporta items con href). |

## [Dependencies]

No se agregan dependencias nuevas; se reutilizan `zod`, `mongoose`, `next/cache` (`unstable_cache`/`revalidateTag` de `lib/api-cache.ts`) y el patrón `revalidate = 3600` existente.

- `lib/api-cache.ts`: agregar tags de caché para páginas provinciales (ej: `seo:province:${slug}`, `seo:province:${slug}:${category}`) e invalidarlos en los puntos existentes de publicación/edición/eliminación de lugares (admin places API, aprobación de sugerencias).
- No introducir una segunda estrategia de caché incompatible.

## [Testing]

Agregar tests unitarios puros (sin DB) para normalización, reglas de indexación y construcción de queries; tests de integración para datos provinciales; y validación del sitemap.

### Tests nuevos

| Archivo | Casos |
|---|---|
| `__tests__/lib/seo/provinces.test.ts` | 1) `normalizeProvinceSlug("Tucumán") === "tucuman"`; 2) aliases: `getProvinceByAlias("CABA")` → `caba`, `getProvinceByAlias("Capital Federal")` → `caba`, `getProvinceByAlias("PBA")` → `buenos-aires`, `getProvinceByAlias("Provincia de Buenos Aires")` → `buenos-aires`; 3) CABA ≠ PBA (`getProvinceBySlug("caba")` no es `buenos-aires`); 4) `isProvincialSlug("cordoba") === true` (slug provincial válido) y `isProvincialSlug("tucuman") === true`; 5) `getProvinceByAlias("Buenos Aires")` NO resuelve PBA (ambiguo con CABA) → `undefined`; 6) `resolveProvinceFromAddress` no resuelve "Buenos Aires" ambiguo sin contexto. |
| `__tests__/lib/seo/indexing-rules.test.ts` | 1) provincia 0 lugares → `not_found`; 2) 1-4 lugares → `noindex`; 3) 5 lugares pero 1 localidad → `noindex`; 4) 5 lugares y 2 localidades → `index`; 5) categoría 0 → `not_found`; 6) 1-2 → `noindex`; 7) ≥3 → `index`. |
| `__tests__/lib/seo/province-pages.test.ts` | 1) Un lugar de Mar del Plata (`province: "buenos-aires"`, `locality: "mar-del-plata"`, `neighborhood: "Centro"`) NO aparece en `getPlacesByProvinceSlug("cordoba")`; 2) filtrado provincia + categoría devuelve solo lugares de esa provincia y tipo; 3) sin duplicados por `_id`; 4) `total === places.length` SOLO cuando la consulta no tiene `limit` ni paginación; si existe `limit`, `total` representa todos los resultados y `places.length` solo los renderizados; 5) `getProvinceLocalities` agrupa por `locality` y mapea `citySlug` cuando existe. |
| `__tests__/lib/seo/sitemap.test.ts` | 1) `buildSeoPages` no genera URLs duplicadas (incluye `/sin-gluten/cordoba` una sola vez); 2) excluye páginas `noindex`/vacías; 3) `lastmod` de una URL solo cambia si cambia el `updatedAt` de sus lugares (no global); 4) URLs de ciudades y fichas se mantienen. |

### Tests existentes a mantener/ajustar

- `__tests__/lib/places-public-query.test.ts`: agregar casos `provinceSlugs` → `query.province = { $in: [...] }` y `localitySlugs` → `query.locality = { $in: [...] }`.
- `__tests__/lib/place-slugs.test.ts`, `__tests__/lib/map-search.test.ts`: sin cambios esperados; verificar que no se rompan.

### Validación final

- `npm test` (jest)
- `npx tsc --noEmit` (typecheck)
- `npm run lint`
- `npm run build` (build de producción)
- Pruebas manuales de rutas nuevas y actuales: `/sin-gluten/cordoba` (ciudad), `/sin-gluten/provincia/cordoba`, `/sin-gluten/provincia/tucuman`, `/sin-gluten/provincia/tucuman/restaurantes`, `/sin-gluten/san-miguel-de-tucuman`, `/sin-gluten/la-plata`.
- Validar JSON-LD con Rich Results Test y Schema Markup Validator.

## [Implementation Order]

Implementar en orden lógico para minimizar conflictos: primero el modelo geográfico y sus tests, luego las reglas de indexación, luego las páginas nuevas, y finalmente sitemap, enlazado interno y validación.

1. **Configuración canónica de provincias**: reescribir `lib/seo/provinces.ts` con las 24 jurisdicciones, aliases (sin "Buenos Aires" resoluble para PBA), `normalizeProvinceSlug`, `getProvinceByAlias`, `resolveProvinceFromAddress` e `isProvincialSlug` (que devuelve `true` para `"cordoba"`). Agregar `__tests__/lib/seo/provinces.test.ts`.
2. **Modelo y datos**: agregar `province`/`locality` a `models/Place.ts` con índices; actualizar `data/cities.seed.json` (agregar `provinceSlug`, corregir CABA vs PBA); actualizar `lib/seo/cities.ts` (`City.provinceSlug`).
3. **Backfill idempotente**: crear `scripts/backfill-place-provinces.ts` con `--dry-run`, reporte de ambiguos, conteo resuelto/ambiguo/sin datos, muestras de CABA, PBA, Córdoba, Tucumán, Mar del Plata y La Plata, y orden de preferencia (campo → snapshot/geocoding → polígonos administrativos confiables → parsing). NO usar bounding boxes ni "límites aproximados" para CABA/PBA. Completar `province` y `locality` de forma independiente. Ejecutar SOLO `--dry-run` y revisar el reporte; NO ejecutar la escritura real.
4. **Reglas de indexación**: crear `lib/seo/indexing-rules.ts` + `__tests__/lib/seo/indexing-rules.test.ts`.
5. **Capa de datos provinciales**: modificar `lib/seo/places.ts` (restricción `province` + `locality` en queries de ciudad, `getPlacesByProvinceSlug`, `getProvinceLocalities`, `getProvinceLastUpdated`, `getPageLastModified`) y crear `lib/seo/province-pages.ts` + tests.
6. **API pública**: agregar `provinceSlugs` y `localitySlugs` a `lib/validations.ts` y `lib/places-public-query.ts`; actualizar `app/api/places/route.ts` si es necesario; actualizar `__tests__/lib/places-public-query.test.ts`.
7. **Páginas provinciales**: crear `app/sin-gluten/provincia/[provinceSlug]/page.tsx`, `[categorySlug]/page.tsx`, `ProvincePageContent`, `ProvinceCategoryPageContent`, `ProvincePageJsonLd`, `ProvinceCategoryPageJsonLd` con metadata, canonical, robots y JSON-LD.
8. **Separación Córdoba ciudad/provincia**: eliminar el branch `isProvincialSlug` de `app/sin-gluten/[ciudadSlug]/page.tsx` (la ruta se resuelve exclusivamente contra `CITIES`); verificar que `/sin-gluten/cordoba` renderice la ciudad con su metadata/canonical actuales y que `/sin-gluten/provincia/cordoba` tenga canonical propio. NO eliminar `ProvincialPage.tsx` todavía.
9. **Sitemap**: corregir duplicados, agregar páginas provinciales indexables, excluir `noindex`/vacías, `lastmod` por URL. Agregar `__tests__/lib/seo/sitemap.test.ts`.
10. **Enlazado interno**: `app/sin-gluten-argentina/page.tsx` (sección por provincia), `app/page.tsx` (sección compacta), `PlaceListWithFilters` (enlace a provincia), `app/lugar/[id]/layout.tsx` (breadcrumb Argentina → Provincia → Ciudad → Lugar).
11. **Mapas embebidos**: actualizar `ProvincialMapEmbed` (usa `provinceSlugs`) y `CityMapEmbed` (usa `provinceSlugs` + `localitySlugs`).
12. **Caché**: agregar tags `seo:province:*` en `lib/api-cache.ts` e invalidar en los puntos de publicación/edición/eliminación existentes.
13. **Eliminación final de `ProvincialPage.tsx`**: comprobar que ningún import o ruta activa lo utiliza (grep), ejecutar todos los tests, y recién entonces eliminar el archivo.
14. **Validación completa**: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, pruebas manuales de rutas nuevas y actuales, validación de JSON-LD. NO hacer commit, push, deploy ni ejecutar el backfill en modo escritura.