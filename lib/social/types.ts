export type SocialPreset =
  | "latest_places"
  | "latest_ventures"
  | "neighborhood"
  | "dedicated_gf"
  | "milestone"
  | "cta_suggest"

export type SocialPlatform = "instagram" | "tiktok"

export type SocialContentItem = {
  id: string
  kind: "place" | "venture"
  name: string
  subtitle: string
  typeLabel: string
  typeEmoji: string
  safetyLabel: string
  safetyDot: string
  photoUrl?: string
  celimapUrl: string
  ratingLine?: string
  extraBadge?: string
  modalitiesLine?: string
  createdAt: string
}

export type SocialMilestoneData = {
  placesCount: number
  reviewsCount: number
  venturesCount: number
  newPlacesThisMonth: number
  newVenturesThisMonth: number
}

export type SocialQueryOptions = {
  preset: SocialPreset
  limit?: number
  days?: number
  communityOnly?: boolean
  neighborhood?: string
  excludeIds?: string[]
}

export type SocialImageFormat = "story" | "feed"

export type SocialPreviewResult = {
  preset: SocialPreset
  presetTitle: string
  platform: SocialPlatform
  caption: string
  /** @deprecated Usar imagePrompt */
  canvaBrief: string
  imagePrompt: string
  attachmentInstructions: string
  imageFormat: SocialImageFormat
  link: string
  venturesLink?: string
  hashtags: string
  items: SocialContentItem[]
  milestone?: SocialMilestoneData
}
