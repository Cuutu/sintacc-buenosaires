"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { IPlace } from "@/models/Place"
import { fetchApi } from "@/lib/fetchApi"
import { toast } from "sonner"
import { ArrowDown, ArrowUp, Lock, Globe } from "lucide-react"
import { LIST_VISIBILITY, type ListVisibility } from "@/lib/lists/constants"
import { cn } from "@/lib/utils"

interface CreateListModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  favorites: IPlace[]
  canUsePrivateLists?: boolean
  onCreated?: (list?: { visibility?: string; privateSharePath?: string | null }) => void
}

export function CreateListModal({
  open,
  onOpenChange,
  favorites,
  canUsePrivateLists = false,
  onCreated,
}: CreateListModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [destination, setDestination] = useState("")
  const [visibility, setVisibility] = useState<ListVisibility>(
    LIST_VISIBILITY.PUBLIC
  )
  const [orderedIds, setOrderedIds] = useState<string[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setOrderedIds(favorites.map((p) => p._id.toString()))
    setNotes({})
    setVisibility(LIST_VISIBILITY.PUBLIC)
  }, [open, favorites])

  const placeById = useMemo(() => {
    const map = new Map<string, IPlace>()
    for (const p of favorites) map.set(p._id.toString(), p)
    return map
  }, [favorites])

  const togglePlace = (id: string) => {
    setOrderedIds((prev) => {
      if (prev.includes(id)) {
        setNotes((n) => {
          const next = { ...n }
          delete next[id]
          return next
        })
        return prev.filter((x) => x !== id)
      }
      return [...prev, id]
    })
  }

  const move = (id: string, dir: -1 | 1) => {
    setOrderedIds((prev) => {
      const idx = prev.indexOf(id)
      if (idx < 0) return prev
      const nextIdx = idx + dir
      if (nextIdx < 0 || nextIdx >= prev.length) return prev
      const copy = [...prev]
      ;[copy[idx], copy[nextIdx]] = [copy[nextIdx], copy[idx]]
      return copy
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("El nombre es obligatorio")
      return
    }
    if (orderedIds.length === 0) {
      toast.error("Agregá al menos un lugar")
      return
    }

    setLoading(true)
    try {
      const placeNotes = orderedIds
        .filter((id) => notes[id]?.trim())
        .map((id) => ({ placeId: id, note: notes[id].trim() }))

      const coverImage =
        placeById.get(orderedIds[0])?.photos?.[0] || undefined

      const created = await fetchApi<{
        visibility?: string
        privateSharePath?: string | null
      }>("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          destination: destination.trim() || undefined,
          coverImage,
          placeIds: orderedIds,
          placeNotes,
          visibility,
        }),
      })
      if (
        visibility === LIST_VISIBILITY.PRIVATE_LINK &&
        created.privateSharePath
      ) {
        try {
          await navigator.clipboard.writeText(
            `${window.location.origin}${created.privateSharePath}`
          )
          toast.success("Lista privada creada — enlace copiado")
        } catch {
          toast.success("Lista privada creada")
        }
      } else {
        toast.success("Lista creada")
      }
      setName("")
      setDescription("")
      setDestination("")
      setOrderedIds(favorites.map((p) => p._id.toString()))
      setNotes({})
      setVisibility(LIST_VISIBILITY.PUBLIC)
      onOpenChange(false)
      onCreated?.(created)
    } catch (err: any) {
      toast.error(err?.message || "Error al crear lista")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear lista</DialogTitle>
          <DialogDescription>
            Compartí recomendaciones. Si es privada, usá un alias — no pongas
            documentos, teléfonos ni datos médicos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre de la lista</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Recomendaciones para María — Madrid 2026"
              maxLength={80}
              className="mt-1"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Preferí un alias o nombre de viaje, no datos personales sensibles.
            </p>
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
            <Label htmlFor="destination">Destino (opcional)</Label>
            <Input
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Ej: Madrid, España"
              maxLength={120}
              className="mt-1"
            />
          </div>

          {canUsePrivateLists ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Visibilidad</legend>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility(LIST_VISIBILITY.PUBLIC)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 text-left transition",
                    visibility === LIST_VISIBILITY.PUBLIC
                      ? "border-primary bg-primary/10"
                      : "border-white/10 hover:border-white/20"
                  )}
                >
                  <Globe className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    <span className="block text-sm font-semibold">Pública</span>
                    <span className="text-xs text-muted-foreground">
                      Visible en CeliMap para la comunidad.
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility(LIST_VISIBILITY.PRIVATE_LINK)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 text-left transition",
                    visibility === LIST_VISIBILITY.PRIVATE_LINK
                      ? "border-primary bg-primary/10"
                      : "border-white/10 hover:border-white/20"
                  )}
                >
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    <span className="block text-sm font-semibold">
                      Privada mediante enlace
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Solo podrán verla las personas que tengan el enlace.
                    </span>
                  </span>
                </button>
              </div>
            </fieldset>
          ) : null}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Lugares ({orderedIds.length} seleccionados)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setOrderedIds(favorites.map((p) => p._id.toString()))
                }
              >
                Seleccionar todos
              </Button>
            </div>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border p-2">
              {favorites.map((place) => {
                const id = place._id.toString()
                const selected = orderedIds.includes(id)
                const orderIdx = orderedIds.indexOf(id)
                return (
                  <div
                    key={id}
                    className={cn(
                      "rounded-lg p-2",
                      selected ? "bg-muted/40" : "hover:bg-muted/30"
                    )}
                  >
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => togglePlace(id)}
                        className="rounded"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {place.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {place.neighborhood}
                      </span>
                    </label>
                    {selected ? (
                      <div className="mt-2 space-y-2 pl-6">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-muted-foreground">
                            #{orderIdx + 1}
                          </span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => move(id, -1)}
                            disabled={orderIdx <= 0}
                            aria-label="Subir"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => move(id, 1)}
                            disabled={orderIdx >= orderedIds.length - 1}
                            aria-label="Bajar"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <Textarea
                          value={notes[id] || ""}
                          onChange={(e) =>
                            setNotes((prev) => ({
                              ...prev,
                              [id]: e.target.value,
                            }))
                          }
                          placeholder="Nota personalizada para tu cliente (opcional)"
                          maxLength={500}
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    ) : null}
                  </div>
                )
              })}
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
