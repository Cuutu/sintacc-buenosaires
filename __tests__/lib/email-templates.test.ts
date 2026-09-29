/**
 * @jest-environment node
 */
import {
  buildVentureApprovedEmailHtml,
  buildVentureRejectedEmailHtml,
  buildVentureSuggestionNewEmailHtml,
} from "@/lib/email-ventures"
import { buildSuggestionApprovedEmailHtml, buildSuggestionRejectedEmailHtml } from "@/lib/email-suggestions"

describe("mails con layout nuevo", () => {
  it("escapa contenido del usuario", () => {
    const html = buildSuggestionRejectedEmailHtml({
      placeName: "<script>alert(1)</script>",
      rejectionReason: 'Motivo "raro" & <b>',
    })
    expect(html).not.toContain("<script>alert(1)</script>")
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;")
    expect(html).toContain("Motivo &quot;raro&quot; &amp; &lt;b&gt;")
  })

  it("usan el logo nuevo y los colores de marca, no la estética vieja", () => {
    const html = buildVentureApprovedEmailHtml({ ventureName: "IsmaLana GF", ventureSlug: "ismalana-gf" })
    expect(html).toContain("/email/celimap-logo.png")
    expect(html).toContain("#1F4D35")
    expect(html).not.toContain("#0f0f12")
    expect(html).not.toContain("#10b981")
    expect(html).toContain("/emprendimientos/ismalana-gf")
  })

  it("rechazos llevan el motivo y un link para volver a sugerir", () => {
    expect(
      buildVentureRejectedEmailHtml({ ventureName: "X", rejectionReason: "Sin contacto" })
    ).toMatch(/Sin contacto[\s\S]*\/sugerir-emprendimiento/)
  })

  it("lugar aprobado linkea a la ficha", () => {
    expect(buildSuggestionApprovedEmailHtml({ placeName: "Lugar", placeId: "abc" })).toContain("/lugar/abc")
  })

  it("mail de admin lista todas las categorías", () => {
    const html = buildVentureSuggestionNewEmailHtml({
      ventureDraft: { name: "Dulce", categories: ["pasteleria", "panificados"], zone: "La Plata" },
      suggestedByName: "Fede",
      suggestedByEmail: "f@example.com",
    })
    expect(html).toContain("Categorías")
    expect(html).toContain("Pastelería, Panificados")
  })
})
