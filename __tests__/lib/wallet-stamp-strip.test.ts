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

import { STRIP_HEIGHT, STRIP_WIDTH, renderStampStrip, stripLayout } from "@/lib/wallet/stamp-strip"

type SlotProps = { index: number; total: number; filled: boolean; size: number }

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
    expect(stripLayout(5)).toMatchObject({ rows: 1, cols: 5 })
    expect(stripLayout(10)).toMatchObject({ rows: 2, cols: 5 })
    expect(stripLayout(7)).toMatchObject({ rows: 2, cols: 4 })
    expect(stripLayout(20)).toMatchObject({ rows: 2, cols: 10 })
  })

  it("keeps every slot inside the strip", () => {
    for (const total of [1, 3, 5, 6, 10, 12, 20]) {
      for (const scale of [1, 2, 3]) {
        const { cols, rows, size, gap } = stripLayout(total, scale)
        expect(cols * size + (cols - 1) * gap).toBeLessThanOrEqual(STRIP_WIDTH * scale)
        expect(rows * size + (rows - 1) * gap).toBeLessThanOrEqual(STRIP_HEIGHT * scale)
        expect(size).toBeGreaterThan(0)
      }
    }
  })

  it("draws one slot per stamp with the filled ones first", async () => {
    await renderStampStrip(3, 10, 2)
    const [element, options] = mockImageResponse.mock.calls[0]
    expect(options).toMatchObject({ width: STRIP_WIDTH * 2, height: STRIP_HEIGHT * 2 })
    const slots = slotsOf(element)
    expect(slots).toHaveLength(10)
    expect(slots.map((s) => s.filled)).toEqual([true, true, true, ...Array(7).fill(false)])
    expect(slots.every((s) => s.total === 10)).toBe(true)
  })

  it("clamps out-of-range values and caches each image", async () => {
    await renderStampStrip(99, 4, 1)
    const slots = slotsOf(mockImageResponse.mock.calls[0][0])
    expect(slots).toHaveLength(4)
    expect(slots.every((s) => s.filled)).toBe(true)
    await renderStampStrip(4, 4, 1)
    expect(mockImageResponse).toHaveBeenCalledTimes(1)
  })
})
