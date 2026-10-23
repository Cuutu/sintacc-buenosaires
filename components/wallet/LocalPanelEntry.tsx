"use client"

import { useEffect, useState } from "react"
import { ChevronRight, ScanLine, Store } from "lucide-react"

type Me = { local: boolean; lugares: string[] }

/**
 * En el perfil: si la cuenta atiende un local con tarjeta de sellos, accesos a escanear y al panel.
 * Ser admin no alcanza (ver /api/local/yo): un admin sin local propio no ve esta sección.
 * Así el personal maneja todo desde la app de CeliMap, con la sesión ya iniciada.
 * Son <a> y no <Link>: /local/escanear necesita carga completa para habilitar la cámara.
 */
export function LocalPanelEntry() {
  const [me, setMe] = useState<Me | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/local/yo", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<Me>) : null))
      .then((data) => {
        if (!cancelled) setMe(data)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  if (!me?.local) return null
  const title = me.lugares.length === 1 ? me.lugares[0] : "Tus locales"

  return (
    <section className="mt-6 rounded-2xl bg-olive p-5 text-cream">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cream/70">
        <Store className="h-4 w-4" aria-hidden />
        Tarjeta de sellos
      </p>
      <h2 className="mt-1 text-lg font-bold">{title}</h2>
      <div className="mt-4 grid gap-2">
        <a
          href="/local/escanear"
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#B84420] px-5 font-semibold text-white"
        >
          <ScanLine className="h-5 w-5" aria-hidden />
          Escanear tarjeta
        </a>
        <a
          href="/local"
          className="flex h-12 items-center justify-between rounded-full bg-cream/10 px-5 font-semibold text-cream"
        >
          Panel del local
          <ChevronRight className="h-5 w-5" aria-hidden />
        </a>
      </div>
    </section>
  )
}
