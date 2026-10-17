"use client"

import { useState } from "react"
import { Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import { REFERRAL_TEXT } from "@/lib/wallet/promos"

type Props = { url: string; placeName: string }

/** "Traé un amigo": el cliente comparte su link (WhatsApp, etc.) o lo copia. */
export function InviteShare({ url, placeName }: Props) {
  const [status, setStatus] = useState<string | null>(null)

  async function share() {
    setStatus(null)
    const text = `Sumate a la tarjeta de sellos de ${placeName} en CeliMap. Con tu primer sello ganamos uno de regalo los dos.`
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: `Tarjeta de sellos · ${placeName}`, text, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setStatus("¡Link copiado! Pegalo en WhatsApp.")
    } catch (error) {
      // Cancelar la ventana de compartir no es un error.
      if (error instanceof Error && error.name === "AbortError") return
      setStatus("No se pudo compartir. Copiá el link de abajo.")
    }
  }

  return (
    <section className="rounded-2xl bg-cream-card p-4 text-olive">
      <h2 className="flex items-center gap-2 font-bold">
        <Gift className="h-4 w-4 text-terracotta-strong" aria-hidden />
        Traé un amigo
      </h2>
      <p className="mt-1 text-sm text-olive/80">{REFERRAL_TEXT}</p>
      <Button className="mt-3 w-full" onClick={share}>
        Compartir mi link
      </Button>
      {status && (
        <p role="status" className="mt-2 text-center text-sm">
          {status}
        </p>
      )}
      <p className="mt-2 break-all text-center text-xs text-olive/60">{url}</p>
    </section>
  )
}
