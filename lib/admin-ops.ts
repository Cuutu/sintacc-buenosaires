import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { Suggestion } from "@/models/Suggestion"
import { VentureSuggestion } from "@/models/VentureSuggestion"
import { Venture } from "@/models/Venture"
import { Contact } from "@/models/Contact"
import { Review } from "@/models/Review"
import {
  MISSING_COORDS,
  MISSING_DESCRIPTION,
  MISSING_HOURS,
  MISSING_INSTAGRAM,
  MISSING_PHONE,
  MISSING_PHOTO,
  MISSING_TACC,
  MISSING_WEB,
} from "@/lib/place-missing-query"
import {
  buildAttentionItems,
  buildPriorityItems,
  computeBaseQualityScore,
  daysSince,
  qualityScoreExplain,
  type AttentionItem,
  type PriorityItem,
} from "@/lib/admin-quality"

export type AdminCounts = {
  suggestionsPending: number
  ventureSuggestionsPending: number
  contactsTotal: number
  contactsPending: number
  placesTotal: number
  placesApproved: number
  placesNoPhoto: number
  placesNoHours: number
  placesNoInstagram: number
  placesNoPhone: number
  placesNoWeb: number
  placesNoDescription: number
  placesNoCoords: number
  placesIncomplete: number
  reviewsHidden: number
  featuredCount: number
}

export type AdminActivityItem = {
  id: string
  kind: "place" | "suggestion" | "venture" | "review" | "message"
  title: string
  detail: string
  at: string
  href: string
  status?: string
}

export type AdminInboxCard = {
  id: string
  title: string
  count: number
  href: string
  hint: string
  lastAt?: string
  staleDays?: number | null
}

export type AdminOpsSnapshot = {
  counts: AdminCounts
  inbox: AdminInboxCard[]
  activity: AdminActivityItem[]
  quality: Array<{ id: string; label: string; count: number; href: string }>
  qualityScore: number | null
  qualityExplain: string
  attention: AttentionItem[]
  priority: PriorityItem[]
}

export async function getAdminCounts(): Promise<AdminCounts> {
  await connectDB()
  const [
    suggestionsPending,
    ventureSuggestionsPending,
    contactsTotal,
    contactsPending,
    placesTotal,
    placesApproved,
    placesNoPhoto,
    placesNoHours,
    placesNoInstagram,
    placesNoPhone,
    placesNoWeb,
    placesNoDescription,
    placesNoCoords,
    placesIncomplete,
    reviewsHidden,
    featuredCount,
  ] = await Promise.all([
    Suggestion.countDocuments({ status: "pending" }),
    VentureSuggestion.countDocuments({ status: "pending" }),
    Contact.countDocuments(),
    Contact.countDocuments({ status: "pending" }),
    Place.countDocuments(),
    Place.countDocuments({ status: "approved" }),
    Place.countDocuments({ status: "approved", ...MISSING_PHOTO }),
    Place.countDocuments({ status: "approved", ...MISSING_HOURS }),
    Place.countDocuments({ status: "approved", ...MISSING_INSTAGRAM }),
    Place.countDocuments({ status: "approved", ...MISSING_PHONE }),
    Place.countDocuments({ status: "approved", ...MISSING_WEB }),
    Place.countDocuments({ status: "approved", ...MISSING_DESCRIPTION }),
    Place.countDocuments({ status: "approved", ...MISSING_COORDS }),
    Place.countDocuments({ status: "approved", ...MISSING_TACC }),
    Review.countDocuments({ status: "hidden" }),
    Place.countDocuments({ featured: true }),
  ])

  return {
    suggestionsPending,
    ventureSuggestionsPending,
    contactsTotal,
    contactsPending,
    placesTotal,
    placesApproved,
    placesNoPhoto,
    placesNoHours,
    placesNoInstagram,
    placesNoPhone,
    placesNoWeb,
    placesNoDescription,
    placesNoCoords,
    placesIncomplete,
    reviewsHidden,
    featuredCount,
  }
}

function toIso(value?: Date | string | null): string {
  if (!value) return new Date().toISOString()
  if (value instanceof Date) return value.toISOString()
  return value
}

function nearlySameTime(a?: Date | string | null, b?: Date | string | null): boolean {
  if (!a || !b) return false
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) < 120000
}

