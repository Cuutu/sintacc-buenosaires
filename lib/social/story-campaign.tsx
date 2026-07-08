import type { ReactNode } from "react"
import type { ImageFormat } from "@/lib/social/image-prompt"
import type { SocialMilestoneData } from "@/lib/social/types"
import { getBaseUrl } from "@/lib/base-url"

const GREEN = "#10b981"
const BG = "#0a0a0a"
const MUTED = "#a1a1aa"
const BORDER = "#27272a"

export type StoryCtaProps = {
  format: ImageFormat
  logoUrl?: string
  placesCount?: number
  venturesCount?: number
}

export type StoryMilestoneProps = {
  format: ImageFormat
  logoUrl?: string
  presetTitle: string
  milestone: SocialMilestoneData
}

function Shell({
  format,
  logoUrl,
  children,
}: {
  format: ImageFormat
  logoUrl?: string
  children: ReactNode
}) {
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
        {children}
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

export function buildCtaTemplateProps(input: {
  format: ImageFormat
  includeLogo?: boolean
  placesCount?: number
  venturesCount?: number
}): StoryCtaProps {
  const baseUrl = getBaseUrl()
  return {
    format: input.format,
    logoUrl: input.includeLogo !== false ? `${baseUrl}/CelimapLOGO.png` : undefined,
    placesCount: input.placesCount,
    venturesCount: input.venturesCount,
  }
}

export function buildMilestoneTemplateProps(input: {
  format: ImageFormat
  includeLogo?: boolean
  presetTitle: string
  milestone: SocialMilestoneData
}): StoryMilestoneProps {
  const baseUrl = getBaseUrl()
  return {
    format: input.format,
    logoUrl: input.includeLogo !== false ? `${baseUrl}/CelimapLOGO.png` : undefined,
    presetTitle: input.presetTitle,
    milestone: input.milestone,
  }
}

/** CTA sugerir — mismo A+D, sin número inventado, 2 filas tipográficas. */
export function StoryCtaImage({ format, logoUrl, placesCount, venturesCount }: StoryCtaProps) {
  const isStory = format === "story"
  const proof = [
    placesCount != null ? `${placesCount.toLocaleString("es-AR")} lugares` : null,
    venturesCount != null ? `${venturesCount.toLocaleString("es-AR")} marcas` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  const rows = [
    { title: "Lugar con local", sub: "Resto · café · panadería" },
    { title: "Emprendimiento", sub: "Marca · delivery · IG" },
  ]

  return (
    <Shell format={format} logoUrl={logoUrl}>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: GREEN,
          letterSpacing: "0.12em",
          marginBottom: 28,
        }}
      >
        SUMÁ AL MAPA
      </div>

      <div
        style={{
          fontSize: isStory ? 56 : 44,
          fontWeight: 700,
          lineHeight: 1.15,
          marginBottom: 20,
          maxWidth: 900,
        }}
      >
        ¿Conocés algo sin gluten?
      </div>

      <div style={{ fontSize: 24, color: MUTED, marginBottom: 56 }}>
        Ayudá a otros celíacos en 2 minutos
      </div>

      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        {rows.map((row, index) => (
          <div
            key={row.title}
            style={{
              display: "flex",
              flexDirection: "column",
              paddingTop: index === 0 ? 0 : 36,
              paddingBottom: 36,
              borderBottom: index < rows.length - 1 ? `1px solid ${BORDER}` : "none",
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
                <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.2 }}>{row.title}</div>
                <div style={{ fontSize: 24, color: MUTED }}>{row.sub}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {proof ? (
        <div style={{ fontSize: 22, color: MUTED, marginTop: 24 }}>{proof}</div>
      ) : null}
    </Shell>
  )
}

/** Hito — hero D con número real de lugares. */
export function StoryMilestoneImage({
  format,
  logoUrl,
  presetTitle,
  milestone,
}: StoryMilestoneProps) {
  const isStory = format === "story"
  const places = milestone.placesCount.toLocaleString("es-AR")
  const stats = [
    { label: "reseñas", value: milestone.reviewsCount.toLocaleString("es-AR") },
    { label: "emprendimientos", value: milestone.venturesCount.toLocaleString("es-AR") },
    { label: "nuevos este mes", value: String(milestone.newPlacesThisMonth) },
  ]

  return (
    <Shell format={format} logoUrl={logoUrl}>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: GREEN,
          letterSpacing: "0.12em",
          marginBottom: 28,
        }}
      >
        LA COMUNIDAD CRECE
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
          {places}
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
          lugares en el mapa
        </div>
      </div>

      <div style={{ fontSize: 24, color: MUTED, marginBottom: 48 }}>{presetTitle}</div>

      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            style={{
              display: "flex",
              flexDirection: "column",
              paddingTop: index === 0 ? 0 : 28,
              paddingBottom: 28,
              borderBottom: index < stats.length - 1 ? `1px solid ${BORDER}` : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              <div style={{ fontSize: 40, fontWeight: 700, color: GREEN }}>{stat.value}</div>
              <div style={{ fontSize: 26, color: MUTED }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>
    </Shell>
  )
}
