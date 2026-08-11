/**
 * @jest-environment jsdom
 */
import React, { act } from "react"
import { createRoot, Root } from "react-dom/client"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const replace = jest.fn()
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(),
}))

jest.mock("next-auth/react", () => ({
  useSession: () => ({ status: "unauthenticated", data: null }),
}))

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: { alt: string }) =>
    React.createElement("img", { alt: props.alt }),
}))

const signInWithGoogle = jest.fn()
const signInWithApple = jest.fn()
const isAppleSignInAvailable = jest.fn(() => false)

jest.mock("@/lib/native-sign-in", () => ({
  signInWithGoogle: (...args: unknown[]) => signInWithGoogle(...args),
  signInWithApple: (...args: unknown[]) => signInWithApple(...args),
  isAppleSignInAvailable: () => isAppleSignInAvailable(),
  NativeAppleSignInError: class NativeAppleSignInError extends Error {
    code: string
    constructor(message: string, code = "failed") {
      super(message)
      this.code = code
    }
  },
}))

import LoginPage from "@/app/login/page"

async function mount(): Promise<{ root: Root; el: HTMLDivElement }> {
  const el = document.createElement("div")
  document.body.appendChild(el)
  const root = createRoot(el)
  await act(async () => {
    root.render(React.createElement(LoginPage))
  })
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20))
  })
  return { root, el }
}

describe("Login page Apple UI", () => {
  beforeEach(() => {
    document.body.innerHTML = ""
    signInWithGoogle.mockReset()
    signInWithApple.mockReset()
    isAppleSignInAvailable.mockReturnValue(false)
  })

  it("oculta Apple en web", async () => {
    const { el } = await mount()
    expect(el.textContent).toContain("Continuar con Google")
    expect(el.textContent).not.toContain("Continuar con Apple")
  })

  it("muestra Apple en iOS nativo con prominencia equivalente", async () => {
    isAppleSignInAvailable.mockReturnValue(true)
    const { el } = await mount()
    expect(el.textContent).toContain("Continuar con Apple")
    expect(el.textContent).toContain("Continuar con Google")
    const apple = el.querySelector('[aria-label="Continuar con Apple"]')
    const google = el.querySelector('[aria-label="Continuar con Google"]')
    expect(apple).toBeTruthy()
    expect(google).toBeTruthy()
  })

  it("cancelación Apple no muestra error alarmante", async () => {
    isAppleSignInAvailable.mockReturnValue(true)
    const { NativeAppleSignInError } = jest.requireMock(
      "@/lib/native-sign-in"
    ) as {
      NativeAppleSignInError: new (
        m: string,
        c: string
      ) => Error & { code: string }
    }
    signInWithApple.mockRejectedValue(
      new NativeAppleSignInError("Cancelado", "cancelled")
    )
    const { el } = await mount()
    const apple = el.querySelector(
      '[aria-label="Continuar con Apple"]'
    ) as HTMLButtonElement
    await act(async () => {
      apple.click()
      await new Promise((r) => setTimeout(r, 20))
    })
    expect(el.querySelector('[role="alert"]')).toBeNull()
  })
})
