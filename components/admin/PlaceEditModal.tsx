"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AddressAutocomplete } from "@/components/address-autocomplete"
import { MapPickerModal } from "@/components/map-picker-modal"
import { LocationPinPreview } from "@/components/location-pin-preview"
import { applyGeoToForm, geocodeAddress, resolveFormLocation } from "@/lib/geocode"
import { normalizeGoogleMapsUrl } from "@/lib/place-research/resolve-maps-url"
import { TYPES, PLACE_TAGS, LOCALITIES } from "@/lib/constants"
import { toast } from "sonner"
import { AdminPhotoStudio } from "@/components/admin/ops/AdminPhotoStudio"
import { HoursEditor } from "@/components/admin/ops/HoursEditor"
import { PlaceResearchPanel } from "@/components/admin/PlaceResearchPanel"
import type { AiResearchItem } from "@/components/admin/types"
import { formatOpeningHours, parseOpeningHours, type WeekHours } from "@/lib/opening-hours"
import { getPlacePath } from "@/lib/place-url"
import { inferSafetyLevel, getSafetyBadge } from "@/components/featured/featured-utils"
import { findDuplicateCandidates } from "@/lib/place-duplicates"
import {
  completenessBarTone,
  completenessTone,
  placeCompleteness,
  placeQualityChecks,
} from "@/lib/place-completeness"
import { adminUi } from "@/lib/admin-ui"
import { cn } from "@/lib/utils"

const EDIT_TABS = ["General", "Ubicación", "Contacto", "Operación", "SEO"] as const

type EditLogItem = { at?: string; by?: string; fields?: string[] }

type PlaceData = {
  _id: string
  name?: string
  status?: string
  type?: string
  types?: string[]
  address?: string
  neighborhood?: string
  locality?: string
  slug?: string
  location?: { lat: number; lng: number }
  openingHours?: string
  delivery?: { available?: boolean; rappi?: string; pedidosya?: string; other?: string }
  contact?: { instagram?: string; url?: string; phone?: string; whatsapp?: string }
  tags?: string[]
  safetyLevel?: string
  photos?: string[]
  description?: string
  pickup?: boolean
  seo?: { metaTitle?: string; metaDescription?: string; canonical?: string }
  updatedAt?: string
  editLog?: EditLogItem[]
  aiEnrichment?: AiResearchItem
}

type FormState = {
  name: string
  status: string
  type: string
  types: string[]
  address: string
  neighborhood: string
  locality: string
  slug: string
  lat: string
  lng: string
  openingHours: string
  delivery: { available: boolean; rappi: string; pedidosya: string; other: string }
  contact: { instagram: string; url: string; phone: string; whatsapp: string }
  tags: string[]
  safetyLevel: string
  photos: string[]
  description: string
  pickup: boolean
  seo: { metaTitle: string; metaDescription: string; canonical: string }
}

