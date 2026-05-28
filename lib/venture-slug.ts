import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import { Venture } from "@/models/Venture"
import { VENTURE_CATEGORY_LANDING_SLUGS, VENTURE_ZONE_LANDING_SLUGS } from "@/lib/venture-seo"

const RESERVED_SLUGS = new Set([
  ...VENTURE_CATEGORY_LANDING_SLUGS,
  ...VENTURE_ZONE_LANDING_SLUGS,
])

/** Slug URL-safe desde texto (minúsculas, sin tildes, guiones). */
export function slugifyText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

export function isReservedVentureSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug)
}

export function buildVentureBaseSlug(name: string, zone?: string): string {
  const namePart = slugifyText(name)
  if (!namePart) return "emprendimiento"
  if (!zone?.trim()) return namePart
  const zonePart = slugifyText(zone)
  if (!zonePart || zonePart.length < 2) return namePart
  const combined = `${namePart}-${zonePart}`
  return combined.length <= 90 ? combined : namePart
}

export async function generateUniqueVentureSlug(
  name: string,
  zone: string,
  excludeId?: mongoose.Types.ObjectId
): Promise<string> {
  await connectDB()
  let base = buildVentureBaseSlug(name, zone)
  if (isReservedVentureSlug(base)) base = `${base}-emprendimiento`

  const exists = async (slug: string) => {
    const q: Record<string, unknown> = { slug }
    if (excludeId) q._id = { $ne: excludeId }
    return Venture.exists(q)
  }

  if (!(await exists(base))) return base

  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`
    if (!(await exists(candidate))) return candidate
  }

  const suffix = excludeId?.toString().slice(-6) ?? Date.now().toString(36)
  return `${base}-${suffix}`
}

export async function ensureVentureSlug(
  venture: { _id: mongoose.Types.ObjectId; name: string; zone: string; slug?: string }
): Promise<string> {
  if (venture.slug?.trim()) return venture.slug.trim()
  const slug = await generateUniqueVentureSlug(
    venture.name,
    venture.zone,
    venture._id
  )
  await Venture.updateOne({ _id: venture._id }, { $set: { slug } })
  return slug
}

export function getVenturePublicPath(slug: string): string {
  return `/emprendimientos/${slug}`
}
