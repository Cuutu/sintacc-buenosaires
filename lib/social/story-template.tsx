import type { SocialContentItem, SocialPreset } from "@/lib/social/types"
import type { ImageFormat } from "@/lib/social/image-prompt"
import {
  formatSafetyShort,
  getContextLine,
  getHeroLine,
  getHeroTag,
  IMAGE_PROMPT_MAX_ITEMS,
} from "@/lib/social/image-prompt"
import { getBaseUrl } from "@/lib/base-url"

const GREEN = "#10b981"
const BG = "#0a0a0a"
const MUTED = "#a1a1aa"
const BORDER = "#27272a"

export type StoryTemplateProps = {
  preset: SocialPreset
  items: SocialContentItem[]
  format: ImageFormat
  logoUrl?: string
}

export function buildStoryTemplateProps(input: {
  preset: SocialPreset
  items: SocialContentItem[]
  format: ImageFormat
  includeLogo?: boolean
}): StoryTemplateProps {
  const items = input.items.slice(0, IMAGE_PROMPT_MAX_ITEMS)
  const baseUrl = getBaseUrl()
  return {
    preset: input.preset,
    items,
    format: input.format,
    logoUrl: input.includeLogo !== false ? `${baseUrl}/CelimapLOGO.png` : undefined,
  }
}

export function StoryListImage({ preset, items, format, logoUrl }: StoryTemplateProps) {
  const count = items.length
  const heroTag = getHeroTag(preset)
  const heroLine = getHeroLine(preset, count, items)
  const contextLine = getContextLine(preset, items)
  const domain = getBaseUrl().replace(/^https?:\/\//, "")
  const isStory = format === "story"
  const width = 1080
  const height = isStory ? 1920 : 1080
  const padX = 72
  const padTop = isStory ? 80 : 56

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        backgroundColor: BG,
        fontFamily: "DM Sans",
        color: "#fafafa",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: `${padTop}px ${padX}px 48px`,
        }}
      >
        {logoUrl ? (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="" width={200} height={56} style={{ objectFit: "contain" }} />
          </div>
        ) : null}

        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: GREEN,
            letterSpacing: "0.12em",
            marginBottom: 28,
          }}
        >
          {heroTag}
        </div>

        <div style={{ display: "flex", alignItems: "center", marginBottom: 20, gap: 24 }}>
          <div
            style={{
              fontSize: isStory ? 120 : 96,
              fontWeight: 700,
              color: GREEN,
              lineHeight: 1,
            }}
          >
            {count}
          </div>
          <div style={{ width: 2, height: 72, backgroundColor: "#fafafa" }} />
          <div
            style={{
              fontSize: isStory ? 36 : 30,
              fontWeight: 700,
              lineHeight: 1.2,
              maxWidth: 640,
            }}
          >
            {heroLine}
          </div>
        </div>

        <div style={{ fontSize: 24, color: MUTED, marginBottom: 40 }}>{contextLine}</div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {items.map((item, index) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                flexDirection: "column",
                paddingTop: index === 0 ? 0 : 28,
                paddingBottom: 28,
                borderBottom: index < items.length - 1 ? `1px solid ${BORDER}` : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 700,
                    color: GREEN,
                    minWidth: 36,
                  }}
                >
                  {index + 1}
                </div>
                <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 8 }}>
                  <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2 }}>{item.name}</div>
                  <div style={{ fontSize: 22, color: MUTED }}>
                    {item.subtitle} · {item.typeLabel} {item.typeEmoji}
                  </div>
                  <div style={{ fontSize: 20, color: MUTED }}>{formatSafetyShort(item)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          borderTop: `2px solid ${GREEN}`,
          padding: "28px 72px",
          display: "flex",
          justifyContent: "center",
          fontSize: 22,
          color: GREEN,
          fontWeight: 600,
        }}
      >
        {domain} · Mapa para celíacos
      </div>
    </div>
  )
}
