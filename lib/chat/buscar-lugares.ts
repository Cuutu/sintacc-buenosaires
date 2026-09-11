import type { FilterQuery } from "mongoose"
import { z } from "zod"
import { resolvePrimarySafety } from "@/components/featured/featured-utils"
import { TYPES } from "@/lib/constants"
import { CANONICAL_ORIGIN } from "@/lib/base-url"
import { userTextToMongoRegex } from "@/lib/chat/regex"
import {
  findKnownNeighborhoodSearch,
  getNeighborhoodSearchValues,
} from "@/lib/map-search"
import connectDB from "@/lib/mongodb"
import { Place, type IPlace } from "@/models/Place"
import { getPlacePath } from "@/lib/place-url"
import { slugifyPlacePart } from "@/lib/place-slugs"
import { CITIES } from "@/lib/seo/cities"
import { isProvincialSlug, normalizeProvinceSlug } from "@/lib/seo/provinces"
import { normalizeChatZona } from "@/lib/chat/normalize-zona"

const PLACE_TYPES = ["restaurant", "cafe", "bakery", "store", "icecream", "bar", "other"] as const
const RESULT_LIMIT = 8
const QUERY_LIMIT = 12
const DEFAULT_RADIUS_METERS = 5000

export type InferredTaccLevel =
  | "dedicated_gf"
  | "gf_options"
  | "cross_contamination_risk"
  | "unknown"

const TYPE_LABEL: Record<(typeof PLACE_TYPES)[number], string> = Object.fromEntries(
  TYPES.map((item) => [item.value, item.label])
) as Record<(typeof PLACE_TYPES)[number], string>

const TACC_LABEL: Record<InferredTaccLevel, string> = {
  dedicated_gf: "100% sin TACC",
  gf_options: "tiene opciones sin TACC (riesgo de contaminación cruzada)",
  cross_contamination_risk: "riesgo de contaminación cruzada",
  unknown: "sin información confirmada sobre TACC",
}

export function taccLabelForLevel(level: InferredTaccLevel): string {
  return TACC_LABEL[level]
}

const TACC_SORT_RANK: Record<InferredTaccLevel, number> = {
  dedicated_gf: 0,
  gf_options: 1,
  cross_contamination_risk: 2,
  unknown: 3,
}

export function chatPlaceUrl(place: { _id: { toString(): string } | string; slug?: string | null }): string {
  return `${CANONICAL_ORIGIN}${getPlacePath(place)}`
}

/** dedicated_gf primero; dentro de cada grupo se mantiene el orden original (estable). */
export function orderByTaccThenStable<T>(
  items: T[],
  getLevel: (item: T) => InferredTaccLevel
): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const rankDiff = TACC_SORT_RANK[getLevel(a.item)] - TACC_SORT_RANK[getLevel(b.item)]
      return rankDiff !== 0 ? rankDiff : a.index - b.index
    })
    .map(({ item }) => item)
}

export const buscarLugaresInputSchema = z.object({
  zona: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .optional()
    .describe(
      "Barrio, ciudad o provincia. Ej: Palermo, Córdoba, CABA, Rosario. Se normaliza sola (capital, ciudad de, CABA, tildes, alias). Mandá la zona una sola vez."
    ),
  tipo: z
    .enum(PLACE_TYPES)
    .optional()
    .describe(
      "Tipo de lugar: restaurant, cafe, bakery, store, icecream, bar, other. Omitilo si piden 'lugares' en general, sin un tipo."
    ),
  soloCienPorcientoSinTacc: z
    .boolean()
    .optional()
    .describe(
      "true = solo lugares 100% sin TACC. false u omitido = lugares con clasificación TACC (100% o con opciones). No incluye lugares sin información confirmada."
    ),
  lat: z
    .number()
    .min(-90)
    .max(90)
    .optional()
    .describe("Latitud para buscar cerca. Tiene que ir con lng."),
  lng: z
    .number()
    .min(-180)
    .max(180)
    .optional()
    .describe("Longitud para buscar cerca. Tiene que ir con lat."),
  radioMetros: z
    .number()
    .min(200)
    .max(50000)
    .optional()
    .describe("Radio en metros alrededor de lat/lng. Default 5000."),
})

export type BuscarLugaresInput = z.infer<typeof buscarLugaresInputSchema>

export type ChatPlaceCard = {
  id: string
  nombre: string
  tipo: string
  direccion: string
  barrio: string
  ciudad?: string
  nivelTacc: Exclude<InferredTaccLevel, "unknown">
  clasificacionTacc: string
  esCienPorcientoSinTacc: boolean
  url: string
  distanciaMetros?: number
}

export type BuscarLugaresResult = {
  encontrados: number
  lugares: ChatPlaceCard[]
  error?: string
}

type PlaceDoc = {
  _id: { toString(): string }
  name: string
  type: IPlace["type"]
  address?: string
  neighborhood?: string
  province?: string
  locality?: string
  slug?: string
  safetyLevel?: IPlace["safetyLevel"]
  tags?: string[]
  distance?: number
}

function appendAnd(query: FilterQuery<IPlace>, condition: FilterQuery<IPlace>): void {
  query.$and = [...(query.$and ?? []), condition]
}

function dedicatedGfCondition(): FilterQuery<IPlace> {
  return {
    $and: [
      { tags: { $nin: ["opciones_sin_tacc"] } },
      { $or: [{ tags: "100_gf" }, { safetyLevel: "dedicated_gf" }] },
    ],
  }
}

/** unknown no entra: hace falta tag TACC o un safetyLevel concreto. */
function confirmedTaccCondition(): FilterQuery<IPlace> {
  return {
    $or: [
      { tags: "100_gf" },
      { tags: "opciones_sin_tacc" },
      {
        safetyLevel: {
          $in: ["dedicated_gf", "gf_options", "cross_contamination_risk"],
        },
      },
    ],
  }
}

