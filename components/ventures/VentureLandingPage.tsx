import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import { VentureCard } from "@/components/ventures/VentureCard"
import { VentureSeoNavLinks } from "@/components/ventures/VentureSeoNavLinks"
import type { VenturePublic } from "@/lib/ventures-server"
import { ArrowLeft } from "lucide-react"

type VentureLandingPageProps = {
  h1: string
  intro: string
  ventures: VenturePublic[]
  breadcrumbLabel: string
}

export function VentureLandingPage({
  h1,
  intro,
  ventures,
  breadcrumbLabel,
}: VentureLandingPageProps) {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Link
          href="/emprendimientos"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Todos los emprendimientos
        </Link>

        <Breadcrumbs
          items={[
            { label: "Emprendimientos", href: "/emprendimientos" },
            { label: breadcrumbLabel },
          ]}
        />

        <header className="mt-6 mb-10 space-y-4">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{h1}</h1>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-3xl">
            {intro}
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/sugerir-emprendimiento">Sugerir emprendimiento</Link>
          </Button>
        </header>

        {ventures.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {ventures.map((v) => (
              <VentureCard key={v._id} venture={v} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-12 mb-12">
            Todavía no hay emprendimientos publicados en esta sección.{" "}
            <Link href="/sugerir-emprendimiento" className="text-primary hover:underline">
              Sugerí uno
            </Link>
            .
          </p>
        )}

        <VentureSeoNavLinks />
      </div>
    </div>
  )
}
