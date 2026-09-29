"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { AdminPhotoStudio } from "@/components/admin/ops/AdminPhotoStudio"
import type { VentureItem } from "@/components/admin/types"
import {
  VENTURE_CATEGORIES,
  VENTURE_MODALITIES,
  VENTURE_SAFETY_LEVELS,
  getCategoryLabels,
  getSafetyBadge,
  getVentureCategories,
  type VentureCategoryId,
  type VentureModalityId,
  type VentureSafetyLevelId,
} from "@/lib/venture-constants"
import { normalizeWhatsAppUrl } from "@/lib/venture-contact"
import { normalizeArWhatsapp } from "@/lib/ar-whatsapp"
import { completenessBarTone, completenessTone } from "@/lib/place-completeness"
import { adminUi } from "@/lib/admin-ui"
import { cn } from "@/lib/utils"

/** Mismo esqueleto que PlaceEditModal: pestañas, autoguardado, Ctrl+S, vista previa. */
const EDIT_TABS = ["General", "Zona y venta", "Contacto", "SEO"] as const

type FormState = {
  status: "approved" | "pending"
  name: string
  categories: VentureCategoryId[]
  safetyLevel: VentureSafetyLevelId
  certifiedProducts: boolean
  description: string
  zone: string
  modalities: VentureModalityId[]
  purchaseChannels: string
  responsibleEmail: string
  instagram: string
  whatsapp: string
  photos: string[]
  slug: string
}

function formFromVenture(v: VentureItem): FormState {
  return {
    status: v.status === "pending" ? "pending" : "approved",
    name: v.name ?? "",
    categories: getVentureCategories(v) as VentureCategoryId[],
    safetyLevel: (v.safetyLevel as VentureSafetyLevelId) || "to_confirm",
    certifiedProducts: Boolean(v.certifiedProducts),
    description: v.description ?? "",
    zone: v.zone ?? "",
    modalities: (v.modalities ?? []) as VentureModalityId[],
    purchaseChannels: v.purchaseChannels ?? "",
    responsibleEmail: v.responsibleEmail ?? "",
    instagram: v.contact?.instagram ?? "",
    whatsapp: v.contact?.whatsapp ?? "",
    photos: v.photos ?? [],
    slug: v.slug ?? "",
  }
}

function ventureQualityChecks(f: FormState) {
  return [
    { id: "photo", label: "Foto", ok: f.photos.length > 0 },
    { id: "categories", label: "Categoría", ok: f.categories.length > 0 },
    { id: "zone", label: "Zona", ok: Boolean(f.zone.trim()) },
    { id: "contact", label: "Instagram o WhatsApp", ok: Boolean(f.instagram.trim() || f.whatsapp.trim()) },
    { id: "modalities", label: "Modalidad", ok: f.modalities.length > 0 },
    { id: "purchase", label: "Dónde comprar", ok: Boolean(f.purchaseChannels.trim()) },
    { id: "description", label: "Descripción", ok: f.description.trim().length >= 40 },
  ]
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value]
}

