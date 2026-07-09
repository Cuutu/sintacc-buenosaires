export function isPlaceResearchEnabled(): boolean {
  const flag = process.env.PLACE_RESEARCH_ENABLED?.trim().toLowerCase()
  if (flag === "false" || flag === "0") return false
  return Boolean(process.env.OPENROUTER_API_KEY?.trim())
}

export function isPlaceResearchAutoOnSubmit(): boolean {
  const flag = process.env.PLACE_RESEARCH_AUTO_ON_SUBMIT?.trim().toLowerCase()
  if (flag === "false" || flag === "0") return false
  return isPlaceResearchEnabled()
}
