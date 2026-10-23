"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Copy, CopyPlus, ExternalLink, RefreshCw } from "lucide-react"
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
import { fetchApi } from "@/lib/fetchApi"
import type { ListWithDetails } from "@/components/lists/ListCard"
import { IPlace } from "@/models/Place"
import { ImageUpload } from "@/components/image-upload"
import { listsUi } from "@/components/lists/lists-ui"
import {
  LIST_DESTINATION_PLACEHOLDER,
  LIST_NAME_PLACEHOLDER,
  ListPlaceRow,
  ListVisibilityField,
  PlaceSearchBox,
  focusDialogContent,
  listModalUi,
  moveId,
  orderPlaceRows,
  usePlaceSearch,
  type PlaceLite,
} from "@/components/lists/ListFormParts"
import {
  linkActionForShareChange,
  listShareState,
  visibilityForShareState,
  type ListShareState,
} from "@/lib/lists/share-state"
import { cn } from "@/lib/utils"

interface ManageListModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  list: ListWithDetails | null
  favorites: IPlace[]
  canUsePrivateLists: boolean
  onUpdated: () => void
}

function toLite(p: { _id: unknown; name: string; neighborhood?: string; photos?: string[]; type?: string }): PlaceLite {
  return {
    _id: String(p._id),
    name: p.name,
    neighborhood: p.neighborhood,
    photos: p.photos,
    type: p.type,
  }
}

