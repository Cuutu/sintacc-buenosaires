"use client"

import * as React from "react"
import { MapboxMap } from "./MapboxMap"
import { MapTopBar, type MapFilters } from "./MapTopBar"
import { PlacesList } from "./PlacesList"
import { usePrefersReducedMotion } from "./usePrefersReducedMotion"
import type { IPlace } from "@/models/Place"

interface MapDesktopProps {
  places: IPlace[]
  loading: boolean
  filters: MapFilters
  onFiltersChange: (f: MapFilters) => void
  onSearchChange: (search: string) => void
  selectedPlaceId: string | null
  onPlaceSelect: (place: IPlace) => void
}

export function MapDesktop({
  places,
  loading,
  filters,
  onFiltersChange,
  onSearchChange,
  selectedPlaceId,
  onPlaceSelect,
}: MapDesktopProps) {
  const reduceMotion = usePrefersReducedMotion()

  return (
    <div className="grid grid-cols-12 h-full w-full">
      <div className="col-span-7 relative">
        <div className="absolute top-4 left-4 right-4 z-10">
          <MapTopBar
            filters={filters}
            onFiltersChange={onFiltersChange}
            onSearchChange={onSearchChange}
          />
        </div>
        <div className="absolute inset-0 pt-24">
          <MapboxMap
            places={places}
            selectedPlaceId={selectedPlaceId ?? undefined}
            onPlaceSelect={onPlaceSelect}
            darkStyle={false}
            reduceMotion={reduceMotion}
          />
        </div>
      </div>
      <div className="col-span-5 border-l border-white/10 bg-black/40 backdrop-blur-xl overflow-y-auto">
        <div className="p-5">
          <h2 className="text-lg font-semibold mb-4">
            Resultados
            <span className="text-muted-foreground font-normal ml-2">
              {places.length} lugar{places.length !== 1 ? "es" : ""}
            </span>
          </h2>
          <PlacesList
            places={places}
            selectedPlaceId={selectedPlaceId}
            loading={loading}
          />
        </div>
      </div>
    </div>
  )
}
