/**
 * @jest-environment node
 */
import mongoose from "mongoose"

jest.mock("@/lib/mongodb", () => ({ __esModule: true, default: jest.fn() }))
const mockProgramFindById = jest.fn()
jest.mock("@/models/LoyaltyProgram", () => ({
  LoyaltyProgram: { findById: (...a: unknown[]) => mockProgramFindById(...a) },
}))
const mockPlaceFind = jest.fn()
jest.mock("@/models/Place", () => ({
  Place: { find: (...a: unknown[]) => ({ select: () => ({ lean: () => mockPlaceFind(...a) }) }) },
}))
jest.mock("@/models/LoyaltyCard", () => ({ LoyaltyCard: {} }))
jest.mock("@/models/LoyaltyStamp", () => ({ LoyaltyStamp: {} }))
jest.mock("@/models/LoyaltyDevice", () => ({ LoyaltyDevice: {} }))

import {
  canStampProgram,
  commonSafety,
  programPlaceIds,
  resolveStampPlace,
  stampPlaceIdsFor,
  staffProgramFilter,
  staffRole,
} from "@/lib/wallet/branches"
import { getProgramWithPlace } from "@/lib/wallet/loyalty"

const main = new mongoose.Types.ObjectId()
const palermo = new mongoose.Types.ObjectId()
const belgrano = new mongoose.Types.ObjectId()
const program = {
  _id: new mongoose.Types.ObjectId(),
  placeId: main,
  brandName: "Polvorín",
  staffEmails: ["duenio@polvorin.com"],
  branches: [
    { placeId: palermo, staffEmails: ["caja.palermo@polvorin.com"] },
    { placeId: belgrano, staffEmails: [] },
  ],
}
const user = (email: string, role = "user") => ({ user: { email, role } })

describe("sucursales", () => {
  it("lists every place of the brand, the main one first", () => {
    expect(programPlaceIds(program)).toEqual([main.toString(), palermo.toString(), belgrano.toString()])
    expect(programPlaceIds({ ...program, branches: [] })).toEqual([main.toString()])
  })

  it("tells managers from branch staff", () => {
    expect(staffRole(program, user("Duenio@Polvorin.com"))).toBe("manager")
    expect(staffRole(program, user("caja.palermo@polvorin.com"))).toBe("branch")
    expect(staffRole(program, user("x@y.com", "admin"))).toBe("admin")
    expect(staffRole(program, user("cliente@gmail.com"))).toBeNull()
    expect(staffRole(program, null)).toBeNull()
    expect(canStampProgram(program, user("caja.palermo@polvorin.com"))).toBe(true)
    expect(canStampProgram(program, user("cliente@gmail.com"))).toBe(false)
  })

  it("employees of the main place only add stamps there", () => {
    const shop = { ...program, branches: [], employeeEmails: ["caja@polvorin.com"] }
    expect(staffRole(shop, user("Caja@Polvorin.com"))).toBe("branch")
    expect(canStampProgram(shop, user("caja@polvorin.com"))).toBe(true)
    expect(stampPlaceIdsFor(shop, user("caja@polvorin.com"))).toEqual([main.toString()])
    // Si el mail está en las dos listas, manda la de encargado.
    expect(staffRole({ ...shop, employeeEmails: ["duenio@polvorin.com"] }, user("duenio@polvorin.com"))).toBe(
      "manager"
    )
    // Con sucursales: el empleado del principal y de una sucursal suma en las dos.
    const both = {
      ...program,
      employeeEmails: ["caja.palermo@polvorin.com"],
    }
    expect(stampPlaceIdsFor(both, user("caja.palermo@polvorin.com"))).toEqual([main.toString(), palermo.toString()])
  })

  it("lets branch staff stamp only at their branch", () => {
    expect(stampPlaceIdsFor(program, user("caja.palermo@polvorin.com"))).toEqual([palermo.toString()])
    expect(stampPlaceIdsFor(program, user("duenio@polvorin.com"))).toHaveLength(3)
    const allowed = [palermo.toString()]
    expect(resolveStampPlace(allowed, undefined)).toBe(palermo.toString())
    expect(resolveStampPlace(allowed, palermo.toString())).toBe(palermo.toString())
    expect(resolveStampPlace(allowed, belgrano.toString())).toBeNull()
    expect(resolveStampPlace([], undefined)).toBeNull()
  })

  it("finds the panel programs of managers and branch staff", () => {
    expect(staffProgramFilter("a@b.com")).toEqual({
      $or: [{ staffEmails: "a@b.com" }, { employeeEmails: "a@b.com" }, { "branches.staffEmails": "a@b.com" }],
    })
  })

  it("labels the card 100% only if every branch is", () => {
    expect(commonSafety(["dedicated", "dedicated"])).toBe("dedicated")
    expect(commonSafety(["dedicated", "options"])).toBeNull()
    expect(commonSafety(["dedicated", null])).toBeNull()
    expect(commonSafety([])).toBeNull()
  })

  it("builds one card for the brand, with a nearby alert per branch", async () => {
    mockProgramFindById.mockResolvedValue(program)
    mockPlaceFind.mockResolvedValue([
      { _id: belgrano, name: "Polvorín Belgrano", slug: "polvorin-belgrano", tags: ["100_gf"], location: { lat: -34.56, lng: -58.45 } },
      { _id: main, name: "Polvorín Centro", slug: "polvorin-centro", tags: ["100_gf"], location: { lat: -34.6, lng: -58.38 } },
      // Ubicación aproximada: no se usa para el aviso.
      { _id: palermo, name: "Polvorín Palermo", slug: "polvorin-palermo", tags: ["100_gf"], location: { lat: -34.58, lng: -58.42 }, locationPrecision: "approx" },
    ])
    const data = await getProgramWithPlace(program._id.toString())
    expect(data?.placeName).toBe("Polvorín")
    expect(data?.placePath).toBe("/lugar/polvorin-centro")
    expect(data?.safety).toBe("dedicated")
    expect(data?.branches.map((b) => b.name)).toEqual(["Polvorín Centro", "Polvorín Palermo", "Polvorín Belgrano"])
    expect(data?.locations).toEqual([
      { latitude: -34.6, longitude: -58.38, name: "Polvorín Centro" },
      { latitude: -34.56, longitude: -58.45, name: "Polvorín Belgrano" },
    ])
  })

  it("keeps a single place as before (its own name, no branch names)", async () => {
    mockProgramFindById.mockResolvedValue({ ...program, brandName: undefined, branches: [] })
    mockPlaceFind.mockResolvedValue([
      { _id: main, name: "Polvorín Centro", slug: "polvorin-centro", tags: ["opciones_sin_tacc"], location: { lat: -34.6, lng: -58.38 } },
    ])
    const data = await getProgramWithPlace(program._id.toString())
    expect(data?.placeName).toBe("Polvorín Centro")
    expect(data?.safety).toBe("options")
    expect(data?.locations).toEqual([{ latitude: -34.6, longitude: -58.38 }])
  })
})
