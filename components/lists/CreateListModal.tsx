"use client"

import { useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { IPlace } from "@/models/Place"
import { fetchApi } from "@/lib/fetchApi"
import { toast } from "sonner"

interface CreateListModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  favorites: IPlace[]
  onCreated?: () => void
}

export function CreateListModal({
  open,
  onOpenChange,
  favorites,
  onCreated,
}: CreateListModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(favorites.map((p) => p._id.toString()))
  )
  const [loading, setLoading] = useState(false)

  const togglePlace = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(favorites.map((p) => p._id.toString())))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("El nombre es obligatorio")
      return
    }
    if (selectedIds.size === 0) {
      toast.error("Agregá al menos un lugar")
      return
    }

    setLoading(true)
    try {
      await fetchApi("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          placeIds: Array.from(selectedIds),
        }),
      })
      toast.success("Lista creada")
      setName("")
      setDescription("")
      setSelectedIds(new Set(favorites.map((p) => p._id.toString())))
      onOpenChange(false)
      onCreated?.()
    } catch (err: any) {
      toast.error(err?.message || "Error al crear lista")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear lista pública</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre de la lista</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Mis cafés sin TACC"
              maxLength={80}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contame de qué trata tu lista..."
              maxLength={300}
              rows={2}
              className="mt-1"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Lugares ({selectedIds.size} seleccionados)</Label>
              <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
                Seleccionar todos
              </Button>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-lg border p-2 space-y-1">
              {favorites.map((place) => (
                <label
                  key={place._id.toString()}
                  className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(place._id.toString())}
                    onChange={() => togglePlace(place._id.toString())}
                    className="rounded"
                  />
                  <span className="text-sm truncate">{place.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {place.neighborhood}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear lista"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
