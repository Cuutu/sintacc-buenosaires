"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AddressAutocomplete } from "@/components/address-autocomplete"
import { MapPickerModal } from "@/components/map-picker-modal"
import { geocodeAddress } from "@/lib/geocode"
import { toast } from "sonner"
import { TYPES, PLACE_TAGS } from "@/lib/constants"
import { MapPin, Link2, ChevronDown, ChevronUp, ArrowLeft, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Mode = "quick" | "full" | null
type Step = 0 | 1 | 2

interface QuickData {
  sourceLink: string
  safetyLevel: "" | "dedicated_gf" | "gf_options"
  name: string
}

interface FormData {
  name: string
  types: string[]
  address: string
  neighborhood: string
  lat: string
  lng: string
  addressText: string
  locationPrecision: "exact" | "approx"
  userProvidedNeighborhood: string
  userProvidedReference: string
  tags: string[]
  openingHours: string
  delivery: { available: boolean; rappi: string; pedidosya: string; other: string }
  contact: { instagram: string; whatsapp: string; phone: string; url: string }
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function SugerirPage() {
  const { data: session } = useSession()
  const router = useRouter()

  const [step, setStep] = useState<Step>(0)
  const [mode, setMode] = useState<Mode>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showOptional, setShowOptional] = useState(false)
  const [mapPickerOpen, setMapPickerOpen] = useState(false)

  const [quickData, setQuickData] = useState<QuickData>({
    sourceLink: "",
    safetyLevel: "",
    name: "",
  })

  const [formData, setFormData] = useState<FormData>({
    name: "",
    types: [],
    address: "",
    neighborhood: "",
    lat: "",
    lng: "",
    addressText: "",
    locationPrecision: "exact",
    userProvidedNeighborhood: "",
    userProvidedReference: "",
    tags: [],
    openingHours: "",
    delivery: { available: false, rappi: "", pedidosya: "", other: "" },
    contact: { instagram: "", whatsapp: "", phone: "", url: "" },
  })

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const progressPercent = step === 0 ? 0 : step === 1 ? 50 : 100

  const toggleType = (v: string) =>
    setFormData((p) => ({
      ...p,
      types: p.types.includes(v) ? p.types.filter((t) => t !== v) : [...p.types, v],
    }))

  const toggleTag = (v: string) =>
    setFormData((p) => ({
      ...p,
      tags: p.tags.includes(v) ? p.tags.filter((t) => t !== v) : [...p.tags, v],
    }))

  // ─── Submit modo rápido ──────────────────────────────────────────────────────

  const handleQuickSubmit = async () => {
    if (!quickData.sourceLink.trim() || !quickData.safetyLevel) {
      setError("Completá el link y el nivel de seguridad")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceLink: quickData.sourceLink.trim(),
          safetyLevel: quickData.safetyLevel,
          name: quickData.name.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al crear sugerencia")
      setStep(2)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al enviar")
    } finally {
      setLoading(false)
    }
  }

  // ─── Submit modo completo ────────────────────────────────────────────────────

  const handleFullSubmit = async () => {
    setError("")

    if (formData.types.length === 0) {
      setError("Seleccioná al menos un tipo de lugar")
      return
    }

    let dataToSubmit = formData

    if ((!formData.lat || !formData.lng) && formData.address.trim()) {
      const geo = await geocodeAddress(formData.address)
      if (geo) {
        dataToSubmit = {
          ...formData,
          address: geo.address,
          lat: geo.lat.toString(),
          lng: geo.lng.toString(),
          neighborhood: geo.neighborhood || "Otro",
        }
      } else {
        setError("No se pudo encontrar la dirección. Seleccionala de la lista o usá el mapa.")
        return
      }
    } else if (!formData.lat || !formData.lng) {
      setError("Agregá una dirección y seleccionala de la lista.")
      return
    }

    setLoading(true)
    try {
      const payload = {
        ...dataToSubmit,
        types: dataToSubmit.types,
        openingHours: dataToSubmit.openingHours || undefined,
        delivery: dataToSubmit.delivery.available
          ? {
              available: true,
              rappi: dataToSubmit.delivery.rappi.trim() || undefined,
              pedidosya: dataToSubmit.delivery.pedidosya.trim() || undefined,
              other: dataToSubmit.delivery.other.trim() || undefined,
            }
          : undefined,
        location: { lat: parseFloat(dataToSubmit.lat), lng: parseFloat(dataToSubmit.lng) },
        addressText: dataToSubmit.addressText || undefined,
        locationPrecision: dataToSubmit.locationPrecision || "exact",
        userProvidedNeighborhood: dataToSubmit.userProvidedNeighborhood.trim() || undefined,
        userProvidedReference: dataToSubmit.userProvidedReference.trim() || undefined,
      }

      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al crear sugerencia")
      setStep(2)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al enviar")
    } finally {
      setLoading(false)
    }
  }

  // ─── Barra de progreso ───────────────────────────────────────────────────────

  const ProgressBar = () => (
    <div className="w-full h-1 bg-muted rounded-full overflow-hidden mb-6">
      <div
        className="h-full bg-primary rounded-full transition-all duration-500"
        style={{ width: `${progressPercent}%` }}
      />
    </div>
  )

  // ─── Guard: sin sesión ───────────────────────────────────────────────────────

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md">
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <p className="text-muted-foreground">
              Iniciá sesión para sugerir un lugar
            </p>
            <Button onClick={() => router.push("/login")}>Iniciar sesión</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Step 2: Confirmación ────────────────────────────────────────────────────

  if (step === 2) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md">
        <ProgressBar />
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-1">¡Gracias por la sugerencia!</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                La revisamos en las próximas 48 horas. Si todo está bien, la sumamos al mapa.
              </p>
            </div>
            <div className="flex gap-3 mt-2 flex-wrap justify-center">
              <Button onClick={() => router.push("/mapa")}>
                Ver en el mapa
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStep(0)
                  setMode(null)
                  setQuickData({ sourceLink: "", safetyLevel: "", name: "" })
                  setFormData({
                    name: "", types: [], address: "", neighborhood: "",
                    lat: "", lng: "", addressText: "", locationPrecision: "exact",
                    userProvidedNeighborhood: "", userProvidedReference: "",
                    tags: [], openingHours: "",
                    delivery: { available: false, rappi: "", pedidosya: "", other: "" },
                    contact: { instagram: "", whatsapp: "", phone: "", url: "" },
                  })
                }}
              >
                Sugerir otro
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Step 0: Elegir modo ─────────────────────────────────────────────────────

  if (step === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <button
          onClick={() => router.push("/mapa")}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al mapa
        </button>

        <ProgressBar />

        <h1 className="text-2xl font-bold mb-1">Sugerir un lugar</h1>
        <p className="text-muted-foreground text-sm mb-6">
          ¿Qué info tenés del lugar? Elegí según lo que sabés.
        </p>

        <div className="grid gap-3">
          <button
            onClick={() => setMode("quick")}
            className={cn(
              "text-left rounded-xl border-2 p-5 transition-all",
              mode === "quick"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-border/80 hover:bg-muted/40"
            )}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔗</span>
              <div className="flex-1">
                <div className="font-semibold flex items-center justify-between">
                  Solo tengo el link
                  {mode === "quick" && (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Instagram, Google Maps, o cualquier red social. Lo completamos nosotros.
                </p>
                <span className="inline-block mt-2 text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5">
                  ⚡ 30 segundos
                </span>
              </div>
            </div>
          </button>

          <button
            onClick={() => setMode("full")}
            className={cn(
              "text-left rounded-xl border-2 p-5 transition-all",
              mode === "full"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-border/80 hover:bg-muted/40"
            )}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">📋</span>
              <div className="flex-1">
                <div className="font-semibold flex items-center justify-between">
                  Tengo los datos completos
                  {mode === "full" && (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Nombre, dirección, tipo de lugar y nivel de seguridad.
                </p>
                <span className="inline-block mt-2 text-xs font-medium text-muted-foreground bg-muted rounded-full px-2.5 py-0.5">
                  📝 ~2 minutos
                </span>
              </div>
            </div>
          </button>
        </div>

        <Button
          className="w-full mt-6"
          disabled={!mode}
          onClick={() => setStep(1)}
        >
          Continuar
        </Button>
      </div>
    )
  }

  // ─── Step 1A: Modo rápido ────────────────────────────────────────────────────

  if (step === 1 && mode === "quick") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <button
          onClick={() => { setStep(0); setError("") }}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Cambiar modo
        </button>

        <ProgressBar />

        <h1 className="text-2xl font-bold mb-1">Pegá el link</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Nos encargamos de completar el resto cuando lo revisemos.
        </p>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label>
              Link del lugar <span className="text-primary">*</span>
            </Label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="instagram.com/... o maps.google.com/..."
                value={quickData.sourceLink}
                onChange={(e) => setQuickData({ ...quickData, sourceLink: e.target.value })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Instagram, Google Maps, Facebook, TikTok...
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>
              ¿Es 100% apto o tiene opciones? <span className="text-primary">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setQuickData({ ...quickData, safetyLevel: "dedicated_gf" })}
                className={cn(
                  "rounded-lg border-2 p-3 text-center transition-all",
                  quickData.safetyLevel === "dedicated_gf"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-border/80"
                )}
              >
                <div className="text-xl mb-1">✅</div>
                <div className="text-sm font-semibold">100% sin TACC</div>
                <div className="text-xs text-muted-foreground">Solo hace sin gluten</div>
              </button>
              <button
                type="button"
                onClick={() => setQuickData({ ...quickData, safetyLevel: "gf_options" })}
                className={cn(
                  "rounded-lg border-2 p-3 text-center transition-all",
                  quickData.safetyLevel === "gf_options"
                    ? "border-yellow-500 bg-yellow-500/5"
                    : "border-border hover:border-border/80"
                )}
              >
                <div className="text-xl mb-1">🟡</div>
                <div className="text-sm font-semibold">Tiene opciones</div>
                <div className="text-xs text-muted-foreground">También tiene con TACC</div>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Nombre del lugar (opcional)</Label>
            <Input
              placeholder="Si lo sabés..."
              value={quickData.name}
              onChange={(e) => setQuickData({ ...quickData, name: e.target.value })}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <Button
            className="w-full"
            disabled={loading || !quickData.sourceLink.trim() || !quickData.safetyLevel}
            onClick={handleQuickSubmit}
          >
            {loading ? "Enviando..." : "🚀 Enviar sugerencia"}
          </Button>
        </div>
      </div>
    )
  }

  // ─── Step 1B: Modo completo ──────────────────────────────────────────────────

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <button
        onClick={() => { setStep(0); setError("") }}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Cambiar modo
      </button>

      <ProgressBar />

      <h1 className="text-2xl font-bold mb-1">Datos del lugar</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Los campos opcionales los podés completar o dejar vacíos — los revisamos antes de publicar.
      </p>

      <div className="space-y-5">
        {/* Nombre */}
        <div className="space-y-1.5">
          <Label>Nombre <span className="text-primary">*</span></Label>
          <Input
            placeholder="Ej: Panadería El Trigo Libre"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        {/* Tipo */}
        <div className="space-y-1.5">
          <Label>Tipo <span className="text-primary">*</span></Label>
          <p className="text-xs text-muted-foreground">Podés elegir más de uno</p>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => toggleType(type.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all",
                  formData.types.includes(type.value)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-border/80 text-muted-foreground"
                )}
              >
                {type.emoji} {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dirección */}
        <div className="space-y-1.5">
          <Label>Dirección <span className="text-primary">*</span></Label>
          <div className="flex gap-2">
            <AddressAutocomplete
              value={formData.address}
              onChange={(address) => setFormData({ ...formData, address })}
              onSelect={(result) =>
                setFormData({
                  ...formData,
                  address: result.address,
                  lat: result.lat.toString(),
                  lng: result.lng.toString(),
                  neighborhood: result.neighborhood || "Otro",
                })
              }
              placeholder="Escribí y seleccioná de la lista..."
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setMapPickerOpen(true)}
              title="Ubicar en el mapa"
            >
              <MapPin className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            ¿No encontrás la dirección?{" "}
            <button
              type="button"
              onClick={() => setMapPickerOpen(true)}
              className="text-primary hover:underline"
            >
              Ubicala en el mapa
            </button>
          </p>
        </div>

        <MapPickerModal
          open={mapPickerOpen}
          onOpenChange={setMapPickerOpen}
          onSelect={(result) =>
            setFormData((prev) => ({
              ...prev,
              address: result.address,
              lat: result.lat.toString(),
              lng: result.lng.toString(),
              neighborhood: result.neighborhood || "Otro",
              addressText: result.addressText || result.address,
              locationPrecision: result.locationPrecision,
              userProvidedNeighborhood: result.userProvidedNeighborhood || "",
              userProvidedReference: result.userProvidedReference || "",
            }))
          }
        />

        {/* Seguridad */}
        <div className="space-y-1.5">
          <Label>Nivel de seguridad <span className="text-primary">*</span></Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() =>
                setFormData((p) => ({
                  ...p,
                  tags: p.tags.includes("100_gf")
                    ? p.tags
                    : [...p.tags.filter((t) => t !== "opciones_sin_tacc"), "100_gf"],
                }))
              }
              className={cn(
                "rounded-lg border-2 p-3 text-center transition-all",
                formData.tags.includes("100_gf")
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-border/80"
              )}
            >
              <div className="text-xl mb-1">✅</div>
              <div className="text-sm font-semibold">100% sin TACC</div>
              <div className="text-xs text-muted-foreground">Solo hace sin gluten</div>
            </button>
            <button
              type="button"
              onClick={() =>
                setFormData((p) => ({
                  ...p,
                  tags: p.tags.includes("opciones_sin_tacc")
                    ? p.tags
                    : [...p.tags.filter((t) => t !== "100_gf"), "opciones_sin_tacc"],
                }))
              }
              className={cn(
                "rounded-lg border-2 p-3 text-center transition-all",
                formData.tags.includes("opciones_sin_tacc")
                  ? "border-yellow-500 bg-yellow-500/5"
                  : "border-border hover:border-border/80"
              )}
            >
              <div className="text-xl mb-1">🟡</div>
              <div className="text-sm font-semibold">Tiene opciones</div>
              <div className="text-xs text-muted-foreground">También tiene con TACC</div>
            </button>
          </div>
        </div>

        {/* ── Acordeón Opcionales ── */}
        <div className="border rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/40 transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                OPCIONAL
              </span>
              Más detalles
            </span>
            {showOptional ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {showOptional && (
            <div className="px-4 pb-4 pt-2 space-y-4 border-t">
              {/* Tags */}
              <div className="space-y-1.5">
                <Label className="text-xs">Características</Label>
                <div className="flex flex-wrap gap-2">
                  {PLACE_TAGS.map((tag) => (
                    <button
                      key={tag.value}
                      type="button"
                      onClick={() => toggleTag(tag.value)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                        formData.tags.includes(tag.value)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-border/80"
                      )}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Horario */}
              <div className="space-y-1.5">
                <Label className="text-xs">Horario</Label>
                <Input
                  placeholder="Ej: Lun-Vie 9-18, Sáb 10-14"
                  value={formData.openingHours}
                  onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
                />
              </div>

              {/* Instagram */}
              <div className="space-y-1.5">
                <Label className="text-xs">Instagram</Label>
                <Input
                  placeholder="@usuario"
                  value={formData.contact.instagram}
                  onChange={(e) =>
                    setFormData({ ...formData, contact: { ...formData.contact, instagram: e.target.value } })
                  }
                />
              </div>

              {/* Teléfono + WhatsApp */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Teléfono</Label>
                  <Input
                    value={formData.contact.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, contact: { ...formData.contact, phone: e.target.value } })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">WhatsApp</Label>
                  <Input
                    placeholder="+54 11 1234-5678"
                    value={formData.contact.whatsapp}
                    onChange={(e) =>
                      setFormData({ ...formData, contact: { ...formData.contact, whatsapp: e.target.value } })
                    }
                  />
                </div>
              </div>

              {/* Web */}
              <div className="space-y-1.5">
                <Label className="text-xs">Sitio web</Label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={formData.contact.url}
                  onChange={(e) =>
                    setFormData({ ...formData, contact: { ...formData.contact, url: e.target.value } })
                  }
                />
              </div>

              {/* Delivery */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    className="rounded border-border"
                    checked={formData.delivery.available}
                    onChange={(e) =>
                      setFormData({ ...formData, delivery: { ...formData.delivery, available: e.target.checked } })
                    }
                  />
                  Tiene delivery
                </label>
                {formData.delivery.available && (
                  <div className="space-y-2 pl-5 border-l-2 border-border">
                    {[
                      { key: "rappi", label: "Rappi", placeholder: "https://www.rappi.com.ar/..." },
                      { key: "pedidosya", label: "PedidosYa", placeholder: "https://www.pedidosya.com.ar/..." },
                      { key: "other", label: "Otro", placeholder: "https://..." },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs">{label}</Label>
                        <Input
                          placeholder={placeholder}
                          value={formData.delivery[key as keyof typeof formData.delivery] as string}
                          onChange={(e) =>
                            setFormData({ ...formData, delivery: { ...formData.delivery, [key]: e.target.value } })
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <Button
          className="w-full"
          disabled={
            loading ||
            !formData.name.trim() ||
            formData.types.length === 0 ||
            !formData.address.trim() ||
            (!formData.tags.includes("100_gf") && !formData.tags.includes("opciones_sin_tacc"))
          }
          onClick={handleFullSubmit}
        >
          {loading ? "Enviando..." : "🚀 Enviar sugerencia"}
        </Button>
      </div>
    </div>
  )
}
