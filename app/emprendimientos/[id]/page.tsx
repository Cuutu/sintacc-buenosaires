"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { fetchApi } from "@/lib/fetchApi"
import { VentureProfileView, type VentureProfileData } from "@/components/ventures/VentureProfileView"

export default function VentureProfilePage() {
  const params = useParams()
  const id = params?.id as string
  const [venture, setVenture] = useState<VentureProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    fetchApi<{ venture: VentureProfileData }>(`/api/ventures/${id}`)
      .then((data) => setVenture(data.venture))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl space-y-4">
        <div className="h-8 w-32 rounded bg-white/5 animate-pulse" />
        <div className="aspect-[16/9] rounded-2xl bg-white/5 animate-pulse" />
        <div className="h-40 rounded-2xl bg-white/5 animate-pulse" />
      </div>
    )
  }

  if (error || !venture) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl text-center">
        <p className="text-muted-foreground mb-4">Emprendimiento no encontrado</p>
        <Button asChild variant="outline">
          <Link href="/emprendimientos">Volver al listado</Link>
        </Button>
      </div>
    )
  }

  return <VentureProfileView venture={venture} />
}
