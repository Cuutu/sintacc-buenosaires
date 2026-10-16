"use client"

import { useState } from "react"
import Image from "next/image"
import { Megaphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatNoticeTime, NOTICE_COOLDOWN_MS, NOTICE_MAX_LENGTH } from "@/lib/wallet/notice"

type Props = {
  programId: string
  placeName: string
  /** Cuántos clientes tienen la tarjeta. */
  cards: number
  active: boolean
  lastNotice: { text: string; sentAt: string } | null
  /** Si ya mandó uno hoy: desde cuándo puede mandar otro ("16/10 18:30"). */
  nextAt: string | null
}

const EXAMPLES = ["Salieron las medialunas sin TACC", "Hoy hay pan de masa madre sin TACC", "Mañana abrimos a las 10"]

/** El local le manda un aviso a todos los que tienen su tarjeta. Llega a la pantalla bloqueada. */
export function NoticeForm({ programId, placeName, cards, active, lastNotice, nextAt }: Props) {
  const [text, setText] = useState("")
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<{ text: string; sentAt: string } | null>(null)
  const [blockedUntil, setBlockedUntil] = useState(nextAt)

  const shown = sent ?? lastNotice
  const clients = cards === 1 ? "1 cliente" : `${cards} clientes`
  const disabled = !active || cards === 0 || Boolean(blockedUntil)

  async function send() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/local/programas/${programId}/aviso`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: text }),
      })
      const data = (await res.json().catch(() => ({}))) as { texto?: string; enviado?: string; error?: string }
      if (!res.ok || !data.texto || !data.enviado) {
        setError(data.error ?? "No se pudo mandar el aviso.")
        return
      }
      setSent({ text: data.texto, sentAt: formatNoticeTime(new Date(data.enviado)) })
      setBlockedUntil(formatNoticeTime(new Date(new Date(data.enviado).getTime() + NOTICE_COOLDOWN_MS)))
      setText("")
    } catch {
      setError("Sin conexión. Probá de nuevo.")
    } finally {
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <section className="mt-5 rounded-2xl bg-[#F8F5EF] p-4 text-olive">
      <h3 className="flex items-center gap-2 font-bold">
        <Megaphone className="h-4 w-4 text-terracotta-strong" aria-hidden />
        Mandá un aviso a tus clientes
      </h3>
      <p className="mt-1 text-sm text-olive/80">
        Le llega al celu a todos los que tienen tu tarjeta, aunque no estén cerca. Uno por día.
      </p>

      {sent && <p className="mt-3 text-sm font-semibold">¡Listo! Le llegó a tus clientes.</p>}
      {shown && (
        <p className="mt-3 text-sm">
          <span className="text-olive/70">Último aviso ({shown.sentAt}):</span> {shown.text}
        </p>
      )}

      {!active ? (
        <p className="mt-3 text-sm text-[#B84420]">La tarjeta está pausada.</p>
      ) : cards === 0 ? (
        <p className="mt-3 text-sm text-olive/70">Cuando alguien guarde tu tarjeta, le vas a poder mandar avisos.</p>
      ) : blockedUntil ? (
        <p className="mt-3 text-sm text-olive/70">El próximo aviso lo podés mandar desde el {blockedUntil}.</p>
      ) : (
        <>
          <label htmlFor={`aviso-${programId}`} className="sr-only">
            Texto del aviso
          </label>
          <textarea
            id={`aviso-${programId}`}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setConfirming(false)
            }}
            maxLength={NOTICE_MAX_LENGTH}
            rows={2}
            placeholder="Ej.: Salieron las medialunas sin TACC"
            className="mt-3 w-full resize-none rounded-xl border border-[#E8E1D6] bg-white p-3 text-base"
          />
          <div className="flex flex-wrap items-center gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setText(example)
                  setConfirming(false)
                }}
                className="rounded-full border border-[#E8E1D6] bg-white px-3 py-1 text-xs"
              >
                {example}
              </button>
            ))}
            <span className="ml-auto text-xs text-olive/60">
              {text.length}/{NOTICE_MAX_LENGTH}
            </span>
          </div>

          {text.trim().length >= 3 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-olive/60">Así le llega</p>
              {/* Parecido al aviso de la pantalla bloqueada del iPhone. */}
              <div className="mt-1 flex gap-3 rounded-2xl bg-white/90 p-3 shadow-[0_2px_12px_rgba(45,74,52,0.15)]">
                <Image
                  src="/wallet/apple/icon@2x.png"
                  alt=""
                  width={58}
                  height={58}
                  unoptimized
                  className="h-9 w-9 shrink-0 rounded-lg"
                />
                <div className="min-w-0 text-sm">
                  <p className="flex justify-between gap-2">
                    <strong>CeliMap</strong>
                    <span className="text-xs text-olive/50">ahora</span>
                  </p>
                  <p className="break-words">
                    {placeName}: {text.trim()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {error && <p className="mt-3 text-sm text-[#B84420]">{error}</p>}

      {!disabled &&
        (confirming ? (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-sm font-semibold">Le llega a {clients} y no se puede borrar. ¿Lo mandamos?</p>
            <div className="flex gap-2">
              <Button disabled={busy} onClick={send}>
                Sí, mandar
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => setConfirming(false)}>
                Cambiar
              </Button>
            </div>
          </div>
        ) : (
          <Button className="mt-3" disabled={text.trim().length < 3} onClick={() => setConfirming(true)}>
            Mandar a {clients}
          </Button>
        ))}
    </section>
  )
}
