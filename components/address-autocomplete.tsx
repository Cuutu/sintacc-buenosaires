"use client"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { MapPin, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

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

import { extractLocality } from "@/lib/geocode"

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Buscar dirección en Argentina...",
  className,
  required,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

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
      if (!token) {
        console.warn("NEXT_PUBLIC_MAPBOX_TOKEN no configurado")
        return
      }

      setLoading(true)
      try {
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

        setSuggestions(data.features || [])
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

  const handleSelect = (feature: MapboxFeature) => {
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
          {suggestions.map((feature, index) => (
            <li
              key={feature.id}
              role="option"
              aria-selected={index === selectedIndex}
              className={cn(
                "px-3 py-2 cursor-pointer text-sm hover:bg-accent",
                index === selectedIndex && "bg-accent"
              )}
              onClick={() => handleSelect(feature)}
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <span className="line-clamp-2">{feature.place_name}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
