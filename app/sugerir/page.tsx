"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AddressAutocomplete } from "@/components/address-autocomplete"
import { MapPickerModal } from "@/components/map-picker-modal"
import { geocodeAddress } from "@/lib/geocode"
import { toast } from "sonner"
import { TYPES, PLACE_TAGS } from "@/lib/constants"
import { ChevronDown, ChevronUp, Link2, MapPin } from "lucide-react"

export default function SugerirPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [quickMode, setQuickMode] = useState(false)
  const [mapPickerOpen, setMapPickerOpen] = useState(false)
  const [quickData, setQuickData] = useState({
    sourceLink: "",
    safetyLevel: "" as "" | "dedicated_gf" | "gf_options",
    name: "",
  })
  const [formData, setFormData] = useState({
    name: "",
    types: [] as string[],
    address: "",
    neighborhood: "",
    lat: "",
    lng: "",
    tags: [] as string[],
    openingHours: "",
    delivery: {
      available: false,
      rappi: "",
      pedidosya: "",
      other: "",
    },
    contact: {
      instagram: "",
      whatsapp: "",
      phone: "",
      url: "",
    },
  })

  const toggleTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }))
  }

  const toggleType = (typeValue: string) => {
    setFormData((prev) => ({
      ...prev,
      types: prev.types.includes(typeValue)
        ? prev.types.filter((t) => t !== typeValue)
        : [...prev.types, typeValue],
    }))
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="mb-4">Debes iniciar sesión para sugerir un lugar</p>
            <Button onClick={() => router.push("/login")}>Iniciar sesión</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceLink: quickData.sourceLink.trim(),
          safetyLevel: quickData.safetyLevel,
          name: quickData.name.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al crear sugerencia")
      toast.success("¡Sugerencia enviada! La completaremos nosotros.")
      router.push("/mapa?success=suggestion")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al enviar")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    let dataToSubmit = formData

    // Si tiene dirección pero no coordenadas (ej. pegó o escribió sin seleccionar), geocodificar
    if ((!formData.lat || !formData.lng) && formData.address.trim()) {
      const geo = await geocodeAddress(formData.address)
      if (geo) {
        dataToSubmit = {
          ...formData,
          address: geo.address,
          lat: geo.lat.toString(),
          lng: geo.lng.toString(),
          neighborhood: geo.neighborhood || "Otro",
        }
      } else {
        setError("No se pudo encontrar la dirección. Probá seleccionando una sugerencia de la lista.")
        setLoading(false)
        return
      }
    } else if (!formData.lat || !formData.lng) {
      setError("Agregá una dirección y seleccionala de la lista o escribíla completa.")
      setLoading(false)
      return
    }

    if (formData.types.length === 0) {
      setError("Seleccioná al menos un tipo de lugar")
      setLoading(false)
      return
    }

    const payload = {
      ...dataToSubmit,
      types: dataToSubmit.types,
      openingHours: dataToSubmit.openingHours || undefined,
      delivery: dataToSubmit.delivery?.available
        ? {
            available: true,
            rappi: dataToSubmit.delivery.rappi?.trim() || undefined,
            pedidosya: dataToSubmit.delivery.pedidosya?.trim() || undefined,
            other: dataToSubmit.delivery.other?.trim() || undefined,
          }
        : undefined,
      location: {
        lat: parseFloat(dataToSubmit.lat),
        lng: parseFloat(dataToSubmit.lng),
      },
    }

    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Error al crear sugerencia")
      }

      toast.success("¡Sugerencia enviada! Será revisada por el equipo.")
      router.push("/mapa?success=suggestion")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Sugerir un lugar</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Modo rápido: solo link + safety */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setQuickMode(!quickMode)}
              className="flex items-center gap-2 w-full text-left text-sm text-primary hover:underline"
            >
              <Link2 className="h-4 w-4" />
              ¿Solo tenés el link de Instagram o Google Maps?
              {quickMode ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
            </button>
            {quickMode && (
              <form onSubmit={handleQuickSubmit} className="mt-4 p-4 rounded-lg border border-border bg-muted/30 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Pegá el link y contanos si es 100% apto o tiene opciones. Nosotros completamos el resto.
                </p>
                <div>
                  <Label>Link (Instagram o Google Maps) *</Label>
                  <Input
                    value={quickData.sourceLink}
                    onChange={(e) => setQuickData({ ...quickData, sourceLink: e.target.value })}
                    placeholder="https://instagram.com/... o https://maps.google.com/..."
                    required
                  />
                </div>
                <div>
                  <Label>¿Es 100% apto o tiene opciones? *</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      type="button"
                      variant={quickData.safetyLevel === "dedicated_gf" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setQuickData({ ...quickData, safetyLevel: "dedicated_gf" })}
                    >
                      100% sin TACC
                    </Button>
                    <Button
                      type="button"
                      variant={quickData.safetyLevel === "gf_options" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setQuickData({ ...quickData, safetyLevel: "gf_options" })}
                    >
                      Opciones sin TACC
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Nombre del lugar (opcional)</Label>
                  <Input
                    value={quickData.name}
                    onChange={(e) => setQuickData({ ...quickData, name: e.target.value })}
                    placeholder="Si lo conocés"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading || !quickData.safetyLevel}
                >
                  {loading ? "Enviando..." : "Enviar sugerencia"}
                </Button>
              </form>
            )}
          </div>

          <div className="border-t border-border pt-6">
            <p className="text-sm text-muted-foreground mb-4">O completá el formulario completo:</p>
          </div>
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
              <p className="text-xs text-muted-foreground mb-2">
                Seleccioná uno o más tipos que apliquen al lugar
              </p>
              <div className="flex flex-wrap gap-2">
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
              <Label>Dirección *</Label>
              <AddressAutocomplete
                value={formData.address}
                onChange={(address) => setFormData({ ...formData, address })}
                onSelect={(result) => {
                  setFormData({
                    ...formData,
                    address: result.address,
                    lat: result.lat.toString(),
                    lng: result.lng.toString(),
                    neighborhood: result.neighborhood || "Otro",
                  })
                }}
                placeholder="Escribí una dirección o lugar en Buenos Aires..."
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Escribí la dirección y seleccionala de la lista
              </p>
              <button
                type="button"
                onClick={() => setMapPickerOpen(true)}
                className="mt-2 flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <MapPin className="h-4 w-4" />
                ¿No encontrás la dirección? Hacé click acá para ubicarla en el mapa
              </button>
            </div>
            <MapPickerModal
              open={mapPickerOpen}
              onOpenChange={setMapPickerOpen}
              onSelect={(result) => {
                setFormData((prev) => ({
                  ...prev,
                  address: result.address,
                  lat: result.lat.toString(),
                  lng: result.lng.toString(),
                  neighborhood: result.neighborhood || "Otro",
                }))
              }}
            />

            <div>
              <Label>Horario (opcional)</Label>
              <Input
                value={formData.openingHours}
                onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
                placeholder="Ej: Lun-Vie 9-18, Sáb 10-14"
              />
            </div>

            <div>
              <Label>Delivery (opcional)</Label>
              <div className="space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.delivery.available}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        delivery: { ...formData.delivery, available: e.target.checked },
                      })
                    }
                    className="rounded border-border"
                  />
                  <span className="text-sm">Tiene delivery</span>
                </label>
                {formData.delivery.available && (
                  <div className="space-y-3 pl-6 border-l-2 border-border">
                    <div>
                      <Label className="text-xs">Rappi</Label>
                      <Input
                        value={formData.delivery.rappi}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            delivery: { ...formData.delivery, rappi: e.target.value },
                          })
                        }
                        placeholder="https://www.rappi.com.ar/..."
                      />
                    </div>
                    <div>
                      <Label className="text-xs">PedidosYa</Label>
                      <Input
                        value={formData.delivery.pedidosya}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            delivery: { ...formData.delivery, pedidosya: e.target.value },
                          })
                        }
                        placeholder="https://www.pedidosya.com.ar/..."
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Otro (WhatsApp, sitio propio, etc.)</Label>
                      <Input
                        value={formData.delivery.other}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            delivery: { ...formData.delivery, other: e.target.value },
                          })
                        }
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                )}
              </div>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Teléfono</Label>
                <Input
                  value={formData.contact.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contact: { ...formData.contact, phone: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input
                  value={formData.contact.whatsapp}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contact: { ...formData.contact, whatsapp: e.target.value },
                    })
                  }
                  placeholder="Ej: +54 11 1234-5678"
                />
              </div>
            </div>

            <div>
              <Label>Sitio web</Label>
              <Input
                type="url"
                value={formData.contact.url}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contact: { ...formData.contact, url: e.target.value },
                  })
                }
                placeholder="https://..."
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading}>
              {loading ? "Enviando..." : "Enviar sugerencia"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
