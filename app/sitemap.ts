import type { MetadataRoute } from "next"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { List } from "@/models/List"
import { getBaseUrl } from "@/lib/base-url"
import { getPlacePath } from "@/lib/place-url"
import { buildSeoPages, dedupeUrls, type SitemapPlace } from "@/lib/seo/sitemap-pages"
import {
  VENTURE_CATEGORY_LANDINGS,
  VENTURE_ZONE_LANDINGS,
} from "@/lib/venture-seo"
import { getAllApprovedVentureSlugs, countApprovedVentures } from "@/lib/ventures-server"
import { publicListsQuery } from "@/lib/lists/access"
import { getPublishedGuides } from "@/lib/seo/guides"
import { isPublicListIndexable } from "@/lib/seo/indexing-rules"
import { staticPageLastModified } from "@/lib/seo/static-lastmod"

export const revalidate = 86400 // 24 horas

function entry(
  url: string,
  opts: {
    lastModified?: Date
    changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"]
    priority?: number
  }
): MetadataRoute.Sitemap[number] {
  const row: MetadataRoute.Sitemap[number] = {
    url,
    changeFrequency: opts.changeFrequency,
    priority: opts.priority,
  }
  if (opts.lastModified) row.lastModified = opts.lastModified
  return row
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl()

  const staticPages: MetadataRoute.Sitemap = [
    entry(base, {
      lastModified: staticPageLastModified("/"),
      changeFrequency: "daily",
      priority: 1,
    }),
    entry(`${base}/mapa`, {
      lastModified: staticPageLastModified("/mapa"),
      changeFrequency: "daily",
      priority: 0.95,
    }),
    entry(`${base}/mapa-sin-tacc`, {
      lastModified: staticPageLastModified("/mapa-sin-tacc"),
      changeFrequency: "weekly",
      priority: 0.92,
    }),
    entry(`${base}/mapa-celiaco`, {
      lastModified: staticPageLastModified("/mapa-celiaco"),
      changeFrequency: "weekly",
      priority: 0.92,
    }),
    entry(`${base}/mapa-para-celiacos`, {
      lastModified: staticPageLastModified("/mapa-para-celiacos"),
      changeFrequency: "weekly",
      priority: 0.9,
    }),
    entry(`${base}/explorar`, {
      lastModified: staticPageLastModified("/explorar"),
      changeFrequency: "daily",
      priority: 0.85,
    }),
    entry(`${base}/sugerir`, {
      lastModified: staticPageLastModified("/sugerir"),
      changeFrequency: "monthly",
      priority: 0.5,
    }),
    entry(`${base}/sin-gluten-argentina`, {
      lastModified: staticPageLastModified("/sin-gluten-argentina"),
      changeFrequency: "daily",
      priority: 0.9,
    }),
    entry(`${base}/que-es-celimap`, {
      lastModified: staticPageLastModified("/que-es-celimap"),
      changeFrequency: "monthly",
      priority: 0.8,
    }),
    entry(`${base}/como-funciona`, {
      lastModified: staticPageLastModified("/como-funciona"),
      changeFrequency: "monthly",
      priority: 0.78,
    }),
    entry(`${base}/como-verificamos-los-lugares`, {
      lastModified: staticPageLastModified("/como-verificamos-los-lugares"),
      changeFrequency: "monthly",
      priority: 0.78,
    }),
    entry(`${base}/privacidad`, {
      lastModified: staticPageLastModified("/privacidad"),
      changeFrequency: "yearly",
      priority: 0.3,
    }),
    entry(`${base}/listas`, {
      lastModified: staticPageLastModified("/listas"),
      changeFrequency: "weekly",
      priority: 0.7,
    }),
    entry(`${base}/emprendimientos`, {
      lastModified: staticPageLastModified("/emprendimientos"),
      changeFrequency: "weekly",
      priority: 0.8,
    }),
  ]

  let seoPages: MetadataRoute.Sitemap = []
  let placeUrls: MetadataRoute.Sitemap = []
  let listUrls: MetadataRoute.Sitemap = []
  let ventureUrls: MetadataRoute.Sitemap = []
  let guideUrls: MetadataRoute.Sitemap = []

  try {
    await connectDB()

    const places = await Place.find(
      { status: "approved" },
      { _id: 1, slug: 1, type: 1, types: 1, neighborhood: 1, province: 1, locality: 1, updatedAt: 1 }
    ).lean()
    seoPages = dedupeUrls(buildSeoPages(base, places as SitemapPlace[]))
    placeUrls = (places as SitemapPlace[]).map((p) =>
      entry(`${base}${getPlacePath(p)}`, {
        lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
        changeFrequency: "weekly",
        priority: 0.8,
      })
    )

    try {
      const lists = await List.find(publicListsQuery(), {
        _id: 1,
        updatedAt: 1,
        placeIds: 1,
      }).lean()
      listUrls = lists
        .filter((l: { placeIds?: unknown[] }) =>
          isPublicListIndexable(true, l.placeIds?.length ?? 0)
        )
        .map((l: { _id: unknown; updatedAt?: Date }) =>
          entry(`${base}/listas/${l._id}`, {
            lastModified: l.updatedAt ? new Date(l.updatedAt) : undefined,
            changeFrequency: "weekly",
            priority: 0.6,
          })
        )
    } catch {
      // Listas opcionales
    }

    const publishedGuides = getPublishedGuides()
    // Hub /guias queda fuera mientras esté noindex / sin publicados
    guideUrls = publishedGuides.map((g) =>
      entry(`${base}/guias/${g.slug}`, {
        lastModified: new Date(g.updatedAt),
        changeFrequency: "monthly",
        priority: 0.7,
      })
    )

    const ventureSlugs = await getAllApprovedVentureSlugs()
    ventureUrls = ventureSlugs.map((v) =>
      entry(`${base}/emprendimientos/${v.slug}`, {
        lastModified: v.updatedAt ? new Date(v.updatedAt) : undefined,
        changeFrequency: "weekly",
        priority: 0.75,
      })
    )

    for (const cat of VENTURE_CATEGORY_LANDINGS) {
      const count = await countApprovedVentures({ category: cat.categoryId })
      if (count > 0) {
        ventureUrls.push(
          entry(`${base}/emprendimientos/${cat.slug}`, {
            lastModified: staticPageLastModified("/emprendimientos"),
            changeFrequency: "weekly",
            priority: 0.78,
          })
        )
      }
    }

    for (const zone of VENTURE_ZONE_LANDINGS) {
      const count = await countApprovedVentures({ zoneConfig: zone })
      if (count > 0) {
        ventureUrls.push(
          entry(`${base}/emprendimientos/${zone.slug}`, {
            lastModified: staticPageLastModified("/emprendimientos"),
            changeFrequency: "weekly",
            priority: 0.77,
          })
        )
      }
    }

    return dedupeUrls([
      ...staticPages,
      ...seoPages,
      ...placeUrls,
      ...listUrls,
      ...guideUrls,
      ...ventureUrls,
    ])
  } catch (error) {
    const { logApiError } = await import("@/lib/logger")
    logApiError("/sitemap", error)
  }

  return dedupeUrls([
    ...staticPages,
    ...seoPages,
    ...placeUrls,
    ...listUrls,
    ...guideUrls,
    ...ventureUrls,
  ])
}
