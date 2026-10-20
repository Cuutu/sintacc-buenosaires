import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import {
  getCategoryLabel,
  getModalityLabel,
  getSafetyBadge,
  getVentureCategories,
  VENTURE_SAFETY_DISCLAIMER,
  VENTURE_CATALOG_INTRO,
} from "@/lib/venture-constants"
import {
  parseVentureLinks,
  buildWhereToBuyCopy,
} from "@/lib/venture-contact"
import { getCategoryLandingPath, getZoneLandingPath, VENTURE_ZONE_LANDINGS } from "@/lib/venture-seo"
import { getVentureCoverPhoto } from "@/lib/venture-photo"
import { isArgentinaVentureZone } from "@/lib/venture-argentina"
import { formatVentureZone } from "@/lib/venture-zone-display"
import { getBaseUrl } from "@/lib/base-url"
import { VentureCategoryIcon } from "@/components/ventures/venture-category-icon"
import { VentureShareButton } from "@/components/ventures/VentureShareButton"
import { VentureCard } from "@/components/ventures/VentureCard"
import type { VenturePublic } from "@/lib/ventures-server"
import {
  Instagram,
  MessageCircle,
  MapPin,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Star,
} from "lucide-react"
import { cn } from "@/lib/utils"

function ProfileSection({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  )
}

function resolveZoneHref(zone: string): string | undefined {
  const z = zone.trim().toLowerCase()
  for (const landing of VENTURE_ZONE_LANDINGS) {
    if ((landing.countryCode ?? "AR") !== "AR") continue
    if (landing.zonePatterns.some((re) => re.test(z))) {
      return getZoneLandingPath(landing.slug)
    }
  }
  return undefined
}

type VentureProfileContentProps = {
  venture: VenturePublic
  related?: VenturePublic[]
}

