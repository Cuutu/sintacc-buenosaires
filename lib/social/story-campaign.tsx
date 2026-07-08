import type { ReactNode } from "react"
import type { ImageFormat } from "@/lib/social/image-prompt"
import type { SocialMilestoneData } from "@/lib/social/types"
import { getBaseUrl } from "@/lib/base-url"

const GREEN = "#10b981"
const BG = "#0a0a0a"
const MUTED = "#a1a1aa"
const WHITE = "#fafafa"

const col = {
  display: "flex" as const,
  flexDirection: "column" as const,
}

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
  const padX = isStory ? 80 : 64
  const padTop = isStory ? 88 : 56

  return (
    <div
      style={{
        ...col,
        width,
        height,
        backgroundColor: BG,
        fontFamily: "DM Sans",
        color: WHITE,
        alignItems: "center",
      }}
    >
      <div
        style={{
          ...col,
          flex: 1,
          width: "100%",
          padding: `${padTop}px ${padX}px 48px`,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {logoUrl ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              width: "100%",
              marginBottom: isStory ? 56 : 32,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt=""
              width={260}
              height={72}
              style={{ objectFit: "contain" }}
            />
          </div>
        ) : null}
        <div
          style={{
            ...col,
            flex: 1,
            width: "100%",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {children}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          width: "100%",
          borderTop: `2px solid ${GREEN}`,
          padding: "28px 72px",
          fontSize: 22,
          color: GREEN,
          fontWeight: 600,
        }}
      >
        {`${domain} · Mapa para celíacos`}
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

/**
 * CTA editorial centrado — mismo look que la referencia aprobada,
 * fondo negro sólido (SIN foto). Tipografía + acento verde.
 */
export function StoryCtaImage({ format, logoUrl, placesCount, venturesCount }: StoryCtaProps) {
  const isStory = format === "story"
  const proof = [
    placesCount != null ? `${placesCount.toLocaleString("es-AR")} lugares` : null,
    venturesCount != null ? `${venturesCount.toLocaleString("es-AR")} marcas` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <Shell format={format} logoUrl={logoUrl}>
      {/* Zona hero centrada */}
      <div style={{ ...col, alignItems: "center", width: "100%" }}>
        <div
          style={{
            ...col,
            alignItems: "center",
            fontSize: 20,
            fontWeight: 700,
            color: GREEN,
            letterSpacing: "0.18em",
            marginBottom: isStory ? 36 : 24,
          }}
        >
          SUMÁ AL MAPA
        </div>

        <div
          style={{
            ...col,
            alignItems: "center",
            fontSize: isStory ? 68 : 48,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            textAlign: "center",
            maxWidth: 920,
            marginBottom: isStory ? 24 : 16,
          }}
        >
          ¿Conocés algo sin gluten?
        </div>

        <div
          style={{
            ...col,
            alignItems: "center",
            fontSize: isStory ? 28 : 22,
            color: MUTED,
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          Ayudá a otros celíacos en 2 minutos
        </div>
      </div>

      {/* Dos caminos — centrados, línea verde fina */}
      <div
        style={{
          ...col,
          alignItems: "center",
          width: "100%",
          maxWidth: 720,
          marginTop: isStory ? 64 : 36,
          marginBottom: isStory ? 64 : 36,
        }}
      >
        <div style={{ ...col, alignItems: "center", width: "100%", paddingBottom: 40 }}>
          <div
            style={{
              ...col,
              alignItems: "center",
              fontSize: isStory ? 40 : 32,
              fontWeight: 700,
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            Lugar con local
          </div>
          <div
            style={{
              ...col,
              alignItems: "center",
              fontSize: isStory ? 26 : 22,
              color: MUTED,
              textAlign: "center",
            }}
          >
            Resto · café · panadería
          </div>
        </div>

        <div
          style={{
            display: "flex",
            width: 120,
            height: 3,
            backgroundColor: GREEN,
            marginBottom: 40,
          }}
        />

        <div style={{ ...col, alignItems: "center", width: "100%" }}>
          <div
            style={{
              ...col,
              alignItems: "center",
              fontSize: isStory ? 40 : 32,
              fontWeight: 700,
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            Emprendimiento
          </div>
          <div
            style={{
              ...col,
              alignItems: "center",
              fontSize: isStory ? 26 : 22,
              color: MUTED,
              textAlign: "center",
            }}
          >
            Marca · delivery · IG
          </div>
        </div>
      </div>

      {/* Proof */}
      <div style={{ ...col, alignItems: "center", width: "100%" }}>
        {proof ? (
          <div
            style={{
              ...col,
              alignItems: "center",
              fontSize: isStory ? 24 : 20,
              color: MUTED,
              textAlign: "center",
            }}
          >
            {`${proof} ya en Celimap`}
          </div>
        ) : null}
      </div>
    </Shell>
  )
}

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
      <div style={{ ...col, alignItems: "center", width: "100%" }}>
        <div
          style={{
            ...col,
            alignItems: "center",
            fontSize: 20,
            fontWeight: 700,
            color: GREEN,
            letterSpacing: "0.18em",
            marginBottom: 32,
          }}
        >
          LA COMUNIDAD CRECE
        </div>

        <div
          style={{
            ...col,
            alignItems: "center",
            fontSize: isStory ? 140 : 100,
            fontWeight: 700,
            color: GREEN,
            lineHeight: 1,
            letterSpacing: "-0.03em",
            marginBottom: 16,
          }}
        >
          {places}
        </div>

        <div
          style={{
            ...col,
            alignItems: "center",
            fontSize: isStory ? 36 : 28,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          lugares en el mapa
        </div>

        <div
          style={{
            ...col,
            alignItems: "center",
            fontSize: 24,
            color: MUTED,
            textAlign: "center",
            marginBottom: 48,
          }}
        >
          {presetTitle}
        </div>
      </div>

      <div style={{ ...col, alignItems: "center", width: "100%", maxWidth: 640 }}>
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            style={{
              ...col,
              alignItems: "center",
              width: "100%",
              paddingTop: index === 0 ? 0 : 28,
              paddingBottom: 28,
              borderBottom:
                index < stats.length - 1 ? `1px solid #27272a` : "none",
            }}
          >
            <div
              style={{
                ...col,
                alignItems: "center",
                fontSize: isStory ? 44 : 34,
                fontWeight: 700,
                color: GREEN,
                marginBottom: 6,
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                ...col,
                alignItems: "center",
                fontSize: 22,
                color: MUTED,
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </Shell>
  )
}
