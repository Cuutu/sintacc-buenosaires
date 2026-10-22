/**
 * @jest-environment jsdom
 */
import React, { act } from "react"
import { createRoot } from "react-dom/client"
import { LoyaltyTeamEditor } from "@/components/admin/LoyaltyTeamEditor"
import type { AdminProgramRow } from "@/lib/wallet/loyalty-admin"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const program = (patch: Partial<AdminProgramRow> = {}): AdminProgramRow => ({
  id: "prog1",
  placeId: "main",
  placeName: "Polvorín Palermo",
  stampsForReward: 10,
  reward: "Cookie",
  staffEmails: ["duenio@polvorin.com"],
  employeeEmails: ["caja@polvorin.com"],
  brandName: "",
  branches: [],
  active: true,
  enrollPath: "/tarjeta/prog1",
  stats: { cards: 0, inWallet: 0, customers: 0, cardsWithSecondStamp: 0, stampsLast7Days: 0, redeems: 0, invitedCards: 0 },
  notice: null,
  doubleStamp: null,
  referralEnabled: false,
  monthly: [],
  ...patch,
})

const fetchMock = jest.fn()
const onChanged = jest.fn().mockResolvedValue(undefined)

async function mount(p: AdminProgramRow) {
  const el = document.createElement("div")
  document.body.appendChild(el)
  const root = createRoot(el)
  await act(async () => {
    root.render(<LoyaltyTeamEditor program={p} endpoint="/api/admin/wallet/programs/prog1" onChanged={onChanged} />)
  })
  return el
}

const button = (el: HTMLElement, text: string) => {
  const found = Array.from(el.querySelectorAll("button")).find(
    (b) => b.textContent?.trim().startsWith(text) || b.getAttribute("aria-label") === text
  )
  if (!found) throw new Error(`No button "${text}"`)
  return found
}

async function click(target: HTMLElement) {
  await act(async () => {
    target.click()
  })
}

async function typeMail(el: HTMLElement, value: string) {
  const input = el.querySelector('input[type="email"]') as HTMLInputElement
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value)
    input.dispatchEvent(new Event("input", { bubbles: true }))
  })
  return input
}

const sentBody = () => JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body)

describe("LoyaltyTeamEditor (equipo de la tarjeta, desde el celu)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    document.body.innerHTML = ""
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })
    global.fetch = fetchMock as unknown as typeof fetch
  })

  it("adds an employee with a phone-friendly mail field and saves only that list", async () => {
    const el = await mount(program())
    await click(button(el, "Agregar persona"))
    const input = await typeMail(el, "Nueva.Caja@Gmail.com ")
    expect(input.getAttribute("autocapitalize")).toBe("none")
    expect(input.getAttribute("inputmode")).toBe("email")

    await click(button(el, "Agregar"))
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/wallet/programs/prog1", expect.objectContaining({ method: "PATCH" }))
    expect(sentBody()).toEqual({ employeeEmails: ["caja@polvorin.com", "nueva.caja@gmail.com"] })
    expect(onChanged).toHaveBeenCalled()
    expect(el.textContent).toContain("Listo: nueva.caja@gmail.com ya puede sumar sellos.")
  })

  it("turns an employee into a manager (and says so before saving)", async () => {
    const el = await mount(program())
    await click(button(el, "Agregar persona"))
    await typeMail(el, "caja@polvorin.com")
    await click(button(el, "Encargado"))
    expect(el.textContent).toContain("Hoy es empleado: pasa a encargado.")

    await click(button(el, "Agregar"))
    expect(sentBody()).toEqual({
      staffEmails: ["duenio@polvorin.com", "caja@polvorin.com"],
      employeeEmails: [],
    })
  })

  it("adds an employee to a branch", async () => {
    const el = await mount(
      program({ branches: [{ placeId: "suc1", name: "Polvorín Belgrano", staffEmails: [] }] })
    )
    await click(button(el, "Agregar persona"))
    await typeMail(el, "mozo@gmail.com")
    const select = el.querySelector("select") as HTMLSelectElement
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!.call(select, "suc1")
      select.dispatchEvent(new Event("change", { bubbles: true }))
    })
    await click(button(el, "Agregar"))
    expect(sentBody()).toEqual({ branches: [{ placeId: "suc1", staffEmails: ["mozo@gmail.com"] }] })
  })

  it("asks before removing someone", async () => {
    const el = await mount(program())
    await click(button(el, "Quitar a caja@polvorin.com"))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(el.textContent).toContain("¿Quitar a caja@polvorin.com?")

    await click(button(el, "Quitar"))
    expect(sentBody()).toEqual({ employeeEmails: [] })
    expect(el.textContent).toContain("Listo: caja@polvorin.com ya no está en el equipo.")
  })

  it("does not call the API for a bad mail or someone already there, and shows API errors", async () => {
    const el = await mount(program())
    await click(button(el, "Agregar persona"))
    await typeMail(el, "caja@")
    await click(button(el, "Agregar"))
    expect(el.textContent).toContain("Ese mail no parece válido")
    await typeMail(el, "caja@polvorin.com")
    await click(button(el, "Agregar"))
    expect(el.textContent).toContain("Ya está como empleado ahí")
    expect(fetchMock).not.toHaveBeenCalled()

    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "Máximo 10 mails" }) })
    await typeMail(el, "otra@gmail.com")
    await click(button(el, "Agregar"))
    expect(el.textContent).toContain("Máximo 10 mails")
    expect(onChanged).not.toHaveBeenCalled()
  })
})
