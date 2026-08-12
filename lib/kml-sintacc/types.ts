import type { IPlace } from "@/models/Place"

export type PlaceType = IPlace["type"]
export type SafetyLevel = NonNullable<IPlace["safetyLevel"]>

/** Draft parseado desde KML Sintaccto (sin escribir DB). */
export type KmlPlaceDraft = {
  name: string
  folder: string
  type: PlaceType
  location: { lat: number; lng: number }
  /** Placeholder hasta reverse-geocode; se pisa con Mapbox/Google */
  address: string
  addressText?: string
  neighborhood: string
  province?: string
  locality?: string
  tags: string[]
  safetyLevel?: SafetyLevel
  openingHours?: string
  contact?: {
    instagram?: string
  }
  delivery?: {
    available: boolean
  }
  source: "kml"
  raw: {
    comercioTipo?: string
    modalidad?: string
    materiaPrima?: string
    cocina?: string
    descriptionHtml: string
  }
}

export type KmlParseResult = {
  sourceName: string
  folders: string[]
  places: KmlPlaceDraft[]
  warnings: string[]
}
