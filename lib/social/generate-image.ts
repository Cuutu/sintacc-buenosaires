import { uploadImageBuffer } from "@/lib/cloudinary/upload-buffer"
import type { ImageFormat } from "@/lib/social/image-prompt"
import { buildSocialPreview } from "@/lib/social/preview"
import { isTemplatePreset } from "@/lib/social/preset-engines"
import { fetchMilestoneData } from "@/lib/social/queries"
import {
  renderCtaPng,
  renderMilestonePng,
  renderStoryPng,
} from "@/lib/social/render-story"
import type { SocialImageFormat, SocialPlatform, SocialPreset } from "@/lib/social/types"

export {
  isListPreset,
  isTemplatePreset,
  LIST_PRESETS,
  OPENROUTER_PRESETS,
} from "@/lib/social/preset-engines"

export type SocialGenerateInput = {
  preset: SocialPreset
  platform: SocialPlatform
  limit?: number
  days?: number
  communityOnly?: boolean
  neighborhood?: string
  excludeIds?: string[]
  imageFormat?: SocialImageFormat
  includeLogo?: boolean
  includePhotos?: boolean
}

export type SocialGenerateResult = {
  engine: "template" | "openrouter"
  imageUrl: string
  cost?: number
  model?: string
  caption: string
  imagePrompt: string
  presetTitle: string
}

export async function generateSocialImage(
  input: SocialGenerateInput
): Promise<SocialGenerateResult> {
  const preview = await buildSocialPreview(input)
  const format = (input.imageFormat ?? "story") as ImageFormat
  const includeLogo = input.includeLogo

  if (!isTemplatePreset(input.preset)) {
    throw new Error(`Preset no soportado para imagen: ${input.preset}`)
  }

  let png: Buffer

  if (input.preset === "cta_suggest") {
    const stats = preview.milestone ?? (await fetchMilestoneData())
    png = await renderCtaPng({
      format,
      includeLogo,
      placesCount: stats.placesCount,
      venturesCount: stats.venturesCount,
    })
  } else if (input.preset === "milestone") {
    const milestone = preview.milestone ?? (await fetchMilestoneData())
    png = await renderMilestonePng({
      format,
      includeLogo,
      presetTitle: preview.presetTitle,
      milestone,
    })
  } else {
    if (preview.items.length === 0) {
      throw new Error("No hay ítems para generar la imagen. Ajustá filtros o actualizá la lista.")
    }
    png = await renderStoryPng({
      preset: input.preset,
      items: preview.items,
      format,
      includeLogo,
    })
  }

  const imageUrl = await uploadImageBuffer(png, "social", "image/png")

  return {
    engine: "template",
    imageUrl,
    caption: preview.caption,
    imagePrompt: preview.imagePrompt,
    presetTitle: preview.presetTitle,
  }
}
