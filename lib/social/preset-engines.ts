import type { SocialPreset } from "@/lib/social/types"

/** Todos los presets de redes usan plantilla Satori A+D (texto exacto). */
export const LIST_PRESETS: SocialPreset[] = [
  "latest_places",
  "latest_ventures",
  "neighborhood",
  "dedicated_gf",
  "cta_suggest",
  "milestone",
]

/** Reservado: OpenRouter desactivado para social (calidad inconsistente). */
export const OPENROUTER_PRESETS: SocialPreset[] = []

export function isListPreset(preset: SocialPreset): boolean {
  return LIST_PRESETS.includes(preset)
}

export function isTemplatePreset(preset: SocialPreset): boolean {
  return (
    preset === "latest_places" ||
    preset === "latest_ventures" ||
    preset === "neighborhood" ||
    preset === "dedicated_gf" ||
    preset === "cta_suggest" ||
    preset === "milestone"
  )
}
