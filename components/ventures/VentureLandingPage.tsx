import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import { VentureCard } from "@/components/ventures/VentureCard"
import { VentureExploreSections } from "@/components/ventures/VentureExploreSections"
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
    <div className="min-h-screen bg-[#F3EEE4]">
      <div className="container mx-auto max-w-6xl px-5 py-8 md:px-8">
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
            <Link href="/sugerir-emprendimiento">Publicar emprendimiento</Link>
          </Button>
        </header>

        {ventures.length > 0 ? (
          <div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {ventures.map((v) => (
              <VentureCard key={v._id} venture={v} />
            ))}
          </div>
        ) : (
          <p className="mb-12 py-12 text-center text-[#5F6B63]">
            Todavía no hay emprendimientos publicados en esta sección.{" "}
            <Link href="/sugerir-emprendimiento" className="text-[#C85A2E] hover:underline">
              Publicá la tuya
            </Link>
            .
          </p>
        )}

        <VentureExploreSections />
      </div>
    </div>
  )
}
