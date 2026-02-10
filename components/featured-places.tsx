"use client"

import { useEffect, useState } from "react"
import { PlaceCard } from "@/components/place-card"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MapPin } from "lucide-react"
import { IPlace } from "@/models/Place"

export function FeaturedPlaces() {
  const [places, setPlaces] = useState<(IPlace & { stats?: any })[]>([])

  useEffect(() => {
    fetch("/api/places?limit=6")
      .then((res) => res.json())
      .then((data) => setPlaces(data.places || []))
      .catch(() => {})
  }, [])

  if (places.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl md:text-3xl font-bold">Lugares destacados</h2>
        <Button asChild variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/10">
          <Link href="/mapa" className="flex items-center gap-2">
            Ver en mapa
            <MapPin className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {places.slice(0, 6).map((place) => (
          <PlaceCard key={place._id.toString()} place={place} />
        ))}
      </div>
      <div className="text-center mt-8">
        <Button asChild variant="secondary" className="bg-card/50 hover:bg-card">
          <Link href="/mapa">Ver todos en el mapa</Link>
        </Button>
      </div>
    </div>
  )
}
