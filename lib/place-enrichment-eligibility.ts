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
  aiEnrichment?: { status?: string } | null
}

export function catalogStatusFilter(catalog: EnrichmentCatalog = "approved"): Record<string, unknown> {
  if (catalog === "all") return { status: { $in: ["approved", "pending"] } }
  return { status: catalog }
}

export function shouldEnqueuePlaceForResearch(
  place: EnrichmentPlaceLike,
  options: { catalog?: EnrichmentCatalog; force?: boolean } = {}
): boolean {
  const status = place.aiEnrichment?.status
  if (status === "queued" || status === "running") return false
  if (options.force) return true
  if (status === "failed") return true

  const catalog = options.catalog ?? "approved"
  if (catalog === "pending" || catalog === "all") {
    if (isPlaceInformationIncomplete(place)) return true
    if (isPlaceMissingTaccClassification(place)) return true
    return status !== "done"
  }

  return isPlaceMissingTaccClassification(place)
}
