"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { User, LogOut, ChevronRight, MapPin, ListChecks } from "lucide-react"
import { fetchApi } from "@/lib/fetchApi"
import { IPlace } from "@/models/Place"
import { getPlacePath } from "@/lib/place-url"
import { getPlaceImageUrl } from "@/lib/place-image"
import { isAllowedAvatarUrl } from "@/lib/avatar-url"
import { formatPlacesCount } from "@/lib/lists/card-places"
import { MIS_LISTAS_HREF } from "@/lib/lists/guardados-tab"
import { getPlaceCoverTheme } from "@/components/map-view/place-selected-card-model"
import { PlaceImage } from "@/components/place-image"
import { listsUi } from "@/components/lists/lists-ui"
import { DeleteAccountSection } from "@/components/delete-account-section"
import { LocalPanelEntry } from "@/components/wallet/LocalPanelEntry"
import { cn } from "@/lib/utils"

/** Cuántos guardados se muestran en el perfil; el resto, en /favoritos. */
const SAVED_PREVIEW = 5
/** Cuántas listas se muestran en el perfil; el resto, en Guardados > Mis listas. */
const LISTS_PREVIEW = 3

type ProfileList = { _id: string; name: string; placesCount?: number }

/** Contenedor de cada bloque: la misma tarjeta blanca de Guardados y Listas. */
const box =
  "rounded-[22px] bg-white p-4 shadow-[0_10px_26px_-22px_rgba(31,42,34,0.5),0_0_0_1px_rgba(45,74,52,0.07)] md:p-5"
const sectionTitle = "text-xl font-extrabold tracking-[-0.02em] text-[#2D4A34]"
const muted = "text-sm text-[#5E6A60]"
const row =
  "flex min-h-[56px] items-center gap-3 rounded-[14px] px-1 py-1.5 transition-colors hover:bg-[#F7F3EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D4A34]/30"

function normalizeFavoritePlace(raw: unknown): IPlace | null {
  if (!raw || typeof raw !== "object") return null
  const place = raw as Partial<IPlace> & { _id?: { toString(): string } | string }
  if (!place._id || !place.name) return null
  return place as IPlace
}

/** Foto chica del lugar; sin foto, la portada de color de las tarjetas. */
function PlaceThumb({ place }: { place: IPlace }) {
  const src = getPlaceImageUrl(place.photos?.[0], "thumb")
  const cover = getPlaceCoverTheme(place)
  return (
    <div
      className={cn("relative h-12 w-12 shrink-0 overflow-hidden rounded-[12px]", !src && cover.texture)}
      style={src ? undefined : { backgroundColor: cover.bg }}
      data-testid="saved-place-thumb"
    >
      {src ? <PlaceImage src={src} alt="" fill className="object-cover" sizes="48px" /> : null}
    </div>
  )
}

/**
 * Link al pie de cada bloque, alineado a la izquierda. A la derecha, en el celular, pasa el
 * botón de CeliBot (fijo abajo a la derecha): ahí tapaba "Ver todos" al scrollear.
 */
function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn(listsUi.link, "mt-2")}>
      {children}
      <ChevronRight className="h-4 w-4" aria-hidden />
    </Link>
  )
}

