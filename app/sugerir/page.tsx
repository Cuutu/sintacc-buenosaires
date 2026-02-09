"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AddressAutocomplete } from "@/components/address-autocomplete"

const TYPES = [
  { value: "restaurant", label: "Restaurante" },
  { value: "cafe", label: "Café" },
  { value: "bakery", label: "Panadería" },
  { value: "store", label: "Tienda" },
  { value: "icecream", label: "Heladería" },
  { value: "bar", label: "Bar" },
  { value: "other", label: "Otro" },
]

const NEIGHBORHOODS = [
  "Palermo",
  "Recoleta",
  "San Telmo",
  "Puerto Madero",
  "Belgrano",
  "Villa Crespo",
  "Caballito",
  "Almagro",
  "Villa Urquiza",
  "Colegiales",
  "Balvanera",
  "Monserrat",
  "La Boca",
  "Barracas",
  "Constitución",
  "Otro",
]

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

    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          location: {
            lat: parseFloat(formData.lat),
            lng: parseFloat(formData.lng),
          },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Error al crear sugerencia")
      }

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
                      {type.label}
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
                    neighborhood: result.neighborhood || "",
                  })
                }}
                placeholder="Escribí una dirección o lugar en Buenos Aires..."
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Escribí al menos 3 caracteres para buscar. Seleccioná una sugerencia para autocompletar.
              </p>
            </div>

            <div>
              <Label>Barrio *</Label>
              <Select
                value={formData.neighborhood}
                onValueChange={(value) =>
                  setFormData({ ...formData, neighborhood: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar barrio" />
                </SelectTrigger>
                <SelectContent>
                  {NEIGHBORHOODS.map((hood) => (
                    <SelectItem key={hood} value={hood}>
                      {hood}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Latitud *</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.lat}
                  onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                  placeholder="-34.6037"
                  required
                  title="Se completa automáticamente al elegir una dirección"
                />
              </div>
              <div>
                <Label>Longitud *</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.lng}
                  onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                  placeholder="-58.3816"
                  required
                  title="Se completa automáticamente al elegir una dirección"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Coordenadas se completan al elegir una dirección. Podés editarlas si es necesario.
            </p>

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
