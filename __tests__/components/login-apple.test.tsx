/**
 * @jest-environment jsdom
 */
import React, { act } from "react"
import { createRoot, Root } from "react-dom/client"
import { readFileSync } from "fs"
import path from "path"

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
    expect(el.querySelector('[data-testid="apple-signin-button"]')).toBeNull()
  })

  it("muestra Apple y Google en iOS nativo con prominencia equivalente", async () => {
    isAppleSignInAvailable.mockReturnValue(true)
    const { el } = await mount()
    const apple = el.querySelector(
      '[data-testid="apple-signin-button"]'
    ) as HTMLButtonElement
    const google = el.querySelector(
      '[data-testid="google-signin-button"]'
    ) as HTMLButtonElement
    expect(apple).toBeTruthy()
    expect(google).toBeTruthy()
    expect(apple.getAttribute("aria-label")).toBe("Continuar con Apple")
    expect(google.getAttribute("aria-label")).toBe("Continuar con Google")
    expect(apple.className).toContain("login-oauth-btn")
    expect(google.className).toContain("login-oauth-btn")
    expect(google.className).toMatch(/h-12/)
    expect(google.className).toMatch(/min-h-\[48px\]/)
    expect(google.className).toMatch(/w-full/)
  })

  it("Apple visible en condición equivalente a iPadOS", async () => {
    isAppleSignInAvailable.mockReturnValue(true)
    const { el } = await mount()
    expect(el.querySelector('[data-apple-signin="true"]')).toBeTruthy()
    expect(el.querySelector('[data-testid="apple-signin-logo"]')).toBeTruthy()
  })

  it("Apple aparece primero en el DOM, con logo oficial", async () => {
    isAppleSignInAvailable.mockReturnValue(true)
    const { el } = await mount()
    const row = el.querySelector('[data-testid="login-oauth-row"]') as HTMLElement
    const providers = Array.from(
      row.querySelectorAll("[data-provider]")
    ).map((node) => node.getAttribute("data-provider"))
    expect(providers).toEqual(["apple", "google"])
    const logo = el.querySelector('[data-testid="apple-signin-logo"]')
    expect(logo?.tagName.toLowerCase()).toBe("svg")
    expect(logo?.querySelector("path")).toBeTruthy()
  })

  it("tarjeta login tiene ancho máximo y no usa media query para ocultar Apple", async () => {
    isAppleSignInAvailable.mockReturnValue(true)
    const { el } = await mount()
    const screen = el.querySelector('[data-testid="login-screen"]') as HTMLElement
    const card = el.querySelector('[data-testid="login-card"]') as HTMLElement
    expect(screen.className).toContain("overflow-x-hidden")
    expect(card.className).toContain("max-w-[400px]")
    expect(appleButtonHiddenByClass(el)).toBe(false)
  })

  it("cancelación Apple no muestra error alarmante y termina carga", async () => {
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
      '[data-testid="apple-signin-button"]'
    ) as HTMLButtonElement
    await act(async () => {
      apple.click()
      await new Promise((r) => setTimeout(r, 20))
    })
    expect(el.querySelector('[role="alert"]')).toBeNull()
    expect(apple.disabled).toBe(false)
    expect(apple.getAttribute("aria-busy")).toBeNull()
  })

  it("error del plugin muestra alerta y libera el botón", async () => {
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
      new NativeAppleSignInError("plugin failed", "failed")
    )
    const { el } = await mount()
    const apple = el.querySelector(
      '[data-testid="apple-signin-button"]'
    ) as HTMLButtonElement
    await act(async () => {
      apple.click()
      await new Promise((r) => setTimeout(r, 20))
    })
    expect(el.querySelector('[role="alert"]')?.textContent).toMatch(/Apple/)
    expect(apple.disabled).toBe(false)
  })

  it("evita doble submit", async () => {
    isAppleSignInAvailable.mockReturnValue(true)
    let resolveSignIn: (() => void) | undefined
    signInWithApple.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSignIn = resolve
        })
    )
    const { el } = await mount()
    const apple = el.querySelector(
      '[data-testid="apple-signin-button"]'
    ) as HTMLButtonElement
    await act(async () => {
      apple.click()
      apple.click()
    })
    expect(signInWithApple).toHaveBeenCalledTimes(1)
    await act(async () => {
      resolveSignIn?.()
      await new Promise((r) => setTimeout(r, 20))
    })
  })

  it("Google sigue visible y dispara su flujo", async () => {
    isAppleSignInAvailable.mockReturnValue(true)
    signInWithGoogle.mockResolvedValue(undefined)
    const { el } = await mount()
    const google = el.querySelector(
      '[data-testid="google-signin-button"]'
    ) as HTMLButtonElement
    await act(async () => {
      google.click()
      await new Promise((r) => setTimeout(r, 20))
    })
    expect(signInWithGoogle).toHaveBeenCalled()
  })
})

