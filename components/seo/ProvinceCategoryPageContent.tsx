import Link from "next/link"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import { ProvincialPlaceCard } from "@/components/seo/ProvincialPlaceCard"
import { ProvinceCategoryPageJsonLd } from "@/components/seo/ProvinceCategoryPageJsonLd"
import type { ProvinceCategoryPageData } from "@/lib/seo/province-pages"
import { getProvinceCategoryTitle, getProvinceCategoryDescription } from "@/lib/seo/templates"
import { getCategoryBySlug } from "@/lib/seo/cities"

interface ProvinceCategoryPageContentProps {
  data: ProvinceCategoryPageData
}

export function ProvinceCategoryPageContent({ data }: ProvinceCategoryPageContentProps) {
  const { province, categorySlug, places, total, localities } = data
  const cat = getCategoryBySlug(categorySlug)
  const catName = cat?.name ?? categorySlug

  return (
    <div className="container py-8">
      <ProvinceCategoryPageJsonLd province={province} categorySlug={categorySlug} places={places} />
      <Breadcrumbs
        items={[
          { label: "Sin gluten Argentina", href: "/sin-gluten-argentina" },
          { label: province.name, href: `/sin-gluten/provincia/${province.slug}` },
          { label: catName },
        ]}
      />
      <h1 className="text-2xl md:text-3xl font-bold mt-4 mb-4">
        {getProvinceCategoryTitle(province, categorySlug)}
      </h1>
      <p className="text-muted-foreground mb-8 max-w-2xl">
        {getProvinceCategoryDescription(province, categorySlug, total)}
      </p>

      {/* Localidades con resultados en esta categoría */}
      {localities.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Localidades con {catName.toLowerCase()}</h2>
          <div className="flex flex-wrap gap-2">
            {localities.map((loc) => (
              <span key={loc.slug} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 text-sm">
                {loc.name} ({loc.count})
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Listado */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          {catName} en {province.name}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {places.map((place) => (
            <ProvincialPlaceCard key={place._id} place={place} provinceSlug={province.slug} />
          ))}
        </div>
      </section>

      {/* Enlaces relacionados */}
      <section className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold mb-3">Ver también</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/sin-gluten/provincia/${province.slug}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors"
          >
            Todos los lugares sin TACC en {province.name}
          </Link>
        </div>
      </section>
    </div>
  )
}