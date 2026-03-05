import Link from "next/link"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import { ProvincialMapEmbed } from "@/components/seo/ProvincialMapEmbed"
import { ProvincialPlaceCard } from "@/components/seo/ProvincialPlaceCard"
import { ProvincialPageJsonLd } from "@/components/seo/ProvincialPageJsonLd"
import { getProvinceBySlug } from "@/lib/seo/provinces"
import { getPlacesByProvince } from "@/lib/seo/places"
import { ScrollReveal } from "@/components/scroll-reveal"

interface ProvincialPageProps {
  provinceSlug: string
}

export async function ProvincialPage({ provinceSlug }: ProvincialPageProps) {
  const province = getProvinceBySlug(provinceSlug)
  if (!province) return null

  const { all, dondeComer, dondeComprar, productores, total } = await getPlacesByProvince(
    provinceSlug
  )

  if (total === 0) {
    return (
      <div className="container py-12">
        <Breadcrumbs
          items={[
            { label: "Sin gluten Argentina", href: "/sin-gluten-argentina" },
            { label: province.name },
          ]}
        />
        <h1 className="text-2xl md:text-3xl font-bold mt-4 mb-6">{province.h1}</h1>
        <p className="text-muted-foreground mb-6">{province.introParagraph}</p>
        <p className="text-muted-foreground">
          Aún no hay establecimientos verificados en el mapa para {province.name}.{" "}
          <Link href="/sugerir" className="text-primary hover:underline">
            Sugerí un lugar
          </Link>{" "}
          para sumarlo.
        </p>
      </div>
    )
  }

  const SectionCard = ({
    title,
    places,
  }: {
    title: string
    places: typeof all
  }) =>
    places.length > 0 ? (
      <ScrollReveal>
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">{title}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {places.map((place) => (
              <ProvincialPlaceCard
                key={place._id}
                place={place}
                provinceSlug={provinceSlug}
              />
            ))}
          </div>
        </section>
      </ScrollReveal>
    ) : null

  return (
    <div className="container py-8">
      <ProvincialPageJsonLd
        provinceName={province.name}
        provinceSlug={provinceSlug}
        places={all}
      />
      <Breadcrumbs
        items={[
          { label: "Sin gluten Argentina", href: "/sin-gluten-argentina" },
          { label: province.name },
        ]}
      />
      <h1 className="text-2xl md:text-4xl font-bold mt-4 mb-6">{province.h1}</h1>
      <p className="text-muted-foreground mb-8 max-w-2xl">{province.introParagraph}</p>

      <ScrollReveal>
        <div className="mb-12">
          <ProvincialMapEmbed
            provinceSlug={provinceSlug}
            provinceName={province.name}
          />
        </div>
      </ScrollReveal>

      <SectionCard title="Dónde comer" places={dondeComer} />
      <SectionCard title="Dónde comprar" places={dondeComprar} />
      <SectionCard title="Productores y fábricas" places={productores} />

      <ScrollReveal>
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-muted-foreground max-w-2xl">{province.closingParagraph}</p>
          <Link
            href="/sugerir"
            className="inline-block mt-4 text-primary font-medium hover:underline"
          >
            Sugerir un lugar sin TACC →
          </Link>
        </div>
      </ScrollReveal>
    </div>
  )
}
