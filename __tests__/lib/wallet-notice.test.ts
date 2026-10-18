/**
 * @jest-environment node
 */
import {
  activeNotice,
  cleanNoticeText,
  formatNoticeTime,
  nextNoticeAt,
  NOTICE_COOLDOWN_MS,
  NOTICE_TTL_MS,
  noticeSchema,
} from "@/lib/wallet/notice"

const sentAt = new Date("2026-10-16T12:00:00Z")
const notice = { text: "Salieron las medialunas sin TACC", sentAt, byEmail: "caja@polvorin.com" }

describe("avisos del local", () => {
  it("keeps the text plain and on one line", () => {
    expect(cleanNoticeText("  Salieron\n\nlas <medialunas>\u0007  ")).toBe("Salieron las medialunas")
    // Comillas y acentos quedan como están: el Wallet no es HTML.
    expect(cleanNoticeText('Hoy "2x1" en budín de limón')).toBe('Hoy "2x1" en budín de limón')
  })

  it("rejects empty, too long and link notices", () => {
    expect(noticeSchema.safeParse({ texto: "Hoy 2x1 en alfajores" }).success).toBe(true)
    expect(noticeSchema.safeParse({ texto: "  " }).success).toBe(false)
    expect(noticeSchema.safeParse({ texto: "x".repeat(141) }).success).toBe(false)
    const link = noticeSchema.safeParse({ texto: "Mirá https://bit.ly/promo" })
    expect(link.success).toBe(false)
    expect(link.success ? "" : link.error.issues[0].message).toBe("Sin links: el aviso es sólo texto.")
    expect(noticeSchema.safeParse({ texto: "Entrá a www.algo.com" }).success).toBe(false)
    expect(noticeSchema.safeParse(null).success).toBe(false)
  })

  it("shows a notice for a week", () => {
    expect(activeNotice(notice, new Date(sentAt.getTime() + NOTICE_TTL_MS - 1))).toBe(notice.text)
    expect(activeNotice(notice, new Date(sentAt.getTime() + NOTICE_TTL_MS))).toBeNull()
    expect(activeNotice(undefined)).toBeNull()
  })

  it("allows one notice a day", () => {
    expect(nextNoticeAt(notice, new Date(sentAt.getTime() + 60_000))?.getTime()).toBe(
      sentAt.getTime() + NOTICE_COOLDOWN_MS
    )
    expect(nextNoticeAt(notice, new Date(sentAt.getTime() + NOTICE_COOLDOWN_MS))).toBeNull()
    expect(nextNoticeAt(null)).toBeNull()
  })

  it("writes times in Argentina", () => {
    expect(formatNoticeTime(new Date("2026-10-16T21:30:00Z"))).toMatch(/16\/10.*18:30/)
  })
})
