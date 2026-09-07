"use client"

import Link from "next/link"
import Image from "next/image"
import { Instagram, MessageCircle } from "lucide-react"
import type { VentureReviewStats } from "@/lib/venture-review-stats"
import {
  getCategoryLabel,
  getModalityLabel,
  getSafetyBadge,
} from "@/lib/venture-constants"
import { parseVentureLinks } from "@/lib/venture-contact"
import { getVentureCoverPhoto } from "@/lib/venture-photo"
import { VentureCategoryIcon } from "@/components/ventures/venture-category-icon"
import { cn } from "@/lib/utils"

export type VentureCardData = {
  _id: string
  slug?: string
  name: string
  category: string
  zone: string
  modalities?: string[]
  safetyLevel?: string
  photos?: string[]
  contact?: { instagram?: string; whatsapp?: string }
  purchaseChannels?: string
  stats?: VentureReviewStats
}

interface VentureCardProps {
  venture: VentureCardData
  featured?: boolean
}

function safetyOverlay(level?: string): { label: string; className: string } | null {
  if (level === "gf_options") return null
  return {
    label: getSafetyBadge("fully_gf").label,
    className: "bg-[#1F4D35] text-[#F8F5EF]",
  }
}

function CategoryPill({ label, onPhoto }: { label: string; onPhoto?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold text-[#1F4D35]",
        onPhoto ? "bg-[#F8F5EF]/92 backdrop-blur-sm" : "bg-[#1F4D35]/8"
      )}
    >
      {label}
    </span>
  )
}

export function VentureCard({ venture, featured = false }: VentureCardProps) {
  const href = `/emprendimientos/${venture.slug ?? venture._id}`
  const photo = getVentureCoverPhoto(venture.photos)
  const safety = safetyOverlay(venture.safetyLevel)
  const category = getCategoryLabel(venture.category)
  const { instagram: igUrl, whatsapp: waUrl } = parseVentureLinks({
    contact: venture.contact,
    purchaseChannels: venture.purchaseChannels,
  })

  const chips = [...(venture.modalities ?? []).map((m) => getModalityLabel(m))]
  if (waUrl && !chips.includes("WhatsApp")) chips.push("WhatsApp")

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[24px] border border-[#E8E1D6] bg-[#FDFBF7]",
        "shadow-[0_8px_24px_-18px_rgba(31,77,53,0.35)] transition-transform duration-200",
        "hover:-translate-y-0.5",
        featured && "w-[min(82vw,320px)] shrink-0"
      )}
    >
      <Link
        href={href}
        className="absolute inset-0 z-0 rounded-[24px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D35] focus-visible:ring-offset-2"
        aria-label={`Ver perfil de ${venture.name}`}
      />

      <div className="relative z-[1] pointer-events-none flex h-full min-h-0 flex-1 flex-col">
        <div
          className={cn(
            "relative overflow-hidden",
            featured ? "h-[200px]" : "aspect-[4/3]"
          )}
        >
          {photo ? (
            <Image
              src={photo}
              alt=""
              fill
              className="object-cover"
              sizes={featured ? "320px" : "(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#1F4D35]/8">
              <VentureCategoryIcon
                category={venture.category}
                className="h-7 w-7 text-[#1F4D35]/55"
              />
              <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#5F6B63]">
                Sin foto
              </span>
            </div>
          )}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
            {safety ? (
              <span
                className={cn(
                  "inline-flex max-w-[75%] rounded-full px-2.5 py-1 text-[11px] font-semibold leading-tight",
                  safety.className
                )}
              >
                {safety.label}
              </span>
            ) : (
              <span />
            )}
            <CategoryPill label={category} onPhoto={Boolean(photo)} />
          </div>
        </div>

        <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
          <div className="min-w-0">
            <h3 className="min-h-[2.5rem] font-display text-lg font-bold leading-snug text-[#1F4D35] line-clamp-2">
              {venture.name}
            </h3>
            <p className="mt-1 truncate text-sm text-[#5F6B63]">{venture.zone}</p>
          </div>

          <div className="mt-3 flex min-h-[28px] flex-wrap content-start gap-1.5">
            {chips.slice(0, 4).map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-[#E8E1D6] bg-white/80 px-2.5 py-1 text-xs font-medium text-[#5F6B63]"
              >
                {chip}
              </span>
            ))}
          </div>

          <div className="mt-auto flex flex-col gap-3 pt-3">
            <div className="flex h-11 items-center gap-2">
              {igUrl ? (
                <a
                  href={igUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="pointer-events-auto relative z-[2] flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E8E1D6] text-[#1F4D35] hover:bg-[#1F4D35]/5"
                  aria-label={`Instagram de ${venture.name}`}
                >
                  <Instagram className="h-4 w-4" />
                </a>
              ) : null}
              {waUrl ? (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="pointer-events-auto relative z-[2] flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E8E1D6] text-[#1F4D35] hover:bg-[#1F4D35]/5"
                  aria-label={`WhatsApp de ${venture.name}`}
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              ) : null}
            </div>
            <span className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[#C85A2E] text-sm font-bold text-[#F8F5EF]">
              Ver perfil
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}

export function VentureCardSkeleton() {
  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-[24px] border border-[#E8E1D6] bg-[#FDFBF7]"
      aria-hidden
    >
      <div className="aspect-[4/3] animate-pulse bg-[#1F4D35]/10" />
      <div className="flex flex-1 flex-col gap-3 px-4 py-3">
        <div className="h-5 w-3/4 animate-pulse rounded-md bg-[#1F4D35]/10" />
        <div className="h-4 w-1/2 animate-pulse rounded-md bg-[#1F4D35]/8" />
        <div className="mt-auto h-11 animate-pulse rounded-2xl bg-[#C85A2E]/20" />
      </div>
    </div>
  )
}
