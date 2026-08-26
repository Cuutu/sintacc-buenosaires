/**
 * @jest-environment jsdom
 */
import {
  __resetHandoffOnceForTests,
  claimHandoffFromUrl,
  createLaunchUrlHandler,
} from "@/lib/native-handoff-once"

const CODE_ABC = "abcabcabcabcabca"
const CODE_XYZ = "defdefdefdefdefd"

function handoffUrl(code: string, next = "/perfil"): string {
  return `celimap://auth/handoff?code=${code}&next=${encodeURIComponent(next)}`
}

describe("native handoff once (sessionStorage)", () => {
  beforeEach(() => {
    __resetHandoffOnceForTests()
  })

  afterEach(() => {
    __resetHandoffOnceForTests()
  })

  it("primer getLaunchUrl con code ABC consume una vez", async () => {
    const assign = jest.fn()
    const handleLaunchUrl = createLaunchUrlHandler({ assign })
    const consumed = await handleLaunchUrl(handoffUrl(CODE_ABC))
    expect(consumed).toBe(true)
    expect(assign).toHaveBeenCalledTimes(1)
    expect(assign.mock.calls[0]?.[0]).toContain(`code=${CODE_ABC}`)
    expect(assign.mock.calls[0]?.[0]).toMatch(/^\/api\/auth\/handoff\?/)
  })

  it("segundo procesamiento de la misma URL no consume", async () => {
    const assign = jest.fn()
    const handleLaunchUrl = createLaunchUrlHandler({ assign })
    await handleLaunchUrl(handoffUrl(CODE_ABC))
    assign.mockClear()
    const consumed = await handleLaunchUrl(handoffUrl(CODE_ABC))
    expect(consumed).toBe(false)
    expect(assign).not.toHaveBeenCalled()
  })

  it("remount/reload: sessionStorage bloquea ABC", async () => {
    const first = createLaunchUrlHandler({ assign: jest.fn() })
    await first(handoffUrl(CODE_ABC))
    expect(sessionStorage.getItem(`celimap:handoff:v1:${CODE_ABC}`)).toBe("1")

    const assign = jest.fn()
    const afterReload = createLaunchUrlHandler({ assign })
    const consumed = await afterReload(handoffUrl(CODE_ABC))
    expect(consumed).toBe(false)
    expect(assign).not.toHaveBeenCalled()
  })

  it("appUrlOpen con el mismo code después de getLaunchUrl no consume dos veces", async () => {
    const assign = jest.fn()
    const handleLaunchUrl = createLaunchUrlHandler({ assign })
    await handleLaunchUrl(handoffUrl(CODE_ABC))
    await handleLaunchUrl(handoffUrl(CODE_ABC))
    expect(assign).toHaveBeenCalledTimes(1)
  })

  it("dos códigos diferentes ABC y XYZ se procesan una vez cada uno", async () => {
    const assign = jest.fn()
    const handleLaunchUrl = createLaunchUrlHandler({ assign })
    expect(await handleLaunchUrl(handoffUrl(CODE_ABC))).toBe(true)
    expect(await handleLaunchUrl(handoffUrl(CODE_XYZ, "/mapa"))).toBe(true)
    expect(await handleLaunchUrl(handoffUrl(CODE_ABC))).toBe(false)
    expect(await handleLaunchUrl(handoffUrl(CODE_XYZ, "/mapa"))).toBe(false)
    expect(assign).toHaveBeenCalledTimes(2)
  })

  it("URL sin code no rompe y no assign", async () => {
    const assign = jest.fn()
    const handleLaunchUrl = createLaunchUrlHandler({ assign })
    await expect(
      handleLaunchUrl("celimap://auth/handoff?next=/perfil")
    ).resolves.toBe(false)
    expect(assign).not.toHaveBeenCalled()
  })

  it("URL inválida no rompe", async () => {
    const assign = jest.fn()
    const handleLaunchUrl = createLaunchUrlHandler({ assign })
    await expect(handleLaunchUrl("https://evil.example/x")).resolves.toBe(false)
    await expect(handleLaunchUrl("not-a-url")).resolves.toBe(false)
    await expect(handleLaunchUrl("")).resolves.toBe(false)
    expect(claimHandoffFromUrl("celimap://auth/other?code=" + CODE_ABC)).toBeNull()
    expect(assign).not.toHaveBeenCalled()
  })

  it("cancelled / null / undefined no rompe", async () => {
    const assign = jest.fn()
    const handleLaunchUrl = createLaunchUrlHandler({
      assign,
      isCancelled: () => true,
    })
    await expect(handleLaunchUrl(handoffUrl(CODE_ABC))).resolves.toBe(false)
    expect(assign).not.toHaveBeenCalled()

    const live = createLaunchUrlHandler({ assign })
    await expect(live(null)).resolves.toBe(false)
    await expect(live(undefined)).resolves.toBe(false)
    expect(claimHandoffFromUrl(null)).toBeNull()
    expect(claimHandoffFromUrl(undefined)).toBeNull()
    expect(assign).not.toHaveBeenCalled()
  })
})
