import { Suspense } from "react"
import type { Metadata } from "next"
import EmprendimientosPageContent from "./EmprendimientosPageContent"
import { VentureSeoNavLinks } from "@/components/ventures/VentureSeoNavLinks"
import { getBaseUrl } from "@/lib/base-url"
import { getVentureIndexMetadata } from "@/lib/venture-seo"

type Props = {
  searchParams: Promise<{ category?: string; search?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams
  const base = getBaseUrl()
  const canonical = `${base}/emprendimientos`

  if (sp.search?.trim() || sp.category) {
    return {
      title: "Emprendimientos sin gluten | Celimap",
      robots: { index: false, follow: true },
      alternates: { canonical },
    }
  }

  return getVentureIndexMetadata()
}

export default function EmprendimientosPage() {
  return (
    <>
      <Suspense
        fallback={
          <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">
            Cargando...
          </div>
        }
      >
        <EmprendimientosPageContent />
      </Suspense>
      <div className="container mx-auto px-4 pb-12 max-w-5xl">
        <VentureSeoNavLinks />
      </div>
    </>
  )
}