describe("Login responsive classes (iPhone / iPad)", () => {
  const viewports = [
    { name: "iPhone portrait", width: 390, height: 844 },
    { name: "iPhone landscape", width: 844, height: 390 },
    { name: "iPad Air 11 portrait", width: 820, height: 1180 },
    { name: "iPad Air 11 landscape", width: 1180, height: 820 },
    { name: "iPad split compact", width: 320, height: 1180 },
    { name: "iPad large", width: 1024, height: 1366 },
  ]

  beforeEach(() => {
    document.body.innerHTML = ""
    isAppleSignInAvailable.mockReturnValue(true)
  })

  it.each(viewports)(
    "$name: Apple+Google visibles, card acotada",
    async ({ width, height }) => {
      Object.defineProperty(window, "innerWidth", {
        value: width,
        configurable: true,
      })
      Object.defineProperty(window, "innerHeight", {
        value: height,
        configurable: true,
      })
      const { el } = await mount()
      const card = el.querySelector('[data-testid="login-card"]') as HTMLElement
      expect(el.querySelector('[data-testid="apple-signin-button"]')).toBeTruthy()
      expect(el.querySelector('[data-testid="google-signin-button"]')).toBeTruthy()
      expect(card.className).toContain("max-w-[400px]")
      expect(card.className).toContain("mx-auto")
      expect(appleButtonHiddenByClass(el)).toBe(false)
    }
  )
})

describe("Login / Apple HIG source contracts", () => {
  it("CSS oficial: logo, blanco, 48px, sin display:none en media queries", () => {
    const css = readFileSync(
      path.join(
        process.cwd(),
        "components",
        "auth",
        "apple-sign-in-button.module.css"
      ),
      "utf8"
    )
    expect(css).toMatch(/background-color:\s*#ffffff/i)
    expect(css).toMatch(/color:\s*#000000/i)
    expect(css).toMatch(/--apple-signin-height:\s*48px/)
    expect(css).toMatch(/--apple-signin-logo:\s*18px/)
    expect(css).toMatch(/min-width:\s*140px/)
    expect(css).not.toMatch(/@media[^{]+\{[^}]*display:\s*none/)
  })

  it("login page no oculta Apple con hidden/md:hidden", () => {
    const src = readFileSync(
      path.join(process.cwd(), "app", "login", "page.tsx"),
      "utf8"
    )
    expect(src).toMatch(/AppleSignInButton/)
    expect(src).not.toMatch(/hidden\s+(sm|md|lg|xl):flex/)
    expect(src).not.toMatch(/md:hidden[\s\S]{0,80}Apple/)
    expect(src).not.toMatch(/max-md:hidden/)
  })
})

function appleButtonHiddenByClass(el: HTMLElement): boolean {
  const apple = el.querySelector('[data-testid="apple-signin-button"]')
  if (!apple) return true
  const cls = `${apple.className} ${apple.parentElement?.className || ""}`
  return /\bhidden\b/.test(cls) && !/\b(sm|md|lg):flex\b/.test(cls)
}
