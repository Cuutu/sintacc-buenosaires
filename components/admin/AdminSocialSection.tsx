"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { NEIGHBORHOODS } from "@/lib/constants"
import { buildCelimapUrlsList, buildPhotoUrlsList } from "@/lib/social/canva-brief"
import type {
  SocialContentItem,
  SocialImageFormat,
  SocialPlatform,
  SocialPreset,
  SocialPreviewResult,
} from "@/lib/social/types"
import { IMAGE_PROMPT_MAX_ITEMS } from "@/lib/social/image-prompt"
import { Copy, ExternalLink, ImageIcon, Loader2, Sparkles } from "lucide-react"

const PRESETS: Array<{
  id: SocialPreset
  label: string
  desc: string
  needsNeighborhood?: boolean
}> = [
  {
    id: "latest_places",
    label: "Últimos lugares",
    desc: "Últimos lugares aprobados (comunidad)",
  },
  {
    id: "latest_ventures",
    label: "Últimos emprendimientos",
    desc: "Marcas nuevas en Celimap",
  },
  {
    id: "neighborhood",
    label: "Spotlight barrio",
    desc: "Lugares recientes de un barrio",
    needsNeighborhood: true,
  },
  {
    id: "dedicated_gf",
    label: "100% sin TACC",
    desc: "Lugares dedicados gluten free",
  },
  {
    id: "milestone",
    label: "Hito comunidad",
    desc: "Cantidad de lugares y reseñas",
  },
  {
    id: "cta_suggest",
    label: "CTA sugerir",
    desc: "Pedir sugerencias de lugares",
  },
]

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copiado`)
  } catch {
    toast.error("No se pudo copiar")
  }
}

export function AdminSocialSection() {
  const [platform, setPlatform] = useState<SocialPlatform>("instagram")
  const [imageFormat, setImageFormat] = useState<SocialImageFormat>("story")
  const [includeLogo, setIncludeLogo] = useState(true)
  const [includePhotos, setIncludePhotos] = useState(false)
  const [limit, setLimit] = useState(5)
  const [days, setDays] = useState(30)
  const [communityOnly, setCommunityOnly] = useState(true)
  const [neighborhood, setNeighborhood] = useState("Palermo")
  const [activePreset, setActivePreset] = useState<SocialPreset>("latest_places")
  const [items, setItems] = useState<SocialContentItem[]>([])
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set())
  const [preview, setPreview] = useState<SocialPreviewResult | null>(null)
  const [caption, setCaption] = useState("")
  const [imagePrompt, setImagePrompt] = useState("")
  const [attachmentInstructions, setAttachmentInstructions] = useState("")
  const [loadingItems, setLoadingItems] = useState(false)
  const [generating, setGenerating] = useState(false)

  const selectedPreset = PRESETS.find((p) => p.id === activePreset)!

  const loadItems = useCallback(async () => {
    if (activePreset === "milestone" || activePreset === "cta_suggest") {
      setItems([])
      setExcludedIds(new Set())
      return
    }

    if (activePreset === "neighborhood" && !neighborhood.trim()) {
      toast.error("Seleccioná un barrio")
      return
    }

    setLoadingItems(true)
    try {
      const params = new URLSearchParams({
        preset: activePreset,
        limit: String(limit),
        days: String(days),
        communityOnly: String(communityOnly),
      })
      if (activePreset === "neighborhood") {
        params.set("neighborhood", neighborhood.trim())
      }

      const res = await fetch(`/api/admin/social/digest?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al cargar")

      setItems(data.items || [])
      setExcludedIds(new Set())
      setPreview(null)
      setCaption("")
      setImagePrompt("")
      setAttachmentInstructions("")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al cargar ítems")
    } finally {
      setLoadingItems(false)
    }
  }, [activePreset, communityOnly, days, limit, neighborhood])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const toggleExcluded = (id: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setPreview(null)
  }

  const includedItems = items.filter((item) => !excludedIds.has(item.id))

  const handleGenerate = async () => {
    if (activePreset === "neighborhood" && !neighborhood.trim()) {
      toast.error("Seleccioná un barrio")
      return
    }

    setGenerating(true)
    try {
      const res = await fetch("/api/admin/social/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preset: activePreset,
          platform,
          limit,
          days,
          communityOnly,
          neighborhood:
            activePreset === "neighborhood" ? neighborhood.trim() : undefined,
          excludeIds: Array.from(excludedIds),
          imageFormat,
          includeLogo,
          includePhotos,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al generar")

      setPreview(data)
      setCaption(data.caption || "")
      setImagePrompt(data.imagePrompt || "")
      setAttachmentInstructions(data.attachmentInstructions || "")
      toast.success("Contenido generado")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al generar")
    } finally {
      setGenerating(false)
    }
  }

  const combinedPrompt = attachmentInstructions
    ? `${attachmentInstructions}\n\n${imagePrompt}`
    : imagePrompt

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-card">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Redes sociales
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Prompt directo estilo A+D para ChatGPT: lista limpia + hero con número. Máx{" "}
          {IMAGE_PROMPT_MAX_ITEMS} ítems por imagen.
        </p>
      </div>

      <div className="p-4 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setActivePreset(preset.id)}
              className={`text-left p-3 rounded-xl border transition-colors ${
                activePreset === preset.id
                  ? "border-primary/40 bg-primary/8"
                  : "border-border bg-card hover:border-border/80"
              }`}
            >
              <p className="text-sm font-semibold">{preset.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{preset.desc}</p>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
              Plataforma
            </p>
            <div className="flex gap-1">
              {(["instagram", "tiktok"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={`text-xs px-3 py-1.5 rounded-lg border ${
                    platform === p
                      ? "border-primary/30 bg-primary/8 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {p === "instagram" ? "Instagram" : "TikTok"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
              Formato imagen
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setImageFormat("story")}
                className={`text-xs px-3 py-1.5 rounded-lg border ${
                  imageFormat === "story"
                    ? "border-primary/30 bg-primary/8 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                Historia 9:16
              </button>
              <button
                type="button"
                onClick={() => setImageFormat("feed")}
                className={`text-xs px-3 py-1.5 rounded-lg border ${
                  imageFormat === "feed"
                    ? "border-primary/30 bg-primary/8 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                Feed 1:1
              </button>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-muted-foreground mb-1">Cantidad</p>
            <Input
              type="number"
              min={1}
              max={15}
              value={limit}
              onChange={(e) =>
                setLimit(Math.min(15, Math.max(1, Number(e.target.value) || 5)))
              }
              className="h-8 w-20 text-sm"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Prompt usa max {IMAGE_PROMPT_MAX_ITEMS}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-muted-foreground mb-1">Días</p>
            <Input
              type="number"
              min={0}
              max={365}
              value={days}
              onChange={(e) => setDays(Number(e.target.value) || 30)}
              className="h-8 w-20 text-sm"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-muted-foreground pb-1">
            <input
              type="checkbox"
              checked={includeLogo}
              onChange={(e) => setIncludeLogo(e.target.checked)}
              className="rounded"
            />
            Adjuntar logo Celimap
          </label>

          <label className="flex items-center gap-2 text-xs text-muted-foreground pb-1">
            <input
              type="checkbox"
              checked={includePhotos}
              onChange={(e) => setIncludePhotos(e.target.checked)}
              className="rounded"
            />
            Incluir fotos en adjuntos (opcional)
          </label>

          {activePreset !== "dedicated_gf" &&
            activePreset !== "milestone" &&
            activePreset !== "cta_suggest" &&
            activePreset !== "latest_ventures" && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground pb-1">
                <input
                  type="checkbox"
                  checked={communityOnly}
                  onChange={(e) => setCommunityOnly(e.target.checked)}
                  className="rounded"
                />
                Solo sugerencias comunidad
              </label>
            )}

          {selectedPreset.needsNeighborhood && (
            <div className="min-w-[140px]">
              <p className="text-[10px] font-semibold text-muted-foreground mb-1">Barrio</p>
              <select
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {NEIGHBORHOODS.filter((n) => n !== "Otro").map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button size="sm" variant="outline" onClick={loadItems} disabled={loadingItems}>
            {loadingItems ? "Cargando..." : "Actualizar lista"}
          </Button>
        </div>

        {items.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2">
              Ítems incluidos ({includedItems.length}/{items.length})
              {includedItems.length > IMAGE_PROMPT_MAX_ITEMS && (
                <span className="font-normal text-amber-500/90">
                  {" "}
                  · solo los primeros {IMAGE_PROMPT_MAX_ITEMS} van al prompt imagen
                </span>
              )}
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {items.map((item) => {
                const excluded = excludedIds.has(item.id)
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                      excluded ? "opacity-45 border-border/50" : "border-border bg-card/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!excluded}
                      onChange={() => toggleExcluded(item.id)}
                      className="rounded shrink-0"
                    />
                    {item.photoUrl ? (
                      <a
                        href={item.photoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-md overflow-hidden shrink-0 border border-border"
                        title="Descargar / adjuntar en ChatGPT"
                      >
                        <img
                          src={item.photoUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center text-lg shrink-0">
                        {item.typeEmoji}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.safetyDot} {item.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {item.subtitle} · {item.typeLabel}
                        {item.ratingLine ? ` · ${item.ratingLine}` : ""}
                      </p>
                    </div>
                    <a
                      href={item.celimapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary shrink-0"
                      title="Abrir ficha"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {items.length === 0 &&
          activePreset !== "milestone" &&
          activePreset !== "cta_suggest" &&
          !loadingItems && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay ítems recientes con estos filtros.
            </p>
          )}

        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full sm:w-auto gap-2"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Generar caption + prompt imagen
        </Button>

        {preview && (
          <div className="space-y-4 pt-2 border-t border-border">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground space-y-1.5">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-primary" />
                Cómo usar con ChatGPT
              </p>
              <ol className="list-decimal list-inside space-y-0.5 pl-0.5">
                <li>Adjuntá logo Celimap (y fotos solo si las activaste)</li>
                <li>Copiá prompt → ChatGPT creador de imágenes</li>
                <li>Estilo lista limpia + hero con número grande</li>
                <li>Publicá historia con el caption</li>
              </ol>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-bold">Imágenes para adjuntar</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => copyText(attachmentInstructions, "Instrucciones adjuntos")}
                >
                  <Copy className="h-3 w-3" />
                  Copiar
                </Button>
              </div>
              <Textarea
                value={attachmentInstructions}
                onChange={(e) => setAttachmentInstructions(e.target.value)}
                className="min-h-[120px] text-sm font-mono"
                placeholder="Links de fotos y logo para adjuntar en ChatGPT..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-bold">
                  Prompt ChatGPT ·{" "}
                  {imageFormat === "story" ? "Historia IG 9:16" : "Feed 1:1"}
                </p>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => copyText(imagePrompt, "Prompt imagen")}
                  >
                    <Copy className="h-3 w-3" />
                    Solo prompt
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => copyText(combinedPrompt, "Prompt completo")}
                  >
                    <Copy className="h-3 w-3" />
                    Prompt + adjuntos
                  </Button>
                </div>
              </div>
              <Textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                className="min-h-[280px] text-sm font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-bold">Caption para publicar</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => copyText(caption, "Caption")}
                >
                  <Copy className="h-3 w-3" />
                  Copiar caption
                </Button>
              </div>
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="min-h-[160px] text-sm font-mono"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1"
                onClick={() => copyText(preview.link, "Link del post")}
              >
                <Copy className="h-3 w-3" />
                Copiar link post
              </Button>
              {includedItems.length > 0 && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1"
                    onClick={() =>
                      copyText(buildPhotoUrlsList(includedItems), "Links de fotos")
                    }
                  >
                    <Copy className="h-3 w-3" />
                    Copiar links fotos
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1"
                    onClick={() =>
                      copyText(buildCelimapUrlsList(includedItems), "Links fichas")
                    }
                  >
                    <Copy className="h-3 w-3" />
                    Copiar links fichas
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
