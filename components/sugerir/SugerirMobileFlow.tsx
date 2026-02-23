"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPickerModal, type MapPickerResult } from "@/components/map-picker-modal"
import { geocodeAddress } from "@/lib/geocode"
import { toast } from "sonner"
import { TYPES, PLACE_TAGS } from "@/lib/constants"
import { MapPin, ArrowLeft } from "lucide-react"

interface SugerirMobileFlowProps {
  onRequireLogin: () => void
}

export function SugerirMobileFlow({ onRequireLogin }: SugerirMobileFlowProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [mapPickerOpen, setMapPickerOpen] = useState(true)
  const [locationData, setLocationData] = useState<MapPickerResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    types: [] as string[],
    tags: [] as string[],
    openingHours: "",
    delivery: { available: false, rappi: "", pedidosya: "", other: "" },
    contact: { instagram: "", whatsapp: "", phone: "", url: "" },
  })

  const toggleTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }))
  }

  const toggleType = (typeValue: string) => {
    setFormData((prev) => ({
      ...prev,
      types: prev.types.includes(typeValue) ? prev.types.filter((t) => t !== typeValue) : [...prev.types, typeValue],
    }))
  }

  if (!session) {
    onRequireLogin()
    return null
  }

  const handleLocationSelect = (result: MapPickerResult) => {
    setLocationData(result)
    setMapPickerOpen(false)
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!locationData) return
    setLoading(true)
    setError("")
    if (formData.types.length === 0) {
      setError("Seleccioná al menos un tipo de lugar")
      setLoading(false)
      return
    }
    const payload = {
      ...formData,
      address: locationData.address,
      lat: locationData.lat.toString(),
      lng: locationData.lng.toString(),
      neighborhood: locationData.neighborhood,
      addressText: locationData.addressText || locationData.address,
      locationPrecision: locationData.locationPrecision || "exact",
      userProvidedNeighborhood: locationData.userProvidedNeighborhood || undefined,
      userProvidedReference: locationData.userProvidedReference || undefined,
      types: formData.types,
      openingHours: formData.openingHours || undefined,
      delivery: formData.delivery?.available
        ? {
            available: true,
            rappi: formData.delivery.rappi?.trim() || undefined,
            pedidosya: formData.delivery.pedidosya?.trim() || undefined,
            other: formData.delivery.other?.trim() || undefined,
          }
        : undefined,
      location: { lat: locationData.lat, lng: locationData.lng },
    }
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al crear sugerencia")
      toast.success("¡Sugerencia enviada! Será revisada por el equipo.")
      router.push("/mapa?success=suggestion")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al enviar")
    } finally {
      setLoading(false)
    }
  }

  if (step === 1) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-8">
        <div className="text-center max-w-sm space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 text-primary">
            <MapPin className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Paso 1: Ubicación</h2>
            <p className="text-muted-foreground text-sm">
              Marcá en el mapa dónde está el lugar que querés sugerir
            </p>
          </div>
          <Button size="lg" className="w-full gap-2" onClick={() => setMapPickerOpen(true)}>
            <MapPin className="h-5 w-5" />
            Elegir ubicación en el mapa
          </Button>
        </div>
        <MapPickerModal
          open={mapPickerOpen}
          onOpenChange={(open) => {
            setMapPickerOpen(open)
            if (!open && !locationData) router.back()
          }}
          onSelect={handleLocationSelect}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <Button variant="ghost" size="sm" className="mb-4 -ml-2 gap-2" onClick={() => setStep(1)}>
        <ArrowLeft className="h-4 w-4" />
        Cambiar ubicación
      </Button>
      {locationData && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardContent className="py-3 flex items-center gap-3">
            <MapPin className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="font-medium truncate">{locationData.address}</p>
              <p className="text-xs text-muted-foreground">{locationData.neighborhood}</p>
            </div>
          </CardContent>
        </Card>
      )}
      <h2 className="text-lg font-semibold mb-4">Paso 2: Detalles del lugar</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Nombre del lugar *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div>
          <Label>Tipo *</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {TYPES.map((type) => (
              <Button
                key={type.value}
                type="button"
                variant={formData.types.includes(type.value) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleType(type.value)}
              >
                {type.emoji} {type.label}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <Label>Horario (opcional)</Label>
          <Input
            value={formData.openingHours}
            onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
            placeholder="Ej: Lun-Vie 9-18, Sáb 10-14"
          />
        </div>
        <div>
          <Label>Características (opcional)</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {PLACE_TAGS.map((tag) => (
              <Button
                key={tag.value}
                type="button"
                variant={formData.tags.includes(tag.value) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleTag(tag.value)}
              >
                {tag.label}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <Label>Instagram</Label>
          <Input
            value={formData.contact.instagram}
            onChange={(e) =>
              setFormData({
                ...formData,
                contact: { ...formData.contact, instagram: e.target.value },
              })
            }
            placeholder="@usuario"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Teléfono</Label>
            <Input
              value={formData.contact.phone}
              onChange={(e) =>
                setFormData({ ...formData, contact: { ...formData.contact, phone: e.target.value } })
              }
            />
          </div>
          <div>
            <Label>WhatsApp</Label>
            <Input
              value={formData.contact.whatsapp}
              onChange={(e) =>
                setFormData({ ...formData, contact: { ...formData.contact, whatsapp: e.target.value } })
              }
              placeholder="+54 11 1234-5678"
            />
          </div>
        </div>
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</div>
        )}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Enviando..." : "Enviar sugerencia"}
        </Button>
      </form>
    </div>
  )
}
