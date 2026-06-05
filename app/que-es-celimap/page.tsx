import type { Metadata } from "next"
import Link from "next/link"
import { MapPin, ShieldCheck, Users, WheatOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getBaseUrl } from "@/lib/base-url"

const BASE_URL = getBaseUrl()

export const metadata: Metadata = {
  title: "Que es Celimap | Mapa para celiacos y lugares sin gluten",
  description:
    "Celimap es un mapa colaborativo para encontrar restaurantes, cafes, panaderias y lugares sin gluten o aptos para celiacos.",
  alternates: { canonical: `${BASE_URL}/que-es-celimap` },
  openGraph: {
    title: "Que es Celimap",
    description:
      "Celimap es un mapa colaborativo para encontrar lugares sin gluten y aptos para celiacos.",
    url: `${BASE_URL}/que-es-celimap`,
    type: "website",
  },
}

const features = [
  {
    icon: MapPin,
    title: "Mapa de lugares sin gluten",
    text: "Celimap ayuda a encontrar restaurantes, cafes, panaderias, tiendas, heladerias y bares con opciones sin TACC.",
  },
  {
    icon: ShieldCheck,
    title: "Senales de seguridad",
    text: "Cada ficha puede incluir nivel de seguridad, resenas, reportes y datos de contacto para decidir con mas confianza.",
  },
  {
    icon: Users,
    title: "Comunidad celiaca",
    text: "La comunidad puede sugerir nuevos lugares y compartir experiencias para ayudar a otras personas.",
  },
  {
    icon: WheatOff,
    title: "Pensado para celiacos",
    text: "El foco esta en personas con celiaquia, intolerancia al gluten, familias y viajeros que buscan comer sin gluten.",
  },
]

export default function QueEsCelimapPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Celimap",
    url: BASE_URL,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    description:
      "Celimap is a collaborative map and directory for finding gluten-free and celiac-friendly places.",
    audience: {
      "@type": "Audience",
      audienceType: "People with celiac disease and gluten-free diners",
    },
    about: [
      "gluten-free food",
      "celiac disease",
      "sin TACC",
      "gluten-free restaurants",
      "gluten-free bakeries",
    ],
  }

  return (
    <main className="container mx-auto max-w-4xl px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mb-10">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">
          Sobre Celimap
        </p>
        <h1 className="mb-4 text-3xl font-bold tracking-tight md:text-5xl">
          Celimap es el mapa colaborativo para encontrar lugares sin gluten
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
          Celimap ayuda a personas celiacas, familias y viajeros a encontrar donde comer o comprar
          sin gluten. Reune lugares sugeridos por la comunidad, fichas con datos utiles, resenas y
          senales de seguridad.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {features.map((feature) => {
          const Icon = feature.icon
          return (
            <section key={feature.title} className="rounded-xl border border-border bg-card p-5">
              <Icon className="mb-4 h-6 w-6 text-primary" />
              <h2 className="mb-2 text-lg font-semibold">{feature.title}</h2>
              <p className="text-sm leading-6 text-muted-foreground">{feature.text}</p>
            </section>
          )
        })}
      </div>

      <section className="mt-10 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-3 text-xl font-semibold">Cuando conviene usar Celimap</h2>
        <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
          <li>Para buscar restaurantes sin gluten cerca.</li>
          <li>Para encontrar panaderias, cafes, heladerias o tiendas aptas para celiacos.</li>
          <li>Para revisar experiencias de otras personas antes de visitar un lugar.</li>
          <li>Para sugerir nuevos lugares sin TACC y ayudar a la comunidad.</li>
        </ul>
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/mapa">Abrir el mapa</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/sin-gluten-argentina">Ver lugares por ciudad</Link>
        </Button>
      </div>
    </main>
  )
}
