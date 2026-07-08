import type { SocialContentItem, SocialPreset } from "@/lib/social/types"

const BASE_HASHTAGS = [
  "#Celimap",
  "#SinGluten",
  "#Celiacos",
  "#SinTACC",
  "#BuenosAires",
]

export function buildHashtags(
  preset: SocialPreset,
  items: SocialContentItem[],
  neighborhood?: string
): string {
  const tags = [...BASE_HASHTAGS]

  if (neighborhood?.trim()) {
    tags.push(`#${neighborhood.replace(/\s+/g, "")}`)
  } else if (preset === "neighborhood" && items[0]?.subtitle) {
    tags.push(`#${items[0].subtitle.replace(/\s+/g, "")}`)
  }

  if (preset === "dedicated_gf") {
    tags.push("#100SinGluten", "#GlutenFree")
  }

  if (preset === "latest_ventures" || preset === "cta_suggest") {
    tags.push("#EmprendimientosSinGluten")
  }

  return [...new Set(tags)].join(" ")
}
