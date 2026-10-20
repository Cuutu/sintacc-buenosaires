import connectDB from "@/lib/mongodb"
import { Venture } from "@/models/Venture"
import { getOrSetApiCache } from "@/lib/api-cache"
import { argentinaVentureMongoFilter } from "@/lib/venture-argentina"
import {
  dedicatedVentureMongoFilter,
  getCategoryLabels,
  getModalityLabels,
  getVentureCategories,
} from "@/lib/venture-constants"
import { getVentureCoverPhoto } from "@/lib/venture-photo"
import { formatVentureZone } from "@/lib/venture-zone-display"

/** Lo que necesita la tarjeta de la home: nada más viaja al cliente. */
export type HomeVenture = {
  id: string
  href: string
  name: string
  /** Categoría principal, para el ícono cuando no hay foto. */
  category: string
  /** Qué venden: "Pastelería · Panificados". */
  sells: string
  /** Zona corta: hasta dos partes, sin la provincia ni el país al final. */
  zone: string
  photo: string | null
  /** La portada es un logo (marcado en el admin): va entero sobre crema. */
  photoIsLogo: boolean
  /** false si solo cargaron formas de venta (ferias, envíos) y no qué productos hacen. */
  knownProducts: boolean
}

type VentureRow = {
  _id: { toString(): string }
  slug?: string | null
  name: string
  category?: string | null
  categories?: string[] | null
  zone?: string | null
  modalities?: string[] | null
  photos?: Array<string | null> | null
  coverIsLogo?: boolean | null
}

export const HOME_VENTURES_SHOW = 4
const CANDIDATES = 40
const TTL_MS = 60 * 60 * 1000

/** La provincia o el país al final no aportan en una tarjeta chica. */
const ZONE_TAIL = /^(provincia de )?(buenos aires|bs\.? ?as\.?|argentina)$/i

/**
 * Zona corta para la tarjeta: "Villa Ballester, San Martín, Provincia de Buenos Aires"
 * → "Villa Ballester, San Martín". Sin el punto final que a veces cargan.
 */
export function shortVentureZone(zone: string | null | undefined): string {
  const parts = formatVentureZone(zone)
    .replace(/\.+$/, "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
  while (parts.length > 1 && ZONE_TAIL.test(parts[parts.length - 1])) parts.pop()
  return parts.slice(0, 2).join(", ")
}

/** Son formas de venta, no productos: no van en "qué venden". */
const NOT_PRODUCTS = new Set(["envios_domicilio", "ferias_retiro"])

export function toHomeVenture(row: VentureRow): HomeVenture {
  const categories = getVentureCategories(row)
  const products = categories.filter((id) => !NOT_PRODUCTS.has(id))
  const sells = products.length
    ? getCategoryLabels(products.slice(0, 2)).join(" · ")
    : getModalityLabels(row.modalities ?? []).slice(0, 2).join(" · ")
  const slug = row.slug || row._id.toString()
  return {
    id: row._id.toString(),
    href: `/emprendimientos/${slug}`,
    name: row.name.trim(),
    category: categories[0] ?? "panificados",
    sells,
    zone: shortVentureZone(row.zone),
    photo: getVentureCoverPhoto(row.photos),
    photoIsLogo: row.coverIsLogo === true,
    knownProducts: products.length > 0,
  }
}

/**
 * Elige los de la home: primero los que tienen foto de producto y dicen qué hacen,
 * después los que tienen logo; dentro de cada grupo, uno por categoría antes de repetir
 * (para que no salgan cuatro pastelerías). Respeta el orden de entrada (los más nuevos
 * primero).
 */
export function pickHomeVentures(ventures: HomeVenture[], max = HOME_VENTURES_SHOW): HomeVenture[] {
  const picked: HomeVenture[] = []
  const usedCategories = new Set<string>()
  const groups = [
    ventures.filter((v) => v.photo && !v.photoIsLogo && v.knownProducts),
    ventures.filter((v) => v.photo && v.photoIsLogo && v.knownProducts),
    ventures.filter((v) => v.photo && !v.knownProducts),
    ventures.filter((v) => !v.photo && v.knownProducts),
    ventures.filter((v) => !v.photo && !v.knownProducts),
  ]

  for (const group of groups) {
    for (const venture of group) {
      if (picked.length >= max) return picked
      if (usedCategories.has(venture.category)) continue
      picked.push(venture)
      usedCategories.add(venture.category)
    }
    for (const venture of group) {
      if (picked.length >= max) return picked
      if (!picked.includes(venture)) picked.push(venture)
    }
  }
  return picked
}

async function loadHomeVentures(): Promise<HomeVenture[]> {
  await connectDB()
  const rows = (await Venture.find({
    status: "approved",
    ...dedicatedVentureMongoFilter(),
    ...argentinaVentureMongoFilter(),
  })
    .select("name slug category categories zone modalities photos coverIsLogo")
    .sort({ createdAt: -1 })
    .limit(CANDIDATES)
    .lean()) as unknown as VentureRow[]

  return pickHomeVentures(rows.map(toHomeVenture))
}

/**
 * Emprendimientos reales para la home (revisión 20/10: antes eran tres íconos). Mismo
 * catálogo que /emprendimientos: aprobados, 100% sin gluten y de Argentina. [] si
 * Mongo falla: la sección muestra las categorías. Se invalida con public:ventures.
 */
export async function getHomeVenturesSafe(): Promise<HomeVenture[]> {
  try {
    return await getOrSetApiCache("public:ventures:home", TTL_MS, loadHomeVentures)
  } catch (error) {
    console.error("[home] getHomeVentures failed:", error)
    return []
  }
}
