import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { getProvinceBySlug } from "@/lib/seo/provinces"
import { LandingMapLazy } from "@/components/seo/LandingMapLazy"

interface ProvincialMapEmbedProps {
  provinceSlug: string
  provinceName: string
}

/** Componente de servidor; el mapa interactivo se baja al tocarlo (LandingMapLazy). */
export function ProvincialMapEmbed({ provinceSlug, provinceName }: ProvincialMapEmbedProps) {
  const province = getProvinceBySlug(provinceSlug)

  return (
    <section className="border rounded-xl overflow-hidden bg-card/50">
      <LandingMapLazy
        label={`Ver el mapa de ${provinceName}`}
        apiQuery={`provinceSlugs=${encodeURIComponent(provinceSlug)}`}
        initialCenter={province?.center}
        initialZoom={province?.zoom}
      />
      <div className="p-3 border-t bg-muted/30 flex justify-center">
        <Link
          href={
            province
              ? `/mapa?provinceSlugs=${provinceSlug}&lng=${province.center?.[0] ?? -64.1888}&lat=${province.center?.[1] ?? -31.4201}&zoom=${province.zoom ?? 7}`
              : `/mapa?provinceSlugs=${provinceSlug}`
          }
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          Ver mapa completo de {provinceName}
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}
