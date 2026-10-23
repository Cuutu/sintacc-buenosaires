"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { IPlace } from "@/models/Place"
import { fetchApi } from "@/lib/fetchApi"
import { ImageUpload } from "@/components/image-upload"
import { trackEvent } from "@/lib/analytics"
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
  visibilityForShareState,
  type ListShareState,
} from "@/lib/lists/share-state"

interface CreateListModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  favorites: IPlace[]
  canUsePrivateLists?: boolean
  onCreated?: (list?: { visibility?: string; privateSharePath?: string | null }) => void
}

function placeKey(p: { _id: string | { toString(): string } }) {
  return typeof p._id === "string" ? p._id : p._id.toString()
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
  const [share, setShare] = useState<ListShareState>("public")
  const [orderedIds, setOrderedIds] = useState<string[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [coverUrls, setCoverUrls] = useState<string[]>([])
  const [extraPlaces, setExtraPlaces] = useState<PlaceLite[]>([])
  const [loading, setLoading] = useState(false)
  const placeSearch = usePlaceSearch(open)

  useEffect(() => {
    if (!open) return
    setOrderedIds([])
    setNotes({})
    setCoverUrls([])
    setExtraPlaces([])
    setShare("public")
    setName("")
    setDescription("")
    setDestination("")
  }, [open])

  const favoritePlaces = useMemo<PlaceLite[]>(
    () =>
      favorites.map((p) => ({
        _id: placeKey(p),
        name: p.name,
        neighborhood: p.neighborhood,
        photos: p.photos,
        type: p.type,
        slug: p.slug,
      })),
    [favorites]
  )

  const placePool = useMemo(() => {
    const map = new Map<string, PlaceLite>()
    for (const p of favoritePlaces) map.set(p._id, p)
    for (const p of extraPlaces) map.set(p._id, p)
    return map
  }, [favoritePlaces, extraPlaces])

  const rows = useMemo(
    () => orderPlaceRows(orderedIds, placePool, [...favoritePlaces, ...extraPlaces]),
    [orderedIds, placePool, favoritePlaces, extraPlaces]
  )

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Ponele un nombre a la lista")
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

      const coverImage = coverUrls[0] || placePool.get(orderedIds[0])?.photos?.[0] || undefined
      const visibility = canUsePrivateLists ? visibilityForShareState(share) : "PUBLIC"

      const created = await fetchApi<{
        _id?: string
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

      // "Privada" = con enlace y el enlace revocado: solo la ve quien la creó.
      const linkAction = canUsePrivateLists ? linkActionForShareChange(null, share) : null
      if (linkAction && created._id) {
        await fetchApi(`/api/lists/${created._id}/private-link`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: linkAction }),
        })
      }

      trackEvent("list_create", {
        visibility: visibility === "PRIVATE_LINK" ? "private_link" : "public",
        placeCount: orderedIds.length,
      })
      if (share === "link" && canUsePrivateLists && created.privateSharePath) {
        try {
          await navigator.clipboard.writeText(`${window.location.origin}${created.privateSharePath}`)
          toast.success("Lista creada. Copiamos el enlace.")
          trackEvent("list_share", { visibility: "private_link" })
        } catch {
          toast.success("Lista creada")
        }
      } else {
        toast.success("Lista creada")
      }
      onOpenChange(false)
      onCreated?.(created)
    } catch (err: any) {
      toast.error(err?.message || "No se pudo crear la lista")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={listModalUi.content} onOpenAutoFocus={focusDialogContent}>
        <DialogHeader className={listModalUi.header}>
          <DialogTitle className="text-xl font-extrabold text-[#2D4A34]">Crear lista</DialogTitle>
          <DialogDescription className="text-base text-[#5E6A60]">
            Juntá lugares para recomendar. No pongas datos personales: nada de documentos,
            teléfonos ni datos médicos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className={listModalUi.body}>
            <div>
              <label htmlFor="list-name" className={listModalUi.label}>
                Nombre de la lista
              </label>
              <Input
                id="list-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={LIST_NAME_PLACEHOLDER}
                maxLength={80}
                className={listModalUi.field}
              />
            </div>

            <div>
              <span className={listModalUi.label}>Foto de portada (opcional)</span>
              <div className="mt-1.5">
                <ImageUpload value={coverUrls} onChange={setCoverUrls} maxCount={1} folder="lists" />
              </div>
              <p className="mt-1 text-sm text-[#5E6A60]">Si no subís una, usamos la del primer lugar.</p>
            </div>

            <div>
              <label htmlFor="list-description" className={listModalUi.label}>
                Descripción (opcional)
              </label>
              <Textarea
                id="list-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contá de qué se trata la lista"
                maxLength={300}
                rows={2}
                className={listModalUi.field}
              />
            </div>

            <div>
              <label htmlFor="list-destination" className={listModalUi.label}>
                Destino (opcional)
              </label>
              <Input
                id="list-destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={LIST_DESTINATION_PLACEHOLDER}
                maxLength={120}
                className={listModalUi.field}
              />
            </div>

            {canUsePrivateLists ? <ListVisibilityField value={share} onChange={setShare} /> : null}

            <PlaceSearchBox
              search={placeSearch.search}
              onSearch={placeSearch.setSearch}
              results={placeSearch.results}
              searching={placeSearch.searching}
              selectedIds={orderedIds}
              onPick={addFromSearch}
            />

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className={listModalUi.label}>Lugares ({orderedIds.length} elegidos)</span>
                {favoritePlaces.length > 0 ? (
                  <button
                    type="button"
                    className={listsUi.link}
                    onClick={() => setOrderedIds(favoritePlaces.map((p) => p._id))}
                  >
                    Usar mis favoritos
                  </button>
                ) : null}
              </div>

              {rows.length === 0 ? (
                <div className="rounded-[14px] border border-dashed border-[#2D4A34]/20 p-4 text-center text-base text-[#5E6A60]">
                  Buscá lugares arriba o{" "}
                  <Link href="/mapa" className="font-bold text-[#B84420] underline">
                    guardá favoritos en el mapa
                  </Link>
                  .
                </div>
              ) : (
                <div className="space-y-1 rounded-[14px] border border-[#E6DFD2] bg-white p-1.5">
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
              )}
            </div>
          </div>

          <DialogFooter className={listModalUi.footer}>
            <button type="button" className={listsUi.secondary} onClick={() => onOpenChange(false)}>
              Cancelar
            </button>
            <button type="submit" className={listsUi.primary} disabled={loading}>
              {loading ? "Creando..." : "Crear lista"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
