import type { ReactNode } from "react"
import type { ImageFormat } from "@/lib/social/image-prompt"
import type { SocialMilestoneData } from "@/lib/social/types"
import { getBaseUrl } from "@/lib/base-url"

const GREEN = "#10b981"
const BG = "#0a0a0a"
const MUTED = "#d4d4d8"
const WHITE = "#ffffff"

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
  footerText,
}: {
  format: ImageFormat
  logoUrl?: string
  children: ReactNode
  footerText?: string
}) {
  const domain = getBaseUrl().replace(/^https?:\/\//, "")
  const isStory = format === "story"
  const width = 1080
  const height = isStory ? 1920 : 1080
  const padX = isStory ? 72 : 56
  const padY = isStory ? 96 : 56

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
          padding: `${padY}px ${padX}px`,
          alignItems: "center",
          justifyContent: "flex-start",
        }}
      >
        {logoUrl ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              width: "100%",
              marginBottom: isStory ? 64 : 36,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt=""
              width={isStory ? 300 : 220}
              height={isStory ? 84 : 62}
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
            justifyContent: "center",
          }}
        >
          {children}
        </div>
        <div
          style={{
            ...col,
            alignItems: "center",
            width: "100%",
            marginTop: isStory ? 48 : 28,
          }}
        >
          <div
            style={{
              ...col,
              alignItems: "center",
              fontSize: isStory ? 22 : 18,
              color: MUTED,
              textAlign: "center",
            }}
          >
            {footerText ?? domain}
          </div>
        </div>
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
 * CTA idéntico a la referencia aprobada:
 * centrado, headline en 3 líneas, 2 caminos + línea verde, proof, dominio.
 * Fondo negro sólido — SIN foto.
 */
export function StoryCtaImage({ format, logoUrl, placesCount, venturesCount }: StoryCtaProps) {
  const isStory = format === "story"
  const domain = getBaseUrl().replace(/^https?:\/\//, "")
  const proof = [
    placesCount != null ? `${placesCount.toLocaleString("es-AR")} lugares` : null,
    venturesCount != null ? `${venturesCount.toLocaleString("es-AR")} marcas` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <Shell format={format} logoUrl={logoUrl} footerText={domain}>
      {/* Tag */}
      <div
        style={{
          ...col,
          alignItems: "center",
          fontSize: isStory ? 22 : 18,
          fontWeight: 700,
          color: GREEN,
          letterSpacing: "0.14em",
          marginBottom: isStory ? 40 : 24,
        }}
      >
        SUMÁ AL MAPA
      </div>

      {/* Headline — 3 líneas exactas como la referencia */}
      <div
        style={{
          ...col,
          alignItems: "center",
          marginBottom: isStory ? 28 : 18,
        }}
      >
        <div
          style={{
            ...col,
            alignItems: "center",
            fontSize: isStory ? 72 : 52,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            textAlign: "center",
            color: WHITE,
          }}
        >
          ¿Conocés
        </div>
        <div
          style={{
            ...col,
            alignItems: "center",
            fontSize: isStory ? 72 : 52,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            textAlign: "center",
            color: WHITE,
          }}
        >
          algo sin
        </div>
        <div
          style={{
            ...col,
            alignItems: "center",
            fontSize: isStory ? 72 : 52,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            textAlign: "center",
            color: WHITE,
          }}
        >
          gluten?
        </div>
      </div>

      {/* Sub */}
      <div
        style={{
          ...col,
          alignItems: "center",
          fontSize: isStory ? 28 : 22,
          fontWeight: 400,
          color: WHITE,
          textAlign: "center",
          marginBottom: isStory ? 72 : 40,
        }}
      >
        Ayudá a otros celíacos en 2 minutos
      </div>

      {/* Camino 1 */}
      <div
        style={{
          ...col,
          alignItems: "center",
          width: "100%",
          marginBottom: isStory ? 36 : 24,
        }}
      >
        <div
          style={{
            ...col,
            alignItems: "center",
            fontSize: isStory ? 36 : 28,
            fontWeight: 700,
            color: WHITE,
            textAlign: "center",
            marginBottom: 10,
          }}
        >
          Lugar con local
        </div>
        <div
          style={{
            ...col,
            alignItems: "center",
            fontSize: isStory ? 26 : 20,
            fontWeight: 400,
            color: MUTED,
            textAlign: "center",
          }}
        >
          Resto · café · panadería
        </div>
      </div>

      {/* Línea verde fina centrada */}
      <div
        style={{
          display: "flex",
          width: isStory ? 160 : 120,
          height: 2,
          backgroundColor: GREEN,
          marginBottom: isStory ? 36 : 24,
        }}
      />

      {/* Camino 2 */}
      <div
        style={{
          ...col,
          alignItems: "center",
          width: "100%",
          marginBottom: isStory ? 64 : 36,
        }}
      >
        <div
          style={{
            ...col,
            alignItems: "center",
            fontSize: isStory ? 36 : 28,
            fontWeight: 700,
            color: WHITE,
            textAlign: "center",
            marginBottom: 10,
          }}
        >
          Emprendimiento
        </div>
        <div
          style={{
            ...col,
            alignItems: "center",
            fontSize: isStory ? 26 : 20,
            fontWeight: 400,
            color: MUTED,
            textAlign: "center",
          }}
        >
          Marca · delivery · IG
        </div>
      </div>

      {/* Proof */}
      {proof ? (
        <div
          style={{
            ...col,
            alignItems: "center",
            fontSize: isStory ? 24 : 18,
            fontWeight: 400,
            color: MUTED,
            textAlign: "center",
          }}
        >
          {`${proof} ya en Celimap`}
        </div>
      ) : null}
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
  const domain = getBaseUrl().replace(/^https?:\/\//, "")
  const stats = [
    { label: "reseñas", value: milestone.reviewsCount.toLocaleString("es-AR") },
    { label: "emprendimientos", value: milestone.venturesCount.toLocaleString("es-AR") },
    { label: "nuevos este mes", value: String(milestone.newPlacesThisMonth) },
  ]

  return (
    <Shell format={format} logoUrl={logoUrl} footerText={`${domain} · Mapa para celíacos`}>
      <div
        style={{
          ...col,
          alignItems: "center",
          fontSize: 20,
          fontWeight: 700,
          color: GREEN,
          letterSpacing: "0.14em",
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
          marginBottom: 56,
        }}
      >
        {presetTitle}
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
              borderBottom: index < stats.length - 1 ? "1px solid #27272a" : "none",
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
