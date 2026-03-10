"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ReviewForm } from "@/components/review-form"
import { ContaminationReportForm } from "@/components/contamination-report-form"
import { TagBadge } from "@/components/TagBadge"
import { FavoriteButton } from "@/components/favorite-button"
import { StickyActionBarMobile, PlaceHeroGallery } from "@/components/lugar"
import { IPlace } from "@/models/Place"
import { IReview } from "@/models/Review"
import {
  Star, MapPin, Instagram, Globe, ExternalLink,
  MapPinned, Clock, Package, AlertTriangle,
  CheckCircle2, Heart, Phone,
} from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { fetchApi } from "@/lib/fetchApi"
import { TYPES } from "@/lib/constants"
import { features } from "@/lib/features"
import { inferSafetyLevel, getSafetyBadge } from "@/components/featured/featured-utils"
import { isOpenNow } from "@/lib/opening-hours"

export default function LugarPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [place, setPlace] = useState<IPlace & { stats?: any } | null>(null)
  const [reviews, setReviews] = useState<IReview[]>([])
  const [contaminationReports, setContaminationReports] = useState<Array<{
    _id: string; comment: string; createdAt: string; userId?: { name?: string }
  }>>([])
  const [reviewSort, setReviewSort] = useState<"recent" | "rating">("recent")
  const [loading, setLoading] = useState(true)
  const [reviewsPagination, setReviewsPagination] = useState<{
    page: number; pages: number; total: number
  } | null>(null)
  const [loadingMoreReviews, setLoadingMoreReviews] = useState(false)
  const [nearbyPlaces, setNearbyPlaces] = useState<Array<IPlace & {
    stats?: { avgRating?: number; totalReviews?: number }; distance?: number
  }>>([])
  const [loadingNearby, setLoadingNearby] = useState(true)
  const [reviewsExpanded, setReviewsExpanded] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const INITIAL_REVIEWS = 4

  // ── EFFECTS ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (params.id) { fetchPlace(); fetchReviews(); fetchContaminationReports() }
  }, [params.id])

  useEffect(() => {
    const hasLocation = place?.location?.lat != null && place?.location?.lng != null
    const hasNeighborhood = Boolean(place?.neighborhood)
    if (place && (hasLocation || hasNeighborhood)) fetchNearby()
    else if (place !== undefined) setLoadingNearby(false)
  }, [place?._id, place?.location?.lat, place?.location?.lng, place?.neighborhood])

  // ── FETCHERS (idénticos al archivo actual) ───────────────────────────────────
  const fetchPlace = async () => {
    try {
      const data = await fetchApi<IPlace & { stats?: unknown }>(`/api/places/${params.id}`)
      setPlace(data)
    } catch (error: any) {
      setPlace(null)
      if (error?.status !== 404) toast.error(error?.message || "Error al cargar el lugar")
    } finally {
      setLoading(false)
    }
  }

  const fetchReviews = async (page = 1, append = false) => {
    try {
      if (append) setLoadingMoreReviews(true)
      const data = await fetchApi<{
        reviews: IReview[]
        pagination: { page: number; pages: number; total: number }
      }>(`/api/reviews?placeId=${params.id}&page=${page}&limit=20`)
      const newReviews = data.reviews || []
      setReviews((prev) => (append ? [...prev, ...newReviews] : newReviews))
      setReviewsPagination(data.pagination
        ? { page: data.pagination.page, pages: data.pagination.pages, total: data.pagination.total }
        : null)
    } catch (error: any) {
      if (!append) toast.error(error?.message || "Error al cargar reseñas")
    } finally {
      if (append) setLoadingMoreReviews(false)
    }
  }

  const fetchContaminationReports = async () => {
    try {
      const data = await fetchApi<{
        reports: Array<{ _id: string; comment: string; createdAt: string; userId?: { name?: string } }>
      }>(`/api/contamination-reports?placeId=${params.id}`)
      setContaminationReports(data.reports || [])
    } catch { /* silencioso */ }
  }

  const fetchNearby = async () => {
    if (!place) { setLoadingNearby(false); return }
    setLoadingNearby(true)
    try {
      let places: Array<IPlace & { distance?: number; stats?: any }> = []
      if (place.location?.lat != null && place.location?.lng != null) {
        const nearData = await fetchApi<{ places: Array<IPlace & { distance?: number }> }>(
          `/api/places/near?lat=${place.location.lat}&lng=${place.location.lng}&radius=2000`
        )
        places = nearData.places || []
      }
      if (places.length === 0 && place.neighborhood) {
        const listData = await fetchApi<{ places: Array<IPlace & { stats?: any }> }>(
          `/api/places?neighborhood=${encodeURIComponent(place.neighborhood)}&limit=7`
        )
        places = listData.places || []
      }
      setNearbyPlaces(places.filter((p: any) => p._id?.toString() !== params.id).slice(0, 6))
    } catch {
      setNearbyPlaces([])
    } finally {
      setLoadingNearby(false)
    }
  }

  // ── DERIVED ──────────────────────────────────────────────────────────────────
  const sortedReviews = [...reviews].sort((a, b) => {
    if ((a as any).pinned && !(b as any).pinned) return -1
    if (!(a as any).pinned && (b as any).pinned) return 1
    if (reviewSort === "rating") return (b as any).rating - (a as any).rating
    return new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime()
  })

  const hasMoreReviews = reviewsExpanded
    ? !!(reviewsPagination && reviewsPagination.page < reviewsPagination.pages)
    : sortedReviews.length > INITIAL_REVIEWS

  const displayedReviews = reviewsExpanded
    ? sortedReviews
    : sortedReviews.slice(0, INITIAL_REVIEWS)

  const mapsUrl = place
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`
    : ""

  const reportCount = place?.stats?.contaminationReportsCount ?? 0
  const effectiveSafety = place ? inferSafetyLevel(place) : undefined
  const safetyConfig = getSafetyBadge(effectiveSafety as any)
  const isDedicated = effectiveSafety === "dedicated_gf"
  const hasReports = reportCount > 0
  const addressText = place?.addressText || place?.address || ""
  const openStatus = place?.openingHours ? isOpenNow(place.openingHours) : null
  const typeConfig = TYPES.find((t) => t.value === (place?.types?.[0] ?? place?.type))
  const totalReviews = place?.stats?.totalReviews ?? 0
  const avgRating = place?.stats?.avgRating ?? 0

  // ── LOADING / NOT FOUND ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!place) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-xl font-semibold mb-2">Lugar no encontrado</p>
        <p className="text-muted-foreground mb-6">El lugar que buscás no existe o fue eliminado.</p>
        <Button asChild><Link href="/mapa">Ir al mapa</Link></Button>
      </div>
    )
  }

  // ── SAFETY CARD ──────────────────────────────────────────────────────────────
  // Compacta, sin los paddings gigantes de la versión anterior
  function SafetyCard() {
    if (hasReports) {
      return (
        <div className="rounded-xl border border-red-500/25 bg-red-950/20 p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-red-300">
              {reportCount} {reportCount === 1 ? "reporte" : "reportes"} de contaminación
            </p>
            <p className="text-xs text-red-400/70 mt-0.5">Verificá antes de visitar</p>
          </div>
        </div>
      )
    }
    if (isDedicated) {
      return (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/12 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-300">VERIFICADO SIN TACC</p>
            <p className="text-xs text-emerald-400/70 mt-0.5">Sin reportes de contaminación</p>
          </div>
        </div>
      )
    }
    return (
      <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold">Sin reportes de contaminación</p>
          <p className="text-xs text-muted-foreground mt-0.5">Ningún usuario reportó problemas</p>
        </div>
      </div>
    )
  }

  // ── INFO CHIPS (todos condicionales) ─────────────────────────────────────────
  // Solo se agregan si el dato existe en place
  const infoChips: { label: string; icon: string; highlight: boolean }[] = []
  if (place.tags?.includes("certificado_sin_tacc"))
    infoChips.push({ label: "Certificado ACELA", icon: "🛡", highlight: true })
  if (place.tags?.includes("cocina_separada"))
    infoChips.push({ label: "Cocina separada", icon: "🍳", highlight: true })
  if (place.delivery?.available)
    infoChips.push({ label: "Delivery", icon: "🚗", highlight: true })
  if (place.openingHours)
    infoChips.push({ label: place.openingHours, icon: "🕐", highlight: false })

  // ── SIDEBAR CONTENT ──────────────────────────────────────────────────────────
  // Se usa tanto en el aside desktop como en el bloque mobile inferior
  function SidebarContent() {
    return (
      <div className="space-y-5">
        {/* Nombre + safety dot */}
        <div>
          <p className="font-bold text-sm line-clamp-2 mb-1">{place!.name}</p>
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span>{safetyConfig.dot}</span>
            {safetyConfig.label}
          </span>
        </div>

        {/* CTAs — siempre visibles en sidebar */}
        <div className="space-y-2">
          <Button asChild className="w-full gap-2 h-10">
            <Link href={mapsUrl} target="_blank" rel="noopener noreferrer">
              <MapPinned className="h-4 w-4" />
              Cómo llegar
            </Link>
          </Button>
          {session && features.favorites ? (
            <div className="w-full [&>button]:w-full">
              <FavoriteButton placeId={place!._id.toString()} showLabel />
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full gap-2 h-10"
              onClick={() => !session && router.push("/login")}
            >
              <Heart className="h-4 w-4" />
              Guardar lugar
            </Button>
          )}
        </div>

        {/* Info de contacto — cada ítem es condicional */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-2">
            Información
          </p>
          <div className="divide-y divide-border/40">
            {/* Dirección — siempre presente */}
            <div className="flex items-start gap-2.5 py-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-xs text-foreground leading-relaxed">{addressText}</span>
            </div>
            {/* Horario — solo si existe */}
            {place!.openingHours && (
              <div className="flex items-center gap-2.5 py-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs">{place!.openingHours}</span>
                  {openStatus !== null && (
                    <span className={`text-[10px] font-semibold ${openStatus ? "text-primary" : "text-muted-foreground"}`}>
                      · {openStatus ? "Abierto" : "Cerrado"}
                    </span>
                  )}
                </div>
              </div>
            )}
            {/* Teléfono — solo si existe */}
            {place!.contact?.phone && (
              <div className="flex items-center gap-2.5 py-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <a href={`tel:${place!.contact.phone}`} className="text-xs text-primary hover:underline">
                  {place!.contact.phone}
                </a>
              </div>
            )}
            {/* Instagram — solo si existe */}
            {place!.contact?.instagram && (
              <div className="flex items-center gap-2.5 py-2">
                <Instagram className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <a
                  href={`https://instagram.com/${place!.contact.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  @{place!.contact.instagram.replace("@", "")}
                </a>
              </div>
            )}
            {/* Web — solo si existe */}
            {place!.contact?.url && (
              <div className="flex items-center gap-2.5 py-2">
                <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <a
                  href={place!.contact.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline truncate"
                >
                  Sitio web <ExternalLink className="inline h-2.5 w-2.5 ml-0.5" />
                </a>
              </div>
            )}
            {/* Delivery — solo si existe */}
            {place!.delivery?.available && (() => {
              const deliveryServices: string[] = []
              if (place!.delivery?.rappi) deliveryServices.push("Rappi")
              if (place!.delivery?.pedidosya) deliveryServices.push("PedidosYa")
              if (place!.delivery?.other) deliveryServices.push("Otro")
              return (
                <div className="flex items-center gap-2.5 py-2">
                  <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs">
                    Delivery
                    {deliveryServices.map((s, i) => (
                      <span key={i} className="text-muted-foreground ml-1">· {s}</span>
                    ))}
                  </span>
                </div>
              )
            })()}
          </div>
        </div>

        {/* Lugares cercanos — solo si hay */}
        {nearbyPlaces.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-2">
              Cerca de este lugar
            </p>
            <div className="space-y-1.5">
              {nearbyPlaces.slice(0, 3).map((p: any) => {
                const nt = TYPES.find((t) => t.value === (p.types?.[0] ?? p.type))
                const ns = getSafetyBadge(inferSafetyLevel(p) as any)
                return (
                  <Link
                    key={p._id.toString()}
                    href={`/lugar/${p._id}`}
                    className="flex items-center gap-2.5 p-2 rounded-lg border border-border/50 hover:border-border bg-white/[0.02] hover:bg-white/[0.04] transition-all"
                  >
                    <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-base shrink-0 overflow-hidden">
                      {p.photos?.[0]
                        ? <img src={p.photos[0]} alt={p.name} className="w-full h-full object-cover rounded-lg" />
                        : nt?.emoji ?? "📍"
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <span>{ns.dot}</span>
                        {p.stats?.avgRating && <span className="text-amber-400">★{p.stats.avgRating.toFixed(1)}</span>}
                        {p.distance && (
                          <span className="ml-auto shrink-0 text-muted-foreground/50">
                            {p.distance < 1000 ? `${Math.round(p.distance)}m` : `${(p.distance / 1000).toFixed(1)}km`}
                          </span>
                        )}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Reportar contaminación — siempre al final */}
        <div className="pt-1 border-t border-border/40">
          <ContaminationReportForm
            placeId={params.id as string}
            onSuccess={() => { fetchPlace(); fetchContaminationReports() }}
            trigger={
              <button type="button" className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-red-400 transition-colors">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                Reportar contaminación cruzada
              </button>
            }
          />
        </div>
      </div>
    )
  }

  // ── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Mobile sticky bar — sin cambios, igual que antes */}
      <StickyActionBarMobile place={place} />

      <div className="container mx-auto px-4 py-6 pb-24 md:pb-10">

        {/* Back link */}
        <Link
          href="/mapa"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors"
        >
          ← Volver al mapa
        </Link>

        {/* ── GRID PRINCIPAL: contenido + sidebar ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">

          {/* ══ COLUMNA PRINCIPAL ══════════════════════════════════════ */}
          <div className="min-w-0">

            {/* Galería hero */}
            <PlaceHeroGallery
              photos={place.photos}
              name={place.name}
              type={place.type}
              types={place.types}
              safetyDot={safetyConfig.dot}
              safetyLabel={safetyConfig.label}
            />

            {/* Tipo + barrio */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {typeConfig && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-muted-foreground">
                  {typeConfig.emoji} {typeConfig.label}
                </span>
              )}
              {place.neighborhood && (
                <span className="text-xs text-muted-foreground/60">{place.neighborhood}</span>
              )}
            </div>

            {/* Nombre */}
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
              {place.name}
            </h1>

            {/* Rating — solo si hay reseñas */}
            {totalReviews > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map((i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />
                  ))}
                </div>
                <span className="text-sm font-bold">{avgRating.toFixed(1)}</span>
                <span className="text-muted-foreground text-sm">·</span>
                <button
                  type="button"
                  onClick={() => document.getElementById("reviews-section")?.scrollIntoView({ behavior: "smooth" })}
                  className="text-xs text-primary hover:underline px-2 py-0.5 bg-primary/8 border border-primary/20 rounded"
                >
                  {totalReviews} {totalReviews === 1 ? "reseña" : "reseñas"} ↓
                </button>
              </div>
            )}

            {/* Safety card compacta */}
            <div className="mb-4">
              <SafetyCard />
            </div>

            {/* Dirección */}
            <div className="flex items-start gap-2.5 mb-4">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">{addressText}</p>
            </div>

            {/* CTAs — solo en mobile (en desktop están en sidebar) */}
            <div className="flex flex-wrap gap-2 mb-4 lg:hidden">
              <Button asChild size="lg" className="min-h-[48px]">
                <Link href={mapsUrl} target="_blank" rel="noopener noreferrer">
                  <MapPinned className="h-4 w-4 mr-2" />
                  Cómo llegar
                </Link>
              </Button>
              {session && features.favorites ? (
                <FavoriteButton placeId={place._id.toString()} showLabel />
              ) : (
                <Button variant="outline" size="lg" className="min-h-[48px]" onClick={() => !session && router.push("/login")}>
                  <Heart className="h-5 w-5 mr-2" />
                  Guardar
                </Button>
              )}
            </div>

            {/* Info chips — solo los que tienen datos */}
            {infoChips.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {infoChips.map((chip, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-full border ${
                      chip.highlight
                        ? "border-primary/25 bg-primary/6 text-primary"
                        : "border-amber-500/20 bg-amber-500/5 text-amber-400"
                    }`}
                  >
                    <span>{chip.icon}</span>
                    {chip.label}
                  </span>
                ))}
              </div>
            )}

            {/* Social links mobile (en desktop van en sidebar) */}
            <div className="flex flex-wrap gap-2 mb-5 lg:hidden">
              {place.contact?.instagram && (
                <a href={`https://instagram.com/${place.contact.instagram.replace("@","")}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <Instagram className="h-3.5 w-3.5" />
                  @{place.contact.instagram.replace("@","")}
                </a>
              )}
              {place.contact?.url && (
                <a href={place.contact.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <Globe className="h-3.5 w-3.5" />
                  Sitio web <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>

            {/* Tags */}
            {place.tags && place.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6 pb-6 border-b border-border/40">
                {place.tags.map((tag) => <TagBadge key={tag} tag={tag} />)}
              </div>
            )}

            {/* ══ SECCIÓN RESEÑAS ═══════════════════════════════════════ */}
            <section id="reviews-section">

              {/* Header reseñas */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold flex items-center gap-2">
                  Reseñas
                  {totalReviews > 0 && (
                    <span className="text-[10px] font-mono text-muted-foreground bg-white/5 border border-white/8 px-2 py-0.5 rounded">
                      {totalReviews}
                    </span>
                  )}
                </h2>
                {!showReviewForm && (
                  <Button
                    size="sm" variant="outline"
                    onClick={() => setShowReviewForm(true)}
                    className="gap-1.5 text-xs h-8 border-primary/25 text-primary hover:bg-primary/8"
                  >
                    + Escribir reseña
                  </Button>
                )}
              </div>

              {/* Rating summary con barras — solo si hay reseñas y no está el form */}
              {totalReviews > 0 && !showReviewForm && (
                <div className="grid grid-cols-[auto_1fr_auto] gap-0 bg-white/[0.03] border border-white/8 rounded-xl mb-4 overflow-hidden">
                  {/* Número grande */}
                  <div className="text-center px-5 py-4 border-r border-white/8">
                    <p className="text-3xl font-extrabold leading-none">{avgRating.toFixed(1)}</p>
                    <div className="flex justify-center gap-0.5 my-1.5">
                      {[1,2,3,4,5].map((i) => (
                        <Star key={i} className={`h-2.5 w-2.5 ${i <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/15"}`} />
                      ))}
                    </div>
                    <p className="text-[9px] text-muted-foreground/60 font-mono uppercase">promedio</p>
                  </div>
                  {/* Barras */}
                  <div className="space-y-1 px-5 py-4">
                    {[5,4,3,2,1].map((star) => {
                      const pct = star === Math.round(avgRating) ? 70
                        : Math.abs(star - Math.round(avgRating)) === 1 ? 15 : 5
                      return (
                        <div key={star} className="flex items-center gap-2">
                          <span className="text-[9px] text-muted-foreground/60 w-2 text-right shrink-0 font-mono">{star}</span>
                          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400/70 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {/* Total */}
                  <div className="text-center px-5 py-4 border-l border-white/8">
                    <p className="text-xl font-bold">{totalReviews}</p>
                    <p className="text-[9px] text-muted-foreground/60 font-mono uppercase mt-1">reseñas</p>
                  </div>
                </div>
              )}

              {/* Sort tabs — solo si hay más de 1 y no está el form */}
              {reviews.length > 1 && !showReviewForm && (
                <div className="flex gap-2 mb-4">
                  {(["recent", "rating"] as const).map((s) => (
                    <button
                      key={s} type="button"
                      onClick={() => setReviewSort(s)}
                      className={`text-[10px] font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                        reviewSort === s
                          ? "border-primary/30 bg-primary/8 text-primary"
                          : "border-white/8 bg-white/[0.03] text-muted-foreground hover:border-white/15"
                      }`}
                    >
                      {s === "recent" ? "Más recientes" : "Mejor valorados"}
                    </button>
                  ))}
                </div>
              )}

              {/* Formulario de reseña */}
              {showReviewForm && (
                <div className="mb-5">
                  <Button variant="ghost" size="sm" className="mb-3" onClick={() => setShowReviewForm(false)}>
                    ← Volver
                  </Button>
                  <ReviewForm
                    placeId={params.id as string}
                    onSuccess={() => { fetchReviews(); setShowReviewForm(false) }}
                  />
                </div>
              )}

              {/* Sin reseñas */}
              {!showReviewForm && reviews.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  <p className="mb-3 text-sm">Todavía no hay reseñas.</p>
                  <Button variant="outline" size="sm" onClick={() => setShowReviewForm(true)}>
                    Sé el primero en opinar
                  </Button>
                </div>
              )}

              {/* Lista de reseñas */}
              {!showReviewForm && displayedReviews.map((review: any) => (
                <div
                  key={review._id}
                  className={`rounded-xl border p-4 mb-3 ${
                    review.pinned
                      ? "border-primary/20 bg-primary/[0.025]"
                      : "border-white/7 bg-white/[0.015]"
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    {review.userId?.image ? (
                      <img src={review.userId.image} alt={review.userId?.name || "U"}
                        className="w-8 h-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-xs font-bold shrink-0 text-muted-foreground">
                        {(review.userId?.name || "U")[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold truncate">{review.userId?.name || "Usuario"}</p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {review.pinned && <span className="text-[10px] text-primary font-mono">📌</span>}
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map((i) => (
                              <Star key={i} className={`h-3 w-3 ${i <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/15"}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(review.createdAt).toLocaleDateString("es-AR", { day:"numeric", month:"short", year:"numeric" })}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">{review.comment}</p>
                  {review.evidencePhotos?.length > 0 && (
                    <div className="flex gap-2 mb-3 flex-wrap">
                      {review.evidencePhotos.map((url: string) => (
                        <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                          className="block w-14 h-14 rounded-lg overflow-hidden border border-border hover:opacity-80 shrink-0">
                          <Image src={url} alt="Foto de la reseña" width={56} height={56} className="object-cover w-full h-full" />
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-1.5 flex-wrap">
                    {review.safeFeeling && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-primary/8 text-primary border border-primary/15">
                        ✓ Me sentí seguro/a
                      </span>
                    )}
                    {review.separateKitchen === "yes" && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/4 text-muted-foreground border border-white/8">
                        Cocina separada
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Paginación */}
              {!showReviewForm && hasMoreReviews && !reviewsExpanded && (
                <div className="flex justify-center pt-2">
                  <Button variant="outline" size="sm" onClick={() => setReviewsExpanded(true)}>
                    Ver más reseñas
                  </Button>
                </div>
              )}
              {!showReviewForm && reviewsExpanded && reviewsPagination && reviewsPagination.page < reviewsPagination.pages && (
                <div className="flex justify-center pt-2">
                  <Button variant="outline" size="sm"
                    onClick={() => fetchReviews(reviewsPagination!.page + 1, true)}
                    disabled={loadingMoreReviews}
                  >
                    {loadingMoreReviews ? "Cargando..." : "Ver más reseñas"}
                  </Button>
                </div>
              )}
            </section>
          </div>
          {/* /columna principal */}

          {/* ══ SIDEBAR DESKTOP (sticky) ══════════════════════════════ */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 rounded-2xl border border-white/8 bg-white/[0.025] backdrop-blur p-5">
              <SidebarContent />
            </div>
          </aside>

        </div>
        {/* /grid */}

        {/* Sidebar mobile — debajo del contenido, sin sticky */}
        <div className="lg:hidden mt-8 rounded-2xl border border-white/8 bg-white/[0.025] p-5">
          <SidebarContent />
        </div>

      </div>
    </>
  )
}
