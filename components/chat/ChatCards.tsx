"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { ListPlus } from "lucide-react"
import { fetchApi } from "@/lib/fetchApi"
import type { BuscarLugaresInput, BuscarLugaresResult } from "@/lib/chat/buscar-lugares"
import type { BuscarListasResult } from "@/lib/chat/buscar-listas"
import { isCienPorcientoBadge } from "@/lib/chat/place-links"
import type { ChatPlaceLinkCard } from "@/lib/chat/place-links"

function toLocalHref(url: string): string {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase()
    if (host === "celimap.com.ar") return `${parsed.pathname}${parsed.search}`
    return url
  } catch {
    return url
  }
}

function isLocalHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//")
}

function CardThumb({ src, alt }: { src?: string; alt: string }) {
  return (
    <span className="relative mt-0.5 h-12 w-12 shrink-0 overflow-hidden rounded-[10px] bg-[#1F4D35]/10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src || "/brand/app-icon.png"}
        alt=""
        width={48}
        height={48}
        className="h-full w-full object-cover"
      />
      <span className="sr-only">{alt}</span>
    </span>
  )
}

function PlaceMiniCard({
  nombre,
  url,
  tipo,
  direccion,
  barrio,
  badge,
}: {
  nombre: string
  url: string
  tipo?: string
  direccion?: string
  barrio?: string
  badge: "cien" | "opciones" | null
}) {
  const href = toLocalHref(url)
  const Label = isLocalHref(href) ? Link : "a"
  const line2 = [tipo, direccion || barrio].filter(Boolean).join(" · ")
  return (
    <div className="my-1.5 rounded-xl border border-[#EDEBE7] bg-[#FAFAF7] p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[14px] font-semibold text-[#1F4D35]">{nombre}</span>
        {badge ? (
          <span
            className={
              badge === "cien"
                ? "rounded-lg bg-[#1F4D35] px-2 py-0.5 text-[11px] font-semibold text-white"
                : "rounded-lg bg-[#B64320] px-2 py-0.5 text-[11px] font-semibold text-white"
            }
          >
            {badge === "cien" ? "100% sin TACC" : "Opciones sin TACC"}
          </span>
        ) : null}
      </div>
      {line2 ? <p className="mt-1 text-[13px] text-[#777]">{line2}</p> : null}
      <Label
        href={href}
        className="mt-1 inline-block text-[13px] font-semibold text-[#B64320] no-underline hover:underline"
        {...(!isLocalHref(href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        Ver en CeliMap →
      </Label>
    </div>
  )
}

export function ChatPlaceMiniCards({
  lugares,
}: {
  lugares: Array<{
    id?: string
    nombre: string
    url: string
    tipo?: string
    direccion?: string
    barrio?: string
    clasificacionTacc?: string
    esCienPorcientoSinTacc?: boolean
  }>
}) {
  if (lugares.length === 0) return null
  return (
    <div className="mt-1">
      {lugares.map((lugar, index) => (
        <PlaceMiniCard
          key={lugar.id || lugar.url || index}
          nombre={lugar.nombre}
          url={lugar.url}
          tipo={lugar.tipo}
          direccion={lugar.direccion}
          barrio={lugar.barrio}
          badge={
            lugar.esCienPorcientoSinTacc === true ||
            isCienPorcientoBadge(lugar.clasificacionTacc, lugar.esCienPorcientoSinTacc)
              ? "cien"
              : lugar.clasificacionTacc || lugar.esCienPorcientoSinTacc === false
                ? "opciones"
                : null
          }
        />
      ))}
    </div>
  )
}

export function ChatPlaceCards({
  result,
  zona,
}: {
  result: BuscarLugaresResult
  zona?: string
}) {
  if (result.lugares.length === 0) return null
  return (
    <div className="mt-2 w-full">
      <CreateListAction
        placeIds={result.lugares.map((lugar) => lugar.id).filter(Boolean)}
        zona={zona}
      />
    </div>
  )
}

export function mergePlaceCards(
  fromTool: BuscarLugaresResult | null | undefined,
  fromText: ChatPlaceLinkCard[]
) {
  if (fromTool && fromTool.lugares.length > 0) return fromTool.lugares
  return fromText
}

export function ChatListCards({ result }: { result: BuscarListasResult }) {
  if (result.listas.length === 0) return null

  return (
    <div className="mt-2 w-full space-y-2">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-[#1F4D35]/55">
        Listas de CeliMap
      </p>
      {result.listas.map((lista) => {
        const href = toLocalHref(lista.url)
        return (
          <Link
            key={lista.id}
            href={href}
            className="flex items-start gap-2.5 rounded-[14px] border border-[#EDEBE7] bg-white px-3 py-2.5 no-underline shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-colors hover:border-[#1F4D35]/40"
          >
            <CardThumb src={lista.foto} alt="" />
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-[#1F4D35]">{lista.nombre}</span>
              <span className="mt-0.5 block text-[12px] text-[#2D2D2D]/70">
                {[lista.destino, lista.lugares ? `${lista.lugares} lugares` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}

function CreateListAction({
  placeIds,
  zona,
}: {
  placeIds: string[]
  zona?: string
}) {
  const { status } = useSession()
  const pathname = usePathname() || "/"
  const [busy, setBusy] = useState(false)
  if (placeIds.length === 0) return null

  const loginHref = `/login?callbackUrl=${encodeURIComponent(pathname)}`
  const name = zona ? `Lugares en ${zona}` : "Lista de CeliMap"

  if (status !== "authenticated") {
    return (
      <Link
        href={loginHref}
        className="mt-1 inline-flex items-center gap-1.5 rounded-[20px] border-[1.5px] border-[#1F4D35] bg-white px-3 py-2 text-[13px] font-semibold text-[#1F4D35] no-underline hover:bg-[#1F4D35] hover:text-white"
      >
        <ListPlus className="h-3.5 w-3.5" />
        Iniciá sesión para armar una lista
      </Link>
    )
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          const created = await fetchApi<{ _id?: string } & { id?: string }>("/api/lists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              destination: zona,
              placeIds,
            }),
          })
          const id = created._id || created.id
          toast.success("Lista creada")
          if (id) window.location.assign(`/listas/${id}`)
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "No pude crear la lista")
        } finally {
          setBusy(false)
        }
      }}
      className="mt-1 inline-flex items-center gap-1.5 rounded-[20px] border-[1.5px] border-[#1F4D35] bg-white px-3 py-2 text-[13px] font-semibold text-[#1F4D35] hover:bg-[#1F4D35] hover:text-white disabled:opacity-40"
    >
      <ListPlus className="h-3.5 w-3.5" />
      {busy ? "Creando…" : "Crear lista con estos lugares"}
    </button>
  )
}

export function chatZonaFromInput(input: BuscarLugaresInput | null): string | undefined {
  return input?.zona?.trim() || undefined
}
