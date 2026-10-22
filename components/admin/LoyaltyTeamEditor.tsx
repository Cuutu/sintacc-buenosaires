"use client"

import { useState, type FormEvent } from "react"
import { X } from "lucide-react"
import { adminUi } from "@/lib/admin-ui"
import { cn } from "@/lib/utils"
import {
  addToTeam,
  isTeamEmail,
  normalizeTeamEmail,
  removeFromTeam,
  sameSlot,
  teamPatch,
  teamSlotOf,
  type TeamLists,
  type TeamSlot,
} from "@/lib/wallet/team"

/** Teclado de mail en el celu: con @, sin mayúscula inicial ni autocorrector. */
export const mailKeyboard = {
  inputMode: "email",
  autoCapitalize: "none",
  autoCorrect: "off",
  spellCheck: false,
  autoComplete: "off",
} as const

export type TeamEditorProgram = {
  placeName: string
  staffEmails: string[]
  employeeEmails: string[]
  branches: Array<{ placeId: string; name: string; staffEmails: string[] }>
}

const teamOf = (p: TeamEditorProgram): TeamLists => ({
  staffEmails: p.staffEmails,
  employeeEmails: p.employeeEmails,
  branches: p.branches.map((b) => ({ placeId: b.placeId, staffEmails: b.staffEmails })),
})

type Role = "manager" | "employee"

const ROLES: Array<{ value: Role; label: string; hint: string }> = [
  { value: "employee", label: "Empleado", hint: "Sólo suma sellos" },
  { value: "manager", label: "Encargado", hint: "Maneja todo" },
]

/**
 * Encargados y empleados de una tarjeta, de a una persona: pensado para el celular.
 * Cada cambio se guarda solo (manda a la API sólo la lista que cambió).
 */
