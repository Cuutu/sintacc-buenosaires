"use client"

import { useState } from "react"
import { Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import { rewardChangeText } from "@/lib/wallet/reward-text"

type Props = {
  programId: string
  placeName: string
  stampsForReward: number
  reward: string
  /** Cuántos clientes tienen la tarjeta (les llega el aviso). */
  cards: number
  /** Si lo cambió hace menos de 15 días: desde cuándo puede de nuevo ("02/11 18:30"). */
  nextAt: string | null
  /** El admin no tiene la espera de 15 días. */
  isAdmin: boolean
}

const STAMP_OPTIONS = Array.from({ length: 20 }, (_, i) => i + 1)

/** El encargado cambia cuántos sellos pide y el premio. Una vez cada 15 días. */
export function RewardForm({ programId, placeName, stampsForReward, reward, cards, nextAt, isAdmin }: Props) {
  const [saved, setSaved] = useState({ stampsForReward, reward })
  const [stamps, setStamps] = useState(stampsForReward)
  const [text, setText] = useState(reward)
  const [blockedUntil, setBlockedUntil] = useState(isAdmin ? null : nextAt)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const trimmed = text.trim()
  const dirty = stamps !== saved.stampsForReward || trimmed !== saved.reward
  const valid = trimmed.length >= 2 && trimmed.length <= 80
  const clients = cards === 1 ? "1 cliente" : `${cards} clientes`

  function edit(next: () => void) {
    next()
    setConfirming(false)
    setMessage(null)
  }

  async function save() {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/local/programas/${programId}/premio`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stampsForReward: stamps, reward: trimmed }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        stampsForReward?: number
        reward?: string
        nextAt?: string | null
        error?: string
      }
      if (!res.ok || typeof data.stampsForReward !== "number" || typeof data.reward !== "string") {
        setMessage({ ok: false, text: data.error ?? "No se pudo guardar el cambio." })
        return
      }
      setSaved({ stampsForReward: data.stampsForReward, reward: data.reward })
      setStamps(data.stampsForReward)
      setText(data.reward)
      setBlockedUntil(isAdmin ? null : (data.nextAt ?? null))
      setMessage({
        ok: true,
        text:
          cards > 0
            ? "¡Listo! Ya se actualizó la tarjeta de tus clientes y les llega el aviso."
            : "¡Listo! Los clientes nuevos van a ver las nuevas condiciones.",
      })
    } catch {
      setMessage({ ok: false, text: "Sin conexión. Probá de nuevo." })
    } finally {
      setBusy(false)
      setConfirming(false)
    }
  }

  const field = "h-11 rounded-xl border border-[#E8E1D6] bg-white px-3 text-base"

  return (
    <section className="mt-5 rounded-2xl bg-[#F8F5EF] p-4 text-olive">
      <h3 className="flex items-center gap-2 font-bold">
        <Gift className="h-4 w-4 text-terracotta-strong" aria-hidden />
        Sellos y premio
      </h3>
      <p className="mt-1 text-sm text-olive/80">
        Vale para todos los que tienen tu tarjeta: los sellos que ya juntaron no se pierden. Podés cambiarlo una vez
        cada 15 días.
      </p>

      {message && (
        <p role="status" className={message.ok ? "mt-3 text-sm font-semibold" : "mt-3 text-sm text-[#B84420]"}>
          {message.text}
        </p>
      )}

      {blockedUntil ? (
        <p className="mt-3 text-sm text-olive/70">
          Ahora: {saved.stampsForReward} sellos = <strong>{saved.reward}</strong>. Lo vas a poder cambiar de nuevo
          desde el {blockedUntil}.
        </p>
      ) : (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-[140px_1fr]">
            <label className="grid gap-1 text-sm font-semibold">
              Sellos
              <select
                value={stamps}
                onChange={(e) => edit(() => setStamps(Number(e.target.value)))}
                className={`${field} font-normal`}
              >
                {STAMP_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Premio
              <input
                value={text}
                maxLength={80}
                placeholder="Ej.: Un café con medialuna"
                onChange={(e) => edit(() => setText(e.target.value))}
                className={`${field} font-normal`}
              />
            </label>
          </div>

          {dirty && valid && (
            <p className="mt-3 rounded-xl bg-white p-3 text-sm">
              <span className="text-olive/70">Así lo ven tus clientes:</span>{" "}
              {rewardChangeText(placeName, stamps, trimmed)}
            </p>
          )}

          {confirming ? (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-sm font-semibold">
                {cards > 0 ? `Le llega el aviso a ${clients}. ` : ""}
                {isAdmin ? "¿Lo cambiamos?" : "Después no lo vas a poder cambiar por 15 días. ¿Lo cambiamos?"}
              </p>
              <div className="flex gap-2">
                <Button disabled={busy} onClick={save}>
                  Sí, cambiar
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => setConfirming(false)}>
                  Volver
                </Button>
              </div>
            </div>
          ) : (
            <Button className="mt-3" disabled={!dirty || !valid} onClick={() => setConfirming(true)}>
              Guardar cambios
            </Button>
          )}
        </>
      )}
    </section>
  )
}
