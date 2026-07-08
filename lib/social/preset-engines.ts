import type { SocialPreset } from "@/lib/social/types"

export const LIST_PRESETS: SocialPreset[] = [
  "latest_places",
  "latest_ventures",
  "neighborhood",
  "dedicated_gf",
]

export const OPENROUTER_PRESETS: SocialPreset[] = ["cta_suggest", "milestone"]

export function isListPreset(preset: SocialPreset): boolean {
  return LIST_PRESETS.includes(preset)
}
