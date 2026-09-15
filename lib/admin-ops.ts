import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { Suggestion } from "@/models/Suggestion"
import { VentureSuggestion } from "@/models/VentureSuggestion"
import { Contact } from "@/models/Contact"
import { Review } from "@/models/Review"
import { VentureReview } from "@/models/VentureReview"
import { estadoQuery } from "@/lib/admin-estado"
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
    placeReviewsPending,
    ventureReviewsPending,
  ] = await Promise.all([
    Suggestion.countDocuments({ status: "pending" }),
    VentureSuggestion.countDocuments({ status: "pending" }),
    Contact.countDocuments(),
    Contact.countDocuments(estadoQuery("pendiente")),
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
    Review.countDocuments(estadoQuery("pendiente")),
    VentureReview.countDocuments(estadoQuery("pendiente")),
  ])

  return {
    reviewsPending: placeReviewsPending + ventureReviewsPending,
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
