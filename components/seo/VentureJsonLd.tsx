import { getBaseUrl } from "@/lib/base-url"
import { getVentureSeoDescription } from "@/lib/venture-seo"
import { normalizeInstagramUrl } from "@/lib/venture-contact"
import type { VenturePublic } from "@/lib/ventures-server"

type VentureJsonLdProps = {
  venture: VenturePublic
}

/** Emprendimientos sin local público → Organization (no LocalBusiness). */
export function VentureJsonLd({ venture }: VentureJsonLdProps) {
  const base = getBaseUrl()
  const url = `${base}/emprendimientos/${venture.slug}`
  const description = getVentureSeoDescription(
    venture.name,
    venture.category,
    venture.zone,
    venture.description
  )
  const instagram = normalizeInstagramUrl(venture.contact?.instagram)
  const areaServed = venture.zone?.trim() || "Argentina"

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: venture.name,
    url,
    description,
    areaServed: {
      "@type": "Place",
      name: areaServed,
    },
  }

  if (instagram) {
    schema.sameAs = [instagram]
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
