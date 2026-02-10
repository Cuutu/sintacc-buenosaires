"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AddressAutocomplete } from "@/components/address-autocomplete"
import { geocodeAddress } from "@/lib/geocode"
import { toast } from "sonner"
import { TYPES, PLACE_TAGS } from "@/lib/constants"

export default function SugerirPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    address: "",
    neighborhood: "",
    lat: "",
    lng: "",
    tags: [] as string[],
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

    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...dataToSubmit,
          location: {
            lat: parseFloat(dataToSubmit.lat),
            lng: parseFloat(dataToSubmit.lng),
          },
        }),
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
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.emoji} {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                Escribí o pegá la dirección. Podés seleccionar una sugerencia o enviar directamente.
              </p>
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
