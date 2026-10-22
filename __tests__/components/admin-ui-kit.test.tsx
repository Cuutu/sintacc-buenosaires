/**
 * @jest-environment jsdom
 */
import React from "react"
import { act } from "react"
import { createRoot } from "react-dom/client"
import { readFileSync, readdirSync, statSync } from "fs"
import path from "path"
import { AdminButton, adminButtonClass } from "@/components/admin/ui/button"
import { FilterChip } from "@/components/admin/ui/filter-chip"
import { PublishStatusBadge, StatusBadge } from "@/components/admin/ui/status-badge"
import { SegmentedControl } from "@/components/admin/ui/segmented-control"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
jest.mock("next/link", () => ({ __esModule: true, default: (p: { href: string; children: React.ReactNode }) => React.createElement("a", p, p.children) }))

function render(node: React.ReactElement) {
  const el = document.createElement("div")
  document.body.appendChild(el)
  act(() => createRoot(el).render(node))
  return el
}

describe("kit del admin", () => {
  it("todos los botones miden 44 px y la acción principal es terracota fuerte", () => {
    for (const variant of ["primary", "secondary", "quiet", "danger"] as const) {
      expect(adminButtonClass({ variant })).toContain("h-11")
    }
    expect(adminButtonClass({ variant: "primary" })).toContain("bg-terracotta-strong")
    expect(adminButtonClass({ variant: "danger" })).toContain("text-danger")
    const el = render(<AdminButton>Guardar</AdminButton>)
    expect(el.querySelector("button")?.getAttribute("type")).toBe("button")
  })

  it("el chip seleccionado es oliva lleno y muestra la cantidad con punto de miles", () => {
    const el = render(
      <FilterChip selected count={1830}>
        Sin foto
      </FilterChip>
    )
    const btn = el.querySelector("button")!
    expect(btn.getAttribute("aria-pressed")).toBe("true")
    expect(btn.className).toContain("bg-olive")
    expect(btn.textContent).toBe("Sin foto1.830")
  })

  it("las etiquetas de estado no son botones y usan colores de estado", () => {
    const el = render(
      <div>
        <PublishStatusBadge status="approved" />
        <PublishStatusBadge status="pending" />
        <StatusBadge tone="danger">Oculta</StatusBadge>
      </div>
    )
    expect(el.querySelector("button")).toBeNull()
    const spans = Array.from(el.querySelectorAll(":scope > div > span"))
    expect(spans[0].textContent).toBe("Publicado")
    expect(spans[0].className).toContain("bg-success-soft")
    expect(spans[1].className).toContain("bg-warning-soft")
    expect(spans[2].className).toContain("bg-danger-soft")
  })

  it("el selector segmentado marca la opción elegida", () => {
    const onChange = jest.fn()
    const el = render(
      <SegmentedControl
        ariaLabel="Estado"
        value="approved"
        onChange={onChange}
        options={[
          { value: "approved", label: "Publicado" },
          { value: "pending", label: "Pendiente", count: 5 },
        ]}
      />
    )
    const [a, b] = Array.from(el.querySelectorAll("button"))
    expect(a.getAttribute("aria-pressed")).toBe("true")
    expect(b.getAttribute("aria-pressed")).toBe("false")
    act(() => b.click())
    expect(onChange).toHaveBeenCalledWith("pending")
  })
})

describe("colores del admin", () => {
  const root = path.join(__dirname, "../..")
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name)
      return statSync(full).isDirectory() ? walk(full) : /\.(tsx?|ts)$/.test(name) ? [full] : []
    })
  const files = [
    ...walk(path.join(root, "components/admin")),
    ...walk(path.join(root, "app/admin")),
    path.join(root, "lib/admin-ui.ts"),
    path.join(root, "lib/place-completeness.ts"),
  ]

  it("no hay colores sueltos en hex: se usan los tokens (olive, cream, line, ink-muted…)", () => {
    const offenders = files.filter((f) => /(bg|text|border|divide|ring|from|to)-\[#[0-9a-f]{3,8}\]/i.test(readFileSync(f, "utf8")))
    expect(offenders.map((f) => path.relative(root, f))).toEqual([])
  })

  it("no quedan clases del tema oscuro (text-red-200, text-amber-400…)", () => {
    const offenders = files.filter((f) =>
      /\b(text|bg|border)-(red|amber|yellow|orange|green|emerald|blue|sky|gray|slate)-\d{2,3}\b/.test(readFileSync(f, "utf8"))
    )
    expect(offenders.map((f) => path.relative(root, f))).toEqual([])
  })
})
