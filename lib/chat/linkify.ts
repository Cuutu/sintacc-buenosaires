/** Convierte URLs sueltas en markdown para que react-markdown arme <a>. */
export function linkifyBareUrls(text: string): string {
  if (!text) return text
  const skip = new Set<string>()
  const markdownLinks = text.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)
  for (const match of markdownLinks) {
    if (match[1]) skip.add(match[1])
  }

  return text.replace(/https?:\/\/[^\s<>\]\)]+/g, (url) => {
    const trimmed = url.replace(/[.,;:!?]+$/, "")
    if (skip.has(trimmed) || skip.has(url)) return url
    return `[${trimmed}](${trimmed})`
  })
}
