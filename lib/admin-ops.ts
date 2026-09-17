import { cache } from "react"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { Suggestion } from "@/models/Suggestion"
import { VentureSuggestion } from "@/models/VentureSuggestion"
import { Contact } from "@/models/Contact"
import { Review } from "@/models/Review"
import { VentureReview } from "@/models/VentureReview"
import { estadoQuery } from "@/lib/admin-estado"
import { getOrSetApiCache } from "@/lib/api-cache"
import { logSlowServerOp } from "@/lib/logger"
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
  computeBaseQualityScore,
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
  reviewsPending: number
  reviewsHidden: number
  featuredCount: number
}

export const EMPTY_ADMIN_COUNTS: AdminCounts = {
  suggestionsPending: 0,
  ventureSuggestionsPending: 0,
  contactsTotal: 0,
  contactsPending: 0,
  placesTotal: 0,
  placesApproved: 0,
  placesNoPhoto: 0,
  placesNoHours: 0,
  placesNoInstagram: 0,
  placesNoPhone: 0,
  placesNoWeb: 0,
  placesNoDescription: 0,
  placesNoCoords: 0,
  placesIncomplete: 0,
  reviewsPending: 0,
  reviewsHidden: 0,
  featuredCount: 0,
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

const ADMIN_COUNTS_CACHE_TTL_MS = 45 * 1000

function facetN(rows?: Array<{ n?: number }>): number {
  return Number(rows?.[0]?.n || 0)
}

async function loadAdminCountsFromDb(): Promise<AdminCounts> {
  const started = Date.now()
  await connectDB()
  const pendingEstado = estadoQuery("pendiente")
  const [
    suggestionsPending,
    ventureSuggestionsPending,
    contactFacets,
    placeFacets,
    reviewFacets,
    ventureReviewsPending,
  ] = await Promise.all([
    Suggestion.countDocuments({ status: "pending" }),
    VentureSuggestion.countDocuments({ status: "pending" }),
    Contact.aggregate<{ total: Array<{ n: number }>; pending: Array<{ n: number }> }>([
      {
        $facet: {
          total: [{ $count: "n" }],
          pending: [{ $match: pendingEstado }, { $count: "n" }],
        },
      },
    ]),
    Place.aggregate<{
      placesTotal: Array<{ n: number }>
      placesApproved: Array<{ n: number }>
      placesNoPhoto: Array<{ n: number }>
      placesNoHours: Array<{ n: number }>
      placesNoInstagram: Array<{ n: number }>
      placesNoPhone: Array<{ n: number }>
      placesNoWeb: Array<{ n: number }>
      placesNoDescription: Array<{ n: number }>
      placesNoCoords: Array<{ n: number }>
      placesIncomplete: Array<{ n: number }>
      featuredCount: Array<{ n: number }>
    }>([
      {
        $facet: {
          placesTotal: [{ $count: "n" }],
          placesApproved: [{ $match: { status: "approved" } }, { $count: "n" }],
          placesNoPhoto: [{ $match: { status: "approved", ...MISSING_PHOTO } }, { $count: "n" }],
          placesNoHours: [{ $match: { status: "approved", ...MISSING_HOURS } }, { $count: "n" }],
          placesNoInstagram: [
            { $match: { status: "approved", ...MISSING_INSTAGRAM } },
            { $count: "n" },
          ],
          placesNoPhone: [{ $match: { status: "approved", ...MISSING_PHONE } }, { $count: "n" }],
          placesNoWeb: [{ $match: { status: "approved", ...MISSING_WEB } }, { $count: "n" }],
          placesNoDescription: [
            { $match: { status: "approved", ...MISSING_DESCRIPTION } },
            { $count: "n" },
          ],
          placesNoCoords: [{ $match: { status: "approved", ...MISSING_COORDS } }, { $count: "n" }],
          placesIncomplete: [{ $match: { status: "approved", ...MISSING_TACC } }, { $count: "n" }],
          featuredCount: [{ $match: { featured: true } }, { $count: "n" }],
        },
      },
    ]),
    Review.aggregate<{ hidden: Array<{ n: number }>; pending: Array<{ n: number }> }>([
      {
        $facet: {
          hidden: [{ $match: { status: "hidden" } }, { $count: "n" }],
          pending: [{ $match: pendingEstado }, { $count: "n" }],
        },
      },
    ]),
    VentureReview.countDocuments(pendingEstado),
  ])

  const places = placeFacets[0]
  const contacts = contactFacets[0]
  const reviews = reviewFacets[0]
  logSlowServerOp({
    route: "admin:counts",
    op: "loadAdminCountsFromDb",
    durationMs: Date.now() - started,
  })

  return {
    reviewsPending: facetN(reviews?.pending) + ventureReviewsPending,
    suggestionsPending,
    ventureSuggestionsPending,
    contactsTotal: facetN(contacts?.total),
    contactsPending: facetN(contacts?.pending),
    placesTotal: facetN(places?.placesTotal),
    placesApproved: facetN(places?.placesApproved),
    placesNoPhoto: facetN(places?.placesNoPhoto),
    placesNoHours: facetN(places?.placesNoHours),
    placesNoInstagram: facetN(places?.placesNoInstagram),
    placesNoPhone: facetN(places?.placesNoPhone),
    placesNoWeb: facetN(places?.placesNoWeb),
    placesNoDescription: facetN(places?.placesNoDescription),
    placesNoCoords: facetN(places?.placesNoCoords),
    placesIncomplete: facetN(places?.placesIncomplete),
    reviewsHidden: facetN(reviews?.hidden),
    featuredCount: facetN(places?.featuredCount),
  }
}

export const getAdminCounts = cache(async function getAdminCounts(): Promise<AdminCounts> {
  return getOrSetApiCache("admin:counts", ADMIN_COUNTS_CACHE_TTL_MS, loadAdminCountsFromDb)
})

export async function getAdminOpsSnapshot(): Promise<AdminOpsSnapshot> {
  const counts = await getAdminCounts()
  return {
    counts,
    qualityScore: computeBaseQualityScore(counts),
    qualityExplain: qualityScoreExplain(),
    inbox: [],
    activity: [],
    quality: [],
    attention: [],
    priority: [],
  }
}
