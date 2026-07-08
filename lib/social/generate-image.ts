import { uploadImageBuffer } from "@/lib/cloudinary/upload-buffer"
import { generateOpenRouterImage } from "@/lib/openrouter/image"
import type { ImageFormat } from "@/lib/social/image-prompt"
import { buildSocialPreview } from "@/lib/social/preview"
import { isListPreset } from "@/lib/social/preset-engines"
import { renderStoryPng } from "@/lib/social/render-story"
import type { SocialImageFormat, SocialPlatform, SocialPreset } from "@/lib/social/types"
import { getBaseUrl } from "@/lib/base-url"

export { isListPreset, LIST_PRESETS, OPENROUTER_PRESETS } from "@/lib/social/preset-engines"

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

function aspectRatioFromFormat(format: ImageFormat): "9:16" | "1:1" {
  return format === "story" ? "9:16" : "1:1"
}

function buildInputReferences(
  includeLogo: boolean,
  photoUrls: string[]
): string[] | undefined {
  const refs: string[] = []
  const baseUrl = getBaseUrl()
  if (includeLogo) refs.push(`${baseUrl}/CelimapLOGO.png`)
  for (const url of photoUrls) {
    if (url) refs.push(url)
  }
  return refs.length ? refs : undefined
}

export async function generateSocialImage(
  input: SocialGenerateInput
): Promise<SocialGenerateResult> {
  const preview = await buildSocialPreview(input)
  const format = (input.imageFormat ?? "story") as ImageFormat
  const includedItems = preview.items

  if (isListPreset(input.preset)) {
    if (includedItems.length === 0) {
      throw new Error("No hay ítems para generar la imagen. Ajustá filtros o actualizá la lista.")
    }

    const png = await renderStoryPng({
      preset: input.preset,
      items: includedItems,
      format,
      includeLogo: input.includeLogo,
    })

    const imageUrl = await uploadImageBuffer(png, "social", "image/png")

    return {
      engine: "template",
      imageUrl,
      caption: preview.caption,
      imagePrompt: preview.imagePrompt,
      presetTitle: preview.presetTitle,
    }
  }

  const photoUrls =
    input.includePhotos && includedItems.length
      ? includedItems.map((i) => i.photoUrl).filter((u): u is string => Boolean(u))
      : []

  const { buffer, cost, model } = await generateOpenRouterImage({
    prompt: preview.imagePrompt,
    aspectRatio: aspectRatioFromFormat(format),
    inputReferenceUrls: buildInputReferences(input.includeLogo !== false, photoUrls),
  })

  const imageUrl = await uploadImageBuffer(buffer, "social", "image/png")

  return {
    engine: "openrouter",
    imageUrl,
    cost,
    model,
    caption: preview.caption,
    imagePrompt: preview.imagePrompt,
    presetTitle: preview.presetTitle,
  }
}