export default function PerfilPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const redirectedRef = useRef(false)
  const [savedPlaces, setSavedPlaces] = useState<IPlace[]>([])
  const [loadingSaved, setLoadingSaved] = useState(true)
  const [lists, setLists] = useState<ProfileList[]>([])
  const [loadingLists, setLoadingLists] = useState(true)
  const [needsAppleReauth, setNeedsAppleReauth] = useState(false)

  const fetchSavedPlaces = useCallback(async () => {
    try {
      const data = await fetchApi<{ favorites: Array<{ placeId: unknown }> }>("/api/favorites")
      const places =
        data.favorites
          ?.map((f) => normalizeFavoritePlace(f.placeId))
          .filter((p): p is IPlace => Boolean(p)) || []
      setSavedPlaces(places)
    } catch {
      setSavedPlaces([])
    } finally {
      setLoadingSaved(false)
    }
  }, [])

  const fetchLists = useCallback(async () => {
    try {
      const data = await fetchApi<{ lists?: ProfileList[] }>("/api/lists?mine=1")
      setLists((data.lists ?? []).filter((l) => l && l._id && l.name))
    } catch {
      setLists([])
    } finally {
      setLoadingLists(false)
    }
  }, [])

  const fetchAccountFlags = useCallback(async () => {
    try {
      const data = await fetchApi<{ hasAppleSub?: boolean }>("/api/account")
      setNeedsAppleReauth(Boolean(data.hasAppleSub))
    } catch {
      setNeedsAppleReauth(false)
    }
  }, [])

  const hasValidUser = Boolean(session?.user?.id)
  const mustRedirect =
    status === "unauthenticated" || (status === "authenticated" && !hasValidUser)

  useEffect(() => {
    if (status === "loading") return
    if (mustRedirect) {
      if (redirectedRef.current) return
      redirectedRef.current = true
      router.replace("/login?callbackUrl=/perfil")
      return
    }
    redirectedRef.current = false
    if (status === "authenticated" && hasValidUser) {
      fetchSavedPlaces()
      fetchLists()
      fetchAccountFlags()
    }
  }, [status, mustRedirect, hasValidUser, router, fetchSavedPlaces, fetchLists, fetchAccountFlags])

  if (status === "loading" || mustRedirect) {
    return (
      <div
        className="container mx-auto max-w-lg px-4 pb-14 pt-6 md:pt-10"
        data-auth-state={status === "loading" ? "loading" : "redirecting"}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-12 w-48 rounded-xl bg-[#2D4A34]/10" />
          <div className="h-32 rounded-[22px] bg-[#2D4A34]/5" />
        </div>
      </div>
    )
  }

  const firstName = session?.user?.name?.trim().split(/\s+/)[0]

  return (
    <div className="container mx-auto max-w-lg px-4 pb-14 pt-6 md:pt-10" data-auth-state="authenticated">
      <header className="mb-6">
        <p className={listsUi.kicker}>{firstName ? `hola, ${firstName}` : "tu cuenta"}</p>
        <h1 className={listsUi.title}>Mi perfil</h1>
      </header>

      <section className={box} aria-label="Tu cuenta">
        <div className="flex items-center gap-4">
          {session?.user?.image && isAllowedAvatarUrl(session.user.image) ? (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full">
              <Image
                src={session.user.image}
                alt={session.user.name || ""}
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#2D4A34]/10">
              <User className="h-8 w-8 text-[#2D4A34]" aria-hidden />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold text-[#2D4A34]">{session?.user?.name}</p>
            <p className={cn(muted, "truncate")}>{session?.user?.email}</p>
          </div>
        </div>
        <button type="button" className={cn(listsUi.secondary, "mt-4 w-full")} onClick={() => signOut()}>
          <LogOut className="h-4 w-4" aria-hidden />
          Cerrar sesión
        </button>
      </section>

      <LocalPanelEntry />

      <section className={cn(box, "mt-6")} aria-labelledby="perfil-guardados">
        <h2 id="perfil-guardados" className={cn(sectionTitle, "mb-2")}>
          Lugares guardados
        </h2>
        {loadingSaved ? (
          <div className="space-y-2" aria-hidden>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-[14px] bg-[#2D4A34]/5" />
            ))}
          </div>
        ) : savedPlaces.length === 0 ? (
          <p className={cn(muted, "py-2")}>
            Todavía no guardaste ningún lugar. Tocá el corazón en la ficha de un lugar y va a aparecer acá.
          </p>
        ) : (
          <ul className="-mx-1 space-y-1">
            {savedPlaces.slice(0, SAVED_PREVIEW).map((place) => {
              const id = typeof place._id === "string" ? place._id : place._id.toString()
              return (
                <li key={id}>
                  <Link href={getPlacePath(place)} className={row}>
                    <PlaceThumb place={place} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-[#2D4A34]">{place.name}</p>
                      {place.neighborhood ? (
                        <p className="flex items-center gap-1 truncate text-xs text-[#5E6A60]">
                          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                          {place.neighborhood}
                        </p>
                      ) : null}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#5E6A60]" aria-hidden />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
        {!loadingSaved && savedPlaces.length > 0 ? (
          // El único link a /favoritos (antes había "Ver todos" arriba y "Ver los N restantes" abajo).
          <SectionLink href="/favoritos">
            {savedPlaces.length > SAVED_PREVIEW ? `Ver los ${savedPlaces.length} guardados` : "Ver en Guardados"}
          </SectionLink>
        ) : null}
      </section>

      <section className={cn(box, "mt-6")} aria-labelledby="perfil-listas">
        <h2 id="perfil-listas" className={cn(sectionTitle, "mb-2")}>
          Mis listas
        </h2>
        {loadingLists ? (
          <div className="h-14 animate-pulse rounded-[14px] bg-[#2D4A34]/5" aria-hidden />
        ) : lists.length === 0 ? (
          <p className={cn(muted, "py-2")}>
            Armá listas con tus lugares favoritos para tenerlos a mano o compartirlos.
          </p>
        ) : (
          <ul className="-mx-1 space-y-1">
            {lists.slice(0, LISTS_PREVIEW).map((list) => (
              <li key={list._id}>
                <Link href={`/listas/${list._id}`} className={row}>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-[#F1ECE2] text-[#2D4A34]">
                    <ListChecks className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-[#2D4A34]">{list.name}</p>
                    <p className="text-xs text-[#5E6A60]">{formatPlacesCount(list.placesCount ?? 0)}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#5E6A60]" aria-hidden />
                </Link>
              </li>
            ))}
            {lists.length > LISTS_PREVIEW ? (
              <li className={cn(muted, "px-1 pt-1")}>
                y {lists.length - LISTS_PREVIEW} {lists.length - LISTS_PREVIEW === 1 ? "lista más" : "listas más"}
              </li>
            ) : null}
          </ul>
        )}
        {!loadingLists ? (
          <SectionLink href={MIS_LISTAS_HREF}>{lists.length > 0 ? "Ver mis listas" : "Crear una lista"}</SectionLink>
        ) : null}
      </section>

      <DeleteAccountSection needsAppleReauth={needsAppleReauth} />
    </div>
  )
}
