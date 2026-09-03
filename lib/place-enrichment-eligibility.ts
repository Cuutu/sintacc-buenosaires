import type { IPlace } from "@/models/Place"
import {
  isPlaceInformationIncomplete,
  isPlaceMissingTaccClassification,
} from "@/lib/place-incomplete"

export type EnrichmentCatalog = "approved" | "pending" | "all"

export type EnrichmentPlaceLike = Pick<
  IPlace,
  | "name"
  | "address"
  | "neighborhood"
  | "type"
  | "contact"
  | "openingHours"
  | "photos"
  | "safetyLevel"
  | "tags"
> & {
  status?: IPlace["status"]
  aiEnrichment?: { status?: string } | null
}

export function isUnpublishedPlace(place: { status?: string | null }): boolean {
  return place.status !== "approved"
}

export function catalogStatusFilter(catalog: EnrichmentCatalog = "pending"): Record<string, unknown> {
  if (catalog === "all") return { status: { $in: ["approved", "pending"] } }
  return { status: catalog }
}

/** Solo pendientes / no publicados. Publicados nunca entran a la cola IA. */
export function shouldEnqueuePlaceForResearch(
  place: EnrichmentPlaceLike,
  options: { force?: boolean } = {}
): boolean {
  if (!isUnpublishedPlace(place)) return false
  const status = place.aiEnrichment?.status
  if (status === "queued" || status === "running") return false
  if (options.force) return true
  if (status === "failed") return true
  if (isPlaceInformationIncomplete(place)) return true
  if (isPlaceMissingTaccClassification(place)) return true
  return status !== "done"
}
