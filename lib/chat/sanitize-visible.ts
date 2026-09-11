/** Saca markup de tools (DSML / Harmony / XML) para que nunca se vea en el chat. */
const DSML_TAG = /<\s*\|\s*DSML\s*\|[^>]*>/gi
const HARMONY_TAG = /<\|[^|>]+\|>/g
const TOOL_XML = /<\/?(?:tool_call|tool_calls|invoke|parameter|function_call|function)[^>]*>/gi
const JUNK_LINE = /DSML|tool_calls|invoke name\s*=|parameter name\s*=|<\s*\|\s*DSML/i

export function sanitizeChatVisibleText(text: string): string {
  if (!text) return ""
  let out = text.replace(DSML_TAG, " ")
  out = out.replace(HARMONY_TAG, " ")
  out = out.replace(TOOL_XML, " ")
  out = out.replace(/<\s*\|\s*DSML[\s\S]*?(?=>|$)/gi, " ")
  out = out.replace(/>{1,}/g, " ")
  out = out
    .split(/\n/)
    .filter((line) => !JUNK_LINE.test(line))
    .join("\n")
  out = out.replace(/^[-\s,.:;]+/, "")
  out = out.replace(/\s+/g, " ").trim()
  if (JUNK_LINE.test(out)) {
    out = out.replace(/<\s*\|[\s\S]*?(?:>|$)/g, " ").replace(/\s+/g, " ").trim()
  }
  if (JUNK_LINE.test(out)) return ""
  return out
}
