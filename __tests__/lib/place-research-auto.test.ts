import { shouldAutoResearchSuggestion } from "@/lib/place-research/config"

describe("shouldAutoResearchSuggestion", () => {
  const prevAuto = process.env.PLACE_RESEARCH_AUTO_ON_SUBMIT
  const prevKey = process.env.OPENROUTER_API_KEY

  beforeEach(() => {
    process.env.PLACE_RESEARCH_AUTO_ON_SUBMIT = "true"
    process.env.OPENROUTER_API_KEY = "test-key"
  })

  afterAll(() => {
    process.env.PLACE_RESEARCH_AUTO_ON_SUBMIT = prevAuto
    process.env.OPENROUTER_API_KEY = prevKey
  })

  it("skips auto research when only Instagram is provided", () => {
    expect(
      shouldAutoResearchSuggestion({
        contact: { instagram: "https://www.instagram.com/alelhi_buzios" },
      })
    ).toBe(false)
  })

  it("runs auto research when Google Maps URL is present", () => {
    expect(
      shouldAutoResearchSuggestion({
        contact: { url: "https://maps.app.goo.gl/XayVD2Z5LncnWCV2A" },
      })
    ).toBe(true)
  })

  it("runs auto research for full form without instagram or maps", () => {
    expect(shouldAutoResearchSuggestion({ contact: {} })).toBe(true)
  })
})
