/**
 * @jest-environment node
 */
import {
  MAX_TEAM_EMAILS,
  addToTeam,
  isTeamEmail,
  removeFromTeam,
  teamPatch,
  teamSlotOf,
  type TeamLists,
} from "@/lib/wallet/team"

const team = (patch: Partial<TeamLists> = {}): TeamLists => ({
  staffEmails: ["duenio@local.com"],
  employeeEmails: ["caja@local.com"],
  branches: [{ placeId: "suc1", staffEmails: ["mozo@local.com"] }],
  ...patch,
})

const added = (result: ReturnType<typeof addToTeam>) => {
  if (!result.ok) throw new Error(result.error)
  return result.team
}

describe("wallet team (encargados y empleados)", () => {
  it("adds an employee to the main place with the mail in lowercase", () => {
    const next = added(addToTeam(team(), "  Nueva@Gmail.com ", { role: "employee", placeId: null }))
    expect(next.employeeEmails).toEqual(["caja@local.com", "nueva@gmail.com"])
    expect(next.staffEmails).toEqual(["duenio@local.com"])
  })

  it("adds a manager", () => {
    const next = added(addToTeam(team(), "socia@gmail.com", { role: "manager" }))
    expect(next.staffEmails).toEqual(["duenio@local.com", "socia@gmail.com"])
  })

  it("adds an employee to a branch", () => {
    const next = added(addToTeam(team(), "otro@gmail.com", { role: "employee", placeId: "suc1" }))
    expect(next.branches[0].staffEmails).toEqual(["mozo@local.com", "otro@gmail.com"])
  })

  it("moves someone who changes role instead of leaving them twice", () => {
    const next = added(addToTeam(team(), "caja@local.com", { role: "manager" }))
    expect(next.staffEmails).toEqual(["duenio@local.com", "caja@local.com"])
    expect(next.employeeEmails).toEqual([])
    expect(teamSlotOf(next, "CAJA@local.com")).toEqual({ role: "manager" })
  })

  it("moves an employee from a branch to the main place", () => {
    const next = added(addToTeam(team(), "mozo@local.com", { role: "employee", placeId: null }))
    expect(next.branches[0].staffEmails).toEqual([])
    expect(next.employeeEmails).toContain("mozo@local.com")
  })

  it("says so when the person is already there", () => {
    expect(addToTeam(team(), "Duenio@local.com", { role: "manager" })).toEqual({ ok: false, error: "Ya es encargado" })
    expect(addToTeam(team(), "caja@local.com", { role: "employee", placeId: null })).toEqual({
      ok: false,
      error: "Ya está como empleado ahí",
    })
  })

  it("rejects mails that are not mails, and full lists", () => {
    expect(isTeamEmail("caja@local")).toBe(false)
    expect(isTeamEmail("caja local@gmail.com")).toBe(false)
    expect(addToTeam(team(), "caja", { role: "manager" })).toMatchObject({ ok: false })
    const full = team({ staffEmails: Array.from({ length: MAX_TEAM_EMAILS }, (_, i) => `e${i}@local.com`) })
    expect(addToTeam(full, "uno.mas@gmail.com", { role: "manager" })).toEqual({
      ok: false,
      error: `Máximo ${MAX_TEAM_EMAILS} encargados`,
    })
    expect(addToTeam(team(), "x@gmail.com", { role: "employee", placeId: "no-existe" })).toMatchObject({ ok: false })
  })

  it("removes someone from wherever they are", () => {
    const next = removeFromTeam(team(), "MOZO@local.com")
    expect(next.branches[0].staffEmails).toEqual([])
    expect(next.staffEmails).toEqual(["duenio@local.com"])
  })

  it("sends only the lists that changed", () => {
    const before = team()
    expect(teamPatch(before, added(addToTeam(before, "a@gmail.com", { role: "manager" })))).toEqual({
      staffEmails: ["duenio@local.com", "a@gmail.com"],
    })
    expect(teamPatch(before, added(addToTeam(before, "caja@local.com", { role: "employee", placeId: "suc1" })))).toEqual({
      employeeEmails: [],
      branches: [{ placeId: "suc1", staffEmails: ["mozo@local.com", "caja@local.com"] }],
    })
    expect(teamPatch(before, before)).toEqual({})
  })
})
