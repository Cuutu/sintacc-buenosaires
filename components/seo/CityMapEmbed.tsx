import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { getCityCenter, getCityBySlug } from "@/lib/seo/cities"
import { LandingMapLazy } from "@/components/seo/LandingMapLazy"

interface CityMapEmbedProps {
  citySlug: string
  cityName: string
}

/**
 * Componente de servidor: arma el centro, los filtros y el link al mapa completo
 * acá, así el cliente no recibe el listado de ciudades ni Mapbox hasta que se pide.
 */
export function CityMapEmbed({ citySlug, cityName }: CityMapEmbedProps) {
  const centerConfig = getCityCenter(citySlug)
  const city = getCityBySlug(citySlug)
  const apiQuery = city
    ? `provinceSlugs=${encodeURIComponent(city.provinceSlug)}&localitySlugs=${encodeURIComponent(citySlug)}`
    : `citySlugs=${encodeURIComponent(citySlug)}`

  return (
    <section className="border rounded-xl overflow-hidden bg-card/50">
      <LandingMapLazy
        label={`Ver el mapa de ${cityName}`}
        apiQuery={apiQuery}
        initialCenter={centerConfig?.center}
        initialZoom={centerConfig?.zoom}
      />
      <div className="p-3 border-t bg-muted/30 flex justify-center">
        <Link
          href={
            centerConfig
              ? `/mapa?provinceSlugs=${city?.provinceSlug ?? ""}&localitySlugs=${citySlug}&lng=${centerConfig.center[0]}&lat=${centerConfig.center[1]}&zoom=${centerConfig.zoom}`
              : `/mapa?localitySlugs=${citySlug}`
          }
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          Ver mapa completo de {cityName}
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}
