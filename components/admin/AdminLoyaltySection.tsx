"use client"

import { useEffect, useState } from "react"
import { ExternalLink, Pause, Play, Trash2 } from "lucide-react"
import { adminUi } from "@/lib/admin-ui"
import { ActionMenu } from "@/components/admin/ui/action-menu"
import { AdminButton, AdminLinkButton } from "@/components/admin/ui/button"
import { AdminPageHeader, AdminSectionTitle } from "@/components/admin/ui/page-header"
import { StatusBadge } from "@/components/admin/ui/status-badge"
import { AdminEmptyState, StatTile } from "@/components/admin/ui/states"
import type { AdminProgramRow } from "@/lib/wallet/loyalty-admin"
import { MonthlyStamps } from "@/components/wallet/MonthlyStamps"
import { monthChange } from "@/lib/wallet/month-stats"

// Igual que DELETE_CONFIRMATION de loyalty-admin (ese archivo usa Mongo y no entra al navegador).
const DELETE_WORD = "BORRAR"

type PlaceOption = { id: string; name: string; neighborhood?: string; status?: string }

type BranchDraft = { placeId: string; name: string; staffEmails: string }

type FormValues = {
  stampsForReward: number
  reward: string
  staffEmails: string
  brandName: string
  branches: BranchDraft[]
}

const EMPTY_VALUES: FormValues = { stampsForReward: 5, reward: "", staffEmails: "", brandName: "", branches: [] }

