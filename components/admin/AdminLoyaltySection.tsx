"use client"

import { useEffect, useState } from "react"
import { adminUi } from "@/lib/admin-ui"
import { cn } from "@/lib/utils"
import type { AdminProgramRow } from "@/lib/wallet/loyalty-admin"
import { MonthlyStamps } from "@/components/wallet/MonthlyStamps"
import { monthChange } from "@/lib/wallet/month-stats"
import { LoyaltyTeamEditor, mailKeyboard } from "@/components/admin/LoyaltyTeamEditor"

// Igual que DELETE_CONFIRMATION de loyalty-admin (ese archivo usa Mongo y no entra al navegador).
const DELETE_WORD = "BORRAR"

type PlaceOption = { id: string; name: string; neighborhood?: string; status?: string }

type BranchDraft = { placeId: string; name: string; staffEmails: string }

type FormValues = {
  stampsForReward: number
  reward: string
  staffEmails: string
  employeeEmails: string
  brandName: string
  branches: BranchDraft[]
}

const EMPTY_VALUES: FormValues = {
  stampsForReward: 5,
  reward: "",
  staffEmails: "",
  employeeEmails: "",
  brandName: "",
  branches: [],
}

/** Lo que se manda a la API al crear (mails separados, sucursales sin el nombre). */
const programBody = (values: FormValues) => ({
  stampsForReward: values.stampsForReward,
  reward: values.reward,
  staffEmails: parseEmails(values.staffEmails),
  employeeEmails: parseEmails(values.employeeEmails),
  brandName: values.brandName.trim(),
  branches: values.branches.map((b) => ({ placeId: b.placeId, staffEmails: parseEmails(b.staffEmails) })),
})

/**
 * Al editar: sellos, premio, nombre y sucursales. El equipo (encargados y empleados) se
 * edita aparte, de a una persona, y no se manda acá para no pisarlo.
 */
const editBody = (values: FormValues) => ({
  stampsForReward: values.stampsForReward,
  reward: values.reward,
  brandName: values.brandName.trim(),
  branches: values.branches.map((b) => ({ placeId: b.placeId, staffEmails: parseEmails(b.staffEmails) })),
})

const fromProgram = (program: AdminProgramRow): FormValues => ({
  stampsForReward: program.stampsForReward,
  reward: program.reward,
  staffEmails: program.staffEmails.join(", "),
  employeeEmails: program.employeeEmails.join(", "),
  brandName: program.brandName,
  branches: program.branches.map((b) => ({ placeId: b.placeId, name: b.name, staffEmails: b.staffEmails.join(", ") })),
})

const parseEmails = (raw: string) =>
  raw
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter(Boolean)

async function sendJson(url: string, method: string, body: unknown): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.ok) return null
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    return data.error ?? "No se pudo guardar"
  } catch {
    return "Sin conexión"
  }
}

export function AdminLoyaltySection({ initialPrograms }: { initialPrograms: AdminProgramRow[] }) {
  const [programs, setPrograms] = useState(initialPrograms)
  const [creating, setCreating] = useState(false)

  async function reload() {
    const res = await fetch("/api/admin/wallet/programs", { cache: "no-store" })
    if (res.ok) setPrograms(((await res.json()) as { programs: AdminProgramRow[] }).programs)
  }

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={adminUi.title}>Tarjetas de sellos</h1>
          <p className={`mt-2 ${adminUi.subtitle}`}>
            Un programa por local. El local suma sellos, manda avisos y arma sus promos desde /local con su Google. Pausar frena las tarjetas nuevas; las que ya existen siguen sumando. Borrar elimina el programa con sus tarjetas y sellos.
          </p>
        </div>
        {!creating && (
          <button type="button" className={adminUi.btnPrimary} onClick={() => setCreating(true)}>
            Nueva tarjeta
          </button>
        )}
      </div>

      {creating && (
        <NewProgramForm
          onCancel={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false)
            await reload()
          }}
        />
      )}

      {programs.length > 0 && <MonthSummary programs={programs} />}

      {programs.length === 0 && !creating ? (
        <p className={`${adminUi.card} mt-6 p-5 ${adminUi.muted}`}>Todavía no hay ningún local con tarjeta.</p>
      ) : (
        <ul className="mt-6 grid gap-4 lg:grid-cols-2">
          {programs.map((p) => (
            <ProgramCard key={p.id} program={p} onChanged={reload} />
          ))}
        </ul>
      )}
    </div>
  )
}