function applyZonaFilter(query: FilterQuery<IPlace>, zona: string): void {
  const normalized = normalizeChatZona(zona)
  const slug = slugifyPlacePart(normalized)
  const city = CITIES.find(
    (item) => item.slug === slug || slugifyPlacePart(item.name) === slug
  )
  if (city) {
    query.locality = city.slug
    query.province = city.provinceSlug
    return
  }

  const neighborhood = findKnownNeighborhoodSearch(normalized)
  if (neighborhood) {
    const matchers = getNeighborhoodSearchValues(neighborhood).map((value) =>
      userTextToMongoRegex(value, true)
    )
    appendAnd(query, {
      $or: [
        { neighborhood: { $in: matchers } },
        { userProvidedNeighborhood: { $in: matchers } },
      ],
    })
    return
  }

  const provinceSlug = normalizeProvinceSlug(normalized) || (isProvincialSlug(slug) ? slug : null)
  if (provinceSlug) {
    query.province = provinceSlug
    return
  }

  const contains = userTextToMongoRegex(normalized, false)
  appendAnd(query, {
    $or: [
      { neighborhood: contains },
      { userProvidedNeighborhood: contains },
      { locality: slug },
      { province: slug },
      { address: contains },
      { name: contains },
    ],
  })
}

function buildPlaceQuery(input: BuscarLugaresInput): FilterQuery<IPlace> {
  const query: FilterQuery<IPlace> = { status: "approved" }

  if (input.tipo) query.type = input.tipo
  if (input.zona) applyZonaFilter(query, input.zona)
  appendAnd(query, confirmedTaccCondition())
  if (input.soloCienPorcientoSinTacc) appendAnd(query, dedicatedGfCondition())

  return query
}

export function clasificacionTacc(place: {
  safetyLevel?: IPlace["safetyLevel"]
  tags?: string[]
}): { level: InferredTaccLevel; label: string; esCienPorcientoSinTacc: boolean } {
  const level = resolvePrimarySafety(place)
  return {
    level,
    label: taccLabelForLevel(level),
    esCienPorcientoSinTacc: level === "dedicated_gf",
  }
}

function toCard(doc: PlaceDoc): ChatPlaceCard | null {
  const safety = clasificacionTacc(doc)
  if (safety.level === "unknown") return null
  return {
    id: doc._id.toString(),
    nombre: doc.name,
    tipo: TYPE_LABEL[doc.type] || doc.type,
    direccion: doc.address || "",
    barrio: doc.neighborhood || "",
    ciudad: doc.locality || doc.province || undefined,
    nivelTacc: safety.level,
    clasificacionTacc: safety.label,
    esCienPorcientoSinTacc: safety.esCienPorcientoSinTacc,
    url: chatPlaceUrl(doc),
    distanciaMetros:
      typeof doc.distance === "number" ? Math.round(doc.distance) : undefined,
  }
}

function mapDocs(docs: PlaceDoc[], soloDedicated: boolean): ChatPlaceCard[] {
  const filtered = docs.filter((doc) => {
    const safety = clasificacionTacc(doc)
    if (safety.level === "unknown") return false
    if (soloDedicated) return safety.esCienPorcientoSinTacc
    return true
  })
  return orderByTaccThenStable(filtered, (doc) => clasificacionTacc(doc).level)
    .slice(0, RESULT_LIMIT)
    .map((doc) => toCard(doc))
    .filter((card): card is ChatPlaceCard => card != null)
}

const PLACE_PROJECT = {
  name: 1,
  type: 1,
  address: 1,
  neighborhood: 1,
  province: 1,
  locality: 1,
  slug: 1,
  safetyLevel: 1,
  tags: 1,
}

async function findNear(
  input: BuscarLugaresInput,
  query: FilterQuery<IPlace>
): Promise<PlaceDoc[] | null> {
  if (input.lat == null || input.lng == null) return null
  const radius = input.radioMetros ?? DEFAULT_RADIUS_METERS

  try {
    const geo = await Place.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [input.lng, input.lat] },
          distanceField: "distance",
          maxDistance: radius,
          spherical: true,
          query,
        },
      },
      { $limit: QUERY_LIMIT },
      { $project: { ...PLACE_PROJECT, distance: 1 } },
    ])
    return geo as PlaceDoc[]
  } catch {
    return null
  }
}

export async function buscarLugares(input: BuscarLugaresInput): Promise<BuscarLugaresResult> {
  const normalized: BuscarLugaresInput =
    input.lat == null || input.lng == null
      ? { ...input, lat: undefined, lng: undefined, radioMetros: undefined }
      : input

  await connectDB()
  const query = buildPlaceQuery(normalized)
  const soloDedicated = Boolean(normalized.soloCienPorcientoSinTacc)

  const near = await findNear(normalized, query)
  if (normalized.lat != null && normalized.lng != null) {
    if (near && near.length > 0) {
      const lugares = mapDocs(near, soloDedicated)
      return { encontrados: lugares.length, lugares }
    }
    if (!normalized.zona) {
      return {
        encontrados: 0,
        lugares: [],
        error:
          "No pude usar las coordenadas para buscar cerca. Pedile una ciudad o un barrio.",
      }
    }
  }

  const docs = await Place.find(query)
    .select("name type address neighborhood province locality slug safetyLevel tags")
    .sort({ featured: -1, lastConfirmedAt: -1, createdAt: -1 })
    .limit(QUERY_LIMIT)
    .lean()

  const lugares = mapDocs(docs as unknown as PlaceDoc[], soloDedicated)
  return { encontrados: lugares.length, lugares }
}
