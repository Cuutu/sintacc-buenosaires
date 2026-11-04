/**
 * Equipo de una tarjeta de sellos (encargados y empleados), para editarlo desde /admin/tarjetas
 * en el celular: agregar o quitar de a una persona.
 *
 * Sin Mongo: lo usa el navegador. Cada mail va en un solo lugar del programa: si alguien pasa
 * de empleado a encargado (o de una sucursal a otra), se mueve.
 */

/** Igual que el tope de la API (staffEmails en lib/wallet/loyalty-admin). */
export const MAX_TEAM_EMAILS = 10

export type TeamLists = {
  /** Encargados: todo (sellos, avisos, promos y premio), en todas las sucursales. */
  staffEmails: string[]
  /** Empleados del local principal: sólo suman sellos. */
  employeeEmails: string[]
  /** Empleados de cada sucursal: sólo suman sellos ahí. */
  branches: Array<{ placeId: string; staffEmails: string[] }>
}

/** Dónde va la persona. placeId null = el local principal. */
export type TeamSlot = { role: "manager" } | { role: "employee"; placeId: string | null }

export const normalizeTeamEmail = (raw: string) => raw.trim().toLowerCase()

/** Lo básico de un mail (la API lo vuelve a validar). */
const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/
export const isTeamEmail = (email: string) => EMAIL_RE.test(email)

/** Dónde está hoy este mail en el programa (o null si no está). */
export function teamSlotOf(team: TeamLists, rawEmail: string): TeamSlot | null {
  const email = normalizeTeamEmail(rawEmail)
  if (team.staffEmails.includes(email)) return { role: "manager" }
  if (team.employeeEmails.includes(email)) return { role: "employee", placeId: null }
  const branch = team.branches.find((b) => b.staffEmails.includes(email))
  return branch ? { role: "employee", placeId: branch.placeId } : null
}

export function sameSlot(a: TeamSlot | null, b: TeamSlot | null): boolean {
  if (!a || !b || a.role !== b.role) return false
  if (a.role === "manager") return true
  return b.role === "employee" && a.placeId === b.placeId
}

export function removeFromTeam(team: TeamLists, rawEmail: string): TeamLists {
  const email = normalizeTeamEmail(rawEmail)
  const drop = (list: string[]) => list.filter((e) => e !== email)
  return {
    staffEmails: drop(team.staffEmails),
    employeeEmails: drop(team.employeeEmails),
    branches: team.branches.map((b) => ({ ...b, staffEmails: drop(b.staffEmails) })),
  }
}

export type AddResult = { ok: true; team: TeamLists } | { ok: false; error: string }

/** Suma a la persona en ese lugar (y la saca de donde estaba). */
export function addToTeam(team: TeamLists, rawEmail: string, slot: TeamSlot): AddResult {
  const email = normalizeTeamEmail(rawEmail)
  if (!isTeamEmail(email)) return { ok: false, error: "Ese mail no parece válido" }
  if (sameSlot(teamSlotOf(team, email), slot)) {
    return { ok: false, error: slot.role === "manager" ? "Ya es encargado" : "Ya está como empleado ahí" }
  }

  const base = removeFromTeam(team, email)
  const full = (list: string[]) => list.length >= MAX_TEAM_EMAILS

  if (slot.role === "manager") {
    if (full(base.staffEmails)) return { ok: false, error: `Máximo ${MAX_TEAM_EMAILS} encargados` }
    return { ok: true, team: { ...base, staffEmails: [...base.staffEmails, email] } }
  }
  if (slot.placeId === null) {
    if (full(base.employeeEmails)) return { ok: false, error: `Máximo ${MAX_TEAM_EMAILS} empleados por local` }
    return { ok: true, team: { ...base, employeeEmails: [...base.employeeEmails, email] } }
  }
  const i = base.branches.findIndex((b) => b.placeId === slot.placeId)
  if (i < 0) return { ok: false, error: "Esa sucursal ya no está en la tarjeta" }
  if (full(base.branches[i].staffEmails)) return { ok: false, error: `Máximo ${MAX_TEAM_EMAILS} empleados por local` }
  return {
    ok: true,
    team: {
      ...base,
      branches: base.branches.map((b, j) => (j === i ? { ...b, staffEmails: [...b.staffEmails, email] } : b)),
    },
  }
}

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i])

/** Lo que se manda a la API: sólo las listas que cambiaron. */
export function teamPatch(before: TeamLists, after: TeamLists): Partial<TeamLists> {
  const body: Partial<TeamLists> = {}
  if (!sameList(before.staffEmails, after.staffEmails)) body.staffEmails = after.staffEmails
  if (!sameList(before.employeeEmails, after.employeeEmails)) body.employeeEmails = after.employeeEmails
  const branchesChanged =
    before.branches.length !== after.branches.length ||
    before.branches.some(
      (b, i) => b.placeId !== after.branches[i].placeId || !sameList(b.staffEmails, after.branches[i].staffEmails)
    )
  if (branchesChanged) body.branches = after.branches
  return body
}