export function ManageListModal({
  open,
  onOpenChange,
  list,
  favorites,
  canUsePrivateLists,
  onUpdated,
}: ManageListModalProps) {
  const [saving, setSaving] = useState(false)
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [destination, setDestination] = useState("")
  const [share, setShare] = useState<ListShareState>("public")
  const [orderedIds, setOrderedIds] = useState<string[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [coverUrls, setCoverUrls] = useState<string[]>([])
  const [extraPlaces, setExtraPlaces] = useState<PlaceLite[]>([])
  const placeSearch = usePlaceSearch(open)

  const listPlaces = useMemo<PlaceLite[]>(
    () =>
      (list?.placeIds ?? [])
        .filter((p): p is Exclude<typeof p, string> => Boolean(p) && typeof p !== "string")
        .map(toLite),
    [list]
  )
  const favoritePlaces = useMemo(() => favorites.map(toLite), [favorites])

  const placePool = useMemo(() => {
    const map = new Map<string, PlaceLite>()
    for (const p of favoritePlaces) map.set(p._id, p)
    for (const p of listPlaces) map.set(p._id, p)
    for (const p of extraPlaces) map.set(p._id, p)
    return map
  }, [favoritePlaces, listPlaces, extraPlaces])

  useEffect(() => {
    if (!list || !open) return
    setName(list.name || "")
    setDescription(list.description || "")
    setDestination(list.destination || "")
    setShare(listShareState(list))
    setOrderedIds(listPlaces.map((p) => p._id))
    const noteMap: Record<string, string> = {}
    for (const n of list.placeNotes || []) {
      const pid = typeof n.placeId === "string" ? n.placeId : n.placeId?.toString?.()
      if (pid && n.note) noteMap[pid] = n.note
    }
    setNotes(noteMap)
    setCoverUrls(list.coverImage ? [list.coverImage] : [])
    setExtraPlaces([])
  }, [list, open, listPlaces])

  // Primero los lugares que ya están en la lista (en su orden); después favoritos y búsquedas.
  const rows = useMemo(
    () => orderPlaceRows(orderedIds, placePool, [...listPlaces, ...favoritePlaces, ...extraPlaces]),
    [orderedIds, placePool, listPlaces, favoritePlaces, extraPlaces]
  )

  if (!list) return null

  const savedShare = listShareState(list)
  const sharePath = list.privateSharePath
  const linkActive = savedShare === "link" && Boolean(sharePath)

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

  const addFromSearch = (place: PlaceLite) => {
    setExtraPlaces((prev) => (prev.some((p) => p._id === place._id) ? prev : [...prev, place]))
    setOrderedIds((prev) => (prev.includes(place._id) ? prev : [...prev, place._id]))
    placeSearch.clear()
  }

  const copyLink = async () => {
    if (!sharePath) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${sharePath}`)
      toast.success("Enlace copiado")
    } catch {
      toast.error("No se pudo copiar el enlace")
    }
  }

  const linkAction = async (action: "regenerate" | "revoke" | "enable") => {
    await fetchApi(`/api/lists/${list._id}/private-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
  }

  const save = async () => {
    if (!name.trim()) {
      toast.error("Ponele un nombre a la lista")
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
      const nextShare = canUsePrivateLists ? share : savedShare
      await fetchApi(`/api/lists/${list._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || "",
          destination: destination.trim() || "",
          placeIds: orderedIds,
          placeNotes,
          visibility: visibilityForShareState(nextShare),
          coverImage: coverUrls[0] || placePool.get(orderedIds[0])?.photos?.[0] || "",
        }),
      })
      // Privada = enlace revocado; volver a "Con enlace" lo reactiva.
      const action = linkActionForShareChange(savedShare, nextShare)
      if (action) await linkAction(action)
      toast.success("Lista actualizada")
      onUpdated()
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.message || "No se pudo guardar")
    } finally {
      setSaving(false)
    }
  }

  const regenerate = async () => {
    setSaving(true)
    try {
      await linkAction("regenerate")
      toast.success("Enlace nuevo listo")
      setConfirmRegenerate(false)
      onUpdated()
    } catch (err: any) {
      toast.error(err?.message || "No se pudo regenerar el enlace")
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
      toast.error(err?.message || "No se pudo duplicar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={listModalUi.content} onOpenAutoFocus={focusDialogContent}>
          <DialogHeader className={listModalUi.header}>
            <DialogTitle className="text-xl font-extrabold text-[#2D4A34]">Gestionar lista</DialogTitle>
            <DialogDescription className="text-base text-[#5E6A60]">
              {canUsePrivateLists
                ? "Editá los lugares, las notas y quién la puede ver. No pongas datos personales."
                : "Editá los lugares y las notas. No pongas datos personales."}
            </DialogDescription>
          </DialogHeader>

          <div className={listModalUi.body}>
            <div>
              <label htmlFor="edit-name" className={listModalUi.label}>
                Nombre
              </label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={LIST_NAME_PLACEHOLDER}
                maxLength={80}
                className={listModalUi.field}
              />
            </div>
            <div>
              <span className={listModalUi.label}>Foto de portada</span>
              <div className="mt-1.5">
                <ImageUpload value={coverUrls} onChange={setCoverUrls} maxCount={1} folder="lists" />
              </div>
            </div>
            <div>
              <label htmlFor="edit-desc" className={listModalUi.label}>
                Descripción
              </label>
              <Textarea
                id="edit-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
                rows={2}
                className={listModalUi.field}
              />
            </div>
            <div>
              <label htmlFor="edit-dest" className={listModalUi.label}>
                Destino
              </label>
              <Input
                id="edit-dest"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={LIST_DESTINATION_PLACEHOLDER}
                maxLength={120}
                className={listModalUi.field}
              />
            </div>

            {canUsePrivateLists ? <ListVisibilityField value={share} onChange={setShare} /> : null}

            {share === "link" && linkActive ? (
              <div className="space-y-2 rounded-[14px] border border-[#E6DFD2] bg-[#F7F3EB] p-3">
                <p className="text-sm font-bold text-[#2D4A34]">Enlace privado activo</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={listsUi.secondary} onClick={copyLink}>
                    <Copy className="h-4 w-4" aria-hidden />
                    Copiar enlace
                  </button>
                  <button
                    type="button"
                    className={listsUi.secondary}
                    onClick={() => sharePath && window.open(sharePath, "_blank", "noopener,noreferrer")}
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden />
                    Vista previa
                  </button>
                  <button
                    type="button"
                    className={listsUi.secondary}
                    disabled={saving}
                    onClick={() => setConfirmRegenerate(true)}
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden />
                    Regenerar
                  </button>
                </div>
              </div>
            ) : null}

            <PlaceSearchBox
              search={placeSearch.search}
              onSearch={placeSearch.setSearch}
              results={placeSearch.results}
              searching={placeSearch.searching}
              selectedIds={orderedIds}
              onPick={addFromSearch}
            />

            <div>
              <span className={listModalUi.label}>Lugares y notas ({orderedIds.length} en la lista)</span>
              <div className="mt-1.5 space-y-1 rounded-[14px] border border-[#E6DFD2] bg-white p-1.5">
                {rows.map((place) => {
                  const id = place._id
                  return (
                    <ListPlaceRow
                      key={id}
                      place={place}
                      selected={orderedIds.includes(id)}
                      orderIdx={orderedIds.indexOf(id)}
                      total={orderedIds.length}
                      note={notes[id] || ""}
                      onToggle={() => togglePlace(id)}
                      onMove={(dir) => setOrderedIds((prev) => moveId(prev, id, dir))}
                      onNote={(value) => setNotes((prev) => ({ ...prev, [id]: value }))}
                    />
                  )
                })}
              </div>
            </div>

            <button type="button" className={cn(listsUi.link, "text-[#5E6A60]")} disabled={saving} onClick={duplicate}>
              <CopyPlus className="h-4 w-4" aria-hidden />
              Duplicar lista
            </button>
          </div>

          <DialogFooter className={listModalUi.footer}>
            <button type="button" className={listsUi.secondary} onClick={() => onOpenChange(false)}>
              Cancelar
            </button>
            <button type="button" className={listsUi.primary} disabled={saving} onClick={save}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmRegenerate} onOpenChange={setConfirmRegenerate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Regenerar enlace?</DialogTitle>
            <DialogDescription>
              El enlace anterior deja de funcionar en el momento. Vas a tener que compartir el nuevo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRegenerate(false)}>
              Cancelar
            </Button>
            <Button disabled={saving} onClick={regenerate}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
