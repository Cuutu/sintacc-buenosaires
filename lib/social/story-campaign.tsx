import type { ReactNode } from "react"
import type { ImageFormat } from "@/lib/social/image-prompt"
import type { SocialMilestoneData } from "@/lib/social/types"
import { getBaseUrl } from "@/lib/base-url"

const GREEN = "#10b981"
const BG = "#0a0a0a"
const SUBTLE = "#a1a1aa"
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

function MilestoneShell({
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
        padding: isStory ? "88px 72px 64px" : "56px 56px 40px",
      }}
    >
      {logoUrl ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            width: "100%",
            marginBottom: isStory ? 48 : 28,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt=""
            width={isStory ? 280 : 200}
            height={isStory ? 78 : 56}
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
          fontSize: isStory ? 22 : 18,
          color: SUBTLE,
          marginTop: isStory ? 32 : 20,
        }}
      >
        {footerText ?? domain}
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
 * CTA — réplica de referencia editorial centrada, fondo negro sólido.
 * Layout en 3 zonas (hero / caminos / pie) para llenar el story sin huecos.
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

  const width = 1080
  const height = isStory ? 1920 : 1080
  const padX = 72

  return (
    <div
      style={{
        ...col,
        width,
        height,
        backgroundColor: BG,
        fontFamily: "DM Sans",
        color: WHITE,
        padding: isStory ? `100px ${padX}px 88px` : `56px ${padX}px 48px`,
      }}
    >
      {/* Logo */}
      {logoUrl ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            width: "100%",
            marginBottom: isStory ? 72 : 40,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt=""
            width={isStory ? 320 : 220}
            height={isStory ? 90 : 62}
            style={{ objectFit: "contain" }}
          />
        </div>
      ) : null}

      {/* Cuerpo — ocupa el alto restante, distribuido */}
      <div
        style={{
          ...col,
          flex: 1,
          width: "100%",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Zona hero */}
        <div style={{ ...col, alignItems: "center", width: "100%" }}>
          <div
            style={{
              ...col,
              alignItems: "center",
              fontSize: isStory ? 24 : 18,
              fontWeight: 700,
              color: GREEN,
              letterSpacing: "0.2em",
              marginBottom: isStory ? 44 : 28,
            }}
          >
            SUMÁ AL MAPA
          </div>

          <div
            style={{
              ...col,
              alignItems: "center",
              fontSize: isStory ? 82 : 56,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: "-0.025em",
              textAlign: "center",
              marginBottom: isStory ? 32 : 20,
            }}
          >
            <div style={{ ...col, alignItems: "center" }}>¿Conocés</div>
            <div style={{ ...col, alignItems: "center" }}>algo sin</div>
            <div style={{ ...col, alignItems: "center" }}>gluten?</div>
          </div>

          <div
            style={{
              ...col,
              alignItems: "center",
              fontSize: isStory ? 30 : 22,
              fontWeight: 400,
              color: WHITE,
              textAlign: "center",
              lineHeight: 1.35,
            }}
          >
            Ayudá a otros celíacos en 2 minutos
          </div>
        </div>

        {/* Zona caminos */}
        <div
          style={{
            ...col,
            alignItems: "center",
            width: "100%",
            maxWidth: 720,
          }}
        >
          <div style={{ ...col, alignItems: "center", width: "100%", marginBottom: isStory ? 40 : 28 }}>
            <div
              style={{
                ...col,
                alignItems: "center",
                fontSize: isStory ? 40 : 30,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              Lugar con local
            </div>
            <div
              style={{
                ...col,
                alignItems: "center",
                fontSize: isStory ? 28 : 22,
                fontWeight: 400,
                color: SUBTLE,
              }}
            >
              Resto · café · panadería
            </div>
          </div>

          <div
            style={{
              display: "flex",
              width: isStory ? 140 : 100,
              height: 2,
              backgroundColor: GREEN,
              marginBottom: isStory ? 40 : 28,
            }}
          />

          <div style={{ ...col, alignItems: "center", width: "100%" }}>
            <div
              style={{
                ...col,
                alignItems: "center",
                fontSize: isStory ? 40 : 30,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              Emprendimiento
            </div>
            <div
              style={{
                ...col,
                alignItems: "center",
                fontSize: isStory ? 28 : 22,
                fontWeight: 400,
                color: SUBTLE,
              }}
            >
              Marca · delivery · IG
            </div>
          </div>
        </div>

        {/* Zona pie — proof + dominio juntos */}
        <div style={{ ...col, alignItems: "center", width: "100%", gap: isStory ? 20 : 12 }}>
          {proof ? (
            <div
              style={{
                ...col,
                alignItems: "center",
                fontSize: isStory ? 26 : 20,
                fontWeight: 400,
                color: SUBTLE,
                textAlign: "center",
              }}
            >
              {`${proof} ya en CeliMap`}
            </div>
          ) : null}
          <div
            style={{
              ...col,
              alignItems: "center",
              fontSize: isStory ? 24 : 18,
              fontWeight: 400,
              color: SUBTLE,
            }}
          >
            {domain}
          </div>
        </div>
      </div>
    </div>
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
    <MilestoneShell format={format} logoUrl={logoUrl} footerText={`${domain} · Mapa para celíacos`}>
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
          color: SUBTLE,
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
            <div style={{ ...col, alignItems: "center", fontSize: 22, color: SUBTLE }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </MilestoneShell>
  )
}
