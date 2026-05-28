import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import { Venture } from "@/models/Venture"
import type { IVenture } from "@/models/Venture"
import { getSingleVentureReviewStats, getVentureReviewStatsMap } from "@/lib/venture-review-stats"
import type { VentureReviewStats } from "@/lib/venture-review-stats"
import { ensureVentureSlug } from "@/lib/venture-slug"
import type { VentureZoneLandingConfig } from "@/lib/venture-seo"

export type VenturePublic = {
  _id: string
  slug: string
  name: string
  category: IVenture["category"]
  zone: string
  modalities: IVenture["modalities"]
  safetyLevel: IVenture["safetyLevel"]
  contact?: IVenture["contact"]
  certifiedProducts?: boolean
  purchaseChannels?: string
  description?: string
  photos: string[]
  status: IVenture["status"]
  source?: IVenture["source"]
  createdAt?: Date
  updatedAt?: Date
  stats?: VentureReviewStats
}

function serializeVenture(
  doc: Record<string, unknown> & { _id: mongoose.Types.ObjectId; slug?: string },
  stats?: VentureReviewStats
): VenturePublic {
  const d = doc as unknown as IVenture & { _id: mongoose.Types.ObjectId }
  return {
    name: d.name,
    slug: d.slug ?? d._id.toString(),
    category: d.category,
    zone: d.zone,
    modalities: d.modalities ?? [],
    safetyLevel: d.safetyLevel,
    contact: d.contact,
    certifiedProducts: d.certifiedProducts,
    purchaseChannels: d.purchaseChannels,
    description: d.description,
    photos: d.photos ?? [],
    status: d.status,
    source: d.source,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    _id: d._id.toString(),
    stats,
  }
}

export function buildZoneMongoFilter(config: VentureZoneLandingConfig): Record<string, unknown> {
  return {
    $or: config.zonePatterns.map((re) => ({ zone: { $regex: re.source, $options: "i" } })),
  }
}

export async function getApprovedVentures(options?: {
  category?: string
  zoneConfig?: VentureZoneLandingConfig
  limit?: number
  excludeId?: string
}): Promise<VenturePublic[]> {
  await connectDB()
  const query: Record<string, unknown> = { status: "approved" }
  if (options?.category) query.category = options.category
  if (options?.zoneConfig) Object.assign(query, buildZoneMongoFilter(options.zoneConfig))
  if (options?.excludeId && mongoose.Types.ObjectId.isValid(options.excludeId)) {
    query._id = { $ne: new mongoose.Types.ObjectId(options.excludeId) }
  }

  const ventures = await Venture.find(query)
    .sort({ createdAt: -1 })
    .limit(options?.limit ?? 50)
    .lean()

  const ids = ventures.map((v) => v._id as mongoose.Types.ObjectId)
  const statsMap = await getVentureReviewStatsMap(ids)

  return ventures.map((v) =>
    serializeVenture(v as Record<string, unknown> & { _id: mongoose.Types.ObjectId }, statsMap.get(v._id.toString()))
  )
}

export async function countApprovedVentures(options?: {
  category?: string
  zoneConfig?: VentureZoneLandingConfig
}): Promise<number> {
  await connectDB()
  const query: Record<string, unknown> = { status: "approved" }
  if (options?.category) query.category = options.category
  if (options?.zoneConfig) Object.assign(query, buildZoneMongoFilter(options.zoneConfig))
  return Venture.countDocuments(query)
}

export async function getVentureBySlug(slug: string): Promise<VenturePublic | null> {
  await connectDB()
  const venture = await Venture.findOne({ slug, status: "approved" }).lean()
  if (!venture) return null
  const stats = await getSingleVentureReviewStats(venture._id as mongoose.Types.ObjectId)
  return serializeVenture(venture as Record<string, unknown> & { _id: mongoose.Types.ObjectId }, stats)
}

export async function getVentureById(id: string): Promise<VenturePublic | null> {
  if (!mongoose.Types.ObjectId.isValid(id)) return null
  await connectDB()
  const oid = new mongoose.Types.ObjectId(id)
  const venture = await Venture.findOne({ _id: oid, status: "approved" }).lean()
  if (!venture) return null
  const stats = await getSingleVentureReviewStats(oid)
  const v = venture as Record<string, unknown> & {
    _id: mongoose.Types.ObjectId
    name: string
    zone: string
    slug?: string
  }
  const slug = v.slug ?? (await ensureVentureSlug(v))
  return serializeVenture({ ...v, slug }, stats)
}

export async function getRelatedVentures(
  venture: VenturePublic,
  limit = 4
): Promise<VenturePublic[]> {
  await connectDB()
  const oid = new mongoose.Types.ObjectId(venture._id)
  const sameCategory = await Venture.find({
    status: "approved",
    category: venture.category,
    _id: { $ne: oid },
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()

  let results = sameCategory
  if (results.length < limit && venture.zone) {
    const extra = await Venture.find({
      status: "approved",
      _id: { $nin: [...results.map((r) => r._id), oid] },
      zone: { $regex: venture.zone.slice(0, 20), $options: "i" },
    })
      .sort({ createdAt: -1 })
      .limit(limit - results.length)
      .lean()
    results = [...results, ...extra]
  }

  const ids = results.map((v) => v._id as mongoose.Types.ObjectId)
  const statsMap = await getVentureReviewStatsMap(ids)
  return results.map((v) =>
    serializeVenture(v as Record<string, unknown> & { _id: mongoose.Types.ObjectId }, statsMap.get(v._id.toString()))
  )
}

export async function getAllApprovedVentureSlugs(): Promise<
  { slug: string; updatedAt?: Date }[]
> {
  await connectDB()
  const ventures = await Venture.find({ status: "approved" }, { slug: 1, name: 1, zone: 1, updatedAt: 1 }).lean()

  const out: { slug: string; updatedAt?: Date }[] = []
  for (const v of ventures) {
    const doc = v as {
      _id: mongoose.Types.ObjectId
      name: string
      zone: string
      slug?: string
      updatedAt?: Date
    }
    const slug = doc.slug ?? (await ensureVentureSlug(doc))
    out.push({ slug, updatedAt: doc.updatedAt })
  }
  return out
}