type Props = {
  venture: VentureItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function VentureEditModal({ venture, open, onOpenChange, onSaved }: Props) {
  const [formData, setFormData] = useState<FormState>(() => formFromVenture(venture))
  const [tab, setTab] = useState<(typeof EDIT_TABS)[number]>("General")
  const [saveState, setSaveState] = useState<"saved" | "dirty" | "saving">("saved")
  const [updatedAt, setUpdatedAt] = useState(venture.updatedAt ?? "")
  const [error, setError] = useState("")
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedSomething = useRef(false)

  useEffect(() => {
    if (!open) return
    setFormData(formFromVenture(venture))
    setUpdatedAt(venture.updatedAt ?? "")
    setSaveState("saved")
    setTab("General")
    setError("")
    savedSomething.current = false
  }, [open, venture])

  const patchForm = (next: Partial<FormState> | ((prev: FormState) => FormState)) => {
    setFormData((prev) => (typeof next === "function" ? next(prev) : { ...prev, ...next }))
    setSaveState("dirty")
  }

  const quality = ventureQualityChecks(formData)
  const pct = Math.round((quality.filter((q) => q.ok).length / quality.length) * 100)
  const badge = getSafetyBadge(formData.safetyLevel)
  const categoryLabel = getCategoryLabels(formData.categories).join(" · ") || "Sin categoría"
  const publicHref = `/emprendimientos/${formData.slug || venture._id}`

  const igHandle = formData.instagram.trim()
  const igHref = igHandle
    ? igHandle.startsWith("http")
      ? igHandle
      : `https://instagram.com/${igHandle.replace("@", "")}`
    : ""
  const waHref = normalizeWhatsAppUrl(formData.whatsapp) ?? ""

  const handleSave = async (silent = false) => {
    setError("")
    if (!formData.name.trim() || !formData.zone.trim() || formData.categories.length === 0) {
      if (!silent) setError("Nombre, zona y al menos una categoría son obligatorios")
      return
    }
    const email = formData.responsibleEmail.trim()
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (!silent) setError("El email del responsable no es válido")
      return
    }
    setSaveState("saving")
    try {
      // Strings vacíos (no undefined) para que borrar un campo lo borre en la base.
      const res = await fetch(`/api/admin/ventures/${venture._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: formData.status,
          name: formData.name.trim(),
          categories: formData.categories,
          safetyLevel: formData.safetyLevel,
          certifiedProducts: formData.certifiedProducts,
          description: formData.description.trim(),
          zone: formData.zone.trim(),
          modalities: formData.modalities,
          purchaseChannels: formData.purchaseChannels.trim(),
          responsibleEmail: email,
          contact: { instagram: igHandle, whatsapp: formData.whatsapp.trim() },
          photos: formData.photos,
          ...(formData.slug.trim().length >= 2 ? { slug: formData.slug.trim() } : {}),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "No se pudieron guardar los cambios")
      savedSomething.current = true
      setSaveState("saved")
      setUpdatedAt(new Date().toISOString())
      const savedSlug = data.venture?.slug
      if (savedSlug) setFormData((prev) => ({ ...prev, slug: savedSlug }))
      if (!silent) {
        toast.success("Emprendimiento actualizado")
        onSaved()
        onOpenChange(false)
      }
    } catch (e) {
      setSaveState("dirty")
      setError(e instanceof Error ? e.message : "Error al guardar")
    }
  }

  useEffect(() => {
    if (!open || saveState !== "dirty") return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void handleSave(true)
    }, 1400)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, saveState, open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault()
        void handleSave(false)
      }
      if ((e.metaKey || e.ctrlKey) && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault()
        setTab(EDIT_TABS[Number(e.key) - 1])
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const close = (next: boolean) => {
    // El autoguardado pudo haber guardado: refrescar la lista al cerrar.
    if (!next && savedSomething.current) onSaved()
    onOpenChange(next)
  }

  const copyValue = async (value: string, label: string) => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    toast.success(`${label} copiado`)
  }

  const openValue = (href: string) => {
    if (!href) return
    window.open(href, "_blank", "noopener,noreferrer")
  }

  const chip = (active: boolean) =>
    cn(
      "h-9 rounded-full border px-3 text-sm font-medium transition-colors",
      active
        ? "border-[#234A33] bg-[#234A33] text-[#F8F5EF]"
        : "border-[#E8E1D6] bg-[#FCFBF8] text-[#234A33] hover:border-[#234A33]/40"
    )

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-[100vw] max-w-[980px] gap-0 overflow-hidden rounded-none border-[#E8E1D6] bg-[#F8F5EF] p-0 text-[#234A33] sm:h-[90vh] sm:max-h-[90vh] sm:rounded-[24px]">
        <div className="flex h-full min-h-0 flex-col">
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#E8E1D6] px-5 py-4">
            <div className="min-w-0">
              <DialogTitle className="truncate font-display text-xl font-extrabold text-[#234A33]">
                {formData.name || "Editar emprendimiento"}
              </DialogTitle>
              <p className="mt-1 truncate text-sm text-[#6B746C]">
                {categoryLabel}
                {formData.zone ? ` · ${formData.zone}` : ""}
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
              <Button variant="outline" onClick={() => close(false)} disabled={saveState === "saving"}>
                Cerrar
              </Button>
              <Button onClick={() => void handleSave(false)} disabled={saveState === "saving"}>
                {saveState === "saving" ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="min-w-0 space-y-5">
                <AdminPhotoStudio
                  compact
                  folder="ventures"
                  photos={formData.photos}
                  onChange={(urls) => patchForm({ photos: urls.slice(0, 3) })}
                />

                <div className="-mx-1 flex gap-1 overflow-x-auto px-1" data-overflow-allowed="admin-ops-quick">
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
                          Oculto
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Nombre</Label>
                      <Input value={formData.name} onChange={(e) => patchForm({ name: e.target.value })} />
                    </div>
                    <div>
                      <Label>Categorías</Label>
                      <p className="text-xs text-[#6B746C]">La primera que marques es la principal (ícono y SEO).</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {VENTURE_CATEGORIES.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            aria-pressed={formData.categories.includes(c.id)}
                            className={chip(formData.categories.includes(c.id))}
                            onClick={() => patchForm((prev) => ({ ...prev, categories: toggle(prev.categories, c.id) }))}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Nivel sin gluten</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {VENTURE_SAFETY_LEVELS.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            aria-pressed={formData.safetyLevel === s.id}
                            className={chip(formData.safetyLevel === s.id)}
                            onClick={() => patchForm({ safetyLevel: s.id })}
                          >
                            <span aria-hidden className="mr-1">{s.dot}</span>
                            {s.label}
                          </button>
                        ))}
                      </div>
                      {formData.safetyLevel === "gf_options" ? (
                        <p className="mt-2 text-xs text-[#C85A2E]">
                          Con “opciones” no aparece en el catálogo público (solo 100% sin gluten).
                        </p>
                      ) : null}
                    </div>
                    <label className="flex h-11 items-center gap-2 text-sm text-[#234A33]">
                      <input
                        type="checkbox"
                        checked={formData.certifiedProducts}
                        onChange={(e) => patchForm({ certifiedProducts: e.target.checked })}
                      />
                      Tiene productos certificados
                    </label>
                    <div>
                      <Label>Descripción</Label>
                      <textarea
                        value={formData.description}
                        maxLength={2000}
                        onChange={(e) => patchForm({ description: e.target.value })}
                        rows={4}
                        className="mt-1 w-full rounded-2xl border border-[#E8E1D6] bg-[#FCFBF8] px-3 py-2 text-sm text-[#234A33] outline-none"
                        placeholder="Qué hace, qué recomiendan probar, cómo trabaja."
                      />
                    </div>
                  </div>
                ) : null}

                {tab === "Zona y venta" ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Ciudad / zona</Label>
                      <Input
                        value={formData.zone}
                        maxLength={150}
                        onChange={(e) => patchForm({ zone: e.target.value })}
                        placeholder="Ej: CABA, La Plata, Rosario"
                      />
                    </div>
                    <div>
                      <Label>Modalidades</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {VENTURE_MODALITIES.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            aria-pressed={formData.modalities.includes(m.id)}
                            className={chip(formData.modalities.includes(m.id))}
                            onClick={() => patchForm((prev) => ({ ...prev, modalities: toggle(prev.modalities, m.id) }))}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Dónde comprar</Label>
                      <textarea
                        value={formData.purchaseChannels}
                        maxLength={1000}
                        onChange={(e) => patchForm({ purchaseChannels: e.target.value })}
                        rows={3}
                        className="mt-1 w-full rounded-2xl border border-[#E8E1D6] bg-[#FCFBF8] px-3 py-2 text-sm text-[#234A33] outline-none"
                        placeholder="Ferias, retiro en..., links de tienda"
                      />
                    </div>
                  </div>
                ) : null}

                {tab === "Contacto" ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Instagram</Label>
                      <Input
                        value={formData.instagram}
                        maxLength={500}
                        onChange={(e) => patchForm({ instagram: e.target.value })}
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
                          onClick={() => copyValue(formData.instagram, "Instagram")}
                          disabled={!formData.instagram}
                        >
                          Copiar
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>WhatsApp</Label>
                      <Input
                        value={formData.whatsapp}
                        maxLength={50}
                        type="tel"
                        onChange={(e) => patchForm({ whatsapp: e.target.value })}
                        placeholder="+54 9 11 1234-5678"
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => openValue(waHref)} disabled={!waHref}>
                          Probar enlace
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => patchForm((prev) => ({ ...prev, whatsapp: normalizeArWhatsapp(prev.whatsapp) }))}
                          disabled={!formData.whatsapp}
                        >
                          Normalizar número
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Email del responsable</Label>
                      <p className="text-xs text-[#6B746C]">Privado: no se muestra en la ficha.</p>
                      <Input
                        type="email"
                        maxLength={254}
                        value={formData.responsibleEmail}
                        onChange={(e) => patchForm({ responsibleEmail: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                ) : null}

                {tab === "SEO" ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Slug</Label>
                      <Input
                        value={formData.slug}
                        maxLength={120}
                        onChange={(e) => patchForm({ slug: e.target.value })}
                      />
                      <p className="mt-1 text-xs text-[#6B746C]">
                        URL: /emprendimientos/{formData.slug || "…"}. Si lo cambiás, los links viejos dejan de funcionar.
                      </p>
                    </div>
                  </div>
                ) : null}

                {error ? <p className="rounded-2xl bg-[#C85A2E]/10 p-3 text-sm text-[#C85A2E]">{error}</p> : null}
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
                    <span className="rounded-full border border-[#E8E1D6] px-2 py-0.5 text-[11px] font-semibold">
                      <span aria-hidden className="mr-1">{badge.dot}</span>
                      {badge.label}
                    </span>
                    <p className="mt-2 font-display text-lg font-extrabold text-[#234A33]">
                      {formData.name || "Nombre del emprendimiento"}
                    </p>
                    <p className="mt-1 text-sm text-[#6B746C]">
                      {categoryLabel}
                      {formData.zone ? ` · ${formData.zone}` : ""}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {formData.whatsapp ? <span className={adminUi.chip}>WhatsApp</span> : null}
                      {formData.instagram ? <span className={adminUi.chip}>Instagram</span> : null}
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
                        <span className={row.ok ? "text-[#2D6A4F]" : "text-[#D4A017]"}>{row.ok ? "Listo" : "Falta"}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </aside>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
