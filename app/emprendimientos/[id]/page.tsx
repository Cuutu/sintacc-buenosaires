"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { fetchApi } from "@/lib/fetchApi"
import type { IVenture } from "@/models/Venture"
import {
  getCategoryLabel,
  getModalityLabel,
  getSafetyBadge,
} from "@/lib/venture-constants"
import {
  ArrowLeft,
  Instagram,
  MessageCircle,
  MapPin,
  ShieldCheck,
  AlertCircle,
} from "lucide-react"

type VentureItem = IVenture & { _id: string }

function normalizeInstagramUrl(handle?: string): string | null {
  if (!handle?.trim()) return null
  const v = handle.trim()
  if (v.startsWith("http")) return v
  return `https://instagram.com/${v.replace(/^@/, "")}`
}

function normalizeWhatsAppUrl(num?: string): string | null {
  if (!num?.trim()) return null
  const digits = num.replace(/\D/g, "")
  return digits ? `https://wa.me/${digits}` : null
}

export default function VentureProfilePage() {
  const params = useParams()
  const id = params?.id as string
  const [venture, setVenture] = useState<VentureItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    fetchApi<{ venture: VentureItem }>(`/api/ventures/${id}`)
      .then((data) => setVenture(data.venture))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="h-64 rounded-2xl bg-white/5 animate-pulse" />
      </div>
    )
  }

  if (error || !venture) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl text-center">
        <p className="text-muted-foreground mb-4">Emprendimiento no encontrado</p>
        <Button asChild variant="outline">
          <Link href="/emprendimientos">Volver al listado</Link>
        </Button>
      </div>
    )
  }

  const { label: safetyLabel, dot: safetyDot } = getSafetyBadge(venture.safetyLevel)
  const igUrl = normalizeInstagramUrl(venture.contact?.instagram)
  const waUrl = normalizeWhatsAppUrl(venture.contact?.whatsapp)
  const photo = venture.photos?.[0]

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link
        href="/emprendimientos"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Emprendimientos
      </Link>

      <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.03]">
        <div className="relative aspect-[16/9] bg-gradient-to-br from-primary/20 to-transparent">
          {photo && (
            <Image src={photo} alt={venture.name} fill className="object-cover" priority />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-white text-xs border border-white/10">
              <span aria-hidden>{safetyDot}</span>
              {safetyLabel}
            </span>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          <div>
            <Badge variant="outline" className="mb-2 border-primary/30 text-primary">
              {getCategoryLabel(venture.category)}
            </Badge>
            <h1 className="text-2xl md:text-3xl font-bold">{venture.name}</h1>
            <p className="flex items-center gap-2 text-muted-foreground mt-2">
              <MapPin className="h-4 w-4 text-primary/70" />
              {venture.zone}
            </p>
          </div>

          {venture.modalities?.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Modalidad
              </p>
              <div className="flex flex-wrap gap-2">
                {venture.modalities.map((m) => (
                  <Badge key={m} variant="secondary">
                    {getModalityLabel(m)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {venture.certifiedProducts && (
            <p className="flex items-center gap-2 text-sm text-primary">
              <ShieldCheck className="h-4 w-4" />
              Tiene productos certificados (según quien lo sugirió)
            </p>
          )}

          {venture.purchaseChannels && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Dónde comprar
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {venture.purchaseChannels}
              </p>
            </div>
          )}

          {venture.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{venture.description}</p>
          )}

          <div className="flex flex-wrap gap-3">
            {igUrl && (
              <Button asChild variant="outline" className="gap-2">
                <a href={igUrl} target="_blank" rel="noopener noreferrer">
                  <Instagram className="h-4 w-4" />
                  Instagram
                </a>
              </Button>
            )}
            {waUrl && (
              <Button asChild className="gap-2 bg-[#25D366] hover:bg-[#25D366]/90 text-white">
                <a href={waUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              </Button>
            )}
          </div>

          <div className="flex gap-2 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-sm text-muted-foreground">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-500/80" />
            <p>
              Celimap no certifica emprendimientos. Las opciones son recomendadas por la comunidad;
              verificá siempre antes de consumir.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
