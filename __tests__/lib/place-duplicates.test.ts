import {
  findDuplicateCandidates,
  getDuplicateMatchLevel,
  scoreDuplicateCandidate,
  type DuplicateDraft,
} from "@/lib/place-duplicates"

describe("place duplicate detection", () => {
  const source: DuplicateDraft = {
    name: "Rochino Pastas",
    type: "bakery",
    address: "Av. Corrientes 1234, CABA",
    neighborhood: "Almagro",
    location: { lat: -34.62, lng: -58.43 },
  }

  const publishedPlace = {
    _id: "place-1",
    kind: "place" as const,
    name: "Rochino Pastas",
    type: "bakery",
    address: "Av. Corrientes 1234, CABA",
    neighborhood: "Almagro",
    location: { lat: -34.6201, lng: -58.4301 },
    status: "approved",
  }

  it("marks exact match when name, address and type coincide", () => {
    const scored = scoreDuplicateCandidate(source, publishedPlace)
    expect(scored).not.toBeNull()
    expect(scored?.reasons).toEqual(
      expect.arrayContaining(["nombre igual", "misma direccion", "mismo tipo"])
    )
    expect(getDuplicateMatchLevel(scored!.reasons, scored!.score)).toBe("exact")
  })

  it("returns duplicate candidates for matching published places", () => {
    const matches = findDuplicateCandidates(source, [publishedPlace])
    expect(matches).toHaveLength(1)
    expect(matches[0]?.name).toBe("Rochino Pastas")
    expect(matches[0]?.type).toBe("bakery")
  })

  it("does not mark exact when type differs and address differs", () => {
    const otherType = {
      ...publishedPlace,
      type: "restaurant",
      address: "Otra calle 999, CABA",
      location: { lat: -34.7, lng: -58.5 },
    }
    const scored = scoreDuplicateCandidate(source, otherType)
    expect(scored?.reasons).not.toContain("mismo tipo")
    expect(getDuplicateMatchLevel(scored!.reasons, scored!.score)).not.toBe("exact")
  })

  it("marks exact when same name + same GPS even if address text differs", () => {
    const otherAddress = {
      ...publishedPlace,
      address: "Otra calle 999, CABA",
      location: { lat: -34.6201, lng: -58.4301 },
    }
    const scored = scoreDuplicateCandidate(source, otherAddress)
    expect(getDuplicateMatchLevel(scored!.reasons, scored!.score)).toBe("exact")
  })

  it("detects Campo Bravo vs CAMPOBRAVO Caballito as exact when close", () => {
    const a: DuplicateDraft = {
      name: "Campo Bravo",
      type: "restaurant",
      neighborhood: "Caballito",
      address: "Av. Rivadavia 5000",
      location: { lat: -34.62, lng: -58.44 },
    }
    const b = {
      _id: "campobravo-2",
      kind: "place" as const,
      name: "CAMPOBRAVO Caballito",
      type: "restaurant",
      neighborhood: "Caballito",
      address: "Rivadavia 5000, Caballito",
      location: { lat: -34.62005, lng: -58.44005 },
      status: "approved",
    }
    const scored = scoreDuplicateCandidate(a, b)
    expect(scored?.reasons).toEqual(expect.arrayContaining(["nombre igual"]))
    expect(scored!.score).toBeGreaterThanOrEqual(50)
    expect(getDuplicateMatchLevel(scored!.reasons, scored!.score)).toBe("exact")
  })
})
