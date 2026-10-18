/**
 * @jest-environment node
 */
import type { ReactElement } from "react"

const mockImageResponse = jest.fn()
jest.mock("@vercel/og", () => ({
  ImageResponse: function (element: ReactElement, options: unknown) {
    mockImageResponse(element, options)
    return { arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer }
  },
}))

import {
  GOOGLE_HERO_BOX,
  STRIP_HEIGHT,
  STRIP_WIDTH,
  appleStripBox,
  renderStampStrip,
  stripLayout,
} from "@/lib/wallet/stamp-strip"

type SlotProps = { index: number; total: number; filled: boolean; size: number }

/** Todo el texto del árbol que se le pasa a ImageResponse. */
function textOf(node: unknown): string {
  if (typeof node === "string") return node
  if (Array.isArray(node)) return node.map(textOf).join("")
  if (!node || typeof node !== "object" || !("props" in node)) return ""
  const el = node as ReactElement
  // Componentes propios: se renderizan para leer lo que dibujan.
  if (typeof el.type === "function") return textOf((el.type as (p: unknown) => unknown)(el.props))
  return textOf((el.props as { children?: unknown }).children)
}

/** Los casilleros del árbol que se le pasa a ImageResponse. */
function slotsOf(node: unknown): SlotProps[] {
  if (Array.isArray(node)) return node.flatMap(slotsOf)
  if (!node || typeof node !== "object" || !("props" in node)) return []
  const props = (node as ReactElement).props as Record<string, unknown>
  if (typeof props.filled === "boolean") return [props as unknown as SlotProps]
  return slotsOf(props.children)
}

describe("wallet stamp strip", () => {
  beforeEach(() => mockImageResponse.mockClear())

  it("uses one row up to 5 stamps and two rows after that", () => {
    const box = appleStripBox(1)
    expect(stripLayout(5, box)).toMatchObject({ rows: 1, cols: 5 })
    expect(stripLayout(10, box)).toMatchObject({ rows: 2, cols: 5 })
    expect(stripLayout(7, box)).toMatchObject({ rows: 2, cols: 4 })
    expect(stripLayout(20, box)).toMatchObject({ rows: 2, cols: 10 })
  })

  it("keeps every slot inside the Apple strip and the Google hero image", () => {
    const boxes = [appleStripBox(1), appleStripBox(2), appleStripBox(3), GOOGLE_HERO_BOX]
    for (const total of [1, 3, 5, 6, 10, 12, 20]) {
      for (const box of boxes) {
        for (const labeled of [false, true]) {
          const { cols, rows, size, gap } = stripLayout(total, box, labeled)
          // Con etiqueta, arriba quedan 24 puntos para ella.
          const top = labeled ? (24 * box.height) / STRIP_HEIGHT : 0
          expect(cols * size + (cols - 1) * gap).toBeLessThanOrEqual(box.width)
          expect(top + rows * size + (rows - 1) * gap).toBeLessThanOrEqual(box.height)
          expect(size).toBeGreaterThan(0)
        }
      }
    }
  })

  it("adds the TACC label only when the place has one", async () => {
    await renderStampStrip(2, 10, appleStripBox(3), "dedicated")
    await renderStampStrip(2, 10, appleStripBox(3), "options")
    await renderStampStrip(2, 10, appleStripBox(3))
    const [dedicated, options, none] = mockImageResponse.mock.calls.map(([element]) => textOf(element))
    expect(dedicated).toContain("100% SIN TACC")
    expect(options).toContain("CON OPCIONES SIN TACC")
    expect(none).not.toMatch(/SIN TACC/)
    // Cada etiqueta es otra imagen.
    await renderStampStrip(2, 10, appleStripBox(3), "dedicated")
    expect(mockImageResponse).toHaveBeenCalledTimes(3)
  })

  it("draws one slot per stamp with the filled ones first", async () => {
    await renderStampStrip(3, 10, appleStripBox(2))
    const [element, options] = mockImageResponse.mock.calls[0]
    expect(options).toMatchObject({ width: STRIP_WIDTH * 2, height: STRIP_HEIGHT * 2 })
    const slots = slotsOf(element)
    expect(slots).toHaveLength(10)
    expect(slots.map((s) => s.filled)).toEqual([true, true, true, ...Array(7).fill(false)])
    expect(slots.every((s) => s.total === 10)).toBe(true)
  })

  it("clamps out-of-range values and caches each image", async () => {
    await renderStampStrip(99, 4, appleStripBox(1))
    const slots = slotsOf(mockImageResponse.mock.calls[0][0])
    expect(slots).toHaveLength(4)
    expect(slots.every((s) => s.filled)).toBe(true)
    await renderStampStrip(4, 4, appleStripBox(1))
    expect(mockImageResponse).toHaveBeenCalledTimes(1)
    // Otro tamaño es otra imagen.
    await renderStampStrip(4, 4, GOOGLE_HERO_BOX)
    expect(mockImageResponse).toHaveBeenCalledTimes(2)
    expect(mockImageResponse.mock.calls[1][1]).toMatchObject({ width: 1032, height: 336 })
  })
})
