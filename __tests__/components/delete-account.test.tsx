/**
 * @jest-environment jsdom
 */
import React, { act } from "react"
import { createRoot, Root } from "react-dom/client"
import { DeleteAccountSection } from "@/components/delete-account-section"
import { ACCOUNT_DELETE_CONFIRM } from "@/lib/account-deletion-constants"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const mockReplace = jest.fn()
const mockRefresh = jest.fn()
const mockSignOut = jest.fn().mockResolvedValue(undefined)
const mockFetchApi = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
}))

jest.mock("next-auth/react", () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}))

jest.mock("@/lib/fetchApi", () => ({
  FetchApiError: class FetchApiError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
  fetchApi: (...args: unknown[]) => mockFetchApi(...args),
}))

jest.mock("@/lib/native-sign-in", () => ({
  isAppleSignInAvailable: () => false,
  clearNativeSocialSessions: jest.fn().mockResolvedValue(undefined),
  reauthenticateAppleForAccountDeletion: jest.fn(),
  NativeAppleSignInError: class NativeAppleSignInError extends Error {
    code: string
    constructor(message: string, code: string) {
      super(message)
      this.code = code
    }
  },
}))

async function mount(ui: React.ReactElement): Promise<{ root: Root; el: HTMLDivElement }> {
  const el = document.createElement("div")
  document.body.appendChild(el)
  const root = createRoot(el)
  await act(async () => {
    root.render(ui)
  })
  return { root, el }
}

async function flush(ms = 20) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })
}

describe("DeleteAccountSection", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    document.body.innerHTML = ""
  })

  it("muestra Eliminar cuenta visible", async () => {
    const { el } = await mount(
      <DeleteAccountSection needsAppleReauth={false} />
    )
    expect(el.textContent).toMatch(/Eliminar cuenta/)
    expect(el.querySelector('[data-testid="delete-account-open"]')).toBeTruthy()
  })

  it("abre modal y cancela", async () => {
    const { el } = await mount(
      <DeleteAccountSection needsAppleReauth={false} />
    )
    await act(async () => {
      ;(el.querySelector('[data-testid="delete-account-open"]') as HTMLButtonElement).click()
    })
    await flush()
    expect(document.querySelector('[data-testid="delete-account-dialog"]')).toBeTruthy()
    await act(async () => {
      ;(document.querySelector('[data-testid="delete-account-cancel"]') as HTMLButtonElement).click()
    })
    await flush()
  })

  it("éxito: llama API, cierra sesión y redirige", async () => {
    mockFetchApi.mockResolvedValue({
      ok: true,
      appleManualInstructions: false,
    })
    const { el } = await mount(
      <DeleteAccountSection needsAppleReauth={false} />
    )
    await act(async () => {
      ;(el.querySelector('[data-testid="delete-account-open"]') as HTMLButtonElement).click()
    })
    await flush()
    const input = document.querySelector(
      '[data-testid="delete-account-confirm-input"]'
    ) as HTMLInputElement
    await act(async () => {
      input.value = ACCOUNT_DELETE_CONFIRM
      input.dispatchEvent(new Event("input", { bubbles: true }))
      // React controlled: fire change
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set
      nativeInputValueSetter?.call(input, ACCOUNT_DELETE_CONFIRM)
      input.dispatchEvent(new Event("input", { bubbles: true }))
      input.dispatchEvent(new Event("change", { bubbles: true }))
    })
    // Use React's onChange via typing helper
    await act(async () => {
      const { Simulate } = await import("react-dom/test-utils")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(Simulate as any).change(input, { target: { value: ACCOUNT_DELETE_CONFIRM } })
    })
    await flush()
    const submit = document.querySelector(
      '[data-testid="delete-account-submit"]'
    ) as HTMLButtonElement
    expect(submit.disabled).toBe(false)
    await act(async () => {
      submit.click()
    })
    await flush(50)
    expect(mockFetchApi).toHaveBeenCalledWith(
      "/api/account",
      expect.objectContaining({ method: "DELETE" })
    )
    expect(mockSignOut).toHaveBeenCalled()
    expect(mockReplace).toHaveBeenCalledWith("/")
  })

  it("muestra error recuperable", async () => {
    const { FetchApiError } = jest.requireMock("@/lib/fetchApi")
    mockFetchApi.mockRejectedValue(new FetchApiError("Fallo temporal", 500))
    const { el } = await mount(
      <DeleteAccountSection needsAppleReauth={false} />
    )
    await act(async () => {
      ;(el.querySelector('[data-testid="delete-account-open"]') as HTMLButtonElement).click()
    })
    await flush()
    const input = document.querySelector(
      '[data-testid="delete-account-confirm-input"]'
    ) as HTMLInputElement
    await act(async () => {
      const { Simulate } = await import("react-dom/test-utils")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(Simulate as any).change(input, { target: { value: ACCOUNT_DELETE_CONFIRM } })
    })
    await act(async () => {
      ;(document.querySelector('[data-testid="delete-account-submit"]') as HTMLButtonElement).click()
    })
    await flush(50)
    expect(
      document.querySelector('[data-testid="delete-account-error"]')?.textContent
    ).toMatch(/Fallo temporal/)
  })

  it("muestra instrucciones manuales Apple", async () => {
    mockFetchApi.mockResolvedValue({
      ok: true,
      appleManualInstructions: true,
      manualAppleRevokeSteps: ["Paso 1", "Paso 2"],
    })
    const { el } = await mount(
      <DeleteAccountSection needsAppleReauth={true} />
    )
    await act(async () => {
      ;(el.querySelector('[data-testid="delete-account-open"]') as HTMLButtonElement).click()
    })
    await flush()
    const input = document.querySelector(
      '[data-testid="delete-account-confirm-input"]'
    ) as HTMLInputElement
    await act(async () => {
      const { Simulate } = await import("react-dom/test-utils")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(Simulate as any).change(input, { target: { value: ACCOUNT_DELETE_CONFIRM } })
    })
    await act(async () => {
      ;(document.querySelector('[data-testid="delete-account-submit"]') as HTMLButtonElement).click()
    })
    await flush(50)
    expect(
      document.querySelector('[data-testid="delete-account-apple-manual"]')
    ).toBeTruthy()
  })
})
