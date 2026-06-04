"use client"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { MapPin, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { extractLocality } from "@/lib/geocode"

interface MapboxFeature {
  id: string
  place_name: string
  center: [number, number] // [lng, lat]
  geometry: { coordinates: [number, number] }
  context?: Array<{ id: string; text: string }>
  place_type?: string[]
}

interface MapboxResponse {
  features: MapboxFeature[]
}

interface GooglePrediction {
  placeId: string
  text: string
  mainText?: string
  secondaryText?: string
}

interface GooglePlace {
  placeId: string
  name?: string
  address: string
  lat: number
  lng: number
  neighborhood?: string
}

interface AddressSuggestion {
  id: string
  provider: "google" | "mapbox"
  label: string
  secondaryLabel?: string
  mapboxFeature?: MapboxFeature
  googlePlaceId?: string
}

export interface AddressResult {
  address: string
  lat: number
  lng: number
  neighborhood?: string
}

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect: (result: AddressResult) => void
  placeholder?: string
  className?: string
  required?: boolean
}

function createSessionToken(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Buscar dirección en Argentina...",
  className,
  required,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const googleSessionTokenRef = useRef(createSessionToken())

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (!value.trim() || value.length < 3) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const googleSuggestions = await fetchGoogleSuggestions(value.trim(), googleSessionTokenRef.current)
        if (googleSuggestions.length > 0) {
          setSuggestions(googleSuggestions)
          setShowDropdown(true)
          setSelectedIndex(-1)
          return
        }

        if (!token) {
          console.warn("NEXT_PUBLIC_MAPBOX_TOKEN no configurado")
          setSuggestions([])
          return
        }

        const encoded = encodeURIComponent(value.trim())
        const params = new URLSearchParams({
          access_token: token,
          country: "AR",
          limit: "5",
          proximity: "-58.3816,-34.6037", // Centro de Buenos Aires
          types: "address,place,locality,neighborhood",
          language: "es",
        })

        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?${params}`
        )
        const data: MapboxResponse = await res.json()

        setSuggestions((data.features || []).map(mapMapboxFeatureToSuggestion))
        setShowDropdown(true)
        setSelectedIndex(-1)
      } catch (err) {
        console.error("Error buscando direcciones:", err)
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [value, token])

  const handleSelect = async (suggestion: AddressSuggestion) => {
    if (suggestion.provider === "google" && suggestion.googlePlaceId) {
      setLoading(true)
      try {
        const place = await fetchGooglePlaceDetails(
          suggestion.googlePlaceId,
          googleSessionTokenRef.current
        )
        if (place) {
          onSelect({
            address: place.address,
            lat: place.lat,
            lng: place.lng,
            neighborhood: place.neighborhood,
          })
          onChange(place.address)
          googleSessionTokenRef.current = createSessionToken()
          setShowDropdown(false)
          setSuggestions([])
          return
        }
      } finally {
        setLoading(false)
      }
    }

    const feature = suggestion.mapboxFeature
    if (!feature) return

    const [lng, lat] = feature.center
    const neighborhood = extractLocality(feature.place_name, feature.context)

    onSelect({
      address: feature.place_name,
      lat,
      lng,
      neighborhood,
    })
    onChange(feature.place_name)
    setShowDropdown(false)
    setSuggestions([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1))
        break
      case "Enter":
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex])
        }
        break
      case "Escape":
        setShowDropdown(false)
        setSelectedIndex(-1)
        break
    }
  }

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="relative">
        {loading ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        )}
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          required={required}
          className={cn("pl-10", loading && "pl-10")}
          autoComplete="off"
        />
      </div>

      {showDropdown && suggestions.length > 0 && (
        <ul
          className="absolute z-50 w-full mt-1 py-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto"
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              role="option"
              aria-selected={index === selectedIndex}
              className={cn(
                "px-3 py-2 cursor-pointer text-sm hover:bg-accent",
                index === selectedIndex && "bg-accent"
              )}
              onClick={() => handleSelect(suggestion)}
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <span className="min-w-0">
                  <span className="line-clamp-1">{suggestion.label}</span>
                  {suggestion.secondaryLabel && (
                    <span className="line-clamp-1 text-xs text-muted-foreground">
                      {suggestion.secondaryLabel}
                    </span>
                  )}
                </span>
              </div>
            </li>
          ))}
          {suggestions.some((item) => item.provider === "google") && (
            <li className="px-3 py-1.5 text-[10px] text-muted-foreground border-t">
              Datos de Google Maps
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

async function fetchGoogleSuggestions(
  input: string,
  sessionToken: string
): Promise<AddressSuggestion[]> {
  const params = new URLSearchParams({ input, sessionToken })
  const res = await fetch(`/api/google-places/autocomplete?${params}`)
  if (!res.ok) return []
  const data: { predictions?: GooglePrediction[] } = await res.json()
  return (data.predictions ?? []).map((prediction) => ({
    id: `google:${prediction.placeId}`,
    provider: "google",
    label: prediction.mainText || prediction.text,
    secondaryLabel: prediction.secondaryText,
    googlePlaceId: prediction.placeId,
  }))
}

async function fetchGooglePlaceDetails(
  placeId: string,
  sessionToken: string
): Promise<GooglePlace | null> {
  const params = new URLSearchParams({ placeId, sessionToken })
  const res = await fetch(`/api/google-places/details?${params}`)
  if (!res.ok) return null
  const data: { place?: GooglePlace | null } = await res.json()
  return data.place ?? null
}

function mapMapboxFeatureToSuggestion(feature: MapboxFeature): AddressSuggestion {
  return {
    id: `mapbox:${feature.id}`,
    provider: "mapbox",
    label: feature.place_name,
    mapboxFeature: feature,
  }
}