type Props = {
  placeId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

function emptyForm(): FormState {
  return {
    name: "",
    status: "approved",
    type: "other",
    types: [],
    address: "",
    neighborhood: "",
    locality: "",
    slug: "",
    lat: "",
    lng: "",
    openingHours: "",
    delivery: { available: false, rappi: "", pedidosya: "", other: "" },
    contact: { instagram: "", url: "", phone: "", whatsapp: "" },
    tags: [],
    safetyLevel: "",
    photos: [],
    description: "",
    pickup: false,
    seo: { metaTitle: "", metaDescription: "", canonical: "" },
  }
}

function normalizeArWhatsapp(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (!digits) return ""
  if (digits.startsWith("549")) return digits
  if (digits.startsWith("54")) return `549${digits.slice(2)}`
  if (digits.startsWith("9") && digits.length >= 10) return `54${digits}`
  if (digits.startsWith("15") && digits.length >= 8) return `54911${digits.slice(2)}`
  return `54${digits}`
}

export function PlaceEditModal({ placeId, open, onOpenChange, onSaved }: Props) {
  const [formData, setFormData] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState("")
  const [mapPickerOpen, setMapPickerOpen] = useState(false)
  const [tab, setTab] = useState<(typeof EDIT_TABS)[number]>("General")
  const [weekHours, setWeekHours] = useState<WeekHours>(parseOpeningHours())
  const [saveState, setSaveState] = useState<"saved" | "dirty" | "saving">("saved")
  const [editLog, setEditLog] = useState<EditLogItem[]>([])
  const [updatedAt, setUpdatedAt] = useState("")
  const [aiResearch, setAiResearch] = useState<AiResearchItem | undefined>()
  const [researchTick, setResearchTick] = useState(0)
  const [dupes, setDupes] = useState<Array<{ id: string; name: string; reasons: string[] }>>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const skipAuto = useRef(true)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setResearchTick(0)
    setAiResearch(undefined)
  }, [placeId])

  const inferSafetyFromTags = (tags: string[]) => {
    if (tags.includes("opciones_sin_tacc")) return "gf_options"
    if (tags.includes("100_gf")) return "dedicated_gf"
    return ""
  }

  const syncTagsWithSafety = (tags: string[], safetyLevel: string) => {
    const next = tags.filter((t) => t !== "100_gf" && t !== "opciones_sin_tacc")
    if (safetyLevel === "dedicated_gf") next.push("100_gf")
    if (safetyLevel === "gf_options") next.push("opciones_sin_tacc")
    return [...new Set(next)]
  }

  const previewPlace = {
    name: formData.name,
    type: formData.types[0] || formData.type,
    neighborhood: formData.neighborhood,
    photos: formData.photos,
    tags: formData.tags,
    safetyLevel: formData.safetyLevel as "dedicated_gf" | "gf_options" | undefined,
    openingHours: formatOpeningHours(weekHours) || formData.openingHours,
    location: {
      lat: Number(formData.lat),
      lng: Number(formData.lng),
    },
    contact: formData.contact,
    description: formData.description,
    slug: formData.slug,
    seo: formData.seo,
  }
  const pct = placeCompleteness(previewPlace)
  const quality = placeQualityChecks(previewPlace)
  const safety = inferSafetyLevel(previewPlace)
  const badge = getSafetyBadge(safety)
  const typeLabel = TYPES.find((t) => t.value === previewPlace.type)?.label || previewPlace.type
  const publicHref = getPlacePath({ _id: placeId, slug: formData.slug })

  useEffect(() => {
    if (!open || !placeId) return
    const silent = researchTick > 0
    if (!silent) {
      setFetching(true)
      setError("")
    }
    skipAuto.current = true
    fetch(`/api/admin/places/${placeId}`)
      .then((res) => res.json())
      .then((place: PlaceData) => {
        const loc = place.location
        const baseTags = place.tags || []
        const normalizedSafety = place.safetyLevel || inferSafetyFromTags(baseTags)
        setFormData({
          name: place.name || "",
          status: place.status || "approved",
          type: place.type || "other",
          types: place.types || (place.type ? [place.type] : ["other"]),
          address: place.address || "",
          neighborhood: place.neighborhood || "",
          locality: place.locality || "",
          slug: place.slug || "",
          lat: loc ? String(loc.lat) : "",
          lng: loc ? String(loc.lng) : "",
          openingHours: place.openingHours || "",
          delivery: {
            available: place.delivery?.available ?? false,
            rappi: place.delivery?.rappi || "",
            pedidosya: place.delivery?.pedidosya || "",
            other: place.delivery?.other || "",
          },
          contact: {
            instagram: place.contact?.instagram || "",
            url: place.contact?.url || "",
            phone: place.contact?.phone || "",
            whatsapp: place.contact?.whatsapp || "",
          },
          tags: syncTagsWithSafety(baseTags, normalizedSafety),
          safetyLevel: normalizedSafety,
          photos: place.photos || [],
          description: place.description || "",
          pickup: Boolean(place.pickup),
          seo: {
            metaTitle: place.seo?.metaTitle || "",
            metaDescription: place.seo?.metaDescription || "",
            canonical: place.seo?.canonical || "",
          },
        })
        setWeekHours(parseOpeningHours(place.openingHours))
        setEditLog(place.editLog || [])
        setUpdatedAt(place.updatedAt || "")
        setAiResearch(place.aiEnrichment)
        if (researchTick === 0) setTab("General")
        setSaveState("saved")
        const q = encodeURIComponent((place.name || "").slice(0, 40))
        if (q.length >= 2) {
          fetch(`/api/admin/places?search=${q}&limit=8`)
            .then((r) => r.json())
            .then((data) => {
              const hits = findDuplicateCandidates(
                {
                  _id: place._id,
                  name: place.name,
                  address: place.address,
                  neighborhood: place.neighborhood,
                  location: place.location,
                  contact: place.contact,
                  type: place.type,
                },
                (data.places || [])
                  .filter((p: { _id: string }) => p._id !== place._id)
                  .map((p: PlaceData) => ({ ...p, kind: "place" as const }))
              )
              setDupes(hits.map((h) => ({ id: h.id, name: h.name, reasons: h.reasons })))
            })
            .catch(() => setDupes([]))
        }
      })
      .catch(() => setError("Error al cargar el lugar"))
      .finally(() => {
        if (!silent) setFetching(false)
        setTimeout(() => {
          skipAuto.current = false
        }, 400)
      })
  }, [open, placeId, researchTick])

  const toggleType = (typeValue: string) => {
    setFormData((prev) => ({
      ...prev,
      types: prev.types.includes(typeValue)
        ? prev.types.filter((t) => t !== typeValue)
        : [...prev.types, typeValue],
      type: prev.types.includes(typeValue) ? prev.type : typeValue,
    }))
    setSaveState("dirty")
  }

  const patchForm = (next: Partial<FormState> | ((prev: FormState) => FormState)) => {
    setFormData((prev) => (typeof next === "function" ? next(prev) : { ...prev, ...next }))
    setSaveState("dirty")
  }

  const buildPayload = () => {
    const loc =
      formData.lat && formData.lng
        ? { lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) }
        : undefined
    return {
      name: formData.name.trim() || undefined,
      status: formData.status || undefined,
      type: formData.types[0] || formData.type || "other",
      types: formData.types.length ? formData.types : undefined,
      address: formData.address.trim() || undefined,
      neighborhood: formData.neighborhood.trim() || undefined,
      location: loc,
      openingHours: formatOpeningHours(weekHours) || formData.openingHours.trim() || undefined,
      delivery: formData.delivery.available
        ? {
            available: true,
            rappi: formData.delivery.rappi?.trim() || undefined,
            pedidosya: formData.delivery.pedidosya?.trim() || undefined,
            other: formData.delivery.other?.trim() || undefined,
          }
        : { available: false },
      contact: {
        instagram: formData.contact.instagram?.trim() || undefined,
        url: formData.contact.url?.trim() || undefined,
        phone: formData.contact.phone?.trim() || undefined,
        whatsapp: formData.contact.whatsapp?.trim() || undefined,
      },
      tags: syncTagsWithSafety(formData.tags, formData.safetyLevel).length
        ? syncTagsWithSafety(formData.tags, formData.safetyLevel)
        : undefined,
      safetyLevel: formData.safetyLevel || undefined,
      photos: formData.photos.length ? formData.photos : undefined,
      description: formData.description.trim() || undefined,
      pickup: formData.pickup,
      slug: formData.slug.trim() || undefined,
      seo: {
        metaTitle: formData.seo.metaTitle.trim() || undefined,
        metaDescription: formData.seo.metaDescription.trim() || undefined,
        canonical: formData.seo.canonical.trim() || undefined,
      },
    }
  }

  const handleSave = async (silent = false) => {
    setError("")
    if (!formData.name.trim() || !formData.address.trim() || !formData.neighborhood.trim()) {
      if (!silent) setError("Nombre, dirección y barrio son obligatorios")
      return
    }
    const geo = await resolveFormLocation({
      address: formData.address,
      lat: formData.lat,
      lng: formData.lng,
      neighborhood: formData.neighborhood,
      mapsUrl: formData.contact.url,
    })
    if (!geo) {
      if (!silent) setError("No se pudo geocodificar la dirección.")
      return
    }
    setLoading(true)
    setSaveState("saving")
    try {
      const payload = {
        ...buildPayload(),
        address: geo.address,
        neighborhood: geo.neighborhood || formData.neighborhood,
        location: { lat: geo.lat, lng: geo.lng },
      }
      const res = await fetch(`/api/places/${placeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        setSaveState("saved")
        setUpdatedAt(new Date().toISOString())
        if (data.slug) setFormData((prev) => ({ ...prev, slug: data.slug }))
        if (data.editLog) setEditLog(data.editLog)
        if (!silent) {
          toast.success("Lugar actualizado")
          onSaved()
          onOpenChange(false)
        }
      } else {
        setSaveState("dirty")
        setError(data.error || "Error al guardar")
      }
    } catch {
      setSaveState("dirty")
      setError("Error al guardar")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open || skipAuto.current || saveState !== "dirty") return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void handleSave(true)
    }, 1400)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [formData, weekHours, saveState, open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault()
        void handleSave(false)
      }
      if ((e.metaKey || e.ctrlKey) && ["1", "2", "3", "4", "5"].includes(e.key)) {
        e.preventDefault()
        setTab(EDIT_TABS[Number(e.key) - 1])
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const copyValue = async (value: string, label: string) => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    toast.success(`${label} copiado`)
  }

  const openValue = (href: string) => {
    if (!href) return
    window.open(href, "_blank", "noopener,noreferrer")
  }

  const mapsHref =
    Number.isFinite(Number(formData.lat)) && Number.isFinite(Number(formData.lng))
      ? `https://www.google.com/maps?q=${formData.lat},${formData.lng}`
      : formData.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.address)}`
        : ""

  const igHref = formData.contact.instagram
    ? formData.contact.instagram.startsWith("http")
      ? formData.contact.instagram
      : `https://instagram.com/${formData.contact.instagram.replace("@", "")}`
    : ""
  const waHref = formData.contact.whatsapp
    ? `https://wa.me/${formData.contact.whatsapp.replace(/\D/g, "")}`
    : ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-[100vw] max-w-[980px] gap-0 overflow-hidden rounded-none border-[#E8E1D6] bg-[#F8F5EF] p-0 text-[#234A33] sm:h-[90vh] sm:max-h-[90vh] sm:rounded-[24px]">
        <div className="flex h-full min-h-0 flex-col">
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#E8E1D6] px-5 py-4">
            <div className="min-w-0">
              <DialogTitle className="truncate font-display text-xl font-extrabold text-[#234A33]">
                {formData.name || "Editar ficha"}
              </DialogTitle>
              <p className="mt-1 truncate text-sm text-[#6B746C]">
                {typeLabel}
                {formData.neighborhood ? ` · ${formData.neighborhood}` : ""}
              </p>
              <p className="mt-1 text-xs text-[#6B746C]">
                {saveState === "saving"
                  ? "Guardando…"
                  : saveState === "dirty"
                    ? "Cambios sin guardar"
                    : "Guardado"}
                {updatedAt
                  ? ` · ${new Date(updatedAt).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                  : ""}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <Link href={publicHref} target="_blank" className={adminUi.btnGhost}>
                Ver ficha pública
              </Link>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={() => void handleSave(false)} disabled={loading || fetching}>
                {loading ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {fetching ? (
              <p className="py-10 text-center text-sm text-[#6B746C]">Cargando ficha…</p>
            ) : (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="min-w-0 space-y-5">
                  <AdminPhotoStudio
                    compact
                    photos={formData.photos}
                    onChange={(urls) => patchForm({ photos: urls })}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", badge.className)}>
                      {badge.label}
                    </span>
                    <span className="text-sm text-[#6B746C]">{typeLabel}</span>
                    <span className="text-sm text-[#6B746C]">{formData.neighborhood}</span>
                  </div>

                  {dupes.length > 0 ? (
                    <div className="rounded-[20px] border border-[#D4A017]/40 bg-[#D4A017]/10 p-4">
                      <p className="text-sm font-semibold text-[#234A33]">Posible duplicado</p>
                      <p className="mt-1 text-sm text-[#6B746C]">
                        {dupes[0].name} · {dupes[0].reasons.slice(0, 2).join(" · ")}
                      </p>
                      <Link href={`/lugar/${dupes[0].id}`} target="_blank" className={cn(adminUi.chip, "mt-3")}>
                        Comparar fichas
                      </Link>
                    </div>
                  ) : null}

                  <PlaceResearchPanel
                    placeId={placeId}
                    placeName={formData.name}
                    aiResearch={aiResearch}
                    onUpdated={() => setResearchTick((n) => n + 1)}
                  />

                  <div
                    className="-mx-1 flex gap-1 overflow-x-auto px-1"
                    data-overflow-allowed="admin-ops-quick"
                  >
                    {EDIT_TABS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setTab(item)}
                        className={cn(
                          "h-10 shrink-0 rounded-full px-3 text-sm font-medium transition-colors duration-150",
                          tab === item
                            ? "bg-[#234A33] text-[#F8F5EF]"
                            : "border border-[#E8E1D6] bg-[#FCFBF8] text-[#6B746C]"
                        )}
                      >
                        {item}
                      </button>
                    ))}
                  </div>

                  {tab === "General" ? (
                    <div className="space-y-4">
                      <div>
                        <Label>Estado</Label>
                        <div className="mt-1 flex gap-2">
                          <Button
                            type="button"
                            variant={formData.status === "approved" ? "default" : "outline"}
                            size="sm"
                            onClick={() => patchForm({ status: "approved" })}
                          >
                            Publicado
                          </Button>
                          <Button
                            type="button"
                            variant={formData.status === "pending" ? "default" : "outline"}
                            size="sm"
                            onClick={() => patchForm({ status: "pending" })}
                          >
                            Pendiente
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label>Nombre</Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => patchForm({ name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Categoría</Label>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {TYPES.map((t) => (
                            <Button
                              key={t.value}
                              type="button"
                              variant={formData.types.includes(t.value) ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleType(t.value)}
                            >
                              {t.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label>Nivel sin gluten</Label>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {[
                            { id: "dedicated_gf", label: "100% sin gluten" },
                            { id: "gf_options", label: "Opciones" },
                            { id: "", label: "Sin definir" },
                          ].map((item) => (
                            <Button
                              key={item.id || "none"}
                              type="button"
                              variant={formData.safetyLevel === item.id ? "default" : "outline"}
                              size="sm"
                              onClick={() =>
                                patchForm((prev) => ({
                                  ...prev,
                                  safetyLevel: item.id,
                                  tags: syncTagsWithSafety(prev.tags, item.id),
                                }))
                              }
                            >
                              {item.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label>Descripción</Label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => patchForm({ description: e.target.value })}
                          rows={4}
                          className="mt-1 w-full rounded-2xl border border-[#E8E1D6] bg-[#FCFBF8] px-3 py-2 text-sm text-[#234A33] outline-none"
                          placeholder="Cómo se ve y se come este lugar."
                        />
                      </div>
                    </div>
                  ) : null}

                  {tab === "Ubicación" ? (
                    <div className="space-y-4">
                      <div>
                        <Label>Dirección</Label>
                        <AddressAutocomplete
                          value={formData.address}
                          onChange={(addr) => patchForm({ address: addr })}
                          onSelect={(r) =>
                            patchForm({
                              address: r.address,
                              lat: String(r.lat),
                              lng: String(r.lng),
                              neighborhood: r.neighborhood || "Otro",
                            })
                          }
                          placeholder="Buscar en Google Maps"
                        />
                      </div>
                      <div className="overflow-hidden rounded-[24px] border border-[#E8E1D6]">
                        {Number.isFinite(Number(formData.lat)) && Number.isFinite(Number(formData.lng)) ? (
                          <LocationPinPreview
                            lat={Number(formData.lat)}
                            lng={Number(formData.lng)}
                            address={formData.address}
                            onAdjust={() => setMapPickerOpen(true)}
                          />
                        ) : (
                          <div className="flex h-56 items-center justify-center text-sm text-[#6B746C]">
                            Todavía no hay pin
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setMapPickerOpen(true)}>
                          Ajustar pin
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => copyValue(`${formData.lat}, ${formData.lng}`, "Coordenadas")}
                          disabled={!formData.lat}
                        >
                          Copiar coordenadas
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => openValue(mapsHref)} disabled={!mapsHref}>
                          Ver en Maps
                        </Button>
                      </div>
                      <MapPickerModal
                        open={mapPickerOpen}
                        onOpenChange={setMapPickerOpen}
                        initialLocation={
                          Number.isFinite(Number(formData.lat)) && Number.isFinite(Number(formData.lng))
                            ? {
                                lat: Number(formData.lat),
                                lng: Number(formData.lng),
                                address: formData.address,
                                neighborhood: formData.neighborhood,
                              }
                            : null
                        }
                        onSelect={(result) =>
                          patchForm((prev) => ({
                            ...prev,
                            address: result.address,
                            lat: String(result.lat),
                            lng: String(result.lng),
                            neighborhood: result.neighborhood || prev.neighborhood || "Otro",
                          }))
                        }
                      />
                      <div>
                        <Label>Localidad / barrio</Label>
                        <Input
                          value={formData.neighborhood}
                          onChange={(e) => patchForm({ neighborhood: e.target.value })}
                          list="localities-list"
                        />
                        <datalist id="localities-list">
                          {LOCALITIES.map((loc) => (
                            <option key={loc} value={loc} />
                          ))}
                        </datalist>
                      </div>
                      <div>
                        <Label>Coordenadas</Label>
                        <p className="mt-1 text-sm text-[#6B746C]">
                          {formData.lat && formData.lng ? `${formData.lat}, ${formData.lng}` : "Sin pin"}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {tab === "Contacto" ? (
                    <div className="space-y-4">
                      <div>
                        <Label>Instagram</Label>
                        <Input
                          value={formData.contact.instagram}
                          onChange={(e) =>
                            patchForm((prev) => ({
                              ...prev,
                              contact: { ...prev.contact, instagram: e.target.value },
                            }))
                          }
                          placeholder="@usuario"
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => openValue(igHref)} disabled={!igHref}>
                            Abrir
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => copyValue(formData.contact.instagram, "Instagram")}
                            disabled={!formData.contact.instagram}
                          >
                            Copiar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              openValue(igHref)
                              toast.message("Revisá que el perfil abra bien")
                            }}
                            disabled={!igHref}
                          >
                            Verificar
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label>WhatsApp</Label>
                        <Input
                          value={formData.contact.whatsapp}
                          onChange={(e) =>
                            patchForm((prev) => ({
                              ...prev,
                              contact: { ...prev.contact, whatsapp: e.target.value },
                            }))
                          }
                          placeholder="+54 11 1234-5678"
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => openValue(waHref)} disabled={!waHref}>
                            Probar enlace
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              patchForm((prev) => ({
                                ...prev,
                                contact: {
                                  ...prev.contact,
                                  whatsapp: normalizeArWhatsapp(prev.contact.whatsapp),
                                },
                              }))
                            }
                            disabled={!formData.contact.whatsapp}
                          >
                            Normalizar número
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label>Teléfono</Label>
                        <Input
                          value={formData.contact.phone}
                          onChange={(e) =>
                            patchForm((prev) => ({
                              ...prev,
                              contact: { ...prev.contact, phone: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Sitio web</Label>
                        <Input
                          value={formData.contact.url}
                          onChange={(e) =>
                            patchForm((prev) => ({
                              ...prev,
                              contact: { ...prev.contact, url: e.target.value },
                            }))
                          }
                          onBlur={async (e) => {
                            const raw = e.target.value.trim()
                            if (!normalizeGoogleMapsUrl(raw)) return
                            const geo = await geocodeAddress(raw)
                            if (!geo) return
                            patchForm((prev) => ({
                              ...applyGeoToForm(prev, geo),
                              contact: { ...prev.contact, url: raw },
                            }))
                          }}
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openValue(formData.contact.url)}
                            disabled={!formData.contact.url}
                          >
                            Abrir
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => copyValue(formData.contact.url, "Sitio")}
                            disabled={!formData.contact.url}
                          >
                            Copiar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {tab === "Operación" ? (
                    <div className="space-y-4">
                      <div>
                        <Label>Horarios</Label>
                        <div className="mt-2">
                          <HoursEditor
                            value={weekHours}
                            onChange={(next) => {
                              setWeekHours(next)
                              setSaveState("dirty")
                            }}
                          />
                        </div>
                      </div>
                      <label className="flex h-11 items-center gap-2 text-sm text-[#234A33]">
                        <input
                          type="checkbox"
                          checked={formData.delivery.available}
                          onChange={(e) =>
                            patchForm((prev) => ({
                              ...prev,
                              delivery: { ...prev.delivery, available: e.target.checked },
                            }))
                          }
                        />
                        Delivery
                      </label>
                      <label className="flex h-11 items-center gap-2 text-sm text-[#234A33]">
                        <input
                          type="checkbox"
                          checked={formData.pickup}
                          onChange={(e) => patchForm({ pickup: e.target.checked })}
                        />
                        Retiro
                      </label>
                      <div>
                        <Label>Tags</Label>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {PLACE_TAGS.filter((t) => !["sin_info", "100_gf", "opciones_sin_tacc"].includes(t.value)).map(
                            (t) => (
                              <Button
                                key={t.value}
                                type="button"
                                variant={formData.tags.includes(t.value) ? "default" : "outline"}
                                size="sm"
                                onClick={() =>
                                  patchForm((prev) => ({
                                    ...prev,
                                    tags: prev.tags.includes(t.value)
                                      ? prev.tags.filter((x) => x !== t.value)
                                      : [...prev.tags, t.value],
                                  }))
                                }
                              >
                                {t.label}
                              </Button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {tab === "SEO" ? (
                    <div className="space-y-4">
                      <div>
                        <Label>Slug</Label>
                        <Input value={formData.slug} onChange={(e) => patchForm({ slug: e.target.value })} />
                      </div>
                      <div>
                        <Label>Meta título</Label>
                        <Input
                          value={formData.seo.metaTitle}
                          onChange={(e) =>
                            patchForm((prev) => ({
                              ...prev,
                              seo: { ...prev.seo, metaTitle: e.target.value },
                            }))
                          }
                          placeholder={formData.name}
                        />
                      </div>
                      <div>
                        <Label>Meta descripción</Label>
                        <textarea
                          value={formData.seo.metaDescription}
                          onChange={(e) =>
                            patchForm((prev) => ({
                              ...prev,
                              seo: { ...prev.seo, metaDescription: e.target.value },
                            }))
                          }
                          rows={3}
                          className="mt-1 w-full rounded-2xl border border-[#E8E1D6] bg-[#FCFBF8] px-3 py-2 text-sm text-[#234A33] outline-none"
                        />
                      </div>
                      <div>
                        <Label>Canonical</Label>
                        <Input
                          value={formData.seo.canonical}
                          onChange={(e) =>
                            patchForm((prev) => ({
                              ...prev,
                              seo: { ...prev.seo, canonical: e.target.value },
                            }))
                          }
                          placeholder={`https://www.celimap.com.ar${publicHref}`}
                        />
                      </div>
                    </div>
                  ) : null}

                  {error ? (
                    <p className="rounded-2xl bg-[#C85A2E]/10 p-3 text-sm text-[#C85A2E]">{error}</p>
                  ) : null}
                </div>

                <aside className="space-y-4">
                  <article className={cn(adminUi.card, "overflow-hidden")}>
                    <div className="relative h-36 bg-[#E8E1D6]">
                      {formData.photos[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={formData.photos[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center font-display text-xl font-bold text-[#234A33]">
                          {(formData.name || "CM").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", badge.className)}>
                        {badge.label}
                      </span>
                      <p className="mt-2 font-display text-lg font-extrabold text-[#234A33]">
                        {formData.name || "Nombre del lugar"}
                      </p>
                      <p className="mt-1 text-sm text-[#6B746C]">
                        {typeLabel}
                        {formData.neighborhood ? ` · ${formData.neighborhood}` : ""}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <span className={adminUi.chip}>Cómo llegar</span>
                        <span className={adminUi.chip}>Guardar</span>
                      </div>
                    </div>
                  </article>

                  <article className={cn(adminUi.card, "p-4")}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[#234A33]">Calidad de la ficha</p>
                      <span className={cn("text-sm font-semibold tabular-nums", completenessTone(pct))}>{pct}%</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-[#E8E1D6]">
                      <div className={cn("h-full rounded-full", completenessBarTone(pct))} style={{ width: `${pct}%` }} />
                    </div>
                    <ul className="mt-3 space-y-2">
                      {quality.map((row) => (
                        <li key={row.id} className="flex items-center justify-between text-sm">
                          <span className="text-[#6B746C]">{row.label}</span>
                          <span className={row.ok ? "text-[#2D6A4F]" : "text-[#D4A017]"}>
                            {row.ok ? "Listo" : "Falta"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </article>

                  <article className={cn(adminUi.card, "p-4")}>
                    <p className="text-sm font-semibold text-[#234A33]">Últimas modificaciones</p>
                    {editLog.length === 0 ? (
                      <p className="mt-2 text-sm text-[#6B746C]">
                        {updatedAt
                          ? `Última edición ${new Date(updatedAt).toLocaleDateString("es-AR")}`
                          : "Todavía no hay historial."}
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {(historyOpen ? editLog : editLog.slice(0, 3)).map((item, i) => (
                          <li key={`${item.at}-${i}`} className="text-sm">
                            <p className="text-[#234A33]">{item.by || "Admin"}</p>
                            <p className="text-[#6B746C]">
                              {item.at
                                ? new Date(item.at).toLocaleString("es-AR", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                              {item.fields?.length ? ` · ${item.fields.slice(0, 3).join(", ")}` : ""}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                    {editLog.length > 3 ? (
                      <button
                        type="button"
                        className={cn(adminUi.chip, "mt-3")}
                        onClick={() => setHistoryOpen((v) => !v)}
                      >
                        {historyOpen ? "Ocultar" : "Ver historial completo"}
                      </button>
                    ) : null}
                  </article>
                </aside>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
