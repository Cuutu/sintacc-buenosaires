"use client"

import { useEffect, useState } from "react"
import { PlaceCard } from "@/components/place-card"
import Link from "next/link"
import { Button } from "@/components/ui/button"
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
    <div className="mb-16">
      <h2 className="text-2xl font-bold mb-6">Lugares destacados</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {places.slice(0, 6).map((place) => (
          <PlaceCard key={place._id.toString()} place={place} />
        ))}
      </div>
      <div className="text-center mt-6">
        <Button asChild variant="outline">
          <Link href="/mapa">Ver todos en el mapa</Link>
        </Button>
      </div>
    </div>
  )
}
