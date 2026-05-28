"use client"

import Link from "next/link"
import Image from "next/image"
import { MapPin, Instagram, MessageCircle, ArrowRight, Star } from "lucide-react"
import type { VentureReviewStats } from "@/lib/venture-review-stats"
import { Badge } from "@/components/ui/badge"
import type { IVenture } from "@/models/Venture"
import {
  getCategoryLabel,
  getModalityLabel,
  getSafetyBadge,
} from "@/lib/venture-constants"
import { parseVentureLinks } from "@/lib/venture-contact"
import { cn } from "@/lib/utils"

type VentureWithId = IVenture & { _id: string; stats?: VentureReviewStats }

interface VentureCardProps {
  venture: VentureWithId
}

export function VentureCard({ venture }: VentureCardProps) {
  const href = `/emprendimientos/${venture._id}`
  const photo = venture.photos?.[0]
  const { label: safetyLabel, dot: safetyDot } = getSafetyBadge(venture.safetyLevel)
  const { instagram: igUrl, whatsapp: waUrl } = parseVentureLinks({
    contact: venture.contact,
    purchaseChannels: venture.purchaseChannels,
  })

  return (
    <article
      className={cn(
        "relative group flex flex-col rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden",
        "transition-all duration-300 hover:border-white/20 hover:bg-white/[0.07]",
        "hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5"
      )}
    >
      <Link
        href={href}
        className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={`Ver perfil de ${venture.name}`}
      />

      <div className="relative z-[1] pointer-events-none flex flex-col flex-1">
        <div className="relative aspect-[16/10] overflow-hidden">
          {photo ? (
            <Image
              src={photo}
              alt=""
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 400px"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-emerald-500/25 via-emerald-500/10 to-transparent" />
          )}
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[11px] font-medium border border-white/10">
              <span aria-hidden>{safetyDot}</span>
              {safetyLabel}
            </span>
          </div>
        </div>

        <div className="flex flex-col flex-1 p-4">
          <Badge variant="outline" className="w-fit mb-2 text-[11px] border-primary/30 text-primary">
            {getCategoryLabel(venture.category)}
          </Badge>
          <h3 className="font-bold text-lg line-clamp-2 group-hover:text-primary transition-colors">
            {venture.name}
          </h3>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" />
          <span className="line-clamp-1">{venture.zone}</span>
        </div>

        {(venture.stats?.totalReviews ?? 0) > 0 && (
          <div className="flex items-center gap-1.5 mt-2 text-sm">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
            <span className="font-semibold text-foreground">
              {venture.stats!.avgRating.toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground">
              ({venture.stats!.totalReviews})
            </span>
          </div>
        )}

          {venture.modalities?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {venture.modalities.map((m) => (
                <span
                  key={m}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground"
                >
                  {getModalityLabel(m)}
                </span>
              ))}
            </div>
          )}

          {(igUrl || waUrl) && <div className="h-10 mt-4" aria-hidden />}

          <div
            className={cn(
              "mt-4 w-full flex items-center justify-center gap-2 min-h-[44px] rounded-md",
              "border border-input bg-background/50 text-sm font-medium",
              "group-hover:border-primary/40 group-hover:bg-primary/5 transition-colors"
            )}
          >
            Ver perfil
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </div>

      {(igUrl || waUrl) && (
        <div className="absolute left-4 bottom-[4.25rem] z-[2] flex items-center gap-2 pointer-events-auto">
          {igUrl && (
            <a
              href={igUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-background/90 backdrop-blur border border-white/10 text-muted-foreground hover:text-primary transition-colors"
              aria-label={`Instagram de ${venture.name}`}
            >
              <Instagram className="h-4 w-4" />
            </a>
          )}
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-background/90 backdrop-blur border border-white/10 text-muted-foreground hover:text-primary transition-colors"
              aria-label={`WhatsApp de ${venture.name}`}
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          )}
        </div>
      )}
    </article>
  )
}
