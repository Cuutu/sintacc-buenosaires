"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AddressAutocomplete } from "@/components/address-autocomplete"
import { geocodeAddress } from "@/lib/geocode"
import { TYPES, PLACE_TAGS } from "@/lib/constants"
import { toast } from "sonner"

type PlaceDraft = {
  name?: string
  type?: string
  types?: string[]
  address?: string
  neighborhood?: string
  location?: { lat: number; lng: number }
  openingHours?: string
  delivery?: { available?: boolean; rappi?: string; pedidosya?: string; other?: string }
  contact?: { instagram?: string; url?: string; phone?: string; whatsapp?: string }
  tags?: string[]
  safetyLevel?: string
}

type Props = {
  suggestionId: string
  placeDraft: PlaceDraft
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  onApproved: () => void
}

export function SuggestionEditModal({
  suggestionId,
  placeDraft,
  open,
  onOpenChange,
  onSaved,
  onApproved,
}: Props) {
  const [formData, setFormData] = useState({
    name: "",
    type: "other" as string,
    types: [] as string[],
    address: "",
    neighborhood: "",
    lat: "",
    lng: "",
    openingHours: "",
    delivery: { available: false, rappi: "", pedidosya: "", other: "" },
    contact: { instagram: "", url: "", phone: "", whatsapp: "" },
    tags: [] as string[],
    safetyLevel: "" as string,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open && placeDraft) {
      const loc = placeDraft.location
      setFormData({
        name: placeDraft.name || "",
        type: placeDraft.type || "other",
        types: placeDraft.types || (placeDraft.type ? [placeDraft.type] : ["other"]),
        address: placeDraft.address || "",
        neighborhood: placeDraft.neighborhood || "",
        lat: loc ? String(loc.lat) : "",
        lng: loc ? String(loc.lng) : "",
        openingHours: placeDraft.openingHours || "",
        delivery: {
          available: placeDraft.delivery?.available ?? false,
          rappi: placeDraft.delivery?.rappi || "",
          pedidosya: placeDraft.delivery?.pedidosya || "",
          other: placeDraft.delivery?.other || "",
        },
        contact: {
          instagram: placeDraft.contact?.instagram || "",
          url: placeDraft.contact?.url || "",
          phone: (placeDraft.contact as any)?.phone || "",
          whatsapp: (placeDraft.contact as any)?.whatsapp || "",
        },
        tags: placeDraft.tags || [],
        safetyLevel: placeDraft.safetyLevel || "",
      })
    }
  }, [open, placeDraft])

  const toggleType = (typeValue: string) => {
    setFormData((prev) => ({
      ...prev,
      types: prev.types.includes(typeValue)
        ? prev.types.filter((t) => t !== typeValue)
        : [...prev.types, typeValue],
      type: prev.types.includes(typeValue) ? prev.type : typeValue,
    }))
  }

  const toggleTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }))
  }

  const buildPayload = () => {
    const loc = formData.lat && formData.lng
      ? { lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) }
      : undefined
    return {
      name: formData.name.trim() || undefined,
      type: formData.types[0] || formData.type || "other",
      types: formData.types.length ? formData.types : undefined,
      address: formData.address.trim() || undefined,
      neighborhood: formData.neighborhood.trim() || undefined,
      location: loc,
      openingHours: formData.openingHours.trim() || undefined,
      delivery: formData.delivery.available
        ? {
            available: true,
            rappi: formData.delivery.rappi?.trim() || undefined,
            pedidosya: formData.delivery.pedidosya?.trim() || undefined,
            other: formData.delivery.other?.trim() || undefined,
          }
        : undefined,
      contact: {
        instagram: formData.contact.instagram?.trim() || undefined,
        url: formData.contact.url?.trim() || undefined,
        phone: formData.contact.phone?.trim() || undefined,
        whatsapp: formData.contact.whatsapp?.trim() || undefined,
      },
      tags: formData.tags.length ? formData.tags : undefined,
      safetyLevel: formData.safetyLevel || undefined,
    }
  }

  const handleSave = async () => {
    setError("")
    if (!formData.name.trim()) {
      setError("El nombre es obligatorio")
      return
    }
    if (!formData.address.trim()) {
      setError("La dirección es obligatoria")
      return
    }
    if (!formData.neighborhood.trim()) {
      setError("El barrio es obligatorio")
      return
    }
    let lat = formData.lat
    let lng = formData.lng
    let address = formData.address
    let neighborhood = formData.neighborhood
    if ((!lat || !lng) && formData.address.trim()) {
      const geo = await geocodeAddress(formData.address)
      if (geo) {
        lat = geo.lat.toString()
        lng = geo.lng.toString()
        address = geo.address
        neighborhood = geo.neighborhood || "Otro"
      } else {
        setError("No se pudo geocodificar la dirección")
        return
      }
    }
    if (!lat || !lng) {
      setError("Seleccioná una dirección de la lista o escribí una completa")
      return
    }

    setLoading(true)
    try {
      const payload = buildPayload()
      const finalPayload = {
        ...payload,
        address,
        neighborhood,
        location: { lat: parseFloat(lat), lng: parseFloat(lng) },
      }
      const res = await fetch(`/api/admin/suggestions/${suggestionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeDraft: finalPayload }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Borrador guardado")
        onSaved()
        onOpenChange(false)
      } else {
        setError(data.error || "Error al guardar")
      }
    } catch {
      setError("Error al guardar")
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    setError("")
    if (!formData.name.trim() || !formData.address.trim() || !formData.neighborhood.trim()) {
      setError("Nombre, dirección y barrio son obligatorios")
      return
    }
    let lat = formData.lat
    let lng = formData.lng
    let address = formData.address
    let neighborhood = formData.neighborhood
    if ((!lat || !lng) && formData.address.trim()) {
      const geo = await geocodeAddress(formData.address)
      if (geo) {
        lat = geo.lat.toString()
        lng = geo.lng.toString()
        address = geo.address
        neighborhood = geo.neighborhood || "Otro"
      } else {
        setError("No se pudo geocodificar la dirección")
        return
      }
    }
    if (!lat || !lng) {
      setError("Seleccioná una dirección de la lista")
      return
    }

    setLoading(true)
    try {
      const payload = buildPayload()
      const finalPayload = {
        ...payload,
        address,
        neighborhood,
        location: { lat: parseFloat(lat), lng: parseFloat(lng) },
      }
      const res = await fetch(`/api/admin/suggestions/${suggestionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeDraft: finalPayload }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Sugerencia aprobada y lugar creado")
        onApproved()
        onOpenChange(false)
      } else {
        setError(data.error || data.details?.map((e: any) => e.message).join(", ") || "Error al aprobar")
      }
    } catch {
      setError("Error al aprobar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar sugerencia</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Nombre *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nombre del lugar"
            />
          </div>
          <div>
            <Label>Tipo *</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {TYPES.map((t) => (
                <Button
                  key={t.value}
                  type="button"
                  variant={formData.types.includes(t.value) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleType(t.value)}
                >
                  {t.emoji} {t.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label>Dirección *</Label>
            <AddressAutocomplete
              value={formData.address}
              onChange={(addr) => setFormData({ ...formData, address: addr })}
              onSelect={(r) =>
                setFormData({
                  ...formData,
                  address: r.address,
                  lat: String(r.lat),
                  lng: String(r.lng),
                  neighborhood: r.neighborhood || "Otro",
                })
              }
              placeholder="Dirección en Buenos Aires..."
            />
          </div>
          <div>
            <Label>Barrio *</Label>
            <Input
              value={formData.neighborhood}
              onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
              placeholder="Ej: Palermo, Villa Crespo"
            />
          </div>
          <div>
            <Label>Nivel sin gluten</Label>
            <div className="flex gap-2 mt-1">
              <Button
                type="button"
                variant={formData.safetyLevel === "dedicated_gf" ? "default" : "outline"}
                size="sm"
                onClick={() => setFormData({ ...formData, safetyLevel: "dedicated_gf" })}
              >
                100% sin gluten
              </Button>
              <Button
                type="button"
                variant={formData.safetyLevel === "gf_options" ? "default" : "outline"}
                size="sm"
                onClick={() => setFormData({ ...formData, safetyLevel: "gf_options" })}
              >
                Opciones
              </Button>
            </div>
          </div>
          <div>
            <Label>Horario</Label>
            <Input
              value={formData.openingHours}
              onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
              placeholder="Lun-Vie 9-18"
            />
          </div>
          <div>
            <Label>Delivery</Label>
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
                className="rounded"
              />
              <span className="text-sm">Tiene delivery</span>
            </label>
          </div>
          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {PLACE_TAGS.filter((t) => t.value !== "sin_info").map((t) => (
                <Button
                  key={t.value}
                  type="button"
                  variant={formData.tags.includes(t.value) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleTag(t.value)}
                >
                  {t.label}
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
              placeholder="@usuario o URL"
            />
          </div>
          <div>
            <Label>Sitio web / Google Maps</Label>
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
          <div className="grid grid-cols-2 gap-4">
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
                placeholder="+54 11 1234-5678"
              />
            </div>
          </div>
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cerrar
          </Button>
          <Button variant="secondary" onClick={handleSave} disabled={loading}>
            {loading ? "Guardando..." : "Guardar borrador"}
          </Button>
          <Button onClick={handleApprove} disabled={loading}>
            {loading ? "Aprobando..." : "Aprobar y crear lugar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
