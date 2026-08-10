"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fetchApi } from "@/lib/fetchApi"
import { toast } from "sonner"
import {
  ArrowDown,
  ArrowUp,
  Copy,
  ExternalLink,
  Link2Off,
  RefreshCw,
  CopyPlus,
  Lock,
  Globe,
} from "lucide-react"
import type { ListWithDetails } from "@/components/lists/ListCard"
import { LIST_LINK_STATUS, LIST_VISIBILITY } from "@/lib/lists/constants"
import { IPlace } from "@/models/Place"
import { cn } from "@/lib/utils"
import { ImageUpload } from "@/components/image-upload"

interface ManageListModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  list: ListWithDetails | null
  favorites: IPlace[]
  canUsePrivateLists: boolean
  onUpdated: () => void
}

type ConfirmAction = "regenerate" | "revoke" | null

export function ManageListModal({
  open,
  onOpenChange,
  list,
  favorites,
  canUsePrivateLists,
  onUpdated,
}: ManageListModalProps) {
  const [saving, setSaving] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [destination, setDestination] = useState("")
  const [visibility, setVisibility] = useState<string>(LIST_VISIBILITY.PUBLIC)
  const [orderedIds, setOrderedIds] = useState<string[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [coverUrls, setCoverUrls] = useState<string[]>([])

  const placeById = useMemo(() => {
    const map = new Map<string, IPlace | { _id: string; name: string; neighborhood?: string; photos?: string[] }>()
    for (const p of favorites) map.set(p._id.toString(), p)
    if (list?.placeIds) {
      for (const p of list.placeIds) {
        const id = typeof p === "string" ? p : p._id?.toString?.() || String(p._id)
        if (id && !map.has(id) && typeof p !== "string") map.set(id, p as IPlace)
      }
    }
    return map
  }, [favorites, list])

  useEffect(() => {
    if (!list || !open) return
    setName(list.name || "")
    setDescription(list.description || "")
    setDestination(list.destination || "")
    setVisibility(
      list.visibility ||
        (list.isPublic ? LIST_VISIBILITY.PUBLIC : LIST_VISIBILITY.PRIVATE_LINK)
    )
    const ids = (list.placeIds || []).map((p) =>
      typeof p === "string" ? p : p._id.toString()
    )
    setOrderedIds(ids)
    const noteMap: Record<string, string> = {}
    for (const n of list.placeNotes || []) {
      const pid =
        typeof n.placeId === "string" ? n.placeId : n.placeId?.toString?.()
      if (pid && n.note) noteMap[pid] = n.note
    }
    setNotes(noteMap)
    setCoverUrls(list.coverImage ? [list.coverImage] : [])
  }, [list, open])

  const allPlaceOptions = useMemo(() => {
    const ids = new Set<string>()
    const items: Array<{ id: string; name: string; neighborhood?: string }> = []
    for (const [id, p] of placeById) {
      ids.add(id)
      items.push({ id, name: p.name, neighborhood: p.neighborhood })
    }
    for (const f of favorites) {
      const id = f._id.toString()
      if (!ids.has(id)) {
        items.push({ id, name: f.name, neighborhood: f.neighborhood })
      }
    }
    return items
  }, [placeById, favorites])

  if (!list) return null

  const isPrivate = visibility === LIST_VISIBILITY.PRIVATE_LINK
  const sharePath = list.privateSharePath
  const linkStatus = list.linkStatus
  const linkActive =
    isPrivate && linkStatus === LIST_LINK_STATUS.ACTIVE && Boolean(sharePath)

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

  const copyLink = async () => {
    if (!sharePath) return
    const url = `${window.location.origin}${sharePath}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Enlace copiado")
    } catch {
      toast.error("No se pudo copiar el enlace")
    }
  }

  const openClientView = () => {
    if (!sharePath) return
    window.open(sharePath, "_blank", "noopener,noreferrer")
  }

  const save = async () => {
    if (!name.trim()) {
      toast.error("El nombre es obligatorio")
      return
    }
    if (orderedIds.length === 0) {
      toast.error("Agregá al menos un lugar")
      return
    }
    setSaving(true)
    try {
      const placeNotes = orderedIds
        .filter((id) => notes[id]?.trim())
        .map((id) => ({ placeId: id, note: notes[id].trim() }))
      await fetchApi(`/api/lists/${list._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || "",
          destination: destination.trim() || "",
          placeIds: orderedIds,
          placeNotes,
          visibility,
          coverImage:
            coverUrls[0] ||
            placeById.get(orderedIds[0])?.photos?.[0] ||
            "",
        }),
      })
      toast.success("Lista actualizada")
      onUpdated()
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.message || "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const runLinkAction = async (action: "regenerate" | "revoke" | "enable") => {
    setSaving(true)
    try {
      await fetchApi(`/api/lists/${list._id}/private-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      toast.success(
        action === "regenerate"
          ? "Enlace regenerado"
          : action === "revoke"
            ? "Acceso revocado"
            : "Acceso rehabilitado"
      )
      setConfirmAction(null)
      onUpdated()
    } catch (err: any) {
      toast.error(err?.message || "Error al actualizar enlace")
    } finally {
      setSaving(false)
    }
  }

  const duplicate = async () => {
    setSaving(true)
    try {
      await fetchApi(`/api/lists/${list._id}/duplicate`, { method: "POST" })
      toast.success("Lista duplicada")
      onUpdated()
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.message || "Error al duplicar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Gestionar lista</DialogTitle>
            <DialogDescription>
              Editá lugares, notas y visibilidad. No incluyas datos sensibles del viajero.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Foto de portada</Label>
              <div className="mt-1.5">
                <ImageUpload
                  value={coverUrls}
                  onChange={setCoverUrls}
                  maxCount={1}
                  folder="lists"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-desc">Descripción</Label>
              <Textarea
                id="edit-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-dest">Destino</Label>
              <Input
                id="edit-dest"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
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
                      "flex items-start gap-3 rounded-xl border p-3 text-left",
                      visibility === LIST_VISIBILITY.PUBLIC
                        ? "border-primary bg-primary/10"
                        : "border-white/10"
                    )}
                  >
                    <Globe className="mt-0.5 h-4 w-4 text-primary" />
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
                      "flex items-start gap-3 rounded-xl border p-3 text-left",
                      visibility === LIST_VISIBILITY.PRIVATE_LINK
                        ? "border-primary bg-primary/10"
                        : "border-white/10"
                    )}
                  >
                    <Lock className="mt-0.5 h-4 w-4 text-primary" />
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

            {isPrivate ? (
              <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-sm font-medium">Enlace privado</p>
                <p className="text-xs text-muted-foreground">
                  Estado:{" "}
                  {linkStatus === LIST_LINK_STATUS.REVOKED
                    ? "Revocado"
                    : linkStatus === LIST_LINK_STATUS.ARCHIVED
                      ? "Archivado"
                      : linkActive
                        ? "Activo"
                        : "Pendiente de guardar"}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={!linkActive}
                    onClick={copyLink}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copiar enlace
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={!linkActive}
                    onClick={openClientView}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Vista previa
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={saving}
                    onClick={() => setConfirmAction("regenerate")}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Regenerar
                  </Button>
                  {linkStatus === LIST_LINK_STATUS.REVOKED ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={saving}
                      onClick={() => runLinkAction("enable")}
                    >
                      Rehabilitar acceso
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="gap-1.5"
                      disabled={saving}
                      onClick={() => setConfirmAction("revoke")}
                    >
                      <Link2Off className="h-3.5 w-3.5" />
                      Revocar
                    </Button>
                  )}
                </div>
              </div>
            ) : null}

            <div>
              <Label>Lugares y notas</Label>
              <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-lg border p-2">
                {allPlaceOptions.map((place) => {
                  const selected = orderedIds.includes(place.id)
                  const orderIdx = orderedIds.indexOf(place.id)
                  return (
                    <div
                      key={place.id}
                      className={cn(
                        "rounded-lg p-2",
                        selected ? "bg-muted/40" : "hover:bg-muted/30"
                      )}
                    >
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => togglePlace(place.id)}
                          className="rounded"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {place.name}
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
                              onClick={() => move(place.id, -1)}
                              disabled={orderIdx <= 0}
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => move(place.id, 1)}
                              disabled={orderIdx >= orderedIds.length - 1}
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <Textarea
                            value={notes[place.id] || ""}
                            onChange={(e) =>
                              setNotes((prev) => ({
                                ...prev,
                                [place.id]: e.target.value,
                              }))
                            }
                            placeholder="Nota personalizada"
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
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="gap-1.5"
              disabled={saving}
              onClick={duplicate}
            >
              <CopyPlus className="h-3.5 w-3.5" />
              Duplicar
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="button" disabled={saving} onClick={save}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmAction !== null}
        onOpenChange={(v) => !v && setConfirmAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "regenerate"
                ? "¿Regenerar enlace?"
                : "¿Revocar acceso?"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "regenerate"
                ? "El enlace anterior dejará de funcionar de inmediato. Tendrás que compartir el nuevo."
                : "Quienes tengan el enlace ya no podrán ver la lista. Podés rehabilitarlo después."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Cancelar
            </Button>
            <Button
              variant={confirmAction === "revoke" ? "destructive" : "default"}
              disabled={saving}
              onClick={() => confirmAction && runLinkAction(confirmAction)}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
