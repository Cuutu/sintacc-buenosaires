"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { ListPlus, MapPin } from "lucide-react"
import { fetchApi } from "@/lib/fetchApi"
import type { BuscarLugaresInput, BuscarLugaresResult } from "@/lib/chat/buscar-lugares"
import type { BuscarListasResult } from "@/lib/chat/buscar-listas"

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

export function ChatPlaceCards({
  result,
  zona,
}: {
  result: BuscarLugaresResult
  zona?: string
}) {
  if (result.error) {
    return <p className="mt-2 text-[13px] text-[#2D2D2D]/70">{result.error}</p>
  }
  if (result.lugares.length === 0) return null

  return (
    <div className="mt-2 w-full space-y-2">
      {result.lugares.map((lugar) => {
        const href = toLocalHref(lugar.url)
        const Label = isLocalHref(href) ? Link : "a"
        return (
          <Label
            key={lugar.id}
            href={href}
            className="block rounded-[14px] border border-[#E0D9CF] bg-white px-3 py-2.5 no-underline shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-colors hover:border-[#1F4D35]/40"
            {...(!isLocalHref(href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            <span className="block text-[14px] font-semibold text-[#1F4D35]">{lugar.nombre}</span>
            <span className="mt-0.5 block text-[12px] leading-snug text-[#2D2D2D]/70">
              {[lugar.barrio, lugar.tipo, lugar.clasificacionTacc].filter(Boolean).join(" · ")}
            </span>
          </Label>
        )
      })}
      <CreateListAction
        placeIds={result.lugares.map((lugar) => lugar.id).filter(Boolean)}
        zona={zona}
      />
    </div>
  )
}

export function ChatListCards({ result }: { result: BuscarListasResult }) {
  if (result.error) {
    return <p className="mt-2 text-[13px] text-[#2D2D2D]/70">{result.error}</p>
  }
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
            className="flex items-start gap-2 rounded-[14px] border border-[#E0D9CF] bg-white px-3 py-2.5 no-underline shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-colors hover:border-[#1F4D35]/40"
          >
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#B64320]" strokeWidth={2.2} />
            <span className="min-w-0">
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
