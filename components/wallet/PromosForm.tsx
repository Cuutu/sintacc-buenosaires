"use client"

import { useState } from "react"
import { Gift, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { REFERRAL_MAX_PER_CARD, WEEK_ORDER, WEEKDAY_SHORT, doubleStampText } from "@/lib/wallet/promos"
import type { DoubleStampWindow } from "@/models/LoyaltyProgram"

type Props = {
  programId: string
  initialDoubleStamp: DoubleStampWindow | null
  initialReferral: boolean
}

type Saved = { selloDoble: DoubleStampWindow | null; traeUnAmigo: boolean }

const DEFAULT_WINDOW: DoubleStampWindow = { days: [1, 2, 3], fromHour: 15, toHour: 18 }
const HOURS = Array.from({ length: 25 }, (_, h) => h)

/**
 * Promos del local: sello doble en sus días y horarios flojos, y "Traé un amigo"
 * (el invitado y quien lo invitó ganan un sello de regalo en la primera visita).
 */
export function PromosForm({ programId, initialDoubleStamp, initialReferral }: Props) {
  const [enabled, setEnabled] = useState(Boolean(initialDoubleStamp))
  const [slot, setSlot] = useState<DoubleStampWindow>(initialDoubleStamp ?? DEFAULT_WINDOW)
  const [referral, setReferral] = useState(initialReferral)
  const [saved, setSaved] = useState<Saved>({ selloDoble: initialDoubleStamp, traeUnAmigo: initialReferral })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const valid = slot.days.length > 0 && slot.fromHour < slot.toHour
  const preview = enabled && valid ? doubleStampText(slot) : null
  const draft: Saved = { selloDoble: enabled ? slot : null, traeUnAmigo: referral }
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)

  function toggleDay(day: number) {
    setMessage(null)
    setSlot((w) => ({
      ...w,
      days: w.days.includes(day) ? w.days.filter((d) => d !== day) : [...w.days, day].sort((a, b) => a - b),
    }))
  }

  async function save() {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/local/programas/${programId}/promos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })
      const data = (await res.json().catch(() => ({}))) as Partial<Saved> & { error?: string }
      if (!res.ok || data.selloDoble === undefined || typeof data.traeUnAmigo !== "boolean") {
        setMessage({ ok: false, text: data.error ?? "No se pudo guardar." })
        return
      }
      setSaved({ selloDoble: data.selloDoble, traeUnAmigo: data.traeUnAmigo })
      setMessage({
        ok: true,
        text:
          data.selloDoble || data.traeUnAmigo
            ? "¡Listo! Ya aparece en la tarjeta de tus clientes."
            : "Listo, sacamos las promos.",
      })
    } catch {
      setMessage({ ok: false, text: "Sin conexión. Probá de nuevo." })
    } finally {
      setBusy(false)
    }
  }

  const select = "h-11 rounded-xl border border-[#E8E1D6] bg-white px-3 text-base"

  return (
    <section className="mt-5 rounded-2xl bg-[#F8F5EF] p-4 text-olive">
      <h3 className="flex items-center gap-2 font-bold">
        <Sparkles className="h-4 w-4 text-terracotta-strong" aria-hidden />
        Sello doble
      </h3>
      <p className="mt-1 text-sm text-olive/80">
        En los días y horarios más tranquilos, cada visita suma 2 sellos. Sirve para que vengan cuando hay
        menos gente. Tus clientes lo ven en la tarjeta.
      </p>

      <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          className="h-5 w-5 accent-[#2D4A34]"
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.target.checked)
            setMessage(null)
          }}
        />
        Activar sello doble
      </label>

      {enabled && (
        <div className="mt-3 flex flex-col gap-3">
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wide text-olive/60">Días</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {WEEK_ORDER.map((day) => {
                const on = slot.days.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleDay(day)}
                    className={cn(
                      "h-11 min-w-[3rem] rounded-full border px-3 text-sm font-semibold",
                      on ? "border-olive bg-olive text-cream" : "border-[#E8E1D6] bg-white text-olive"
                    )}
                  >
                    {WEEKDAY_SHORT[day]}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-olive/60">
              Desde
              <select
                className={select}
                value={slot.fromHour}
                onChange={(e) => {
                  setSlot((w) => ({ ...w, fromHour: Number(e.target.value) }))
                  setMessage(null)
                }}
              >
                {HOURS.slice(0, 24).map((h) => (
                  <option key={h} value={h}>
                    {h} h
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-olive/60">
              Hasta
              <select
                className={select}
                value={slot.toHour}
                onChange={(e) => {
                  setSlot((w) => ({ ...w, toHour: Number(e.target.value) }))
                  setMessage(null)
                }}
              >
                {HOURS.slice(1).map((h) => (
                  <option key={h} value={h}>
                    {h === 24 ? "24 h (fin del día)" : `${h} h`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!valid && (
            <p className="text-sm text-[#B84420]">
              {slot.days.length === 0
                ? "Elegí al menos un día."
                : "El horario tiene que terminar después de empezar."}
            </p>
          )}
          {preview && (
            <p className="text-sm">
              <span className="text-olive/70">En la tarjeta dice:</span> {preview}
            </p>
          )}
        </div>
      )}

      <h3 className="mt-5 flex items-center gap-2 font-bold">
        <Gift className="h-4 w-4 text-terracotta-strong" aria-hidden />
        Traé un amigo
      </h3>
      <p className="mt-1 text-sm text-olive/80">
        Cada cliente tiene un link para invitar amigos. Cuando el amigo suma su primer sello, ganan un
        sello de regalo los dos (hasta {REFERRAL_MAX_PER_CARD} regalos por cliente). Si la apagás, los
        links dejan de servir; quien ya guardó la tarjeta con un link igual recibe su regalo.
      </p>
      <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          className="h-5 w-5 accent-[#2D4A34]"
          checked={referral}
          onChange={(e) => {
            setReferral(e.target.checked)
            setMessage(null)
          }}
        />
        Activar Traé un amigo
      </label>

      {message && (
        <p role="status" className={cn("mt-3 text-sm", message.ok ? "font-semibold" : "text-[#B84420]")}>
          {message.text}
        </p>
      )}

      {dirty && (
        <Button className="mt-3" disabled={busy || (enabled && !valid)} onClick={save}>
          Guardar
        </Button>
      )}
    </section>
  )
}
