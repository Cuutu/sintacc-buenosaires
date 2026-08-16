import { computePopoverPlacement } from "@/components/map-view/popover-placement"

describe("computePopoverPlacement", () => {
  it("prioriza arriba del pin cuando hay espacio", () => {
    const pos = computePopoverPlacement({
      anchorX: 400,
      anchorY: 400,
      cardW: 320,
      cardH: 240,
      containerW: 800,
      containerH: 700,
    })
    expect(pos.side).toBe("top")
    expect(pos.top).toBeLessThan(400 - 56)
    expect(pos.left).toBeGreaterThanOrEqual(16)
    expect(pos.left + 320).toBeLessThanOrEqual(800 - 16)
  })

  it("cae a la derecha si no entra arriba", () => {
    const pos = computePopoverPlacement({
      anchorX: 80,
      anchorY: 80,
      cardW: 320,
      cardH: 240,
      containerW: 900,
      containerH: 700,
    })
    expect(pos.side).toBe("right")
    expect(pos.left).toBeGreaterThan(80)
  })

  it("nunca se sale del viewport", () => {
    const pos = computePopoverPlacement({
      anchorX: 20,
      anchorY: 20,
      cardW: 320,
      cardH: 240,
      containerW: 360,
      containerH: 280,
    })
    expect(pos.left).toBeGreaterThanOrEqual(16)
    expect(pos.top).toBeGreaterThanOrEqual(16)
    expect(pos.left + 320).toBeLessThanOrEqual(360)
    expect(pos.top + 240).toBeLessThanOrEqual(280)
  })
})