/** Lo que se manda a la API (mails separados, sucursales sin el nombre). */
const programBody = (values: FormValues) => ({
  stampsForReward: values.stampsForReward,
  reward: values.reward,
  staffEmails: parseEmails(values.staffEmails),
  brandName: values.brandName.trim(),
  branches: values.branches.map((b) => ({ placeId: b.placeId, staffEmails: parseEmails(b.staffEmails) })),
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
      <AdminPageHeader
        title="Tarjetas de sellos"
        description="Un programa por local. El local suma sellos, manda avisos y arma sus promos desde /local con su Google. Pausar frena las tarjetas nuevas (las que ya existen siguen sumando); Borrar elimina el programa con sus tarjetas y sellos."
        actions={
          !creating ? (
            <AdminButton variant="primary" onClick={() => setCreating(true)}>
              Nueva tarjeta
            </AdminButton>
          ) : null
        }
      />

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
        <div className={`${adminUi.card} mt-6`}>
          <AdminEmptyState title="Todavía no hay ningún local con tarjeta" hint="Con Nueva tarjeta elegís el local y el premio." />
        </div>
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
        <AdminSectionTitle>Sellos de {monthName}</AdminSectionTitle>
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
              <td className="py-2 text-right font-bold tabular-nums">{r.stamps}</td>
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
        className={adminUi.input}
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {shown.length > 0 && (
        <ul className="mt-1 overflow-hidden rounded-2xl border border-line bg-cream-card">
          {shown.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="min-h-11 w-full px-3 py-2 text-left text-olive hover:bg-cream"
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
}: {
  values: FormValues
  onChange: (v: FormValues) => void
  /** Para no ofrecer el local principal como sucursal. */
  mainPlaceId?: string
}) {
  const input = adminUi.input
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
      <label className="grid gap-1 sm:col-span-2">
        <span className={adminUi.label}>
          {values.branches.length > 0 ? "Encargados (todas las sucursales)" : "Mails del local (Google)"}, separados
          por coma
        </span>
        <input
          className={input}
          placeholder="caja@local.com, duenio@gmail.com"
          value={values.staffEmails}
          onChange={(e) => onChange({ ...values, staffEmails: e.target.value })}
        />
      </label>

      <fieldset className="grid gap-3 rounded-2xl border border-line p-3 sm:col-span-2">
        <legend className={`px-1 ${adminUi.label}`}>Sucursales</legend>
        <p className={`text-sm ${adminUi.muted}`}>
          Una sola tarjeta que vale en todas. Cada sucursal puede tener sus mails: esos sólo suman sellos ahí; los
          encargados de arriba manejan todo.
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
          <div key={b.placeId} className="grid gap-2 rounded-2xl bg-cream p-3">
            <div className="flex items-center justify-between gap-2">
              <strong className={adminUi.text}>{b.name}</strong>
              <AdminButton
                variant="danger"
                onClick={() => onChange({ ...values, branches: values.branches.filter((_, j) => j !== i) })}
              >
                Quitar
              </AdminButton>
            </div>
            <input
              className={input}
              aria-label={`Mails de ${b.name}`}
              placeholder="Mails de esta sucursal (opcional)"
              value={b.staffEmails}
              onChange={(e) => setBranch(i, { staffEmails: e.target.value })}
            />
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
      <AdminSectionTitle>Nueva tarjeta</AdminSectionTitle>
      {place ? (
        <div className="flex items-center justify-between gap-3">
          <p className={adminUi.text}>
            <strong>{place.name}</strong>
            {place.neighborhood ? ` · ${place.neighborhood}` : ""}
          </p>
          <AdminButton onClick={() => setPlace(null)}>Cambiar</AdminButton>
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
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <AdminButton variant="primary" disabled={busy} onClick={save}>
          Crear
        </AdminButton>
        <AdminButton onClick={onCancel}>Cancelar</AdminButton>
      </div>
    </section>
  )
}

/**
 * Números de cada tarjeta, con etiquetas cortas que entran en una línea
 * (antes "VISITAS (7 DÍAS)" en mayúsculas se partía en dos y las cajas quedaban de distinto alto).
 */
export function loyaltyStatTiles(program: AdminProgramRow, retention: number): Array<[string, string | number]> {
  const { stats } = program
  return [
    ["Visitas 7 días", stats.stampsLast7Days],
    ["Con la tarjeta", stats.inWallet],
    ["Vinieron", stats.customers],
    ["Tarjetas creadas", stats.cards],
    ["Volvieron", `${retention}%`],
    ["Canjes", stats.redeems],
    ...(program.referralEnabled || stats.invitedCards > 0 ? ([["Invitados", stats.invitedCards]] as Array<[string, number]>) : []),
  ]
}

function ProgramCard({ program, onChanged }: { program: AdminProgramRow; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState<FormValues>({
    stampsForReward: program.stampsForReward,
    reward: program.reward,
    staffEmails: program.staffEmails.join(", "),
    brandName: program.brandName,
    branches: program.branches.map((b) => ({ placeId: b.placeId, name: b.name, staffEmails: b.staffEmails.join(", ") })),
  })
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
    <li className={`${adminUi.card} grid content-start gap-4 p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-olive">
            {program.placeSlug ? (
              <a href={`/lugar/${program.placeSlug}`} className="underline-offset-2 hover:underline">
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
        {program.active ? (
          <StatusBadge tone="success">Activa</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">Pausada</StatusBadge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {loyaltyStatTiles(program, retention).map(([label, value]) => (
          <StatTile key={label} label={label} value={value} className="bg-cream p-3" />
        ))}
      </div>

      <MonthlyStamps months={program.monthly} />

      {editing ? (
        <ProgramFields values={values} onChange={setValues} mainPlaceId={program.placeId} />
      ) : (
        <>
          <p className={`text-sm ${adminUi.muted}`}>
            {program.branches.length > 0 ? "Encargados" : "Local"}:{" "}
            {program.staffEmails.length > 0 ? program.staffEmails.join(", ") : "sin mails cargados"}
          </p>
          {program.branches.length > 0 && (
            <p className={`text-sm ${adminUi.muted}`}>
              Sucursales: {program.placeName} (principal)
              {program.branches.map((b) => `, ${b.name}${b.staffEmails.length ? ` (${b.staffEmails.join(", ")})` : ""}`)}
            </p>
          )}
        </>
      )}
      {program.notice && (
        <p className={`text-sm ${adminUi.muted}`}>
          Último aviso ({program.notice.sentAt}, {program.notice.byEmail}):{" "}
          <span className={adminUi.text}>{program.notice.text}</span>
        </p>
      )}
      {program.doubleStamp && <p className={`text-sm ${adminUi.muted}`}>{program.doubleStamp}</p>}
      {program.referralEnabled && <p className={`text-sm ${adminUi.muted}`}>Traé un amigo: activo.</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {editing ? (
          <>
            <AdminButton variant="primary" disabled={busy} onClick={() => patch(programBody(values))}>
              Guardar
            </AdminButton>
            <AdminButton onClick={() => setEditing(false)}>Cancelar</AdminButton>
          </>
        ) : (
          <>
            <AdminButton onClick={() => setEditing(true)}>Editar</AdminButton>
            <AdminLinkButton href={`/local/cartel/${program.id}`}>Imprimir cartel</AdminLinkButton>
            <AdminButton onClick={copyLink} title="Copia el link para que los clientes guarden la tarjeta">
              {copied ? "¡Copiado!" : "Copiar link"}
            </AdminButton>
            <ActionMenu
              label={`Más acciones para ${title}`}
              items={[
                {
                  label: "Ver página del cliente",
                  icon: <ExternalLink className="h-4 w-4" aria-hidden />,
                  onSelect: () => window.open(program.enrollPath, "_blank", "noreferrer"),
                },
                {
                  label: program.active ? "Pausar" : "Reactivar",
                  icon: program.active ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />,
                  disabled: busy,
                  onSelect: () => void patch({ active: !program.active }),
                },
                {
                  label: "Borrar",
                  icon: <Trash2 className="h-4 w-4" aria-hidden />,
                  danger: true,
                  disabled: busy,
                  onSelect: () => {
                    setConfirmingDelete(true)
                    setDeleteText("")
                    setError(null)
                  },
                },
              ]}
            />
          </>
        )}
      </div>

      {confirmingDelete && !editing && (
        <div className="grid gap-3 rounded-2xl border border-danger bg-danger-soft p-4">
          <p className={`text-sm ${adminUi.text}`}>
            Se borran el programa, sus {stats.cards === 1 ? "1 tarjeta" : `${stats.cards} tarjetas`} y todos los
            sellos. No se puede deshacer. Las tarjetas que ya están en los celulares quedan ahí pero no suman más
            (las de Google pasan a vencidas). Si sólo querés frenar tarjetas nuevas, usá Pausar.
          </p>
          <label className="grid gap-1">
            <span className={adminUi.label}>Escribí {DELETE_WORD} para confirmar</span>
            <input
              className={adminUi.input}
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              autoComplete="off"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <AdminButton variant="danger" disabled={busy || deleteText.trim() !== DELETE_WORD} onClick={remove}>
              Borrar {title}
            </AdminButton>
            <AdminButton onClick={() => setConfirmingDelete(false)}>Cancelar</AdminButton>
          </div>
        </div>
      )}
    </li>
  )
}
