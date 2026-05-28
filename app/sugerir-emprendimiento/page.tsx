"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ImageUpload } from "@/components/image-upload"
import {
  VENTURE_CATEGORIES,
  VENTURE_MODALITIES,
  VENTURE_SAFETY_LEVELS,
} from "@/lib/venture-constants"
import type { VentureModalityId, VentureSafetyLevelId } from "@/lib/venture-constants"
import type { VentureCategoryId } from "@/lib/venture-constants"
import { cn } from "@/lib/utils"
import { ArrowLeft, CheckCircle2, AlertCircle, Info } from "lucide-react"

export default function SugerirEmprendimientoPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [name, setName] = useState("")
  const [instagram, setInstagram] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [zone, setZone] = useState("")
  const [shipsNationwide, setShipsNationwide] = useState(false)
  const [category, setCategory] = useState<VentureCategoryId | "">("")
  const [safetyLevel, setSafetyLevel] = useState<VentureSafetyLevelId | "">("")
  const [certifiedProducts, setCertifiedProducts] = useState(false)
  const [modalities, setModalities] = useState<VentureModalityId[]>([])
  const [purchaseChannels, setPurchaseChannels] = useState("")
  const [suggesterComment, setSuggesterComment] = useState("")
  const [photos, setPhotos] = useState<string[]>([])

  const toggleModality = (id: VentureModalityId) => {
    setModalities((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!name.trim() || !zone.trim() || !category || !safetyLevel) {
      setError("Completá nombre, zona, categoría y nivel de seguridad")
      return
    }
    if (!instagram.trim() && !whatsapp.trim()) {
      setError("Agregá Instagram o WhatsApp para contacto")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/venture-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category,
          zone: zone.trim(),
          modalities,
          safetyLevel,
          certifiedProducts,
          purchaseChannels: purchaseChannels.trim() || undefined,
          contact: {
            instagram: instagram.trim() || undefined,
            whatsapp: whatsapp.trim() || undefined,
          },
          photos,
          suggesterComment: suggesterComment.trim() || undefined,
          shipsNationwide,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al enviar")
      setSubmitted(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al enviar")
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md">
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <p className="text-muted-foreground">Iniciá sesión para sugerir un emprendimiento</p>
            <Button onClick={() => router.push("/login?callbackUrl=/sugerir-emprendimiento")}>
              Iniciar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md text-center">
        <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">¡Gracias por sumar!</h1>
        <p className="text-muted-foreground mb-8 text-sm">
          Revisamos cada sugerencia antes de publicarla. Te avisamos por email cuando esté online.
        </p>
        <div className="flex flex-col gap-3">
          <Button asChild>
            <Link href="/emprendimientos">Ver emprendimientos</Link>
          </Button>
          <Button variant="outline" onClick={() => setSubmitted(false)}>
            Sugerir otro
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-xl">
      <Link
        href="/emprendimientos"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Link>

      <h1 className="text-2xl md:text-3xl font-bold mb-2">
        ¿Conocés un emprendimiento sin gluten?
      </h1>
      <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
        Ayudanos a sumar marcas y proyectos que le hacen la vida más fácil a la comunidad celíaca.
      </p>

      <div className="flex gap-2 p-4 rounded-xl border border-white/10 bg-white/[0.02] text-sm text-muted-foreground mb-8">
        <Info className="h-5 w-5 shrink-0 text-primary/80" />
        <p>
          <strong className="text-foreground">¿Tiene local abierto al público?</strong> Sugerilo en{" "}
          <Link href="/sugerir" className="text-primary hover:underline">
            Sugerir lugar
          </Link>{" "}
          para el mapa. Acá van marcas por Instagram, WhatsApp, delivery o ferias.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre del emprendimiento *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Pan Sin TACC de María"
            required
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="instagram">Instagram</Label>
            <Input
              id="instagram"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@marca o link"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp o contacto</Label>
            <Input
              id="whatsapp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+54 11 ..."
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="zone">Ciudad / zona *</Label>
          <Input
            id="zone"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            placeholder="Ej: CABA, La Plata, Rosario"
            required
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={shipsNationwide}
            onChange={(e) => setShipsNationwide(e.target.checked)}
            className="rounded border-border"
          />
          <span className="text-sm">¿Hace envíos a todo el país?</span>
        </label>

        <div className="space-y-2">
          <Label>Categoría *</Label>
          <div className="flex flex-wrap gap-2">
            {VENTURE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm border transition-colors",
                  category === cat.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-white/10 hover:border-primary/30"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Modalidad</Label>
          <div className="flex flex-wrap gap-2">
            {VENTURE_MODALITIES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleModality(m.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm border transition-colors",
                  modalities.includes(m.id)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-white/10 hover:border-primary/30"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>¿Es 100% sin gluten? *</Label>
          <div className="flex flex-wrap gap-2">
            {VENTURE_SAFETY_LEVELS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSafetyLevel(s.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm border transition-colors flex items-center gap-1",
                  safetyLevel === s.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-white/10 hover:border-primary/30"
                )}
              >
                <span aria-hidden>{s.dot}</span>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={certifiedProducts}
            onChange={(e) => setCertifiedProducts(e.target.checked)}
            className="rounded border-border"
          />
          <span className="text-sm">¿Tiene productos certificados?</span>
        </label>

        <div className="space-y-2">
          <Label htmlFor="purchase">¿Dónde se puede comprar?</Label>
          <textarea
            id="purchase"
            value={purchaseChannels}
            onChange={(e) => setPurchaseChannels(e.target.value)}
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Instagram, ferias, delivery, retiro en..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="comment">Comentario de quien lo sugiere</Label>
          <textarea
            id="comment"
            value={suggesterComment}
            onChange={(e) => setSuggesterComment(e.target.value)}
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="¿Qué recomendás probar? ¿Alguna experiencia?"
          />
        </div>

        <div className="space-y-2">
          <Label>Fotos opcionales</Label>
          <ImageUpload value={photos} onChange={setPhotos} folder="ventures" maxCount={3} />
        </div>

        <div className="flex gap-2 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-muted-foreground">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-500/80 mt-0.5" />
          <p>
            Las sugerencias son revisadas antes de publicarse. Celimap no certifica emprendimientos,
            pero ayuda a visibilizar opciones recomendadas por la comunidad.
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Enviando..." : "Enviar sugerencia"}
        </Button>
      </form>
    </div>
  )
}
