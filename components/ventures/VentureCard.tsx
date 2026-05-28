"use client"

import Link from "next/link"
import Image from "next/image"
import { MapPin, Instagram, MessageCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { IVenture } from "@/models/Venture"
import {
  getCategoryLabel,
  getModalityLabel,
  getSafetyBadge,
} from "@/lib/venture-constants"
import { parseVentureLinks } from "@/lib/venture-contact"
import { cn } from "@/lib/utils"

type VentureWithId = IVenture & { _id: string }

interface VentureCardProps {
  venture: VentureWithId
}

export function VentureCard({ venture }: VentureCardProps) {
  const photo = venture.photos?.[0]
  const { label: safetyLabel, dot: safetyDot } = getSafetyBadge(venture.safetyLevel)
  const { instagram: igUrl, whatsapp: waUrl } = parseVentureLinks({
    contact: venture.contact,
    purchaseChannels: venture.purchaseChannels,
  })

  return (
    <article
      className={cn(
        "group flex flex-col rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden",
        "transition-all duration-300 hover:border-white/20 hover:bg-white/[0.07] hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5"
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        {photo ? (
          <Image
            src={photo}
            alt={venture.name}
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

        <div className="flex items-center gap-3 mt-4">
          {igUrl && (
            <a
              href={igUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="Instagram"
              onClick={(e) => e.stopPropagation()}
            >
              <Instagram className="h-5 w-5" />
            </a>
          )}
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="WhatsApp"
              onClick={(e) => e.stopPropagation()}
            >
              <MessageCircle className="h-5 w-5" />
            </a>
          )}
        </div>

        <Button asChild className="mt-4 w-full gap-2" variant="outline">
          <Link href={`/emprendimientos/${venture._id}`}>
            Ver perfil
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </article>
  )
}
