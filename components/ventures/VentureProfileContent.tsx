import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import {
  getCategoryLabel,
  getModalityLabel,
  getSafetyBadge,
} from "@/lib/venture-constants"
import {
  parseVentureLinks,
  buildWhereToBuyCopy,
  getCategorySubtitle,
} from "@/lib/venture-contact"
import {
  getVentureSeoDescription,
  getCategoryLandingPath,
  getZoneLandingPath,
  VENTURE_ZONE_LANDINGS,
} from "@/lib/venture-seo"
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
  const photo = venture.photos?.[0]
  const categoryLabel = getCategoryLabel(venture.category)
  const { label: safetyLabel, dot: safetyDot } = getSafetyBadge(venture.safetyLevel)
  const links = parseVentureLinks({
    contact: venture.contact,
    purchaseChannels: venture.purchaseChannels,
  })
  const description = getVentureSeoDescription(
    venture.name,
    venture.category,
    venture.zone,
    venture.description
  )
  const whereToBuyLines = buildWhereToBuyCopy({
    links,
    modalities: venture.modalities,
    purchaseText: links.purchaseText,
  })
  const subtitle = getCategorySubtitle(venture.category, venture.zone)
  const isVerified =
    venture.safetyLevel === "fully_gf" || venture.safetyLevel === "gf_options"
  const shareUrl = `${getBaseUrl()}/emprendimientos/${venture.slug}`
  const categoryHref = getCategoryLandingPath(venture.category)
  const zoneHref = resolveZoneHref(venture.zone)

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Breadcrumbs
        items={[
          { label: "Emprendimientos", href: "/emprendimientos" },
          { label: venture.name },
        ]}
      />

      <article className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.03] mt-6">
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
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-emerald-950/40 to-background flex flex-col items-center justify-center px-6 text-center">
              <VentureCategoryIcon
                category={venture.category}
                className="h-12 w-12 text-primary/80 mb-4"
              />
              <p className="text-sm font-medium text-primary/90 mb-1">{categoryLabel}</p>
              <p className="text-xl md:text-2xl font-bold text-foreground line-clamp-2">
                {venture.name}
              </p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent pointer-events-none" />
          {photo && (
            <div className="absolute bottom-4 left-4 right-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-white text-xs border border-white/10">
                <span aria-hidden>{safetyDot}</span>
                {safetyLabel}
              </span>
            </div>
          )}
        </div>

        <div className="p-6 md:p-8 space-y-8">
          <header className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-primary/30 text-primary">
                <Link href={categoryHref} className="hover:underline">
                  {categoryLabel}
                </Link>
              </Badge>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 border border-white/10">
                <span aria-hidden>{safetyDot}</span>
                {safetyLabel}
              </span>
              {venture.modalities?.map((m) => (
                <Badge key={m} variant="secondary" className="text-xs">
                  {getModalityLabel(m)}
                </Badge>
              ))}
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight break-words">
                {venture.name}
              </h1>
              <p className="flex items-center gap-2 text-muted-foreground mt-2 text-sm md:text-base">
                <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
                {zoneHref ? (
                  <Link href={zoneHref} className="hover:text-foreground hover:underline">
                    {subtitle}
                  </Link>
                ) : (
                  <span>{subtitle}</span>
                )}
              </p>
              {(venture.stats?.totalReviews ?? 0) > 0 && (
                <div className="flex items-center gap-2 mt-2">
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
                  <span className="text-sm font-semibold">
                    {venture.stats!.avgRating.toFixed(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({venture.stats!.totalReviews}{" "}
                    {venture.stats!.totalReviews === 1 ? "reseña" : "reseñas"})
                  </span>
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-1">
              {links.whatsapp && (
                <Button
                  asChild
                  className="w-full sm:w-auto gap-2 bg-[#25D366] hover:bg-[#25D366]/90 text-white min-h-[44px]"
                >
                  <a href={links.whatsapp} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" />
                    Comprar / consultar por WhatsApp
                  </a>
                </Button>
              )}
              {links.instagram && (
                <Button asChild variant="outline" className="w-full sm:w-auto gap-2 min-h-[44px]">
                  <a href={links.instagram} target="_blank" rel="noopener noreferrer">
                    <Instagram className="h-4 w-4" />
                    Ver Instagram
                  </a>
                </Button>
              )}
              {links.web && (
                <Button asChild variant="outline" className="w-full sm:w-auto gap-2 min-h-[44px]">
                  <a href={links.web} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Ir a la tienda
                  </a>
                </Button>
              )}
              <VentureShareButton ventureName={venture.name} shareUrl={shareUrl} />
            </div>
          </header>

          <hr className="border-white/10" />

          <ProfileSection title="Sobre el emprendimiento">
            <p className="text-sm leading-relaxed text-foreground/90">{description}</p>
          </ProfileSection>

          {venture.modalities && venture.modalities.length > 0 && (
            <ProfileSection title="Modalidad">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {venture.modalities.map((m) => (
                  <div
                    key={m}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-center text-sm font-medium"
                  >
                    {getModalityLabel(m)}
                  </div>
                ))}
              </div>
            </ProfileSection>
          )}

          <ProfileSection title="Dónde comprar">
            <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              {whereToBuyLines.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="text-primary mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </ProfileSection>

          <ProfileSection title="Seguridad sin gluten">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3 text-sm">
              <p className="flex items-center gap-2">
                <span aria-hidden>{safetyDot}</span>
                <span>
                  <strong className="text-foreground">Nivel de seguridad:</strong> {safetyLabel}
                </span>
              </p>
              {venture.certifiedProducts ? (
                <p className="flex items-start gap-2 text-primary">
                  <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                  Tiene productos certificados según quien lo sugirió.
                </p>
              ) : !isVerified ? (
                <p className="text-muted-foreground">Información pendiente de verificación.</p>
              ) : null}
            </div>
          </ProfileSection>

          <ProfileSection title="Importante">
            <div className="flex gap-3 p-4 rounded-xl border border-amber-500/25 bg-amber-500/5">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-500/90 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Celimap no certifica emprendimientos. Las opciones son recomendadas por la
                comunidad; verificá siempre antes de consumir.
              </p>
            </div>
          </ProfileSection>
        </div>
      </article>

      {related.length > 0 && (
        <section className="mt-12 space-y-4">
          <h2 className="text-lg font-bold">Emprendimientos relacionados</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {related.map((v) => (
              <VentureCard key={v._id} venture={v} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
