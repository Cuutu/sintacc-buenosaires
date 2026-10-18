import { revalidatePath, unstable_cache, revalidateTag } from "next/cache"

const TAG_BY_PREFIX: Record<string, string> = {
  "public:places:": "public:places",
  "public:stats": "public:stats",
  "admin:places:": "admin:places",
  "admin:counts": "admin:counts",
  "admin:insights:": "admin:insights",
  "seo:province:": "seo:province",
  // Sin estas dos, invalidateApiCache(["public:ventures:"]) no tocaba nada: cada
  // entrada quedaba con su clave entera como tag y seguía vieja hasta el TTL.
  "public:ventures:": "public:ventures",
  "admin:ventures:": "admin:ventures",
  "public:review-stats": "public:review-stats",
}

function resolveTag(cacheKey: string): string {
  for (const [prefix, tag] of Object.entries(TAG_BY_PREFIX)) {
    if (cacheKey.startsWith(prefix) || cacheKey === prefix.replace(/:$/, "")) {
      return tag
    }
  }
  return cacheKey
}

export async function getOrSetApiCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const revalidate = Math.max(1, Math.ceil(ttlMs / 1000))
  const tag = resolveTag(key)
  return unstable_cache(loader, [key], { revalidate, tags: [tag] })()
}

export function invalidateApiCache(prefixes: string[]) {
  const tags = new Set<string>()
  for (const prefix of prefixes) {
    tags.add(TAG_BY_PREFIX[prefix] ?? resolveTag(prefix))
  }
  for (const tag of tags) {
    revalidateTag(tag)
  }
  // "seo:province:" lo manda toda escritura de lugares públicos: es la señal de
  // que las landings (ISR de 1 h) quedaron viejas.
  if (prefixes.includes("seo:province:")) revalidateSeoLandingPages()
  if (prefixes.includes("public:ventures:")) revalidateVenturePages()
}

/** Fichas y landings de emprendimientos (ISR de 1 h). */
export function revalidateVenturePages() {
  revalidatePath("/emprendimientos/[slug]", "page")
  revalidatePath("/emprendimientos")
}

/** Landings SEO con ISR que muestran lugares. Las variantes /filtrado son dinámicas. */
export const SEO_LANDING_ROUTES = [
  "/sin-gluten/[ciudadSlug]",
  "/sin-gluten/[ciudadSlug]/[categoriaSlug]",
  "/sin-gluten/provincia/[provinceSlug]",
  "/sin-gluten/provincia/[provinceSlug]/[categorySlug]",
  "/categoria/[category]",
] as const

/**
 * Marca como viejas todas las landings de ciudad, provincia y categoría. No las
 * regenera ahora: cada una se rehace en su próxima visita.
 */
export function revalidateSeoLandingPages() {
  for (const route of SEO_LANDING_ROUTES) revalidatePath(route, "page")
  revalidatePath("/sin-gluten-argentina")
}

/**
 * Todas las fichas a la vez (acciones en lote del admin). No las regenera ahora:
 * cada una se rehace en su próxima visita.
 */
export function revalidateAllPlacePages() {
  revalidatePath("/lugar/[id]", "page")
}

/** ISR de /lugar/[id] es 1h. Sin esto, admin guarda y la ficha pública sigue vieja. */
export function revalidatePlacePages(place: {
  _id: { toString(): string }
  slug?: string | null
}) {
  const id = place._id.toString()
  revalidatePath(`/lugar/${id}`)
  const slug = place.slug?.trim()
  if (slug && slug !== id) revalidatePath(`/lugar/${slug}`)
}