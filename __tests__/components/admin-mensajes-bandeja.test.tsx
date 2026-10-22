/**
 * @jest-environment jsdom
 */
import React from "react"
import { act } from "react"
import { createRoot } from "react-dom/client"
import { AdminContactsSection } from "@/components/admin/AdminContactsSection"
import type { ContactItem } from "@/components/admin/types"
import { formatAdminDate, formatAdminDateTime } from "@/lib/admin-format"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, ...p }: { href: string; children: React.ReactNode }) => React.createElement("a", p, children),
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const contacts: ContactItem[] = [
  { _id: "c1", name: "Marta", email: "m@example.com", subject: "Lugar cerrado", message: "Cerró.", status: "new", estado: "pendiente", createdAt: "2026-10-20T15:00:00Z" },
  { _id: "c2", name: "Pedro", email: "p@example.com", subject: "Sumar", message: "Hola", status: "read", estado: "respondido", createdAt: "2026-10-10T15:00:00Z" },
  { _id: "c3", name: "Lucía", email: "l@example.com", subject: "Horarios", message: "Mal", status: "new", createdAt: "2026-10-01T15:00:00Z" },
]

function render() {
  const el = document.createElement("div")
  document.body.appendChild(el)
  act(() =>
    createRoot(el).render(
      <AdminContactsSection
        estadoFilter=""
        onEstadoFilter={() => undefined}
        contacts={contacts}
        contactsLoading={false}
        contactSearch=""
        setContactSearch={() => undefined}
        fetchContacts={() => undefined}
      />
    )
  )
  return el
}

describe("Mensajes", () => {
  it("cada mensaje muestra su fecha", () => {
    const items = Array.from(render().querySelectorAll("li"))
    expect(items).toHaveLength(3)
    items.forEach((li, i) => {
      const time = li.querySelector("time")
      expect(time?.getAttribute("dateTime")).toBe(contacts[i].createdAt)
      expect(time?.textContent).toBe(formatAdminDate(contacts[i].createdAt))
    })
  })

  it("los pendientes (o sin estado) se marcan como nuevos; los respondidos no", () => {
    const items = Array.from(render().querySelectorAll("li"))
    const isNew = items.map((li) => li.textContent?.includes("Nuevo:") ?? false)
    expect(isNew).toEqual([true, false, true])
    expect(items[0].textContent).toContain("Pendiente")
    expect(items[1].textContent).not.toContain("Pendiente")
  })

  it("el detalle muestra fecha y hora y responder por email", () => {
    const root = render()
    const aside = root.querySelector("aside")!
    expect(aside.textContent).toContain(formatAdminDateTime(contacts[0].createdAt))
    expect(aside.querySelector('a[href^="mailto:"]')?.textContent).toContain("Responder por email")
    expect(aside.textContent).toContain("Marcar como respondido")
  })
})