export async function getAdminOpsSnapshot(): Promise<AdminOpsSnapshot> {
  const counts = await getAdminCounts()

  const [
    suggestions,
    places,
    ventures,
    reviews,
    contacts,
    oldestPendingSuggestion,
    oldestPendingVenture,
    oldestPendingContact,
    oldestHiddenReview,
    popularMissingHours,
    popularMissingPhoto,
  ] = await Promise.all([
    Suggestion.find({})
      .sort({ updatedAt: -1 })
      .limit(4)
      .select("placeDraft.name status updatedAt")
      .lean(),
    Place.find({})
      .sort({ updatedAt: -1 })
      .limit(4)
      .select("name status slug updatedAt createdAt")
      .lean(),
    Venture.find({})
      .sort({ updatedAt: -1 })
      .limit(3)
      .select("name status slug updatedAt")
      .lean(),
    Review.find({})
      .sort({ createdAt: -1 })
      .limit(3)
      .select("rating status createdAt")
      .lean(),
    Contact.find({})
      .sort({ createdAt: -1 })
      .limit(3)
      .select("subject status createdAt")
      .lean(),
    Suggestion.findOne({ status: "pending" }).sort({ createdAt: 1 }).select("createdAt").lean(),
    VentureSuggestion.findOne({ status: "pending" }).sort({ createdAt: 1 }).select("createdAt").lean(),
    Contact.findOne({ status: "pending" }).sort({ createdAt: 1 }).select("createdAt").lean(),
    Review.findOne({ status: "hidden" }).sort({ createdAt: 1 }).select("createdAt").lean(),
    Place.countDocuments({
      status: "approved",
      "googleSnapshot.userRatingCount": { $gte: 10 },
      ...MISSING_HOURS,
    }),
    Place.countDocuments({
      status: "approved",
      "googleSnapshot.userRatingCount": { $gte: 10 },
      ...MISSING_PHOTO,
    }),
  ])

  const activity: AdminActivityItem[] = [
    ...suggestions.map((s) => ({
      id: `sug-${String(s._id)}`,
      kind: "suggestion" as const,
      title:
        s.status === "approved"
          ? "Lugar aprobado"
          : s.status === "rejected"
            ? "Sugerencia rechazada"
            : "Sugerencia nueva",
      detail: s.placeDraft?.name || "Sin nombre",
      at: toIso(s.updatedAt),
      href: "/admin/lugares?cola=1",
      status: s.status,
    })),
    ...places.map((p) => ({
      id: `pl-${String(p._id)}`,
      kind: "place" as const,
      title:
        p.status === "pending"
          ? "Lugar pendiente"
          : nearlySameTime(p.createdAt, p.updatedAt)
            ? "Nuevo lugar agregado"
            : "Información actualizada",
      detail: p.name,
      at: toIso(p.updatedAt),
      href: `/admin/lugares?editar=${String(p._id)}`,
      status: p.status === "approved" ? "publicado" : p.status,
    })),
    ...ventures.map((v) => ({
      id: `ve-${String(v._id)}`,
      kind: "venture" as const,
      title: "Emprendimiento publicado",
      detail: v.name,
      at: toIso(v.updatedAt),
      href: "/admin/marcas",
      status: v.status,
    })),
    ...reviews.map((r) => ({
      id: `rv-${String(r._id)}`,
      kind: "review" as const,
      title: r.status === "hidden" ? "Reseña reportada" : "Reseña recibida",
      detail: `${r.rating} ★`,
      at: toIso(r.createdAt),
      href: r.status === "hidden" ? "/admin/resenas?status=hidden" : "/admin/resenas",
      status: r.status,
    })),
    ...contacts.map((c) => ({
      id: `ct-${String(c._id)}`,
      kind: "message" as const,
      title: c.status === "pending" ? "Mensaje nuevo" : "Mensaje leído",
      detail: c.subject,
      at: toIso(c.createdAt),
      href: "/admin/mensajes",
      status: c.status === "pending" ? "pendiente" : c.status,
    })),
  ]
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, 8)

  const inbox: AdminInboxCard[] = [
    {
      id: "places",
      title: "Lugares por revisar",
      count: counts.suggestionsPending,
      href: "/admin/lugares?cola=1",
      hint: "Sugerencias de locales",
      lastAt: suggestions[0] ? toIso(suggestions[0].updatedAt) : undefined,
      staleDays: counts.suggestionsPending > 0 ? daysSince(toIso(oldestPendingSuggestion?.createdAt)) : null,
    },
    {
      id: "brands",
      title: "Marcas por validar",
      count: counts.ventureSuggestionsPending,
      href: "/admin/marcas?cola=1",
      hint: "Emprendimientos pendientes",
      lastAt: ventures[0] ? toIso(ventures[0].updatedAt) : undefined,
      staleDays: counts.ventureSuggestionsPending > 0 ? daysSince(toIso(oldestPendingVenture?.createdAt)) : null,
    },
    {
      id: "messages",
      title: "Mensajes sin responder",
      count: counts.contactsPending,
      href: "/admin/mensajes",
      hint: "Bandeja de contacto",
      lastAt: contacts[0] ? toIso(contacts[0].createdAt) : undefined,
      staleDays: counts.contactsPending > 0 ? daysSince(toIso(oldestPendingContact?.createdAt)) : null,
    },
    {
      id: "reviews",
      title: "Reseñas reportadas",
      count: counts.reviewsHidden,
      href: "/admin/resenas?status=hidden",
      hint: "Moderación",
      lastAt: reviews[0] ? toIso(reviews[0].createdAt) : undefined,
      staleDays: counts.reviewsHidden > 0 ? daysSince(toIso(oldestHiddenReview?.createdAt)) : null,
    },
  ]

  const quality = [
    { id: "photo", label: "Lugares sin foto", count: counts.placesNoPhoto, href: "/admin/lugares?missing=photo&status=approved" },
    { id: "hours", label: "Lugares sin horarios", count: counts.placesNoHours, href: "/admin/lugares?missing=hours&status=approved" },
    { id: "instagram", label: "Lugares sin Instagram", count: counts.placesNoInstagram, href: "/admin/lugares?missing=instagram&status=approved" },
    { id: "coords", label: "Lugares sin coordenadas", count: counts.placesNoCoords, href: "/admin/lugares?missing=coords&status=approved" },
    { id: "class", label: "Fichas mínimas", count: counts.placesIncomplete, href: "/admin/lugares?missing=incomplete&status=approved" },
    { id: "reviews", label: "Reseñas ocultas", count: counts.reviewsHidden, href: "/admin/resenas?status=hidden" },
  ]

  return {
    counts,
    inbox,
    activity,
    quality,
    qualityScore: computeBaseQualityScore(counts),
    qualityExplain: qualityScoreExplain(),
    attention: buildAttentionItems(counts),
    priority: buildPriorityItems(counts, {
      missingHours: popularMissingHours,
      missingPhoto: popularMissingPhoto,
    }),
  }
}
