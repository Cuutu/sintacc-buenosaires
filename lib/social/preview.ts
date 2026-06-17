import { buildCanvaBrief } from "@/lib/social/canva-brief"
import { buildCaption } from "@/lib/social/captions"
import { buildHashtags } from "@/lib/social/hashtags"
import {
  fetchMilestoneData,
  fetchSocialItems,
  getPresetLink,
} from "@/lib/social/queries"
import type {
  SocialPlatform,
  SocialPreset,
  SocialPreviewResult,
  SocialQueryOptions,
} from "@/lib/social/types"

export async function buildSocialPreview(input: {
  preset: SocialPreset
  platform: SocialPlatform
  limit?: number
  days?: number
  communityOnly?: boolean
  neighborhood?: string
  excludeIds?: string[]
}): Promise<SocialPreviewResult> {
  const queryOptions: SocialQueryOptions = {
    preset: input.preset,
    limit: input.limit,
    days: input.days,
    communityOnly: input.communityOnly,
    neighborhood: input.neighborhood,
    excludeIds: input.excludeIds,
  }

  const { items, presetTitle, milestone } = await fetchSocialItems(queryOptions)
  const link = getPresetLink(input.preset)
  const hashtags = buildHashtags(input.preset, items, input.neighborhood)

  let placesCount: number | undefined
  if (input.preset === "cta_suggest") {
    const stats = milestone ?? (await fetchMilestoneData())
    placesCount = stats.placesCount
  }

  const caption = buildCaption({
    preset: input.preset,
    platform: input.platform,
    presetTitle,
    items,
    link,
    hashtags,
    milestone,
    placesCount,
  })

  const canvaBrief = buildCanvaBrief({
    preset: input.preset,
    presetTitle,
    items,
    link,
    milestone,
    placesCount,
  })

  return {
    preset: input.preset,
    presetTitle,
    platform: input.platform,
    caption,
    canvaBrief,
    link,
    hashtags,
    items,
    milestone,
  }
}