export function VentureProfileContent({ venture, related = [] }: VentureProfileContentProps) {
  const photo = getVentureCoverPhoto(venture.photos)
  const categoryIds = getVentureCategories(venture)
  const { label: safetyLabel } = getSafetyBadge("fully_gf")
  const zoneLabel = formatVentureZone(venture.zone)
  const links = parseVentureLinks({
    contact: venture.contact,
    purchaseChannels: venture.purchaseChannels,
  })
  const manualDescription = venture.description?.trim() || ""
  const whereToBuyLines = buildWhereToBuyCopy({
    links,
    modalities: venture.modalities,
    purchaseText: links.purchaseText,
  })
  const shareUrl = `${getBaseUrl()}/emprendimientos/${venture.slug}`
  const zoneHref = resolveZoneHref(venture.zone)
  const inArgentina = isArgentinaVentureZone(venture.zone)
  const hasBuyLinks = Boolean(links.whatsapp || links.instagram || links.web)

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 pb-10 md:pb-12 lg:max-w-5xl lg:px-5 lg:pt-10">
      <Breadcrumbs
        items={[
          { label: "Emprendimientos", href: "/emprendimientos" },
          { label: venture.name },
        ]}
      />

      {/* Compu: foto a la izquierda (alto completo) y datos a la derecha. */}
      <article className="mt-6 overflow-hidden rounded-2xl border border-olive/10 bg-olive/5 lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:rounded-[28px]">
        <div className="relative aspect-[16/9] min-h-[200px] overflow-hidden lg:aspect-auto lg:min-h-[480px]">
          {photo ? (
            <Image
              src={photo}
              alt={venture.name}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 480px"
            />
          ) : (
            <div className="celi-trigo-crema absolute inset-0 flex items-center justify-center bg-[#2D4A34]">
              <VentureCategoryIcon category={venture.category} className="h-10 w-10 text-[#F7F3EB]/80" />
            </div>
          )}
          {photo && (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
          )}
        </div>

        <div className="space-y-8 p-6 md:p-8">
          <header className="space-y-4">
            {!inArgentina ? (
              <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <p className="text-sm leading-relaxed text-[#5F6B63]">
                  Este emprendimiento está fuera de Argentina (
                  <strong className="text-[#1F4D35]">{zoneLabel}</strong>, según datos cargados).
                  Lo listamos en{" "}
                  <Link
                    href="/emprendimientos#fuera-de-argentina"
                    className="font-medium text-[#1F4D35] underline underline-offset-2"
                  >
                    Fuera de Argentina
                  </Link>
                  .
                </p>
              </div>
            ) : null}

            {/* El nombre va primero: es lo que vino a buscar quien llega desde Google. */}
            <div>
              <h1 className="break-words text-[32px] font-extrabold leading-[1.05] tracking-[-0.035em] text-[#2D4A34] [text-wrap:balance] lg:font-serif lg:text-[46px] lg:font-medium lg:italic lg:leading-[1.0] lg:tracking-[-0.02em]">
                {venture.name}
              </h1>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground md:text-base">
                <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
                {zoneHref ? (
                  <Link href={zoneHref} className="hover:text-foreground hover:underline">
                    {zoneLabel}
                  </Link>
                ) : (
                  <span>{zoneLabel}</span>
                )}
              </p>
              {(venture.stats?.totalReviews ?? 0) > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i <= Math.round(venture.stats!.avgRating)
                            ? "fill-[#C85A2E] text-[#C85A2E]"
                            : "text-muted-foreground/25"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-semibold">{venture.stats!.avgRating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">
                    ({venture.stats!.totalReviews}{" "}
                    {venture.stats!.totalReviews === 1 ? "reseña" : "reseñas"})
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1F4D35]/15 bg-[#1F4D35]/8 px-2.5 py-0.5 text-xs font-semibold text-[#1F4D35]">
                <span aria-hidden className="h-2 w-2 rounded-full bg-[#1F4D35]" />
                {safetyLabel}
              </span>
              {categoryIds.map((id) => (
                <Badge key={id} variant="outline" className="border-primary/30 text-primary">
                  <Link href={getCategoryLandingPath(id)} className="hover:underline">
                    {getCategoryLabel(id)}
                  </Link>
                </Badge>
              ))}
              {venture.modalities?.map((m) => (
                <Badge key={m} variant="secondary" className="text-xs">
                  {getModalityLabel(m)}
                </Badge>
              ))}
            </div>
          </header>

          {hasBuyLinks ? (
            <ProfileSection title="Cómo comprar">
              <div className="flex flex-col flex-wrap gap-3 sm:flex-row">
                {links.whatsapp && (
                  <Button
                    asChild
                    className="min-h-[44px] w-full gap-2 bg-[#1F4D35] text-[#F8F5EF] hover:bg-[#1F4D35]/90 sm:w-auto"
                  >
                    <a href={links.whatsapp} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                  </Button>
                )}
                {links.instagram && (
                  <Button asChild variant="outline" className="min-h-[44px] w-full gap-2 sm:w-auto">
                    <a href={links.instagram} target="_blank" rel="noopener noreferrer">
                      <Instagram className="h-4 w-4" />
                      Instagram
                    </a>
                  </Button>
                )}
                {links.web && (
                  <Button asChild variant="outline" className="min-h-[44px] w-full gap-2 sm:w-auto">
                    <a href={links.web} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Sitio web
                    </a>
                  </Button>
                )}
                <VentureShareButton ventureName={venture.name} shareUrl={shareUrl} />
              </div>
            </ProfileSection>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <VentureShareButton ventureName={venture.name} shareUrl={shareUrl} />
            </div>
          )}

          {manualDescription ? (
            <ProfileSection title="Sobre el emprendimiento">
              <p className="text-sm leading-relaxed text-foreground/90">{manualDescription}</p>
            </ProfileSection>
          ) : null}

          {whereToBuyLines.length > 0 && !hasBuyLinks ? (
            <ProfileSection title="Dónde comprar">
              <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                {whereToBuyLines.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary text-primary" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </ProfileSection>
          ) : null}

          <ProfileSection title="Según datos cargados">
            <div className="space-y-3 rounded-xl border border-olive/10 bg-olive/5 p-4 text-sm">
              <p className="text-xs leading-relaxed text-[#5F6B63]">
                {VENTURE_CATALOG_INTRO} {VENTURE_SAFETY_DISCLAIMER}
              </p>
              {venture.certifiedProducts ? (
                <p className="flex items-start gap-2 text-primary">
                  <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                  Quien lo sugirió indicó productos certificados. No es un sello de CeliMap.
                </p>
              ) : null}
            </div>
          </ProfileSection>
        </div>
      </article>

      {related.length > 0 && (
        <section className="mt-12 space-y-4">
          <h2 className="text-lg font-bold">Emprendimientos relacionados</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((v) => (
              <VentureCard key={v._id} venture={v} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