export function LoyaltyTeamEditor({
  program,
  endpoint,
  method = "PATCH",
  onChanged,
}: {
  program: TeamEditorProgram
  /** Admin: /api/admin/wallet/programs/<id> (PATCH). Panel del local: /api/local/programas/<id>/equipo (PUT). */
  endpoint: string
  method?: "PATCH" | "PUT"
  onChanged: () => Promise<void> | void
}) {
  const team = teamOf(program)
  const hasBranches = program.branches.length > 0
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<Role>("employee")
  /** "" = el local principal. */
  const [where, setWhere] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)

  const slot: TeamSlot = role === "manager" ? { role } : { role, placeId: hasBranches && where ? where : null }
  const placeName = (placeId: string | null) =>
    placeId === null ? program.placeName : (program.branches.find((b) => b.placeId === placeId)?.name ?? "la sucursal")
  const describe = (s: TeamSlot) =>
    s.role === "manager" ? "encargado" : hasBranches ? `empleado de ${placeName(s.placeId)}` : "empleado"

  const typed = normalizeTeamEmail(email)
  const current = isTeamEmail(typed) ? teamSlotOf(team, typed) : null
  const moving = current && !sameSlot(current, slot) ? current : null

  async function save(next: TeamLists): Promise<boolean> {
    const body = teamPatch(team, next)
    if (Object.keys(body).length === 0) return true
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setError(data.error ?? "No se pudo guardar")
        return false
      }
    } catch {
      setError("Sin conexión. Probá de nuevo.")
      return false
    } finally {
      setBusy(false)
    }
    await onChanged()
    return true
  }

  async function add(e: FormEvent) {
    e.preventDefault()
    setDone(null)
    const result = addToTeam(team, email, slot)
    if (!result.ok) {
      setError(result.error)
      return
    }
    if (await save(result.team)) {
      setDone(role === "manager" ? `Listo: ${typed} ya maneja la tarjeta.` : `Listo: ${typed} ya puede sumar sellos.`)
      setEmail("")
      setOpen(false)
    }
  }

  async function remove(target: string) {
    setDone(null)
    if (await save(removeFromTeam(team, target))) {
      setConfirming(null)
      setDone(`Listo: ${target} ya no está en el equipo.`)
    }
  }

  const groups = [
    { key: "manager", title: "Encargados", hint: "manejan todo", emails: team.staffEmails },
    {
      key: "main",
      title: hasBranches ? `Empleados de ${program.placeName}` : "Empleados",
      hint: "sólo suman sellos",
      emails: team.employeeEmails,
    },
    ...program.branches.map((b) => ({
      key: b.placeId,
      title: `Empleados de ${b.name}`,
      hint: "sólo suman sellos ahí",
      emails: b.staffEmails,
    })),
  ]
  const input = `h-12 w-full rounded-xl border ${adminUi.border} bg-white px-3 text-base ${adminUi.text}`

  return (
    <section className={`grid gap-4 rounded-2xl border ${adminUi.border} bg-white p-4`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className={`text-base font-bold ${adminUi.text}`}>Equipo</h3>
        {!open && (
          <button
            type="button"
            className={adminUi.btnPrimary}
            onClick={() => {
              setOpen(true)
              setError(null)
              setDone(null)
              setConfirming(null)
            }}
          >
            Agregar persona
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={add} noValidate className="grid gap-3 rounded-xl bg-[#F8F5EF] p-3">
          <label className="grid gap-1">
            <span className={adminUi.label}>Mail con el que entra a CeliMap</span>
            <input
              {...mailKeyboard}
              type="email"
              enterKeyHint="done"
              // Se abre al tocar "Agregar persona": va directo al teclado.
              autoFocus
              className={input}
              placeholder="nombre@gmail.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(null)
              }}
            />
          </label>

          <div className="grid gap-1" role="group" aria-label="Qué puede hacer">
            <span className={adminUi.label}>Qué puede hacer</span>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  aria-pressed={role === r.value}
                  onClick={() => setRole(r.value)}
                  className={cn(
                    "grid min-h-14 content-center rounded-xl border px-3 py-2 text-left",
                    role === r.value
                      ? "border-[#234A33] bg-[#234A33] text-[#F8F5EF]"
                      : `${adminUi.border} bg-white ${adminUi.text}`
                  )}
                >
                  <span className="text-sm font-semibold">{r.label}</span>
                  <span className="text-xs opacity-80">{r.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {role === "employee" && hasBranches && (
            <label className="grid gap-1">
              <span className={adminUi.label}>Dónde trabaja</span>
              <select className={input} value={where} onChange={(e) => setWhere(e.target.value)}>
                <option value="">{program.placeName} (principal)</option>
                {program.branches.map((b) => (
                  <option key={b.placeId} value={b.placeId}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {moving && (
            <p className={`text-sm ${adminUi.text}`}>
              Hoy es {describe(moving)}: pasa a {describe(slot)}.
            </p>
          )}
          {error && <p className="text-sm text-[#B84420]">{error}</p>}

          <div className="flex gap-2">
            <button type="submit" className={cn(adminUi.btnPrimary, "flex-1")} disabled={busy || !typed}>
              {busy ? "Guardando…" : "Agregar"}
            </button>
            <button
              type="button"
              className={adminUi.btnGhost}
              onClick={() => {
                setOpen(false)
                setEmail("")
                setError(null)
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {groups.map((g) => (
        <div key={g.key} className="grid gap-2">
          <p className={`text-sm font-semibold ${adminUi.text}`}>
            {g.title} <span className={`font-normal ${adminUi.muted}`}>· {g.hint}</span>
          </p>
          {g.emails.length === 0 ? (
            <p className={`text-sm ${adminUi.muted}`}>Nadie todavía.</p>
          ) : (
            <ul className="grid gap-2">
              {g.emails.map((e) => (
                <li
                  key={e}
                  className="flex min-h-12 items-center justify-between gap-2 rounded-xl bg-[#F8F5EF] py-1 pl-3 pr-1"
                >
                  {confirming === e ? (
                    <>
                      <span className={`min-w-0 break-all text-sm ${adminUi.text}`}>
                        ¿Quitar a <strong>{e}</strong>?
                      </span>
                      <span className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          disabled={busy}
                          className={cn(adminUi.btnGhost, "px-3 text-[#B84420]")}
                          onClick={() => remove(e)}
                        >
                          Quitar
                        </button>
                        <button type="button" className={cn(adminUi.btnGhost, "px-3")} onClick={() => setConfirming(null)}>
                          No
                        </button>
                      </span>
                    </>
                  ) : (
                    <>
                      <span className={`min-w-0 break-all text-sm ${adminUi.text}`}>{e}</span>
                      <button
                        type="button"
                        aria-label={`Quitar a ${e}`}
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${adminUi.muted} hover:bg-white`}
                        onClick={() => {
                          setConfirming(e)
                          setError(null)
                          setDone(null)
                        }}
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {!open && error && <p className="text-sm text-[#B84420]">{error}</p>}
      {done && (
        <p role="status" className={`text-sm font-semibold ${adminUi.text}`}>
          {done}
        </p>
      )}
      <p className={`text-xs ${adminUi.muted}`}>
        Entran a la app o la web de CeliMap con ese mail (Google o Apple) y en su perfil les aparece “Escanear
        tarjeta”.
      </p>
    </section>
  )
}
