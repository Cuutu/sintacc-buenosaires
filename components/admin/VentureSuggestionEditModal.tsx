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
import {
  VENTURE_CATEGORIES,
  VENTURE_MODALITIES,
  VENTURE_SAFETY_LEVELS,
} from "@/lib/venture-constants"
import type { VentureModalityId, VentureSafetyLevelId, VentureCategoryId } from "@/lib/venture-constants"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type VentureDraft = {
  name?: string
  category?: string
  zone?: string
  modalities?: string[]
  safetyLevel?: string
  contact?: { instagram?: string; whatsapp?: string }
  purchaseChannels?: string
  certifiedProducts?: boolean
  photos?: string[]
}

type Props = {
  suggestionId: string
  ventureDraft: VentureDraft
  suggesterComment?: string
  shipsNationwide?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  onApproved: () => void
}

export function VentureSuggestionEditModal({
  suggestionId,
  ventureDraft,
  open,
  onOpenChange,
  onSaved,
  onApproved,
}: Props) {
  const [form, setForm] = useState({
    name: "",
    category: "" as VentureCategoryId | "",
    zone: "",
    modalities: [] as VentureModalityId[],
    safetyLevel: "to_confirm" as VentureSafetyLevelId,
    instagram: "",
    whatsapp: "",
    purchaseChannels: "",
    certifiedProducts: false,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && ventureDraft) {
      setForm({
        name: ventureDraft.name || "",
        category: (ventureDraft.category as VentureCategoryId) || "",
        zone: ventureDraft.zone || "",
        modalities: (ventureDraft.modalities || []) as VentureModalityId[],
        safetyLevel: (ventureDraft.safetyLevel as VentureSafetyLevelId) || "to_confirm",
        instagram: ventureDraft.contact?.instagram || "",
        whatsapp: ventureDraft.contact?.whatsapp || "",
        purchaseChannels: ventureDraft.purchaseChannels || "",
        certifiedProducts: ventureDraft.certifiedProducts ?? false,
      })
    }
  }, [open, ventureDraft])

  const saveDraft = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/venture-suggestions/${suggestionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ventureDraft: {
            name: form.name,
            category: form.category,
            zone: form.zone,
            modalities: form.modalities,
            safetyLevel: form.safetyLevel,
            certifiedProducts: form.certifiedProducts,
            purchaseChannels: form.purchaseChannels || undefined,
            contact: {
              instagram: form.instagram || undefined,
              whatsapp: form.whatsapp || undefined,
            },
            photos: ventureDraft.photos,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error")
      toast.success("Borrador guardado")
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error")
    } finally {
      setLoading(false)
    }
  }

  const approve = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/venture-suggestions/${suggestionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          ventureDraft: {
            name: form.name,
            category: form.category,
            zone: form.zone,
            modalities: form.modalities,
            safetyLevel: form.safetyLevel,
            certifiedProducts: form.certifiedProducts,
            purchaseChannels: form.purchaseChannels || undefined,
            contact: {
              instagram: form.instagram || undefined,
              whatsapp: form.whatsapp || undefined,
            },
            photos: ventureDraft.photos,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error")
      toast.success("Emprendimiento publicado")
      onOpenChange(false)
      onApproved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error")
    } finally {
      setLoading(false)
    }
  }

  const toggleMod = (id: VentureModalityId) => {
    setForm((p) => ({
      ...p,
      modalities: p.modalities.includes(id)
        ? p.modalities.filter((m) => m !== id)
        : [...p.modalities, id],
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar emprendimiento sugerido</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Zona</Label>
            <Input value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Categoría</Label>
            <div className="flex flex-wrap gap-1">
              {VENTURE_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setForm({ ...form, category: c.id })}
                  className={cn(
                    "px-2 py-1 rounded text-xs border",
                    form.category === c.id ? "border-primary bg-primary/10" : "border-border"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Modalidades</Label>
            <div className="flex flex-wrap gap-1">
              {VENTURE_MODALITIES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMod(m.id)}
                  className={cn(
                    "px-2 py-1 rounded text-xs border",
                    form.modalities.includes(m.id)
                      ? "border-primary bg-primary/10"
                      : "border-border"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Seguridad</Label>
            <div className="flex flex-wrap gap-1">
              {VENTURE_SAFETY_LEVELS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setForm({ ...form, safetyLevel: s.id })}
                  className={cn(
                    "px-2 py-1 rounded text-xs border",
                    form.safetyLevel === s.id ? "border-primary bg-primary/10" : "border-border"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Instagram</Label>
              <Input
                value={form.instagram}
                onChange={(e) => setForm({ ...form, instagram: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Dónde comprar</Label>
            <textarea
              value={form.purchaseChannels}
              onChange={(e) => setForm({ ...form, purchaseChannels: e.target.value })}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={saveDraft} disabled={loading}>
            Guardar borrador
          </Button>
          <Button onClick={approve} disabled={loading}>
            Aprobar y publicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
