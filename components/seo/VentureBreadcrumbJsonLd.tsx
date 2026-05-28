import { getBaseUrl } from "@/lib/base-url"

type VentureBreadcrumbJsonLdProps = {
  ventureName: string
  ventureSlug: string
}

export function VentureBreadcrumbJsonLd({
  ventureName,
  ventureSlug,
}: VentureBreadcrumbJsonLdProps) {
  const base = getBaseUrl()
  const items = [
    { name: "Inicio", item: base },
    { name: "Emprendimientos", item: `${base}/emprendimientos` },
    { name: ventureName, item: `${base}/emprendimientos/${ventureSlug}` },
  ]

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((entry, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: entry.name,
      item: entry.item,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
