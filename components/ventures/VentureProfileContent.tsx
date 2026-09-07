import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import {
  getCategoryLabel,
  getModalityLabel,
  getSafetyBadge,
  VENTURE_SAFETY_DISCLAIMER,
} from "@/lib/venture-constants"
import {
  parseVentureLinks,
  buildWhereToBuyCopy,
} from "@/lib/venture-contact"
import { getCategoryLandingPath, getZoneLandingPath, VENTURE_ZONE_LANDINGS } from "@/lib/venture-seo"
import { getVentureCoverPhoto } from "@/lib/venture-photo"
import { isArgentinaVentureZone } from "@/lib/venture-argentina"
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
  const categoryLabel = getCategoryLabel(venture.category)
  const { label: safetyLabel, dot: safetyDot } = getSafetyBadge(venture.safetyLevel)
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
  const categoryHref = getCategoryLandingPath(venture.category)
  const zoneHref = resolveZoneHref(venture.zone)
  const inArgentina = isArgentinaVentureZone(venture.zone)
  const hasBuyLinks = Boolean(links.whatsapp || links.instagram || links.web)

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 pb-[calc(var(--bottom-nav-clearance)+1.5rem)] md:pb-12">
      <Breadcrumbs
        items={[
          { label: "Emprendimientos", href: "/emprendimientos" },
          { label: venture.name },
        ]}
      />

      <article className="mt-6 overflow-hidden rounded-2xl border border-olive/10 bg-olive/5">
        <div className="relative aspect-[16/9] min-h-[200px] overflow-hidden">
          {photo ? (
            <Image
              src={photo}
              alt={venture.name}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 672px"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1F4D35]/10 px-6 text-center">
              <VentureCategoryIcon
                category={venture.category}
                className="mb-3 h-8 w-8 text-[#1F4D35]/50"
              />
              <p className="text-xs font-semibold uppercase tracking-wide text-[#5F6B63]">Sin foto</p>
              <p className="mt-2 text-sm font-medium text-[#1F4D35]/80">{categoryLabel}</p>
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
                  Este emprendimiento no entra en el listado de Argentina. Ubicación según datos
                  cargados: <strong className="text-[#1F4D35]">{venture.zone}</strong>.
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-primary/30 text-primary">
                <Link href={categoryHref} className="hover:underline">
                  {categoryLabel}
                </Link>
              </Badge>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-olive/10 bg-olive/5 px-2.5 py-0.5 text-xs font-medium">
                <span aria-hidden>{safetyDot}</span>
                {safetyLabel}
              </span>
              {venture.modalities?.map((m) => (
                <Badge key={m} variant="secondary" className="text-xs">
                  {getModalityLabel(m)}
                </Badge>
              ))}
            </div>

            <p className="text-xs leading-relaxed text-[#5F6B63]">{VENTURE_SAFETY_DISCLAIMER}</p>

            <div>
              <h1 className="break-words text-2xl font-bold tracking-tight md:text-3xl">
                {venture.name}
              </h1>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground md:text-base">
                <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
                {zoneHref ? (
                  <Link href={zoneHref} className="hover:text-foreground hover:underline">
                    {venture.zone}
                  </Link>
                ) : (
                  <span>{venture.zone}</span>
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
                            ? "fill-amber-400 text-amber-400"
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
          </header>

          {hasBuyLinks ? (
            <ProfileSection title="Cómo comprar">
              <div className="flex flex-col flex-wrap gap-3 sm:flex-row">
                {links.whatsapp && (
                  <Button
                    asChild
                    className="min-h-[44px] w-full gap-2 bg-[#25D366] text-white hover:bg-[#25D366]/90 sm:w-auto"
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

          {venture.modalities && venture.modalities.length > 0 && (
            <ProfileSection title="Modalidad">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {venture.modalities.map((m) => (
                  <div
                    key={m}
                    className="rounded-lg border border-olive/10 bg-olive/5 px-3 py-2.5 text-center text-sm font-medium"
                  >
                    {getModalityLabel(m)}
                  </div>
                ))}
              </div>
            </ProfileSection>
          )}

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
              <p className="flex items-center gap-2">
                <span aria-hidden>{safetyDot}</span>
                <span className="text-foreground">{safetyLabel}</span>
              </p>
              <p className="text-xs leading-relaxed text-[#5F6B63]">{VENTURE_SAFETY_DISCLAIMER}</p>
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
          <div className="grid gap-4 sm:grid-cols-2">
            {related.map((v) => (
              <VentureCard key={v._id} venture={v} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