/** Sellos de este mes de todos los locales, de mayor a menor (para pensar el tope gratis). */
function MonthSummary({ programs }: { programs: AdminProgramRow[] }) {
  const rows = programs
    .map((p) => {
      const current = p.monthly[p.monthly.length - 1]
      const previous = p.monthly[p.monthly.length - 2]
      return { id: p.id, name: p.brandName || p.placeName, stamps: current?.stamps ?? 0, previous: previous?.stamps ?? 0, customers: current?.customers ?? 0 }
    })
    .sort((a, b) => b.stamps - a.stamps)
  const total = rows.reduce((sum, r) => sum + r.stamps, 0)
  const previousTotal = rows.reduce((sum, r) => sum + r.previous, 0)
  const change = monthChange(total, previousTotal)
  const monthName = programs[0]?.monthly[programs[0].monthly.length - 1]?.label ?? ""
  return (
    <section className={`${adminUi.card} mt-6 p-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className={`text-lg font-bold ${adminUi.text}`}>Sellos de {monthName}</h2>
        <p className={adminUi.muted}>
          <strong className={`text-2xl ${adminUi.text}`}>{total}</strong> en total
          {change && ` (${change} vs. el mes pasado)`}
        </p>
      </div>
      <p className={`mt-1 text-sm ${adminUi.muted}`}>
        Todavía no se cobra nada: es para ver cuánto usa cada local antes de definir el tope gratis.
      </p>
      <table className={`mt-4 w-full text-left text-sm ${adminUi.text}`}>
        <thead>
          <tr className={adminUi.label}>
            <th className="py-2 font-semibold">Local</th>
            <th className="py-2 text-right font-semibold">Este mes</th>
            <th className="py-2 text-right font-semibold">Mes pasado</th>
            <th className="hidden py-2 text-right font-semibold sm:table-cell">Clientes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={`border-t ${adminUi.border}`}>
              <td className="py-2">{r.name}</td>
              <td className="py-2 text-right font-bold">{r.stamps}</td>
              <td className={`py-2 text-right ${adminUi.muted}`}>{r.previous}</td>
              <td className={`hidden py-2 text-right sm:table-cell ${adminUi.muted}`}>{r.customers}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

/** Buscador de lugares de CeliMap (para el local principal y las sucursales). */
function PlaceSearch({
  label,
  placeholder,
  exclude = [],
  onPick,
}: {
  label: string
  placeholder: string
  exclude?: string[]
  onPick: (place: PlaceOption) => void
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<PlaceOption[]>([])

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/wallet/places?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
        })
        if (res.ok) setResults(((await res.json()) as { places: PlaceOption[] }).places)
      } catch {
        // búsqueda cancelada
      }
    }, 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  const shown = results.filter((r) => !exclude.includes(r.id))
  return (
    <label className="grid gap-1">
      <span className={adminUi.label}>{label}</span>
      <input
        className={`h-11 w-full rounded-xl border ${adminUi.border} bg-white px-3 ${adminUi.text}`}
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {shown.length > 0 && (
        <ul className={`mt-1 overflow-hidden rounded-xl border ${adminUi.border} bg-white`}>
          {shown.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className={`w-full px-3 py-2 text-left hover:bg-[#F8F5EF] ${adminUi.text}`}
                onClick={() => {
                  onPick(r)
                  setQuery("")
                  setResults([])
                }}
              >
                {r.name}
                <span className={adminUi.muted}>
                  {r.neighborhood ? ` · ${r.neighborhood}` : ""}
                  {r.status === "pending" ? " · sin publicar" : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </label>
  )
}

function ProgramFields({
  values,
  onChange,
  mainPlaceId,
  team = true,
}: {
  values: FormValues
  onChange: (v: FormValues) => void
  /** Para no ofrecer el local principal como sucursal. */
  mainPlaceId?: string
  /** Mostrar los mails del equipo (al crear). Al editar, el equipo va en su propio bloque. */
  team?: boolean
}) {
  const input = `h-11 w-full rounded-xl border ${adminUi.border} bg-white px-3 ${adminUi.text}`
  const setBranch = (i: number, patch: Partial<BranchDraft>) =>
    onChange({ ...values, branches: values.branches.map((b, j) => (j === i ? { ...b, ...patch } : b)) })
  return (
    <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
      <label className="grid gap-1">
        <span className={adminUi.label}>Sellos</span>
        <input
          type="number"
          min={1}
          max={20}
          className={input}
          value={values.stampsForReward}
          onChange={(e) => onChange({ ...values, stampsForReward: Number(e.target.value) })}
        />
      </label>
      <label className="grid gap-1">
        <span className={adminUi.label}>Premio</span>
        <input
          className={input}
          maxLength={80}
          placeholder="Un café de regalo"
          value={values.reward}
          onChange={(e) => onChange({ ...values, reward: e.target.value })}
        />
      </label>
      {team && (
        <>
          <label className="grid gap-1 sm:col-span-2">
            <span className={adminUi.label}>
              Encargados: manejan todo (sellos, avisos, promos y premio
              {values.branches.length > 0 ? ", en todas las sucursales" : ""}). Mails de Google, separados por coma
            </span>
            <input
              {...mailKeyboard}
              className={input}
              placeholder="duenio@gmail.com"
              value={values.staffEmails}
              onChange={(e) => onChange({ ...values, staffEmails: e.target.value })}
            />
          </label>
          <label className="grid gap-1 sm:col-span-2">
            <span className={adminUi.label}>
              Empleados{values.branches.length > 0 ? " del local principal" : ""}: sólo suman sellos. Separados por coma
            </span>
            <input
              {...mailKeyboard}
              className={input}
              placeholder="caja@gmail.com (opcional)"
              value={values.employeeEmails}
              onChange={(e) => onChange({ ...values, employeeEmails: e.target.value })}
            />
          </label>
        </>
      )}

      <fieldset className={`grid gap-3 rounded-xl border ${adminUi.border} p-3 sm:col-span-2`}>
        <legend className={`px-1 ${adminUi.label}`}>Sucursales</legend>
        <p className={`text-sm ${adminUi.muted}`}>
          {team
            ? "Una sola tarjeta que vale en todas. Cada sucursal puede tener sus empleados: sólo suman sellos ahí; los encargados de arriba manejan todo."
            : "Una sola tarjeta que vale en todas. Los empleados de cada sucursal se agregan en Equipo."}
        </p>
        {values.branches.length > 0 && (
          <label className="grid gap-1">
            <span className={adminUi.label}>Nombre en la tarjeta (la marca)</span>
            <input
              className={input}
              maxLength={60}
              placeholder="Ej.: Polvorín"
              value={values.brandName}
              onChange={(e) => onChange({ ...values, brandName: e.target.value })}
            />
          </label>
        )}
        {values.branches.map((b, i) => (
          <div key={b.placeId} className="grid gap-2 rounded-xl bg-[#F8F5EF] p-3">
            <div className="flex items-center justify-between gap-2">
              <strong className={adminUi.text}>{b.name}</strong>
              <button
                type="button"
                className={cn(adminUi.chip, "text-[#B84420]")}
                onClick={() => onChange({ ...values, branches: values.branches.filter((_, j) => j !== i) })}
              >
                Quitar
              </button>
            </div>
            {team && (
              <input
                {...mailKeyboard}
                className={input}
                aria-label={`Empleados de ${b.name}`}
                placeholder="Empleados de esta sucursal: sólo suman sellos (opcional)"
                value={b.staffEmails}
                onChange={(e) => setBranch(i, { staffEmails: e.target.value })}
              />
            )}
          </div>
        ))}
        <PlaceSearch
          label="Agregar sucursal"
          placeholder="Buscá la sucursal en CeliMap"
          exclude={[...(mainPlaceId ? [mainPlaceId] : []), ...values.branches.map((b) => b.placeId)]}
          onPick={(place) =>
            onChange({
              ...values,
              branches: [...values.branches, { placeId: place.id, name: place.name, staffEmails: "" }],
            })
          }
        />
      </fieldset>
    </div>
  )
}

function NewProgramForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const [place, setPlace] = useState<PlaceOption | null>(null)
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!place) return setError("Elegí el local")
    setBusy(true)
    const err = await sendJson("/api/admin/wallet/programs", "POST", { placeId: place.id, ...programBody(values) })
    setBusy(false)
    if (err) setError(err)
    else onCreated()
  }

  return (
    <section className={`${adminUi.card} mt-6 grid gap-4 p-5`}>
      <h2 className={`text-lg font-bold ${adminUi.text}`}>Nueva tarjeta</h2>
      {place ? (
        <div className="flex items-center justify-between gap-3">
          <p className={adminUi.text}>
            <strong>{place.name}</strong>
            {place.neighborhood ? ` · ${place.neighborhood}` : ""}
          </p>
          <button type="button" className={adminUi.chip} onClick={() => setPlace(null)}>
            Cambiar
          </button>
        </div>
      ) : (
        <PlaceSearch
          label={values.branches.length > 0 ? "Local principal" : "Local"}
          placeholder="Buscá por nombre o barrio"
          exclude={values.branches.map((b) => b.placeId)}
          onPick={setPlace}
        />
      )}
      <ProgramFields values={values} onChange={setValues} mainPlaceId={place?.id} />
      {error && <p className="text-sm text-[#B84420]">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className={adminUi.btnPrimary} disabled={busy} onClick={save}>
          Crear
        </button>
        <button type="button" className={adminUi.btnGhost} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </section>
  )
}

function ProgramCard({ program, onChanged }: { program: AdminProgramRow; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState<FormValues>(() => fromProgram(program))
  const title = program.brandName || program.placeName
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteText, setDeleteText] = useState("")
  const { stats } = program
  const retention = stats.customers > 0 ? Math.round((stats.cardsWithSecondStamp / stats.customers) * 100) : 0

  async function patch(body: Record<string, unknown>) {
    setBusy(true)
    const err = await sendJson(`/api/admin/wallet/programs/${program.id}`, "PATCH", body)
    setBusy(false)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setEditing(false)
    await onChanged()
  }

  async function remove() {
    setBusy(true)
    const err = await sendJson(`/api/admin/wallet/programs/${program.id}`, "DELETE", { confirmar: deleteText.trim() })
    setBusy(false)
    if (err) {
      setError(err)
      return
    }
    await onChanged()
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${program.enrollPath}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError("No se pudo copiar")
    }
  }

  return (
    <li className={`${adminUi.card} grid gap-4 p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className={`text-lg font-bold ${adminUi.text}`}>
            {program.placeSlug ? (
              <a href={`/lugar/${program.placeSlug}`} className="hover:underline">
                {title}
              </a>
            ) : (
              title
            )}
          </h2>
          <p className={`text-sm ${adminUi.muted}`}>
            {program.stampsForReward} sellos: {program.reward}
          </p>
        </div>
        <span className={program.active ? adminUi.chipActive : adminUi.chip}>
          {program.active ? "Activa" : "Pausada"}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Visitas (7 días)", stats.stampsLast7Days],
          ["Con la tarjeta", stats.inWallet],
          ["Vinieron", stats.customers],
          ["Tarjetas creadas", stats.cards],
          ["Volvieron", `${retention}%`],
          ["Canjes", stats.redeems],
          ...(program.referralEnabled || stats.invitedCards > 0 ? [["Invitados", stats.invitedCards]] : []),
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-[#F8F5EF] p-3">
            <dt className={adminUi.label}>{label}</dt>
            <dd className={`text-2xl font-bold ${adminUi.text}`}>{value}</dd>
          </div>
        ))}
      </dl>

      {editing ? (
        <ProgramFields values={values} onChange={setValues} mainPlaceId={program.placeId} team={false} />
      ) : (
        <LoyaltyTeamEditor program={program} onChanged={onChanged} />
      )}

      <MonthlyStamps months={program.monthly} />
      {program.notice && (
        <p className={`text-sm ${adminUi.muted}`}>
          Último aviso ({program.notice.sentAt}, {program.notice.byEmail}):{" "}
          <span className={adminUi.text}>{program.notice.text}</span>
        </p>
      )}
      {program.doubleStamp && <p className={`text-sm ${adminUi.muted}`}>{program.doubleStamp}</p>}
      {program.referralEnabled && <p className={`text-sm ${adminUi.muted}`}>Traé un amigo: activo.</p>}
      {error && <p className="text-sm text-[#B84420]">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {editing ? (
          <>
            <button
              type="button"
              className={adminUi.btnPrimary}
              disabled={busy}
              onClick={() => patch(editBody(values))}
            >
              Guardar
            </button>
            <button type="button" className={adminUi.btnGhost} onClick={() => setEditing(false)}>
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={adminUi.btnGhost}
              onClick={() => {
                // Siempre desde lo guardado: el equipo pudo cambiar desde que se abrió la página.
                setValues(fromProgram(program))
                setError(null)
                setEditing(true)
              }}
            >
              Editar tarjeta
            </button>
            <a href={`/local/cartel/${program.id}`} className={adminUi.btnGhost}>
              Imprimir cartel
            </a>
            <button type="button" className={adminUi.btnGhost} onClick={copyLink}>
              {copied ? "¡Copiado!" : "Copiar link de la tarjeta"}
            </button>
            <a href={program.enrollPath} target="_blank" rel="noreferrer" className={adminUi.btnGhost}>
              Ver página del cliente
            </a>
            <button
              type="button"
              disabled={busy}
              className={cn(adminUi.btnGhost, program.active && "text-[#B84420]")}
              onClick={() => patch({ active: !program.active })}
            >
              {program.active ? "Pausar" : "Reactivar"}
            </button>
            {!confirmingDelete && (
              <button
                type="button"
                disabled={busy}
                className={cn(adminUi.btnGhost, "text-[#B84420]")}
                onClick={() => {
                  setConfirmingDelete(true)
                  setDeleteText("")
                  setError(null)
                }}
              >
                Borrar
              </button>
            )}
          </>
        )}
      </div>

      {confirmingDelete && !editing && (
        <div className="grid gap-3 rounded-xl border border-[#B84420]/40 bg-[#FBE9E2] p-4">
          <p className={`text-sm ${adminUi.text}`}>
            Se borran el programa, sus {stats.cards === 1 ? "1 tarjeta" : `${stats.cards} tarjetas`} y todos los
            sellos. No se puede deshacer. Las tarjetas que ya están en los celulares quedan ahí pero no suman más
            (las de Google pasan a vencidas). Si sólo querés frenar tarjetas nuevas, usá Pausar.
          </p>
          <label className="grid gap-1">
            <span className={adminUi.label}>Escribí {DELETE_WORD} para confirmar</span>
            <input
              className={`h-11 w-full rounded-xl border ${adminUi.border} bg-white px-3 ${adminUi.text}`}
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              autoComplete="off"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || deleteText.trim() !== DELETE_WORD}
              className={cn(adminUi.btnPrimary, "bg-[#B84420] hover:bg-[#B84420]/90")}
              onClick={remove}
            >
              Borrar {title}
            </button>
            <button type="button" className={adminUi.btnGhost} onClick={() => setConfirmingDelete(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
