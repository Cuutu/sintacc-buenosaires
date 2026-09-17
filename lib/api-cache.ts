import { revalidatePath, unstable_cache, revalidateTag } from "next/cache"

const TAG_BY_PREFIX: Record<string, string> = {
  "public:places:": "public:places",
  "public:stats": "public:stats",
  "admin:places:": "admin:places",
  "admin:counts": "admin:counts",
  "admin:insights:": "admin:insights",
  "seo:province:": "seo:province",
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