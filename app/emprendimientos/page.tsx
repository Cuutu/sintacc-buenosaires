import { Suspense } from "react"
import type { Metadata } from "next"
import EmprendimientosPageContent from "./EmprendimientosPageContent"
import { VentureCardSkeleton } from "@/components/ventures/VentureCard"
import { getBaseUrl } from "@/lib/base-url"
import { getVentureIndexMetadata } from "@/lib/venture-seo"
import { getApprovedVentures } from "@/lib/ventures-server"

export const revalidate = 3600

type Props = {
  searchParams: Promise<{ category?: string; search?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams
  const base = getBaseUrl()
  const canonical = `${base}/emprendimientos`

  if (sp.search?.trim() || sp.category) {
    return {
      title: "Emprendimientos sin gluten",
      robots: { index: false, follow: true },
      alternates: { canonical },
    }
  }

  return getVentureIndexMetadata()
}

export default async function EmprendimientosPage() {
  let initialVentures: Awaited<ReturnType<typeof getApprovedVentures>> = []
  try {
    initialVentures = await getApprovedVentures({ limit: "all" })
  } catch {
    initialVentures = []
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F3EEE4] px-5 py-16 md:px-8">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <VentureCardSkeleton key={i} />
            ))}
          </div>
        </div>
      }
    >
      <EmprendimientosPageContent initialVentures={initialVentures} />
    </Suspense>
  )
}
