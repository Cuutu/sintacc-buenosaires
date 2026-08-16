import { Suspense } from "react"
import type { Metadata } from "next"
import EmprendimientosPageContent from "./EmprendimientosPageContent"
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
      title: "Emprendimientos sin gluten",
      robots: { index: false, follow: true },
      alternates: { canonical },
    }
  }

  return getVentureIndexMetadata()
}

export default function EmprendimientosPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-[#F3EEE4] px-5 py-16 text-center text-[#5F6B63]">Cargando emprendimientos…</div>
      }
    >
      <EmprendimientosPageContent />
    </Suspense>
  )
}
