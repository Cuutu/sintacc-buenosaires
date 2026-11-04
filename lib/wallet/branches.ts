/**
 * Quién puede hacer qué con la tarjeta de un local (y de una marca con sucursales).
 * - Encargados (program.staffEmails): todo, en todas las sucursales.
 * - Empleados del local principal (program.employeeEmails) y de cada sucursal
 *   (branches[].staffEmails): sólo suman sellos ahí y ven su panel.
 */

import type mongoose from "mongoose"
import type { ILoyaltyProgram } from "@/models/LoyaltyProgram"
import type { CardSafety } from "@/lib/wallet/card-safety"

/** Apple y Google aceptan hasta 10 ubicaciones por tarjeta para avisar al pasar cerca. */
export const MAX_PASS_LOCATIONS = 10
/** Tope de sucursales por programa (más que eso, hablar). */
export const MAX_BRANCHES = 30

type ProgramStaff = Pick<ILoyaltyProgram, "placeId" | "staffEmails"> & {
  employeeEmails?: string[]
  branches?: Array<{ placeId: mongoose.Types.ObjectId; staffEmails: string[] }>
}

/** "branch" = empleado (del local principal o de una sucursal): sólo suma sellos. */
export type StaffRole = "admin" | "manager" | "branch"

type Session = { user?: { email?: string | null; role?: string } } | null

const norm = (email: string | null | undefined) => (email ?? "").trim().toLowerCase()

/** Todos los lugares del programa, el principal primero. */
export function programPlaceIds(program: ProgramStaff): string[] {
  return Array.from(new Set([program.placeId.toString(), ...(program.branches ?? []).map((b) => b.placeId.toString())]))
}

export function hasBranches(program: ProgramStaff): boolean {
  return (program.branches ?? []).length > 0
}

export function staffRole(program: ProgramStaff, session: Session): StaffRole | null {
  if (!session?.user) return null
  if (session.user.role === "admin") return "admin"
  const email = norm(session.user.email)
  if (!email) return null
  if (program.staffEmails.includes(email)) return "manager"
  if ((program.employeeEmails ?? []).includes(email)) return "branch"
  if ((program.branches ?? []).some((b) => b.staffEmails.includes(email))) return "branch"
  return null
}

/** Puede sumar sellos (en alguna sucursal). */
export function canStampProgram(program: ProgramStaff, session: Session): boolean {
  return staffRole(program, session) !== null
}

/** Sucursales donde esta persona puede sumar sellos (ids de lugar), la principal primero. */
export function stampPlaceIdsFor(program: ProgramStaff, session: Session): string[] {
  const role = staffRole(program, session)
  if (!role) return []
  if (role !== "branch") return programPlaceIds(program)
  const email = norm(session?.user?.email)
  return [
    ...((program.employeeEmails ?? []).includes(email) ? [program.placeId.toString()] : []),
    ...(program.branches ?? []).filter((b) => b.staffEmails.includes(email)).map((b) => b.placeId.toString()),
  ]
}

/** La sucursal donde se suma el sello: la pedida si puede, o la única que tiene, o la principal. */
export function resolveStampPlace(allowed: string[], requested: string | null | undefined): string | null {
  if (allowed.length === 0) return null
  if (requested) return allowed.includes(requested) ? requested : null
  return allowed[0]
}

/** Programas donde el mail es encargado o empleado (para /local). */
export function staffProgramFilter(email: string) {
  return { $or: [{ staffEmails: email }, { employeeEmails: email }, { "branches.staffEmails": email }] }
}

/** La etiqueta TACC de la tarjeta: sólo si todas las sucursales coinciden. */
export function commonSafety(safeties: Array<CardSafety | null>): CardSafety | null {
  if (safeties.length === 0) return null
  const first = safeties[0]
  return first && safeties.every((s) => s === first) ? first : null
}
