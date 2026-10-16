"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { LoyaltyCardPreview } from "@/components/wallet/StampDots"
import type { CardSafety } from "@/lib/wallet/card-safety"
import type { StampIncrement } from "@/lib/wallet/promos"

type Props = {
  serial: string
  placeName: string
  reward: string
  initialStamps: number
  total: number
  safety: CardSafety | null
  /** Cuánto suma el próximo sello (2 en sello doble, +1 si viene invitado). Lo calcula el servidor. */
  initialNext: StampIncrement
}

/** Botones del local: sumar sello o, con la tarjeta completa, canjear el premio. */
export function StampActions({ serial, placeName, reward, initialStamps, total, safety, initialNext }: Props) {
  const [stamps, setStamps] = useState(initialStamps)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const complete = stamps >= total
  const [next, setNext] = useState(initialNext)
  const willAdd = Math.max(1, Math.min(next.added, total - stamps))

  async function send(accion: "sello" | "canje") {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/local/tarjetas/${serial}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        stamps?: number
        added?: number
        inviterRewarded?: boolean
        next?: StampIncrement
        error?: string
      }
      if (!res.ok || typeof data.stamps !== "number") {
        setMessage({ ok: false, text: data.error ?? "No se pudo actualizar la tarjeta." })
        return
      }
      setStamps(data.stamps)
      if (data.next) setNext(data.next)
      setMessage({
        ok: true,
        text:
          accion === "canje"
            ? "Premio canjeado. La tarjeta arranca de cero."
            : [
                (data.added ?? 1) > 1 ? `¡Sumaste ${data.added} sellos!` : "¡Sello sumado!",
                data.inviterRewarded ? "Su amigo también ganó un sello de regalo." : "",
              ]
                .filter(Boolean)
                .join(" "),
      })
    } catch {
      setMessage({ ok: false, text: "Sin conexión. Probá de nuevo." })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <LoyaltyCardPreview placeName={placeName} reward={reward} stamps={stamps} total={total} safety={safety} />
      {complete ? (
        <Button size="lg" disabled={busy} onClick={() => send("canje")}>
          Canjear premio: {reward}
        </Button>
      ) : (
        <>
          {next.friend && (
            <p className="rounded-xl bg-[#FBE9E2] p-3 text-center text-sm font-semibold text-[#B84420]">
              Viene invitado por un amigo: es su primer sello y le regalamos uno más. Su amigo también gana uno.
            </p>
          )}
          {next.reason === "double" && (
            <p className="rounded-xl bg-[#FBE9E2] p-3 text-center text-sm font-semibold text-[#B84420]">
              Ahora es horario de sello doble: esta visita suma 2.
            </p>
          )}
          <Button size="lg" disabled={busy} onClick={() => send("sello")}>
            {willAdd > 1 ? `Sumar ${willAdd} sellos` : "Sumar sello"}
          </Button>
        </>
      )}
      {message && (
        <p
          role="status"
          className={message.ok ? "text-center font-semibold text-olive" : "text-center text-[#B84420]"}
        >
          {message.text}
        </p>
      )}
    </div>
  )
}
