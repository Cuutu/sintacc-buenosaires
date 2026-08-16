import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { CITIES } from "@/lib/seo/cities"
import { PROVINCES } from "@/lib/seo/provinces"
import { isCityPageIndexable, isProvincePageIndexable } from "@/lib/seo/indexing-rules"
import { getPublishedGuides } from "@/lib/seo/guides"
import { getAdminCounts, type AdminCounts } from "@/lib/admin-ops"

export type SeoMetricState = "ready" | "pending"

export type SeoMetric = {
  id: string
  label: string
  value: number | null
  href?: string
  state: SeoMetricState
  note: string
}

export type AdminSeoSnapshot = {
  counts: AdminCounts
  ready: SeoMetric[]
  pending: SeoMetric[]
}

type GeoRow = { _id: { province?: string; locality?: string }; n: number }

export async function getAdminSeoSnapshot(): Promise<AdminSeoSnapshot> {
  await connectDB()
  const [counts, withSlug, withTitle, withDescription, withCanonical, geo] = await Promise.all([
    getAdminCounts(),
    Place.countDocuments({ status: "approved", slug: { $exists: true, $nin: [null, ""] } }),
    Place.countDocuments({
      status: "approved",
      "seo.metaTitle": { $exists: true, $nin: [null, ""] },
    }),
    Place.countDocuments({
      status: "approved",
      "seo.metaDescription": { $exists: true, $nin: [null, ""] },
    }),
    Place.countDocuments({
      status: "approved",
      "seo.canonical": { $exists: true, $nin: [null, ""] },
    }),
    Place.aggregate<GeoRow>([
      { $match: { status: "approved" } },
      { $group: { _id: { province: "$province", locality: "$locality" }, n: { $sum: 1 } } },
    ]),
  ])

  const byProvince = new Map<string, { n: number; localities: Set<string> }>()
  const byCity = new Map<string, number>()
  for (const row of geo) {
    const province = row._id.province
    const locality = row._id.locality
    if (province) {
      const current = byProvince.get(province) ?? { n: 0, localities: new Set<string>() }
      current.n += row.n
      if (locality) current.localities.add(locality)
      byProvince.set(province, current)
    }
    if (province && locality) {
      byCity.set(`${province}:${locality}`, (byCity.get(`${province}:${locality}`) ?? 0) + row.n)
    }
  }

  const indexableProvinces = PROVINCES.filter((province) => {
    const row = byProvince.get(province.slug)
    return row ? isProvincePageIndexable(row.n, row.localities.size) : false
  }).length

  const indexableCities = CITIES.filter((city) => {
    const n = byCity.get(`${city.provinceSlug}:${city.slug}`) ?? 0
    return isCityPageIndexable(n, city.slug)
  }).length

  const publishedGuides = getPublishedGuides().length
  const provincesWithPlaces = [...byProvince.values()].filter((row) => row.n > 0).length
  const citiesWithPlaces = byCity.size

  const ready: SeoMetric[] = [
    {
      id: "places",
      label: "Lugares publicados",
      value: counts.placesApproved,
      href: "/admin/lugares?status=approved",
      state: "ready",
      note: "Fichas con status aprobado.",
    },
    {
      id: "slugs",
      label: "Lugares con slug",
      value: withSlug,
      href: "/admin/lugares?status=approved",
      state: "ready",
      note: "URLs públicas de ficha.",
    },
    {
      id: "titles",
      label: "Fichas con meta title",
      value: withTitle,
      href: "/admin/lugares",
      state: "ready",
      note: "Campo seo.metaTitle cargado en la ficha.",
    },
    {
      id: "descriptions",
      label: "Fichas con meta description",
      value: withDescription,
      href: "/admin/lugares",
      state: "ready",
      note: "Campo seo.metaDescription cargado en la ficha.",
    },
    {
      id: "canonical",
      label: "Fichas con canonical",
      value: withCanonical,
      href: "/admin/lugares",
      state: "ready",
      note: "Campo seo.canonical cargado en la ficha.",
    },
    {
      id: "cities-indexable",
      label: "Ciudades indexables",
      value: indexableCities,
      href: "/admin/lugares",
      state: "ready",
      note: "Ciudades que pasan las reglas reales de indexación.",
    },
    {
      id: "provinces-indexable",
      label: "Provincias indexables",
      value: indexableProvinces,
      href: "/admin/lugares",
      state: "ready",
      note: "Provincias que pasan umbral de lugares y localidades.",
    },
    {
      id: "geo-cities",
      label: "Ciudades con al menos un lugar",
      value: citiesWithPlaces,
      state: "ready",
      note: "Cobertura geográfica real en la base.",
    },
    {
      id: "geo-provinces",
      label: "Provincias con al menos un lugar",
      value: provincesWithPlaces,
      state: "ready",
      note: "Jurisdicciones con fichas publicadas.",
    },
    {
      id: "guides",
      label: "Guías publicadas",
      value: publishedGuides,
      href: "/guias",
      state: "ready",
      note: "Contenido editorial ya publicado en /guias.",
    },
    {
      id: "no-photo",
      label: "Lugares sin foto",
      value: counts.placesNoPhoto,
      href: "/admin/lugares?missing=photo&status=approved",
      state: "ready",
      note: "Afecta rich results y CTR orgánico. Es calidad de ficha, no un ranking SEO.",
    },
  ]

  const pending: SeoMetric[] = [
    {
      id: "h1",
      label: "H1 por página",
      value: null,
      state: "pending",
      note: "No hay auditoría de headings. Falta un crawler interno que lea el HTML publicado.",
    },
    {
      id: "sitemap-coverage",
      label: "URLs en sitemap vs indexadas",
      value: null,
      state: "pending",
      note: "El sitemap se genera en runtime. Falta conectar Search Console para ver cobertura real.",
    },
    {
      id: "indexation",
      label: "Problemas de indexación",
      value: null,
      state: "pending",
      note: "No hay integración con Search Console ni logs de crawl.",
    },
    {
      id: "thin",
      label: "Páginas con poco contenido",
      value: null,
      state: "pending",
      note: "Las reglas de noindex ya existen. Falta un reporte agregado de páginas thin.",
    },
  ]

  return { counts, ready, pending }
}
